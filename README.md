# Digital Escrow Smart Contract

A decentralized escrow system built on BNB Smart Chain that facilitates secure transactions between buyers and sellers.

## Features

- Secure escrow transactions
- Buyer and seller protection
- Transparent transaction status
- Upgradeable smart contracts
- Dispute resolution system
- Gas-efficient operations

## Smart Contracts

- `DigitalEscrow.sol`: Main escrow contract
- `EscrowLib.sol`: Library for validation and utilities

## Getting Started

### Prerequisites

- Node.js v16+
- npm or yarn
- MetaMask or any Web3 wallet

### Installation

 Clone the repository
```bash
git clone 

Use npx hardhat --help to see helpers

## Live Testing

You can test the smart contract on BSC Testnet:

### Contract Address
Testnet: [0x2C145071F63Cc40bf2769A01d7aac062eDfb862F](https://testnet.bscscan.com/address/0x2C145071F63Cc40bf2769A01d7aac062eDfb862F)

### How to Test
1. Connect your wallet to BSC Testnet
2. Get test BNB from [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart)
3. Visit the contract on BscScan
4. Use "Write as Proxy" to:
   - Create transaction (as buyer)
   - Deliver product (as seller)
   - Confirm receipt (as buyer)

### Test Flow
1. Buyer: Create transaction with test amount
2. Seller: Submit delivery proof
3. Buyer: Confirm receipt
4. Monitor transaction status in "Read as Proxy"
