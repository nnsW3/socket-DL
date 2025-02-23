import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import {
  ChainSlug,
  TestnetIds,
  MainnetIds,
  ROLES,
  REQUIRED_ROLES,
  CORE_CONTRACTS,
  ChainSocketAddresses,
  REQUIRED_CHAIN_ROLES,
  IntegrationTypes,
  isTestnet,
  isMainnet,
  DeploymentAddresses,
} from "../../../src";
import { getRoleHash, getChainRoleHash, getInstance } from "../utils";
import { Wallet, ethers } from "ethers";
import { getProviderFromChainSlug } from "../../constants";
import { overrides } from "../config/config";
import AccessControlExtendedABI from "@socket.tech/dl-core/artifacts/abi/AccessControlExtended.json";

let roleStatus: any = {};

interface checkAndUpdateRolesObj {
  userSpecificRoles: { userAddress: string; filterRoles: ROLES[] }[];
  filterChains: ChainSlug[];
  filterSiblingChains: ChainSlug[];
  contractName: CORE_CONTRACTS;
  newRoleStatus: boolean;
  sendTransaction: boolean;
}

// let roleTxns: any;
let roleTxns: {
  [chainSlug in ChainSlug]?: {
    [contractName: string]: {
      to: string;
      role: string;
      slug: number;
      grantee: string;
    }[];
  };
} = {};

let otherTxns: {
  [chainSlug in ChainSlug]?: {
    to: string;
    data: string;
  }[];
} = {};

const isRoleChanged = (hasRole: boolean, newRoleStatus: boolean) => {
  return (!hasRole && newRoleStatus) || (hasRole && !newRoleStatus);
};
const addTransaction = (
  chainSlug: ChainSlug,
  contractName: string,
  contractAddress: string,
  hasRole: boolean,
  role: string,
  slug: number,
  userAddress: string,
  newRoleStatus: boolean
) => {
  if (isRoleChanged(hasRole, newRoleStatus)) {
    if (!roleTxns[chainSlug]) roleTxns[chainSlug] = {};
    if (!roleTxns[chainSlug]![contractName])
      roleTxns[chainSlug]![contractName] = [];
    roleTxns[chainSlug]![contractName]?.push({
      to: contractAddress,
      role,
      slug,
      grantee: userAddress,
    });
  }
};

const getRoleTxnData = (
  roles: string[],
  slugs: number[],
  userAddresses: string[],
  type: "GRANT" | "REVOKE"
) => {
  let accessControlInterface = new ethers.utils.Interface(
    AccessControlExtendedABI
  );
  if (type === "GRANT") {
    return accessControlInterface.encodeFunctionData(
      "grantBatchRole(bytes32[],uint32[],address[])",
      [roles, slugs, userAddresses]
    );
  } else if (type === "REVOKE") {
    return accessControlInterface.encodeFunctionData(
      "revokeBatchRole(bytes32[],uint32[],address[])",
      [roles, slugs, userAddresses]
    );
  } else {
    throw Error("Invalid grant type");
  }
};

const executeRoleTransactions = async (
  chainSlug: ChainSlug,
  newRoleStatus: boolean,
  wallet: Wallet
) => {
  if (!roleTxns[chainSlug]) return;
  let contracts = Object.keys(roleTxns[chainSlug]!);
  for (let i = 0; i < contracts.length; i++) {
    let contractSpecificTxns:
      | { to: string; role: string; slug: number; grantee: string }[]
      | undefined = roleTxns[chainSlug]![contracts[i] as CORE_CONTRACTS];
    if (!contractSpecificTxns?.length) continue;

    let roles: string[] = [],
      slugs: number[] = [],
      addresses: string[] = [];

    let contractAddress: string | undefined;

    contractSpecificTxns!.forEach((roleTx) => {
      contractAddress = roleTx.to;
      if (newRoleStatus) {
        roles.push(roleTx.role);
        slugs.push(roleTx.slug);
        addresses.push(roleTx.grantee);
      } else {
        roles.push(roleTx.role);
        slugs.push(roleTx.slug);
        addresses.push(roleTx.grantee);
      }
    });

    if (!roles.length) continue;
    console.log(chainSlug, contracts[0], roles.length);
    let data: string;
    if (newRoleStatus) {
      data = getRoleTxnData(roles, slugs, addresses, "GRANT");
    } else {
      data = getRoleTxnData(roles, slugs, addresses, "REVOKE");
    }
    let tx = await wallet.sendTransaction({
      to: contractAddress,
      data,
      ...overrides(chainSlug),
    });
    console.log(
      `chain: ${chainSlug}`,
      " contract:",
      contractAddress,
      { newRoleStatus },
      "hash: ",
      tx.hash
    );
    await tx.wait();
  }
};

