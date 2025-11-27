# MicroTaskBounty

A full-stack microtask bounty platform with Ethereum smart contracts, a web frontend, and an Expo-based mobile app. This README consolidates setup and development instructions for the whole repository (contracts, web-app, mobile-app).

---

## Table of contents

- [Prerequisites](#prerequisites)
- [Repository layout](#repository-layout)
- [Quick start (local development)](#quick-start-local-development)
- [Smart contracts (Hardhat)](#smart-contracts-hardhat)
  - [Compile](#compile)
  - [Run a local node](#run-a-local-node)
  - [Deploy to local network](#deploy-to-local-network)
  - [Deploy to testnet/mainnet](#deploy-to-testnetmainnet)
  - [Verify contracts](#verify-contracts)
- [Web app](#web-app)
- [Mobile app (Expo)](#mobile-app-expo)
- [Environment variables](#environment-variables)
- [Typechain & generated types](#typechain--generated-types)
- [Testing](#testing)
- [Common troubleshooting & tips](#common-troubleshooting--tips)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

- Git
- Node.js (recommended LTS version e.g. 18.x or later; Node >=16 is typically supported)
- npm (comes with Node) or yarn / pnpm
- npx (comes with npm)
- (Optional) expo-cli for mobile: `npm install -g expo-cli` or use `npx expo`
- (Optional) An Ethereum wallet private key for deploying to public networks
- (Optional) Etherscan API key for contract verification

---

## Repository layout

Top-level folders and files (relevant):
- `contracts/` — Smart contract source (Solidity), Hardhat project files are in root.
- `scripts/` — Deploy / utility scripts for contracts.
- `deployments.json` — JSON with deployed contract addresses (used as reference).
- `web-app/` — Web frontend.
- `mobile-app/` — Expo React Native mobile frontend.
- `hardhat.config.ts`, `package.json`, `tsconfig.json`, etc.

---

## Quick start (local development)

1. Clone the repo:
   ```bash
   git clone https://github.com/technicaldee/MicroTaskBounty.git
   cd MicroTaskBounty
   ```

2. Install root dependencies:
   ```bash
   npm install
   ```

3. Install frontend / mobile dependencies (in separate terminals or one after another):
   ```bash
   # Web
   cd web-app
   npm install
   cd ..

   # Mobile
   cd mobile-app
   npm install
   cd ..
   ```

4. Start a local Hardhat node and deploy contracts:
   ```bash
   # In terminal A: start a local node
   npx hardhat node

   # In terminal B: deploy to the running local node
   npx hardhat run scripts/deploy.ts --network localhost
   ```
   After deployment, `deployments.json` or the script output will contain contract addresses.

5. Start the web app:
   ```bash
   cd web-app
   npm start
   # (or npm run dev if the project defines it; open http://localhost:3000)
   ```

6. Start the mobile app (Expo):
   ```bash
   cd mobile-app
   npx expo start
   # Use Expo Go or an emulator (press 'i' for iOS simulator or 'a' for Android from the Expo CLI)
   ```

---

## Smart contracts (Hardhat)

This repo uses Hardhat. Typical commands:

### Compile
```bash
npx hardhat compile
```

### Run a local node
```bash
npx hardhat node
```

This starts a JSON-RPC node and prints test accounts and private keys. Use this for local development.

### Deploy to local network
With `npx hardhat node` running, deploy:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```
The `scripts/deploy.ts` script (if present) will deploy contracts and often print addresses; these can be copied into frontends.

### Deploy to testnets / mainnet
1. Create a `.env` file in the repository root (example below).
2. Run:
```bash
npx hardhat run scripts/deploy.ts --network goerli
# or
npx hardhat run scripts/deploy.ts --network sepolia
```
(Replace network name with the one configured in `hardhat.config.ts`.)

### Verify contracts on Etherscan
After deploying to a public network:
```bash
npx hardhat verify --network <network> <CONTRACT_ADDRESS> "<constructor_arg1>" "<constructor_arg2>"
```
You need an `ETHERSCAN_API_KEY` set in your env and networks configured in `hardhat.config.ts`.

---

## Web app

1. Install dependencies:
   ```bash
   cd web-app
   npm install
   ```

2. Configure contract addresses:
   - Option A (preferred): Copy the generated `deployments.json` (from `scripts/deploy.ts`) into `web-app/src/config` or point your app environment to the contract addresses.
   - Option B: Use environment variables in `.env` (prefix `REACT_APP_` for Create React App) such as:
     ```
     REACT_APP_TASK_MANAGER_ADDRESS=0x...
     REACT_APP_BOUNTY_POOL_ADDRESS=0x...
     ```
   - Restart dev server after setting env vars.

3. Start the app:
   ```bash
   npm start
   ```

Notes:
- If a specific config file is expected by the web app, place addresses there. Search `web-app/src` for references to `TASK_MANAGER` or `deployments` to find where to plug addresses.

---

## Mobile app (Expo)

1. Install dependencies:
   ```bash
   cd mobile-app
   npm install
   ```

2. Environment variables:
   - Create `mobile-app/.env`, example:
     ```
     WEB3_STORAGE_TOKEN=your_web3_storage_token_here
     ```
   - The mobile README in this repo indicates you must set `WEB3_STORAGE_TOKEN` for assets storage integration.

3. Configure contract addresses:
   After deploying contracts, update the blockchain addresses in:
   ```
   mobile-app/src/services/blockchain.ts
   ```
   Example snippet:
   ```ts
   blockchainService.setAddresses({
     taskManager: "0x...",
     bountyPool: "0x...",
     reputationContract: "0x...",
     verificationContract: "0x...",
   });
   ```

4. Start Expo:
   ```bash
   npx expo start
   ```
   - Use Expo Go on your device or run an emulator (`i` for iOS, `a` for Android in the Expo terminal).

Notes:
- For production mobile wallet integrations, consider integrating WalletConnect or Valora instead of using raw private keys.

---

## Environment variables (examples)

Create a `.env` in the repo root (do NOT commit secrets):

```
# Root .env for Hardhat & deployments
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
RPC_URL=https://eth-goerli.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
```

mobile-app/.env:
```
WEB3_STORAGE_TOKEN=your_web3_storage_token_here
```

web-app/.env (if using REACT_APP env vars):
```
REACT_APP_TASK_MANAGER_ADDRESS=0x...
REACT_APP_BOUNTY_POOL_ADDRESS=0x...
```

---

## Typechain & generated types

If TypeChain is configured, run:
```bash
npx hardhat compile
# or explicitly
npx hardhat typechain
```
This will generate TypeScript contract typings under `typechain-types/` (or the directory configured in `hardhat.config.ts`).

---

## Testing

Run smart contract tests:
```bash
npx hardhat test
```

Front-end unit tests (if any) can be run from each app directory:
```bash
# web
cd web-app
npm test

# mobile (if available)
cd mobile-app
npm test
```

---

## Common troubleshooting & tips

- "Network error / provider not found": Make sure your RPC URL is correct in `.env` and that you restarted the dev server after changing env vars.
- Typescript errors in generated types: run `npx hardhat compile` to regenerate typechain files.
- If `npx hardhat run` says script not found: confirm `scripts/deploy.ts` exists; adjust path as needed (e.g., `scripts/deploy.ts` or `scripts/deploy.js`).
- Mobile app: If dependencies fail to install with native modules, ensure you are using compatible Node and Expo SDK versions.
- If contract addresses do not reflect in frontends, ensure you copy the latest addresses from `deployments.json` (or from the deployment output) and restart the frontend.

---

## Contributing

- Fork, create a feature branch, run tests, open a PR with a clear description.
- Please include steps to reproduce any bug and attach test output if relevant.

---

## License

Specify license here (add `LICENSE` file to the repo if needed).

---

If anything in this README is unclear or you'd like me to add explicit example files (example .env, an example `deployments.json` usage in the web app, or a script to copy addresses into the frontends), tell me which piece you want and I will add the appropriate examples.
