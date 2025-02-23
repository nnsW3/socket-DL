import {
  getDefaultIntegrationType,
  getProviderFromChainSlug,
} from "../../constants";
import { getInstance } from "../utils";
import {
  ChainSlug,
  ChainSocketAddresses,
  DeploymentAddresses,
  IntegrationTypes,
  MainnetIds,
  TestnetIds,
  isTestnet,
} from "../../../src";
import { Contract, Wallet } from "ethers";
import { getSwitchboardAddressFromAllAddresses } from "../../../src";
import { overrides } from "../config/config";

export const connectPlugs = async (
  addresses: DeploymentAddresses,
  chains: ChainSlug[]
) => {
  try {
    await Promise.all(
      chains.map(async (chain) => {
        if (!addresses[chain]) return;

        const providerInstance = getProviderFromChainSlug(chain);
        const socketSigner: Wallet = new Wallet(
          process.env.SOCKET_SIGNER_KEY as string,
          providerInstance
        );

        const addr: ChainSocketAddresses = addresses[chain]!;
        if (!addr["integrations"]) return;

        const list = isTestnet(chain) ? TestnetIds : MainnetIds;
        const siblingSlugs: ChainSlug[] = list.filter(
          (chainSlug) =>
            chainSlug !== chain &&
            addresses?.[chainSlug]?.["Counter"] &&
            chains.includes(chainSlug)
        );

        const siblingIntegrationtype: IntegrationTypes[] = siblingSlugs.map(
          (chainSlug) => {
            return getDefaultIntegrationType(chain, chainSlug);
          }
        );

        console.log(`Configuring for ${chain}`);

        const counter: Contract = (
          await getInstance("Counter", addr["Counter"])
        ).connect(socketSigner);

        const socket: Contract = (
          await getInstance("Socket", addr["Socket"])
        ).connect(socketSigner);

        for (let index = 0; index < siblingSlugs.length; index++) {
          const sibling = siblingSlugs[index];
          const siblingCounter = addresses?.[sibling]?.["Counter"];
          let switchboard;
          try {
            switchboard = getSwitchboardAddressFromAllAddresses(
              addresses,
              chain,
              sibling,
              siblingIntegrationtype[index]
            );
          } catch (error) {
            console.log(error, " continuing");
          }
          if (!switchboard) continue;

          const configs = await socket.getPlugConfig(counter.address, sibling, {
            ...overrides(chain),
          });
          if (
            configs["siblingPlug"].toLowerCase() ===
              siblingCounter?.toLowerCase() &&
            configs["inboundSwitchboard__"].toLowerCase() ===
              switchboard.toLowerCase()
          ) {
            console.log("Config already set!");
            continue;
          }

          const tx = await counter.setSocketConfig(
            sibling,
            siblingCounter,
            switchboard,
            { ...overrides(chain) }
          );

          console.log(
            `Connecting counter of ${chain} for ${sibling} and ${siblingIntegrationtype[index]} at tx hash: ${tx.hash}`
          );
          await tx.wait();
        }
      })
    );
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};
