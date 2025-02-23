import { Wallet, constants } from "ethers";

import { getProviderFromChainSlug, switchboards } from "../../constants";
import { getInstance, getSwitchboardAddress } from "../utils";
import {
  CORE_CONTRACTS,
  ChainSlug,
  ChainSocketAddresses,
  DeploymentAddresses,
  IntegrationTypes,
  NativeSwitchboard,
  ChainSlugToKey,
} from "../../../src";
import registerSwitchboardForSibling from "../scripts/registerSwitchboard";
import { arrayify, defaultAbiCoder, keccak256, id } from "ethers/lib/utils";
import {
  capacitorType,
  maxPacketLength,
  overrides,
  msgValueMaxThreshold,
} from "../config/config";

export const registerSwitchboards = async (
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  switchboardContractName: string,
  integrationType: IntegrationTypes,
  addr: ChainSocketAddresses,
  addresses: DeploymentAddresses,
  socketSigner: Wallet
) => {
  for (let sibling of siblingSlugs) {
    const siblingSwitchboard = getSwitchboardAddress(
      chain,
      integrationType,
      addresses?.[sibling]
    );

    if (!siblingSwitchboard || !addr[switchboardContractName]) continue;

    addr = await registerSwitchboardForSibling(
      addr[switchboardContractName],
      siblingSwitchboard,
      sibling,
      capacitorType,
      maxPacketLength,
      socketSigner,
      integrationType,
      addr
    );
  }

  return addr;
};

export const setManagers = async (
  addr: ChainSocketAddresses,
  socketSigner: Wallet,
  executionManagerVersion: CORE_CONTRACTS
) => {
  const socket = (
    await getInstance(CORE_CONTRACTS.Socket, addr.Socket)
  ).connect(socketSigner);

  let tx;
  const currentEM = await socket.executionManager__({
    ...overrides(await socketSigner.getChainId()),
  });
  if (
    currentEM.toLowerCase() !== addr[executionManagerVersion]?.toLowerCase()
  ) {
    tx = await socket.setExecutionManager(addr[executionManagerVersion], {
      ...overrides(await socketSigner.getChainId()),
    });
    console.log("updateExecutionManager", tx.hash);
    await tx.wait();
  }

  const currentTM = await socket.transmitManager__({
    ...overrides(await socketSigner.getChainId()),
  });
  if (currentTM.toLowerCase() !== addr.TransmitManager?.toLowerCase()) {
    tx = await socket.setTransmitManager(addr.TransmitManager, {
      ...overrides(await socketSigner.getChainId()),
    });
    console.log("updateTransmitManager", tx.hash);
    await tx.wait();
  }
};

export const configureExecutionManager = async (
  contractName: string,
  emAddress: string,
  socketBatcherAddress: string,
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  socketSigner: Wallet
) => {
  try {
    console.log("configuring execution manager for ", chain, emAddress);

    let executionManagerContract, socketBatcherContract;
    executionManagerContract = (
      await getInstance(contractName, emAddress!)
    ).connect(socketSigner);

    let nextNonce = (
      await executionManagerContract.nextNonce(socketSigner.address, {
        ...overrides(chain),
      })
    ).toNumber();

    let requests: any = [];
    await Promise.all(
      siblingSlugs.map(async (siblingSlug) => {
        let currentValue = await executionManagerContract.msgValueMaxThreshold(
          siblingSlug,
          { ...overrides(chain) }
        );

        if (
          currentValue.toString() ==
          msgValueMaxThreshold(siblingSlug)?.toString()
        ) {
          return;
        }

        const digest = keccak256(
          defaultAbiCoder.encode(
            ["bytes32", "address", "uint32", "uint32", "uint256", "uint256"],
            [
              id("MSG_VALUE_MAX_THRESHOLD_UPDATE"),
              emAddress!,
              chain,
              siblingSlug,
              nextNonce,
              msgValueMaxThreshold(siblingSlug),
            ]
          )
        );

        const signature = await socketSigner.signMessage(arrayify(digest));

        let request = {
          signature,
          dstChainSlug: siblingSlug,
          nonce: nextNonce++,
          perGasCost: 0,
          perByteCost: 0,
          overhead: 0,
          fees: msgValueMaxThreshold(siblingSlug),
          functionSelector: "0xa1885700", // setMsgValueMaxThreshold
        };
        requests.push(request);
      })
    );

    if (requests.length === 0) return;
    socketBatcherContract = (
      await getInstance("SocketBatcher", socketBatcherAddress)
    ).connect(socketSigner);

    let tx = await socketBatcherContract.setExecutionFeesBatch(
      emAddress,
      requests,
      { ...overrides(chain) }
    );
    console.log("configured EM for ", chain, tx.hash);
    await tx.wait();
  } catch (error) {
    console.log("error while configuring execution manager: ", error);
  }
};

