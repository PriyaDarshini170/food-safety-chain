// Read-only access to the smart contract through the JSON-RPC node.
// Writes are always signed by the user's own MetaMask wallet in the browser.
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "contract.json");
const STATUS = ["CREATED", "PROCESSED", "IN_DISTRIBUTION", "AT_RETAILER", "SOLD", "RECALLED"];
const STAGE = ["FARMING", "PROCESSING", "DISTRIBUTION", "RETAIL", "SALE", "RECALL"];
const ROLE = ["NONE", "ADMIN", "FARMER", "PROCESSOR", "DISTRIBUTOR", "RETAILER", "CUSTOMER"];
const ZERO = ethers.ZeroAddress;

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
let cache = { address: null, contract: null };

const readConfig = () => JSON.parse(fs.readFileSync(FILE, "utf8"));

function contract() {
  const cfg = readConfig();
  if (!cfg.address || !cfg.abi.length) {
    const e = new Error("Smart contract not deployed yet. Run: npm run deploy");
    e.status = 503;
    throw e;
  }
  if (cache.address !== cfg.address) cache = { address: cfg.address, contract: new ethers.Contract(cfg.address, cfg.abi, provider) };
  return cache.contract;
}

const gateway = (cid) => {
  if (!cid) return "";
  if (cid.startsWith("local-")) return `/uploads/${cid.slice(6)}`;
  return `${(process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud").replace(/\/$/, "")}/ipfs/${cid}`;
};

async function nameOf(c, addr, memo) {
  if (!addr || addr === ZERO) return null;
  if (!memo[addr]) {
    const p = await c.getParticipant(addr);
    memo[addr] = { address: addr, name: p.name, location: p.location, role: ROLE[Number(p.role)] };
  }
  return memo[addr];
}

async function summary(c, id) {
  const [b, p, cert] = await Promise.all([c.getProductBasic(id), c.getProductParticipants(id), c.getProductCertificates(id)]);
  return {
    id,
    batchId: b.batchId,
    productName: b.productName,
    status: STATUS[Number(b.status)],
    statusIndex: Number(b.status),
    qualityScore: Number(b.qualityScore),
    origin: b.origin,
    expiryDate: b.expiryDate,
    imageUrl: gateway(cert.imageCID),
    farmer: p.farmer.toLowerCase(),
    processor: p.processor.toLowerCase(),
    distributor: p.distributor.toLowerCase(),
    retailer: p.retailer.toLowerCase(),
    customer: p.customer.toLowerCase(),
  };
}

async function listProducts() {
  const c = contract();
  const n = Number(await c.productCount());
  const ids = Array.from({ length: n }, (_, i) => n - i); // newest first
  return Promise.all(ids.map((id) => summary(c, id)));
}

async function getProduct(id) {
  const c = contract();
  const n = Number(await c.productCount());
  if (!(id >= 1 && id <= n)) {
    const e = new Error("Product not found");
    e.status = 404;
    throw e;
  }
  const memo = {};
  const [base, certs, times, count, p] = await Promise.all([
    summary(c, id),
    c.getProductCertificates(id),
    c.getProductTimes(id),
    c.getHistoryCount(id),
    c.getProductParticipants(id),
  ]);
  const full = await c.products(id);
  const rawHistory = await Promise.all(Array.from({ length: Number(count) }, (_, i) => c.getHistoryRecord(id, i)));
  const history = await Promise.all(
    rawHistory.map(async (h) => ({
      stage: STAGE[Number(h.stage)],
      participant: await nameOf(c, h.participant, memo),
      location: h.location,
      remarks: h.remarks,
      ipfsCID: h.ipfsCID,
      timestamp: Number(h.timestamp),
    }))
  );
  const t = (v) => (Number(v) ? Number(v) : null);
  return {
    ...base,
    harvestDate: full.harvestDate,
    participants: {
      farmer: await nameOf(c, p.farmer, memo),
      processor: await nameOf(c, p.processor, memo),
      distributor: await nameOf(c, p.distributor, memo),
      retailer: await nameOf(c, p.retailer, memo),
      customer: await nameOf(c, p.customer, memo),
    },
    certificates: {
      quality: gateway(certs.qualityCID),
      safety: gateway(certs.safetyCID),
      document: gateway(certs.documentCID),
    },
    times: {
      created: t(times.createdAt), processed: t(times.processedAt), distributed: t(times.distributedAt),
      retailer: t(times.retailerAt), sold: t(times.soldAt), recalled: t(times.recalledAt),
    },
    history,
  };
}

// Public view for QR scans: ONLY the image and the current stage.
async function publicView(id) {
  const c = contract();
  const n = Number(await c.productCount());
  if (!(id >= 1 && id <= n)) {
    const e = new Error("Product not found");
    e.status = 404;
    throw e;
  }
  const [b, cert] = await Promise.all([c.getProductBasic(id), c.getProductCertificates(id)]);
  return { imageUrl: gateway(cert.imageCID), status: STATUS[Number(b.status)], statusIndex: Number(b.status) };
}

module.exports = { readConfig, listProducts, getProduct, publicView, gateway, provider };
