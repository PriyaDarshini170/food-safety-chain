const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Role enum in the contract: ADMIN=1 FARMER=2 PROCESSOR=3 DISTRIBUTOR=4 RETAILER=5 CUSTOMER=6
const DEMO = [
  { role: "FARMER", id: 2, name: "Green Valley Farms", location: "Tumakuru, Karnataka" },
  { role: "PROCESSOR", id: 3, name: "FreshPack Processing Unit", location: "Bengaluru, Karnataka" },
  { role: "DISTRIBUTOR", id: 4, name: "SafeRoute Logistics", location: "Hubballi, Karnataka" },
  { role: "RETAILER", id: 5, name: "Daily Fresh Mart", location: "Mysuru, Karnataka" },
  { role: "CUSTOMER", id: 6, name: "Demo Customer", location: "Gubbi, Karnataka" },
];

async function main() {
  const signers = await hre.ethers.getSigners();
  const Factory = await hre.ethers.getContractFactory("FoodSafetySupplyChain");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("FoodSafetySupplyChain deployed to:", address);
  console.log("Admin wallet:", signers[0].address);

  const demo = [];
  for (let i = 0; i < DEMO.length; i++) {
    const d = DEMO[i];
    const wallet = signers[i + 1].address;
    await (await contract.registerParticipant(wallet, d.name, d.location, d.id)).wait();
    demo.push({ role: d.role, name: d.name, location: d.location, wallet });
    console.log("Registered " + d.role + ": " + wallet);
  }

  const artifact = await hre.artifacts.readArtifact("FoodSafetySupplyChain");
  const net = await hre.ethers.provider.getNetwork();
  const out = { address, chainId: Number(net.chainId), admin: signers[0].address, abi: artifact.abi, demo };
  fs.writeFileSync(path.join(__dirname, "../backend/contract.json"), JSON.stringify(out, null, 2));
  console.log("\nSaved backend/contract.json - restart the backend to seed demo users.");
}

main().catch((e) => { console.error(e); process.exit(1); });
