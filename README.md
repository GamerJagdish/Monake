# 🐍 Monake (Monad Snake)

A decentralized snake game built on the Monad testnet, featuring a daily prize pool and on-chain leaderboard system.

## 🎮 Overview

Monake is a modern take on the classic Snake game, integrated with blockchain technology through the Monad testnet. Players compete for the highest score, with the daily winner taking home the entire prize pool collected that day.

## ✨ Features

- 🎯 Classic snake gameplay with modern twists
- 💰 Daily prize pool system
- 📊 On-chain leaderboard using verified smart contracts
- 🔗 Fully integrated with Monad testnet
- 🏆 Transparent and fair competition system

## 🛠️ Technical Stack

- Smart Contracts: Solidity
- Blockchain: Monad Testnet
- Frontend: Next.js
- Backend: Redis
## 🚀 Getting Started

### Prerequisites

- Node.js
- Redis server

### Installation

1. Clone the repository
```bash
git clone https://github.com/GamerJagdish/Monake.git
cd Monake
```

2. Install dependencies
```bash
yarn install
```

3. Configure environment
```bash
cp .env.example .env.local
```

4. Start the application
```bash
yarn run dev
```

## 🎯 How to Play

1. Connect your Monad testnet wallet (Farcaster only for now)
2. Enter the game lobby
3. Play the snake game and try to achieve the highest score
4. Your score will be automatically recorded on the blockchain
5. Check the leaderboard to see your ranking
6. Win the daily prize pool by being the top scorer!

## 💰 Prize Pool System

- Each day, a new prize pool is created
- Players contribute to the pool by paying daily pass worth 0.01 MON
- The highest scoring player at the end of the day wins the entire pool
- Prizes are automatically distributed through smart contracts

## 🔍 Smart Contract

The leaderboard and prize pool system is powered by verified smart contracts on the Monad testnet, ensuring:
- Transparent scoring
- Fair distribution of prizes
- Immutable leaderboard records
- Automated prize distribution

## 🤝 Contributing

We welcome contributions!