const executeOtherTransactions = async (
  chainSlug: ChainSlug,
  wallet: Wallet
) => {
  if (!otherTxns[chainSlug as any as keyof typeof otherTxns]) return;

  let txnDatas = otherTxns[chainSlug as any as keyof typeof otherTxns]!;
  for (let i = 0; i < txnDatas.length; i++) {
    let { to, data } = txnDatas[i];
    let tx = await wallet.sendTransaction({
      to,
      data,
      ...overrides(chainSlug),
    });
    console.log(`to: ${to}, txHash: ${tx?.hash}`);
    await tx.wait();
    console.log(`txHash: ${tx?.hash} COMPLETE`);
  }
};

const executeTransactions = async (
  activeChainSlugs: ChainSlug[],
  newRoleStatus: boolean
) => {
  await Promise.all(
    activeChainSlugs.map(async (chainSlug) => {
      let provider = getProviderFromChainSlug(chainSlug as any as ChainSlug);
      let wallet = new Wallet(process.env.SOCKET_SIGNER_KEY!, provider);
      await executeRoleTransactions(chainSlug, newRoleStatus, wallet);
      await executeOtherTransactions(chainSlug, wallet);
    })
  );
};

const getSiblingSlugs = (chainSlug: ChainSlug): ChainSlug[] => {
  if (isTestnet(chainSlug)) return TestnetIds.filter((c) => c !== chainSlug);
  if (isMainnet(chainSlug)) return MainnetIds.filter((c) => c !== chainSlug);
  return [];
};

const checkNativeSwitchboardRoles = async ({
  chainSlug,
  provider,
  siblingSlugs,
  addresses,
  filterRoles,
  userAddress,
  newRoleStatus,
  filterChains,
}: {
  chainSlug: ChainSlug;
  siblingSlugs: ChainSlug[];
  provider: any;
  addresses: ChainSocketAddresses | undefined;
  filterRoles: ROLES[];
  userAddress: string;
  newRoleStatus: boolean;
  filterChains: ChainSlug[];
}) => {
  let contractName = CORE_CONTRACTS.NativeSwitchboard;
  await Promise.all(
    siblingSlugs.map(async (siblingSlug) => {
      if (filterChains.length > 0 && !filterChains.includes(siblingSlug))
        return;

      let pseudoContractName = contractName + "_" + String(siblingSlug);
      let contractAddress =
        addresses?.["integrations"]?.[siblingSlug]?.[IntegrationTypes.native]
          ?.switchboard;

      if (!contractAddress) {
        // console.log(
        //   chainSlug,
        //   siblingSlug,
        //   " address not present: ",
        //   contractName
        // );
        return;
      }
      let instance = (
        await getInstance("OptimismSwitchboard", contractAddress)
      ).connect(provider);
      let requiredRoles =
        REQUIRED_ROLES[contractName as keyof typeof REQUIRED_ROLES];

      roleStatus[chainSlug][pseudoContractName] = {};
      await Promise.all(
        requiredRoles.map(async (role) => {
          if (filterRoles.length > 0 && !filterRoles.includes(role)) return;
          let hasRole = await instance.callStatic["hasRole(bytes32,address)"](
            getRoleHash(role),
            userAddress,
            { ...overrides(chainSlug) }
          );

          if (!roleStatus[chainSlug][pseudoContractName]["global"])
            roleStatus[chainSlug][pseudoContractName]["global"] = [];
          if (isRoleChanged(hasRole, newRoleStatus))
            roleStatus[chainSlug][pseudoContractName]["global"].push({
              hasRole,
              role,
              userAddress,
            });
          addTransaction(
            chainSlug,
            pseudoContractName,
            contractAddress!,
            hasRole,
            getRoleHash(role),
            0,
            userAddress,
            newRoleStatus
          );
        })
      );
    })
  );
};

