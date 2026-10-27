# FoodChain: Decentralized Food Safety Assurance via Blockchain with Smart Contracts

MERN + Solidity project (VTU 7th sem major project).

| Layer | Tech |
|---|---|
| Smart contract | Solidity (`contracts/FoodSafetySupplyChain.sol`), Hardhat, local node |
| Backend | Node.js, Express, MongoDB (users), JWT, ethers v6 (read-only RPC), Pinata IPFS upload |
| Frontend | React + Vite, framer-motion, MetaMask signing (ethers v6), qrcode.react |

**Login:** email + password (JWT) per role, then MetaMask signs every blockchain write.
**QR scan:** opens `/p/:id`, a public page showing **only the product photo and its current stage**.

## Prerequisites
Node 18+ (20 recommended), MongoDB running locally (or an Atlas URI), MetaMask browser extension.

## Quick start (one command)

```bash
npm run install:all
npm run dev        # starts blockchain, deploys contract, starts API and frontend
```
Then open http://localhost:5173. MongoDB is optional: if none is running, an embedded MongoDB starts automatically
(data saved in `backend/data`). The first run downloads its binary (~100 MB), so keep internet on.

## Run step by step (alternative)

```bash
# 0. install everything
npm run install:all

# 1. start the local blockchain (leave running). Chain ID 31337
npm run chain

# 2. deploy the contract + register 5 demo participants (new terminal)
npm run deploy          # writes backend/contract.json

# 3. backend config + start
cp backend/.env.example backend/.env      # add PINATA_JWT for real IPFS (optional)
npm run backend         # seeds admin + demo users

# 4. frontend (new terminal)
npm run frontend        # http://localhost:5173
```

If you restart `npm run chain` you must run `npm run deploy` again and restart the backend (the chain is wiped).

### MetaMask setup
1. Click **Connect MetaMask** in the app. It adds the *FoodChain Local* network (RPC `http://127.0.0.1:8545`, chain ID 31337) automatically.
2. Import the Hardhat test accounts using the private keys printed by `npm run chain`:
   - Account #0 = **Admin**, #1 = Farmer, #2 = Processor, #3 = Distributor, #4 = Retailer, #5 = Customer
3. In MetaMask, select the account matching the role you signed in as. The app warns you if they do not match.

### Demo logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@foodchain.com | Admin@123 |
| Farmer / Processor / Distributor / Retailer / Customer | `<role>@foodchain.com` | Demo@123 |

### Demo flow (for viva)
1. **Farmer**: Register product (photo, batch, quality score) → QR code appears.
2. **Processor**: Mark as processed → add safety certificate → hand over to distributor.
3. **Distributor**: add log entry (e.g. "Cold chain 4°C") → deliver to retailer.
4. **Retailer**: sell to customer. (Any involved party or admin can recall.)
5. **Customer**: sees the full history; **anyone** scanning the QR sees only photo + stage.
6. **Admin**: add participants (creates login + registers wallet on-chain), activate/deactivate.

## Scanning the QR with a phone
The QR contains `<site origin>/p/<id>`, so the phone must reach your PC:
1. Phone and PC on the same Wi-Fi.
2. Open the app on the PC through your LAN IP (e.g. `http://192.168.1.10:5173`), not `localhost` (or set `VITE_PUBLIC_URL` in `frontend/.env`).
3. Allow ports 5173 and 5000 in the firewall. Vite proxies `/api` to the backend, so nothing else is needed.
The public page does not need MetaMask, because the backend reads the chain.

## Ganache instead of Hardhat node
Start Ganache on port 7545, then:
```bash
export GANACHE_KEYS=0xkey0,0xkey1,0xkey2,0xkey3,0xkey4,0xkey5   # Ganache private keys
npm run deploy:ganache
```
Set `RPC_URL=http://127.0.0.1:7545` and `ADMIN_WALLET=<account 0>` in `backend/.env`. Add a Ganache network in MetaMask (the app uses the chain ID saved in `contract.json`).

## Production build / deployment
```bash
npm run build           # builds frontend/dist
npm start               # backend serves API + built frontend on :5000
```
Host the Node app on Render/Railway, use MongoDB Atlas for `MONGO_URI`, and point `RPC_URL` at your chain (for a public demo, deploy the contract to Sepolia with a Sepolia network in `hardhat.config.js`, then set `RPC_URL`/`ADMIN_WALLET` accordingly). Set a strong `JWT_SECRET`.

## Troubleshooting
- **"Request failed with status code 500" on login:** the backend is not running (Vite returns 500 when it cannot reach it). Run `npm run dev`, or `npm run backend`, and read that terminal for the real error.
- **Compiler 0.8.34 not found:** change the version in `hardhat.config.js` and the `pragma` to `0.8.28`.
- **"Contract not deployed yet":** run `npm run deploy`, then restart the backend.
- **"Wrong role" / "Not registered" in MetaMask:** wrong account selected.
- **Images not loading from IPFS:** the public gateway can be slow. Retry, or leave `PINATA_JWT` empty for local storage.

## Contract notes
The contract is your original logic (compacted formatting only). `viaIR` is enabled to avoid "stack too deep" in `registerProduct`.