export const setupPolygonNativeSwitchboard = async (addresses) => {
  try {
    let srcChains = Object.keys(addresses)
      .filter((chain) => ["1", "137"].includes(chain))
      .map((c) => parseInt(c) as ChainSlug);

    await Promise.all(
      srcChains.map(async (srcChain: ChainSlug) => {
        console.log(`Configuring for ${srcChain}`);

        const providerInstance = getProviderFromChainSlug(
          srcChain as any as ChainSlug
        );
        const socketSigner: Wallet = new Wallet(
          process.env.SOCKET_SIGNER_KEY as string,
          providerInstance
        );

        for (let dstChain in addresses[srcChain]?.["integrations"]) {
          const dstConfig = addresses[srcChain]["integrations"][dstChain];
          if (!dstConfig?.[IntegrationTypes.native]) continue;

          const srcSwitchboardType =
            switchboards[ChainSlugToKey[srcChain]]?.[
              ChainSlugToKey[parseInt(dstChain) as ChainSlug]
            ]?.["switchboard"];

          const dstSwitchboardAddress = getSwitchboardAddress(
            srcChain,
            IntegrationTypes.native,
            addresses?.[dstChain]
          );
          if (!dstSwitchboardAddress) continue;

          const srcSwitchboardAddress =
            dstConfig?.[IntegrationTypes.native]["switchboard"];

          if (srcSwitchboardType === NativeSwitchboard.POLYGON_L1) {
            const sbContract = (
              await getInstance("PolygonL1Switchboard", srcSwitchboardAddress)
            ).connect(socketSigner);

            const fxChild = await sbContract.fxChildTunnel();
            if (fxChild !== constants.AddressZero) continue;
            console.log(
              `Setting ${dstSwitchboardAddress} fx child tunnel in ${srcSwitchboardAddress} on networks ${srcChain}-${dstChain}`
            );

            const tx = await sbContract
              .connect(socketSigner)
              .setFxChildTunnel(dstSwitchboardAddress, {
                ...overrides(await socketSigner.getChainId()),
              });
            console.log(srcChain, tx.hash);
            await tx.wait();
          } else if (srcSwitchboardType === NativeSwitchboard.POLYGON_L2) {
            const sbContract = (
              await getInstance("PolygonL2Switchboard", srcSwitchboardAddress)
            ).connect(socketSigner);

            const fxRoot = await sbContract.fxRootTunnel();
            if (fxRoot !== constants.AddressZero) continue;
            console.log(
              `Setting ${dstSwitchboardAddress} fx root tunnel in ${srcSwitchboardAddress} on networks ${srcChain}-${dstChain}`
            );

            const tx = await sbContract
              .connect(socketSigner)
              .setFxRootTunnel(dstSwitchboardAddress, {
                ...overrides(await socketSigner.getChainId()),
              });
            console.log(srcChain, tx.hash);
            await tx.wait();
          } else continue;
        }

        console.log(
          `Configuring remote switchboards for ${srcChain} - COMPLETED`
        );
      })
    );
  } catch (error) {
    console.error(error);
  }
};