export const checkAndUpdateRoles = async (
  params: checkAndUpdateRolesObj,
  allAddresses: DeploymentAddresses
): Promise<{ params: checkAndUpdateRolesObj; roleStatus: any }> => {
  try {
    let {
      sendTransaction,
      filterChains,
      filterSiblingChains,
      contractName,
      userSpecificRoles,
      newRoleStatus,
    } = params;

    (roleTxns = {}), (otherTxns = {}), (roleStatus = {});
    console.log("================= checking for : ", params);
    let activeChainSlugs =
      filterChains.length > 0 ? filterChains : [...MainnetIds, ...TestnetIds];
    // parallelize chains
    await Promise.all(
      activeChainSlugs.map(async (chainSlug) => {
        if (filterChains.length > 0 && !filterChains.includes(chainSlug))
          return;
        roleStatus[chainSlug] = {};
        // roleStatus[chainSlug]["integrations"] = {};
        const addresses = allAddresses[chainSlug];
        if (!addresses) return;

        const siblingSlugs = getSiblingSlugs(chainSlug);
        const provider = getProviderFromChainSlug(
          chainSlug as any as ChainSlug
        );

        let contractNames = Object.keys(REQUIRED_ROLES);
        await Promise.all(
          userSpecificRoles.map(async (roleObj) => {
            let { userAddress, filterRoles } = roleObj;
            if (!contractNames.includes(contractName as CORE_CONTRACTS)) return;

            let contractAddress: string | undefined;
            // In case of native switchboard, check for address under integrations->NATIVE_BRIDGE
            if (contractName === CORE_CONTRACTS.NativeSwitchboard) {
              await checkNativeSwitchboardRoles({
                chainSlug,
                provider,
                siblingSlugs,
                addresses,
                userAddress,
                newRoleStatus,
                filterRoles,
                filterChains,
              });
              return;
            }

            //@ts-ignore
            contractAddress =
              addresses?.[contractName as keyof ChainSocketAddresses];

            if (!contractAddress) {
              console.log(chainSlug, " address not present: ", contractName);
              return;
            }
            let instance = (
              await getInstance(contractName, contractAddress)
            ).connect(provider);

            let requiredRoles =
              REQUIRED_ROLES[contractName as keyof typeof REQUIRED_ROLES];

            roleStatus[chainSlug][contractName!] = {};
            await Promise.all(
              requiredRoles.map(async (role) => {
                if (filterRoles.length > 0 && !filterRoles.includes(role))
                  return;
                let hasRole = await instance.callStatic[
                  "hasRole(bytes32,address)"
                ](getRoleHash(role), userAddress, { ...overrides(chainSlug) });
                if (isRoleChanged(hasRole, newRoleStatus)) {
                  if (!roleStatus[chainSlug][contractName!]["global"]) {
                    roleStatus[chainSlug][contractName!]["global"] = [];
                  }
                  roleStatus[chainSlug][contractName]["global"].push({
                    hasRole,
                    role,
                    userAddress,
                  });
                }

                // console.log(chainSlug, contractName, role, hasRole);
                addTransaction(
                  chainSlug,
                  contractName as CORE_CONTRACTS,
                  contractAddress!,
                  hasRole,
                  getRoleHash(role),
                  0, // keep slug as 0 for non-chain specific roles
                  userAddress,
                  newRoleStatus
                );
              })
            );

            let requiredChainRoles =
              REQUIRED_CHAIN_ROLES[
                contractName as keyof typeof REQUIRED_CHAIN_ROLES
              ];

            if (!requiredChainRoles?.length) return;
            if (
              contractName == CORE_CONTRACTS.TransmitManager &&
              filterRoles.includes(ROLES.TRANSMITTER_ROLE)
            ) {
              siblingSlugs.push(chainSlug);
            }
            await Promise.all(
              siblingSlugs.map(async (siblingSlug) => {
                if (
                  filterSiblingChains.length > 0 &&
                  !filterSiblingChains.includes(siblingSlug)
                )
                  return;

                await Promise.all(
                  requiredChainRoles.map(async (role) => {
                    if (filterRoles.length > 0 && !filterRoles.includes(role))
                      return;
                    let hasRole = await instance.callStatic[
                      "hasRole(bytes32,address)"
                    ](
                      getChainRoleHash(role, Number(siblingSlug)),
                      userAddress,
                      { ...overrides(chainSlug) }
                    );

                    if (isRoleChanged(hasRole, newRoleStatus)) {
                      if (
                        !roleStatus[chainSlug][contractName][siblingSlug]
                          ?.length
                      )
                        roleStatus[chainSlug][contractName][siblingSlug] = [];

                      roleStatus[chainSlug][contractName][siblingSlug].push({
                        role,
                        hasRole,
                        userAddress,
                      });
                    }

                    // console.log(chainSlug, contractName, role, hasRole);

                    // If Watcher role in FastSwitchboard, have to call another function
                    // to set the role
                    if (
                      (contractName === CORE_CONTRACTS.FastSwitchboard ||
                        contractName === CORE_CONTRACTS.FastSwitchboard2) &&
                      role === ROLES.WATCHER_ROLE &&
                      isRoleChanged(hasRole, newRoleStatus)
                    ) {
                      let data;
                      if (newRoleStatus) {
                        data = instance.interface.encodeFunctionData(
                          "grantWatcherRole",
                          [siblingSlug, userAddress]
                        );
                      } else {
                        data = instance.interface.encodeFunctionData(
                          "revokeWatcherRole",
                          [siblingSlug, userAddress]
                        );
                      }

                      if (!otherTxns[chainSlug]) otherTxns[chainSlug] = [];
                      otherTxns[chainSlug]?.push({
                        to: instance.address,
                        data,
                      });
                    } else {
                      addTransaction(
                        chainSlug,
                        contractName as CORE_CONTRACTS,
                        contractAddress!,
                        hasRole,
                        getRoleHash(role),
                        Number(siblingSlug),
                        userAddress,
                        newRoleStatus
                      );
                    }
                  })
                );
              })
            );
          })
        );
      })
    );

    console.log(JSON.stringify(roleStatus));
    console
      .log
      // "send transaction: ",
      // sendTransaction,
      // "roleTxns : ",
      // roleTxns,
      // JSON.stringify(roleTxns)
      // "other txns: ",
      // otherTxns,
      // JSON.stringify(otherTxns)
      ();

    if (sendTransaction)
      await executeTransactions(activeChainSlugs, newRoleStatus);

    return { params, roleStatus };
  } catch (error) {
    console.log("Error while checking roles", error);
    throw error;
  }
};
