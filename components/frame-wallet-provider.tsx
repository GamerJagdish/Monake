import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { injected } from "wagmi/connectors";
import { createConfig, http } from "wagmi";
import { WagmiProvider } from '@privy-io/wagmi';
import { monadTestnet } from "wagmi/chains";

export const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  connectors: [
    farcasterFrame(),
    injected(), // Add injected connector for browser wallets
  ],
});

export default function FrameWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      {children}
    </WagmiProvider>
  );
}
