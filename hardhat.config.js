require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Do not inherit the insecure TLS override that some local environments set.
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
}

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const POLYGON_AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
let rawKey = (process.env.DEPLOYER_PRIVATE_KEY || "").trim();
if (rawKey && !rawKey.startsWith("0x")) {
  rawKey = `0x${rawKey}`;
}
const DEPLOYER_PRIVATE_KEY = rawKey;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      gas: 14000000,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    amoy: {
      url: POLYGON_AMOY_RPC_URL,
      chainId: 80002,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
