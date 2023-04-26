import { config as dotenvConfig } from "dotenv";
import { ethers } from "ethers";
import { resolve } from "path";
import { ChainKey, networkToChainSlug } from "../../src";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;

export const gasPrice: {
  [chainKEY in ChainKey]?: number | "auto" | undefined;
} = {
  [ChainKey.ARBITRUM]: "auto",
  [ChainKey.ARBITRUM_GOERLI]: "auto",
  [ChainKey.OPTIMISM]: "auto",
  [ChainKey.OPTIMISM_GOERLI]: "auto",
  [ChainKey.AVALANCHE]: "auto",
  [ChainKey.BSC]: "auto",
  [ChainKey.BSC_TESTNET]: "auto",
  [ChainKey.MAINNET]: "auto",
  [ChainKey.GOERLI]: "auto",
  [ChainKey.POLYGON_MAINNET]: "auto",
  [ChainKey.POLYGON_MUMBAI]: "auto",
  [ChainKey.HARDHAT]: "auto",
};

export const chainSlugKeys: string[] = Object.values(networkToChainSlug);

export function getJsonRpcUrl(chain: ChainKey): string {
  let jsonRpcUrl: string;
  switch (chain) {
    case ChainKey.ARBITRUM:
      jsonRpcUrl = process.env.ARBITRUM_RPC as string;
      break;

    case ChainKey.ARBITRUM_GOERLI:
      jsonRpcUrl = process.env.ARB_GOERLI_RPC as string;
      break;

    case ChainKey.OPTIMISM:
      jsonRpcUrl = process.env.OPTIMISM_RPC as string;
      break;

    case ChainKey.OPTIMISM_GOERLI:
      jsonRpcUrl = process.env.OPTIMISM_GOERLI_RPC as string;
      break;

    case ChainKey.POLYGON_MAINNET:
      jsonRpcUrl = process.env.POLYGON_RPC as string;
      break;

    case ChainKey.POLYGON_MUMBAI:
      jsonRpcUrl = process.env.POLYGON_MUMBAI_RPC as string;
      break;

    case ChainKey.AVALANCHE:
      jsonRpcUrl = process.env.AVAX_RPC as string;
      break;

    case ChainKey.BSC:
      jsonRpcUrl = process.env.BSC_RPC as string;
      break;

    case ChainKey.BSC_TESTNET:
      jsonRpcUrl = process.env.BSC_TESTNET_RPC as string;
      break;

    case ChainKey.MAINNET:
      jsonRpcUrl = process.env.ETHEREUM_RPC as string;
      break;

    case ChainKey.GOERLI:
      jsonRpcUrl = process.env.GOERLI_RPC as string;
      break;

    case ChainKey.HARDHAT:
      jsonRpcUrl = "http://127.0.0.1:8545/";
      break;

    default:
      jsonRpcUrl = "https://" + chain + ".infura.io/v3/" + infuraApiKey;
  }

  return jsonRpcUrl;
}

export const getProviderFromChainName = (chainSlug: ChainKey) => {
  const jsonRpcUrl = getJsonRpcUrl(chainSlug);
  return new ethers.providers.JsonRpcProvider(jsonRpcUrl);
};
