require("@nomicfoundation/hardhat-ethers");

// Ganache: export GANACHE_KEYS=0xkey1,0xkey2,... (at least 6 keys, first one is the Admin)
const ganacheKeys = process.env.GANACHE_KEYS ? process.env.GANACHE_KEYS.split(",") : [];

module.exports = {
  solidity: {
    // If your Hardhat cannot download 0.8.34, change this AND the pragma in the contract to 0.8.28
    version: "0.8.34",
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true },
  },
  networks: {
    hardhat: { chainId: 31337, allowUnlimitedContractSize: true },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    ganache: { url: "http://127.0.0.1:7545", accounts: ganacheKeys },
  },
};
