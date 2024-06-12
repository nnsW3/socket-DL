import { config as dotenvConfig } from "dotenv";
import axios from "axios";

dotenvConfig();
import {
  ChainSlug,
  TestnetIds,
  MainnetIds,
  isTestnet,
  isMainnet,
  CORE_CONTRACTS,
  DeploymentMode,
} from "../../../../src";
import { getAddresses, getRelayUrl, getRelayAPIKEY } from "../../utils";
import { BigNumber, Contract, ethers } from "ethers";
import Counter from "../../../../out/Counter.sol/Counter.json";
import Socket from "../../../../out/Socket.sol/Socket.json";

import { getProviderFromChainSlug } from "../../../constants/networks";
import { formatEther } from "ethers/lib/utils";
import { chains, mode, overrides } from "../../config/config";

interface RequestObj {
  to: string;
  data: string;
  chainSlug: number;
  value?: string | BigNumber;
  gasPrice?: string | BigNumber | undefined;
  gasLimit: string | number | undefined;
}

const API_BASE_URL =
  mode == DeploymentMode.DEV
    ? "https://raf5spoep4.execute-api.us-east-1.amazonaws.com/dev/v1"
    : "https://prod.dlapi.socket.tech";
const getSiblingSlugs = (chainSlug: ChainSlug): ChainSlug[] => {
  console.log(chainSlug, isMainnet(chainSlug));
  if (isTestnet(chainSlug))
    return TestnetIds.filter(
      (siblingChainSlug) => chainSlug !== siblingChainSlug
    );
  if (isMainnet(chainSlug))
    return MainnetIds.filter(
      (siblingChainSlug) => chainSlug !== siblingChainSlug
    );
  return [];
};

const axiosPost = async (url: string, data: object, config = {}) => {
  try {
    let response = await axios.post(url, data, config);
    // console.log("txStatus : ", response.status, response.data);
    return { success: true, ...response?.data };
  } catch (error) {
    //@ts-ignore
    console.log("status : ", error?.response?.status);
    console.log(
      "error occurred, url : ",
      url,
      "data : ",
      data,
      config,
      "\n error : ",
      //@ts-ignore
      error?.message,
      //@ts-ignore
      error?.response.data
    );
    //@ts-ignore
    return { success: false, ...error?.response?.data };
  }
};

const relayTx = async (params: RequestObj, provider: any) => {
  try {
    let { to, data, chainSlug, gasPrice, value, gasLimit } = params;
    let url = await getRelayUrl(mode);
    let config = {
      headers: {
        "x-api-key": getRelayAPIKEY(mode),
      },
    };
    // console.log({url})
    let body = {
      to,
      data,
      value,
      chainId: (await provider.getNetwork()).chainId,
      gasLimit,
      gasPrice,
      sequential: false,
      source: "LoadTester",
    };
    let response = await axiosPost(url!, body, config);
    if (response?.success) return response?.data;
    else return { hash: "" };
  } catch (error) {
    console.log("uncaught error");
  }
};

export const sendMessagesToAllPaths = async (params: {
  senderChains: ChainSlug[];
  receiverChains: ChainSlug[];
  count: number;
}) => {
  const amount = 100;
  const msgGasLimit = "100000"; // update this when add fee logic for dst gas limit
  try {
    let { senderChains, receiverChains, count } = params;

    console.log("================= checking for : ", params);
    let activeChainSlugs =
      senderChains.length > 0 ? senderChains : [...MainnetIds, ...TestnetIds];

    // parallelize chains
    await Promise.all(
      activeChainSlugs.map(async (chainSlug) => {
        const siblingSlugs = getSiblingSlugs(chainSlug);
        const addresses = await getAddresses(chainSlug, mode);

        console.log({ chainSlug, siblingSlugs });

        if (!addresses) {
          console.log("addresses not found for ", chainSlug, addresses);
          return;
        }

        // console.log(" 2 ");

        const counterAddress = addresses["Counter"];
        if (!counterAddress) {
          console.log(chainSlug, "counter address not present: ", chainSlug);
          return;
        }
        // console.log(" 3 ");

        const provider = await getProviderFromChainSlug(chainSlug);
        const socket: Contract = new ethers.Contract(
          addresses[CORE_CONTRACTS.Socket],
          Socket.abi,
          provider
        );

        const counter: Contract = new ethers.Contract(
          counterAddress,
          Counter.abi
        );

        await Promise.all(
          siblingSlugs.map(async (siblingSlug) => {
            if (
              receiverChains.length > 0 &&
              !receiverChains.includes(siblingSlug)
            )
              return;

            // value = 100
            let executionParams =
              "0x0100000000000000000000000000000000000000000000000000000000000064";
            let transmissionParams =
              "0x0000000000000000000000000000000000000000000000000000000000000000";
            let data = counter.interface.encodeFunctionData(
              "remoteAddOperation",
              [
                siblingSlug,
                amount,
                msgGasLimit,
                // executionParams,
                ethers.constants.HashZero,
                ethers.constants.HashZero,
              ]
            );
            let to = counter.address;
            let value = await socket.getMinFees(
              msgGasLimit,
              100, // payload size
              executionParams,
              transmissionParams,
              siblingSlug,
              to
            );

            console.log(
              `fees for path ${chainSlug}-${siblingSlug} is ${formatEther(
                value
              )}`
            );

            const gasLimit: number | string | undefined =
              chainSlug === ChainSlug.ARBITRUM ||
              chainSlug === ChainSlug.ARBITRUM_SEPOLIA
                ? 200000
                : overrides(chainSlug)?.gasLimit
                ? overrides(chainSlug).gasLimit.toString()
                : undefined;

            let tempArray = new Array(count).fill(1);
            await Promise.all(
              tempArray.map(async (c) => {
                // console.log(c)
                console.log(to, data, value);
                let response = await relayTx(
                  {
                    to,
                    data,
                    value,
                    gasLimit,
                    gasPrice:
                      overrides(chainSlug)?.gasPrice?.toString() || undefined,
                    chainSlug,
                  },
                  provider
                );
                console.log(
                  `Track message here: ${API_BASE_URL}/messages-from-tx?srcChainSlug=${chainSlug}&srcTxHash=${response?.hash}`
                );
              })
            );
          })
        );
      })
    );
  } catch (error) {
    console.log("Error while sending outbound tx", error);
  }
};

const main = async () => {
  let senderChains = chains;
  let receiverChains = chains;
  let count = 1;
  await sendMessagesToAllPaths({ senderChains, receiverChains, count });
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });

// npx ts-node scripts/deploy/helpers/send-msg/allPathTest.ts
