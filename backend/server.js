require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const User = require("./models/User");
const chain = require("./chain");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const UPLOADS = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS));

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error(e.message);
    res.status(e.status || 500).json({ message: e.message || "Server error" });
  });

// ---------- auth middleware ----------
const auth = (...roles) => async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { id } = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(id);
    if (!user || !user.active) return res.status(401).json({ message: "Account inactive or not found" });
    if (roles.length && !roles.includes(user.role)) return res.status(403).json({ message: "Not allowed for your role" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Please sign in again" });
  }
};

const publicUser = (u, withEmail = false) => ({
  _id: u._id, name: u.name, role: u.role, location: u.location, wallet: u.wallet, active: u.active,
  ...(withEmail ? { email: u.email, createdAt: u.createdAt } : {}),
});

// ---------- config & auth ----------
app.get("/api/config", wrap(async (req, res) => {
  const { address, chainId, abi } = chain.readConfig();
  res.json({ address, chainId, abi, rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545" });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const { email, password, role } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password || ""), user.password)))
    return res.status(401).json({ message: "Wrong email or password" });
  if (role && user.role !== role) return res.status(403).json({ message: `This account is not a ${role.toLowerCase()} account` });
  if (!user.active) return res.status(403).json({ message: "Your account has been deactivated by the admin" });
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, user: publicUser(user, true) });
}));

app.get("/api/auth/me", auth(), wrap(async (req, res) => res.json({ user: publicUser(req.user, true) })));

// ---------- users (participants) ----------
app.get("/api/users", auth(), wrap(async (req, res) => {
  const q = {};
  if (req.query.role) q.role = req.query.role;
  if (req.user.role !== "ADMIN") q.active = true;
  const users = await User.find(q).sort({ createdAt: -1 });
  res.json(users.map((u) => publicUser(u, req.user.role === "ADMIN")));
}));

app.post("/api/users", auth("ADMIN"), wrap(async (req, res) => {
  const { name, email, password, role, location, wallet } = req.body;
  if (!name || !email || !password || !role || !wallet) return res.status(400).json({ message: "All fields are required" });
  if (role === "ADMIN" || !User.ROLES.includes(role)) return res.status(400).json({ message: "Invalid role" });
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return res.status(400).json({ message: "Wallet must be a valid 0x address" });
  if (await User.findOne({ wallet: wallet.toLowerCase() })) return res.status(409).json({ message: "Wallet already used by another user" });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: "Email already registered" });
  const user = await User.create({ name, email, role, location, wallet, password: await bcrypt.hash(password, 10) });
  res.status(201).json(publicUser(user, true));
}));

app.patch("/api/users/:id/active", auth("ADMIN"), wrap(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { active: !!req.body.active }, { new: true });
  res.json(publicUser(user, true));
}));

app.delete("/api/users/:id", auth("ADMIN"), wrap(async (req, res) => {
  await User.deleteOne({ _id: req.params.id, role: { $ne: "ADMIN" } });
  res.json({ ok: true });
}));

// ---------- IPFS upload (Pinata) with local fallback ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post("/api/upload", auth(), upload.single("file"), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file received" });
  if (process.env.PINATA_JWT) {
    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` }, body: form,
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ message: data?.error?.details || data?.error || "Pinata upload failed" });
    return res.json({ cid: data.IpfsHash, url: chain.gateway(data.IpfsHash) });
  }
  const name = crypto.randomBytes(12).toString("hex") + path.extname(req.file.originalname).toLowerCase();
  fs.writeFileSync(path.join(UPLOADS, name), req.file.buffer);
  res.json({ cid: `local-${name}`, url: `/uploads/${name}`, note: "Stored locally (PINATA_JWT not set)" });
}));

// ---------- blockchain reads ----------
app.get("/api/products", auth(), wrap(async (req, res) => res.json(await chain.listProducts())));
app.get("/api/products/:id", auth(), wrap(async (req, res) => res.json(await chain.getProduct(Number(req.params.id)))));

// PUBLIC (QR scan): image + stage only
app.get("/api/public/product/:id", wrap(async (req, res) => res.json(await chain.publicView(Number(req.params.id)))));

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---------- serve built frontend in production ----------
const dist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

// ---------- seed ----------
async function seed() {
  const hash = (p) => bcrypt.hash(p, 10);
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@foodchain.com").toLowerCase();
  let cfg = { demo: [] };
  try { cfg = chain.readConfig(); } catch {}
  // default = Hardhat account #0 (the deployer / contract admin)
  const adminWallet = (process.env.ADMIN_WALLET || cfg.admin || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266").toLowerCase();
  if (adminWallet && !(await User.findOne({ email: adminEmail }))) {
    await User.create({
      name: "System Administrator", email: adminEmail, role: "ADMIN", location: "System",
      wallet: adminWallet, password: await hash(process.env.ADMIN_PASSWORD || "Admin@123"),
    });
    console.log("Seeded admin:", adminEmail);
  }
  for (const d of cfg.demo || []) {
    const email = `${d.role.toLowerCase()}@foodchain.com`;
    if (!(await User.findOne({ email }))) {
      await User.create({ name: d.name, email, role: d.role, location: d.location, wallet: d.wallet, password: await hash("Demo@123") });
      console.log("Seeded demo user:", email);
    }
  }
}

const PORT = process.env.PORT || 5000;

// Connect to MongoDB. If none is running, fall back to an embedded MongoDB (stored in backend/data)
async function connectDb() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/foodsafety";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log("MongoDB connected:", uri);
  } catch (e) {
    console.warn("MongoDB not reachable at", uri, "- starting embedded MongoDB (first run downloads ~100MB)...");
    let MongoMemoryServer;
    try { ({ MongoMemoryServer } = require("mongodb-memory-server")); }
    catch { throw new Error("MongoDB is not running and mongodb-memory-server is not installed. Start MongoDB or run: npm install --prefix backend"); }
    const dbPath = path.join(__dirname, "data", "db");
    fs.mkdirSync(dbPath, { recursive: true });
    const mem = await MongoMemoryServer.create({ instance: { dbPath, port: 27018, storageEngine: "wiredTiger", launchTimeout: 120000, launchTimeout: 120000 } });
    await mongoose.connect(mem.getUri("foodsafety"));
    console.log("Embedded MongoDB running (data saved in backend/data/db)");
  }
}

(async () => {
  try {
    await connectDb();
    await seed();
    app.listen(PORT, "0.0.0.0", () => console.log(`API running on http://localhost:${PORT}`));
  } catch (e) {
    console.error("Startup failed:", e.message);
    process.exit(1);
  }
})();
