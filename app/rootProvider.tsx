"use client";
import { ReactNode } from "react";
import { baseSepolia as base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi.config"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@coinbase/onchainkit/styles.css";

const queryClient = new QueryClient();

export function RootProvider({ children }: { children: ReactNode }) {

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: "auto",
            },
            wallet: {
              display: "modal",
              preference: "all",
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
