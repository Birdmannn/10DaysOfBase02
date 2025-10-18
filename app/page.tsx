"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { useState } from "react";
import { useAccount, useBalance, useConnect } from "wagmi";

export default function Home() {

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { connectors, connect } = useConnect();
  const [error, setError] = useState<string | null>(null);

  const handleConnectWallet = async (connectorName: string) => {
    setError(null);

    // Check if extension is available
    const isExtensionAvailable = checkWalletExtension(connectorName);

    if (!isExtensionAvailable) {
      setError(`${connectorName} extension is not installed. Please install it to continue.`);
      return;
    }

    // Find and connect with the selected connector
    const connector = connectors.find(c => c.name === connectorName);
    if (connector) {
      connect({ connector });
    }
  };

  const checkWalletExtension = (walletName: string): boolean => {
    if (typeof window === "undefined") return false;

    const windowObj = window as any;

    switch (walletName) {
      case "MetaMask":
        return !!(windowObj.ethereum && windowObj.ethereum.isMetaMask);
      case "Coinbase Wallet":
        return !!(windowObj.ethereum && windowObj.ethereum.isCoinbaseWallet);
      case "WalletConnect":
        // WalletConnect doesn't require an extension, it works via QR code
        return true;
      default:
        return false;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        <div className={styles.walletSection}>
          {isConnected ? (
            <div className={styles.connectedInfo}>
              <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
              {balance && <p>Balance: {balance.value.toString()} {balance.symbol}</p>}
            </div>
          ) : (
            <div className={styles.walletButtons}>
              <button onClick={() => handleConnectWallet("MetaMask")}>
                Connect MetaMask
              </button>
              <button onClick={() => handleConnectWallet("Coinbase Wallet")}>
                Connect Coinbase Wallet
              </button>
              <button onClick={() => handleConnectWallet("WalletConnect")}>
                Connect WalletConnect
              </button>
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </header>

      <div className={styles.content}>
        <Image
          priority
          src="/sphere.svg"
          alt="Sphere"
          width={200}
          height={200}
        />
        <h1 className={styles.title}>OnchainKit</h1>

        <p>
          Get started by editing <code>app/page.tsx</code>
        </p>

        <h2 className={styles.componentsTitle}>Explore Components</h2>

        <ul className={styles.components}>
          {[
            {
              name: "Transaction",
              url: "https://docs.base.org/onchainkit/transaction/transaction",
            },
            {
              name: "Swap",
              url: "https://docs.base.org/onchainkit/swap/swap",
            },
            {
              name: "Checkout",
              url: "https://docs.base.org/onchainkit/checkout/checkout",
            },
            {
              name: "Wallet",
              url: "https://docs.base.org/onchainkit/wallet/wallet",
            },
            {
              name: "Identity",
              url: "https://docs.base.org/onchainkit/identity/identity",
            },
          ].map((component) => (
            <li key={component.name}>
              <a target="_blank" rel="noreferrer" href={component.url}>
                {component.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
