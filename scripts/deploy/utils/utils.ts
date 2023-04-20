import { Wallet } from "ethers";
import { network, ethers, run } from "hardhat";

import { ContractFactory, Contract } from "ethers";
import { Address } from "hardhat-deploy/dist/types";
import path from "path";
import fs from "fs";
import {
  ChainSlug,
  ChainSocketAddresses,
  DeploymentAddresses,
} from "../../../src";

export const deployedAddressPath = path.join(
  __dirname,
  "/../../../deployments/addresses.json"
);

export const verificationDetailsPath = path.join(
  __dirname,
  "/../../../deployments/verification.json"
);

export const getRoleHash = (role: string) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(role)).toString();

export const getChainRoleHash = (role: string, chainSlug: number) =>
  ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256"],
      [role, chainSlug]
    )
  );

export const deployContractWithoutArgs = async (
  contractName: string,
  signer: Wallet
): Promise<Contract> => {
  try {
    const Contract: ContractFactory = await ethers.getContractFactory(
      contractName
    );
    const contractInstance: Contract = await Contract.connect(signer).deploy();
    await contractInstance.deployed();
    return contractInstance;
  } catch (error) {
    throw error;
  }
};

export async function deployContractWithArgs(
  contractName: string,
  args: Array<any>,
  signer: Wallet
) {
  try {
    const Contract: ContractFactory = await ethers.getContractFactory(
      contractName
    );

    const contract: Contract = await Contract.connect(signer).deploy(...args);
    await contract.deployed();
    return contract;
  } catch (error) {
    throw error;
  }
}

export const verify = async (
  address: string,
  contractName: string,
  path: string,
  args: any[]
) => {
  try {
    const chainSlug = await getChainSlug();
    if (chainSlug === 31337) return;

    await run("verify:verify", {
      address,
      contract: `${path}:${contractName}`,
      constructorArguments: args,
    });
  } catch (error) {
    console.log("Error during verification", error);
  }
};

export const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay * 1000));

export const getInstance = async (
  contractName: string,
  address: Address
): Promise<Contract> =>
  (await ethers.getContractFactory(contractName)).attach(address);

export const getChainSlug = async (): Promise<number> => {
  if (network.config.chainId === undefined)
    throw new Error("chain id not found");
  return Number(network.config.chainId);
};

export const integrationType = (integrationName: string) =>
  ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(["string"], [integrationName])
  );

export const storeAddresses = async (
  addresses: ChainSocketAddresses,
  chainSlug: ChainSlug
) => {
  if (!fs.existsSync(deployedAddressPath)) {
    await fs.promises.mkdir(deployedAddressPath);
  }

  const outputExists = fs.existsSync(deployedAddressPath);
  let deploymentAddresses: DeploymentAddresses = {};
  if (outputExists) {
    const deploymentAddressesString = fs.readFileSync(
      deployedAddressPath,
      "utf-8"
    );
    deploymentAddresses = JSON.parse(deploymentAddressesString);
  }

  deploymentAddresses[chainSlug] = addresses;
  fs.writeFileSync(
    deployedAddressPath,
    JSON.stringify(deploymentAddresses, null, 2)
  );
};

export const storeVerificationParams = async (
  verificationDetail: object,
  chainSlug: ChainSlug
) => {
  if (!fs.existsSync(verificationDetailsPath)) {
    await fs.promises.mkdir(verificationDetailsPath);
  }

  const outputExists = fs.existsSync(verificationDetailsPath);
  let verificationDetails: object = {};
  if (outputExists) {
    const verificationDetailsString = fs.readFileSync(
      verificationDetailsPath,
      "utf-8"
    );
    verificationDetails = JSON.parse(verificationDetailsString);
  }

  verificationDetails[chainSlug] = verificationDetail;
  fs.writeFileSync(
    verificationDetailsPath,
    JSON.stringify(verificationDetails, null, 2)
  );
};

export const getChainSlugsFromDeployedAddresses = async () => {
  if (!fs.existsSync(deployedAddressPath)) {
    await fs.promises.mkdir(deployedAddressPath);
  }

  const outputExists = fs.existsSync(deployedAddressPath);
  let deploymentAddresses: DeploymentAddresses = {};
  if (outputExists) {
    const deploymentAddressesString = fs.readFileSync(
      deployedAddressPath,
      "utf-8"
    );
    deploymentAddresses = JSON.parse(deploymentAddressesString);

    return Object.keys(deploymentAddresses);
  }
};

export const getAddresses = async (chainSlug: ChainSlug) => {
  if (!fs.existsSync(deployedAddressPath)) {
    await fs.promises.mkdir(deployedAddressPath);
  }

  const outputExists = fs.existsSync(deployedAddressPath);
  let deploymentAddresses: DeploymentAddresses = {};
  if (outputExists) {
    const deploymentAddressesString = fs.readFileSync(
      deployedAddressPath,
      "utf-8"
    );
    deploymentAddresses = JSON.parse(deploymentAddressesString);
  }

  return deploymentAddresses[chainSlug];
};

export const createObj = function (
  obj: ChainSocketAddresses,
  keys: string[],
  value: any
): ChainSocketAddresses {
  if (keys.length === 1) {
    obj[keys[0]] = value;
  } else {
    const key = keys.shift();
    if (key === undefined) return obj;
    obj[key] = createObj(
      typeof obj[key] === "undefined" ? {} : obj[key],
      keys,
      value
    );
  }
  return obj;
};
