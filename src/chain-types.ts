/***********************************************
 *                                             *
 * Update below values when new chain is added *
 *                                             *
 ***********************************************/

export enum HardhatChainName {
  ARBITRUM = "arbitrum",
  ARBITRUM_GOERLI = "arbitrum-goerli",
  OPTIMISM = "optimism",
  OPTIMISM_GOERLI = "optimism-goerli",
  AVALANCHE = "avalanche",
  AVALANCHE_TESTNET = "avalanche-testnet",
  BSC = "bsc",
  BSC_TESTNET = "bsc-testnet",
  MAINNET = "mainnet",
  GOERLI = "goerli",
  SEPOLIA = "sepolia",
  POLYGON_MAINNET = "polygon-mainnet",
  POLYGON_MUMBAI = "polygon-mumbai",
  AEVO_TESTNET = "aevo-testnet",
  AEVO = "aevo",
  LYRA_TESTNET = "lyra-testnet",
  LYRA = "lyra",
  XAI_TESTNET = "xai_testnet",
  SX_NETWORK_TESTNET = "sxn_testnet",
  HARDHAT = "hardhat",
}

export enum ChainId {
  ARBITRUM = 42161,
  ARBITRUM_GOERLI = 421613,
  OPTIMISM = 10,
  OPTIMISM_GOERLI = 420,
  BSC = 56,
  BSC_TESTNET = 97,
  MAINNET = 1,
  GOERLI = 5,
  SEPOLIA = 11155111,
  POLYGON_MAINNET = 137,
  POLYGON_MUMBAI = 80001,
  AEVO_TESTNET = 11155112,
  AEVO = 2999,
  HARDHAT = 31337,
  AVALANCHE = 43114,
  LYRA_TESTNET = 901,
  LYRA = 0, // update this
  XAI_TESTNET = 47279324479,
  SX_NETWORK_TESTNET = 647,
}

export enum ChainSlug {
  ARBITRUM = ChainId.ARBITRUM,
  ARBITRUM_GOERLI = ChainId.ARBITRUM_GOERLI,
  OPTIMISM = ChainId.OPTIMISM,
  OPTIMISM_GOERLI = ChainId.OPTIMISM_GOERLI,
  BSC = ChainId.BSC,
  BSC_TESTNET = ChainId.BSC_TESTNET,
  MAINNET = ChainId.MAINNET,
  GOERLI = ChainId.GOERLI,
  SEPOLIA = ChainId.SEPOLIA,
  POLYGON_MAINNET = ChainId.POLYGON_MAINNET,
  POLYGON_MUMBAI = ChainId.POLYGON_MUMBAI,
  AEVO_TESTNET = ChainId.AEVO_TESTNET,
  AEVO = ChainId.AEVO,
  HARDHAT = ChainId.HARDHAT,
  AVALANCHE = ChainId.AVALANCHE,
  LYRA_TESTNET = ChainId.LYRA_TESTNET,
  LYRA = ChainId.LYRA,
  XAI_TESTNET = 1399904803,
  SX_NETWORK_TESTNET = ChainId.SX_NETWORK_TESTNET,
}

export const hardhatChainNameToSlug = {
  [HardhatChainName.ARBITRUM]: ChainSlug.ARBITRUM,
  [HardhatChainName.ARBITRUM_GOERLI]: ChainSlug.ARBITRUM_GOERLI,
  [HardhatChainName.OPTIMISM]: ChainSlug.OPTIMISM,
  [HardhatChainName.OPTIMISM_GOERLI]: ChainSlug.OPTIMISM_GOERLI,
  [HardhatChainName.BSC]: ChainSlug.BSC,
  [HardhatChainName.BSC_TESTNET]: ChainSlug.BSC_TESTNET,
  [HardhatChainName.MAINNET]: ChainSlug.MAINNET,
  [HardhatChainName.GOERLI]: ChainSlug.GOERLI,
  [HardhatChainName.SEPOLIA]: ChainSlug.SEPOLIA,
  [HardhatChainName.POLYGON_MAINNET]: ChainSlug.POLYGON_MAINNET,
  [HardhatChainName.POLYGON_MUMBAI]: ChainSlug.POLYGON_MUMBAI,
  [HardhatChainName.AEVO_TESTNET]: ChainSlug.AEVO_TESTNET,
  [HardhatChainName.AEVO]: ChainSlug.AEVO,
  [HardhatChainName.HARDHAT]: ChainSlug.HARDHAT,
  [HardhatChainName.AVALANCHE]: ChainSlug.AVALANCHE,
  [HardhatChainName.LYRA_TESTNET]: ChainSlug.LYRA_TESTNET,
  [HardhatChainName.LYRA]: ChainSlug.LYRA,
  [HardhatChainName.XAI_TESTNET]: ChainSlug.XAI_TESTNET,
  [HardhatChainName.SX_NETWORK_TESTNET]: ChainSlug.SX_NETWORK_TESTNET,
};

export const ChainSlugToKey = {
  [ChainSlug.ARBITRUM]: HardhatChainName.ARBITRUM,
  [ChainSlug.ARBITRUM_GOERLI]: HardhatChainName.ARBITRUM_GOERLI,
  [ChainSlug.OPTIMISM]: HardhatChainName.OPTIMISM,
  [ChainSlug.OPTIMISM_GOERLI]: HardhatChainName.OPTIMISM_GOERLI,
  [ChainSlug.BSC]: HardhatChainName.BSC,
  [ChainSlug.BSC_TESTNET]: HardhatChainName.BSC_TESTNET,
  [ChainSlug.MAINNET]: HardhatChainName.MAINNET,
  [ChainSlug.GOERLI]: HardhatChainName.GOERLI,
  [ChainSlug.SEPOLIA]: HardhatChainName.SEPOLIA,
  [ChainSlug.POLYGON_MAINNET]: HardhatChainName.POLYGON_MAINNET,
  [ChainSlug.POLYGON_MUMBAI]: HardhatChainName.POLYGON_MUMBAI,
  [ChainSlug.AEVO_TESTNET]: HardhatChainName.AEVO_TESTNET,
  [ChainSlug.AEVO]: HardhatChainName.AEVO,
  [ChainSlug.HARDHAT]: HardhatChainName.HARDHAT,
  [ChainSlug.AVALANCHE]: HardhatChainName.AVALANCHE,
  [ChainSlug.LYRA_TESTNET]: HardhatChainName.LYRA_TESTNET,
  [ChainSlug.LYRA]: HardhatChainName.LYRA,
  [ChainSlug.XAI_TESTNET]: HardhatChainName.XAI_TESTNET,
  [ChainSlug.SX_NETWORK_TESTNET]: HardhatChainName.SX_NETWORK_TESTNET,
};

export const TestnetIds: ChainSlug[] = [
  ChainSlug.GOERLI,
  ChainSlug.SEPOLIA,
  ChainSlug.POLYGON_MUMBAI,
  ChainSlug.ARBITRUM_GOERLI,
  ChainSlug.OPTIMISM_GOERLI,
  ChainSlug.BSC_TESTNET,
  ChainSlug.AEVO_TESTNET,
  ChainSlug.LYRA_TESTNET,
  ChainSlug.XAI_TESTNET,
  ChainSlug.SX_NETWORK_TESTNET,
];

export const MainnetIds: ChainSlug[] = [
  ChainSlug.MAINNET,
  ChainSlug.POLYGON_MAINNET,
  ChainSlug.ARBITRUM,
  ChainSlug.OPTIMISM,
  ChainSlug.BSC,
  ChainSlug.AEVO,
  ChainSlug.LYRA,
];
