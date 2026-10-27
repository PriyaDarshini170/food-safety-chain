// Creates backend/.env from the example if it does not exist yet.
const fs = require("fs"), path = require("path");
const env = path.join(__dirname, "../backend/.env"), ex = path.join(__dirname, "../backend/.env.example");
if (!fs.existsSync(env)) { fs.copyFileSync(ex, env); console.log("Created backend/.env"); }
