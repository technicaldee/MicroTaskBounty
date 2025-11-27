# MiniPay Mobile App

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the app**:
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

Create a `.env` file in the `mobile-app/` directory:

```env
WEB3_STORAGE_TOKEN=your_web3_storage_token_here
```

### Contract Addresses

After deploying contracts, update the addresses in `src/services/blockchain.ts`:

```typescript
blockchainService.setAddresses({
  taskManager: "0x...",
  bountyPool: "0x...",
  reputationContract: "0x...",
  verificationContract: "0x...",
});
```

## Running the App

- **iOS Simulator**: Press `i` in the Expo CLI
- **Android Emulator**: Press `a` in the Expo CLI
- **Physical Device**: Scan the QR code with Expo Go app

## Notes

- The app uses Expo SDK 54
- Asset files (icon, splash) are optional and can be added later
- Wallet connection currently requires private key (integrate Valora/WalletConnect for production)




