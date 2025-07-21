"use client";
import { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { FrameProvider } from "./farcaster-provider";
import FrameWalletProvider from "./frame-wallet-provider";
import { monadTestnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface ProvidersProps {
    children: ReactNode;
}

const queryClient = new QueryClient();

export function Providers({ children }: ProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <PrivyProvider
                appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
                config={{
                    supportedChains: [monadTestnet],
                    defaultChain: monadTestnet,
                    appearance: {
                        theme: "dark",
                        walletList: [
                            "backpack",
                            "metamask",
                            "rainbow",
                            "wallet_connect"
                        ],
                        logo: "/images/logo.png",
                    }
                }}
            >
                <FrameWalletProvider>
                    <FrameProvider>{children}</FrameProvider>
                </FrameWalletProvider>
            </PrivyProvider>
        </QueryClientProvider>
    );
} 