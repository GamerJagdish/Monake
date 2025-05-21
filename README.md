# Monake: Farcaster Frames with Monad Integration

Welcome to Monake! This project is a Next.js application designed to leverage the power of Farcaster frames, integrated with the Monad blockchain (specifically the Monad Testnet) and a robust notification system.

## Project Overview

Monake aims to provide a seamless experience for interacting with Farcaster frames, enabling wallet connections and actions on the Monad network. It features a notification system to keep users informed about relevant activities.

## Key Features

*   **Farcaster Frame Integration:** Utilizes `@farcaster/frame-sdk` and other Farcaster libraries to build and manage interactive frames.
*   **Monad Blockchain Support:** Connects to the Monad Testnet using Wagmi and `@farcaster/frame-wagmi-connector` for on-chain interactions, including a smart contract-based leaderboard.
*   **Wallet Connectivity:** Provides wallet connection capabilities through `frame-wallet-provider.tsx`, enabling users to interact with their Monad wallets directly within Farcaster frames.
*   **Notification System:** Implements a notification system (as seen in `lib/notification-client.ts` and `lib/notification.ts`) using Redis (`@upstash/redis`) to deliver timely updates to users.
*   **Modern Tech Stack:** Built with Next.js, React, and Tailwind CSS for a fast, responsive, and modern user experience.

## Technology Stack

*   **Frontend:** Next.js, React, Tailwind CSS
*   **Blockchain Integration:**
    *   Farcaster: `@farcaster/frame-sdk`, `@farcaster/frame-node`, `@farcaster/auth-client`, `@farcaster/frame-wagmi-connector`
    *   Monad: `wagmi/chains` (monadTestnet), `viem`
*   **Wallet Management:** Wagmi
*   **State Management:** `@tanstack/react-query`
*   **Notifications:** `@upstash/redis`, Custom notification logic
*   **Styling:** Tailwind CSS, `clsx`, `tailwind-merge`, `tailwindcss-animate`
*   **UI Components:** Shadcn/UI, Radix UI (`@radix-ui/react-label`, `@radix-ui/react-select`, etc.), Lucide Icons (`lucide-react`)
*   **Animation:** Framer Motion
*   **Linting & Formatting:** ESLint (`eslint-config-next`)
*   **Package Manager:** Yarn

## Getting Started

### Prerequisites

*   Node.js (version specified in `.nvmrc` if available, or a recent LTS version)
*   Yarn (version `1.22.22` as per `packageManager` in `package.json`)
*   Access to a Redis instance (e.g., Upstash) and configured environment variables.
*   Environment variables for Farcaster and potentially Monad RPC endpoints if not using defaults.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd monake
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add the necessary environment variables. Refer to the codebase (e.g., `lib/notification.ts`, `process.env` usage) for required variables like:
    *   `NEXT_PUBLIC_URL`: The public URL of your application.
    *   `NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME`: Your project name for the notification service (defaults to "Monake").
    *   Redis connection details (e.g., `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
    *   Any Farcaster or Neynar API keys.

    Example `.env.local`:
    ```env
    NEXT_PUBLIC_URL=http://localhost:3000
    NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=MyMonakeApp
    # Add your Redis credentials here
    UPSTASH_REDIS_REST_URL=your_redis_url
    UPSTASH_REDIS_REST_TOKEN=your_redis_token
    ```

### Running the Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

In the project directory, you can run:

*   `yarn dev`: Runs the app in development mode.
*   `yarn build`: Builds the app for production.
*   `yarn start`: Starts the production server.
*   `yarn lint`: Lints the codebase.

## Project Structure (Key Files & Directories)

*   `components/`: Contains React components, including `frame-wallet-provider.tsx` for Wagmi and Farcaster frame wallet setup.
*   `lib/`: Utility functions and core logic, such as `notification-client.ts` for sending notifications and `notification.ts` for managing user notification details with Redis.
*   `pages/`: Next.js pages and API routes.
*   `public/`: Static assets.
*   `styles/`: Global styles.
*   `package.json`: Lists project dependencies and scripts.
*   `next.config.mjs`: Next.js configuration.
*   `tailwind.config.ts`: Tailwind CSS configuration.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License - see the `LICENSE` file (if it exists) or `package.json` for details.