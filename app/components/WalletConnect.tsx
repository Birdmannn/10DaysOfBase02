"use client";
import { useEffect, useState, useRef } from "react";
import { useConnect, useAccount, useDisconnect, useBalance } from "wagmi";
import { baseSepolia } from "viem/chains";
import styles from "./wallet-connect.module.css";

interface DetectedWallet {
  id: string;
  name: string;
  icon: string;
  isInstalled: boolean;
}

const EXPECTED_CHAIN_ID = baseSepolia.id;
const EXPECTED_CHAIN_NAME = "Base Sepolia";

export function WalletConnect() {
  const { connectors, connect, isPending } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCorrectNetwork = chain?.id === EXPECTED_CHAIN_ID;
  const isWrongNetwork = isConnected && !isCorrectNetwork;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const wallets: DetectedWallet[] = [];

    connectors.forEach((connector) => {
      let isInstalled = false;
      let icon = "🔌";

      if (connector.name === "MetaMask") {
        isInstalled = typeof window !== "undefined" && !!window.ethereum;
        icon = "🦊";
      } else if (connector.name === "Coinbase Wallet") {
        isInstalled =
          typeof window !== "undefined" &&
          !!(window.ethereum?.isCoinbaseWallet ||
            window.CoinbaseWalletProvider);
        icon = "💙";
      }

      if (isInstalled) {
        wallets.push({
          id: connector.uid,
          name: connector.name,
          icon,
          isInstalled,
        });
      }
    });

    setDetectedWallets(wallets);
  }, [isClient, connectors]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnect = (walletId: string) => {
    const connector = connectors.find((c) => c.uid === walletId);
    if (connector) {
      connect({ connector });
      setIsDropdownOpen(false);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isClient) return null;

  if (detectedWallets.length === 0) {
    return null;
  }

  if (isConnected && address) {
    return (
      <div className={styles.connectedContainer} ref={dropdownRef}>
        <button
          className={`${styles.connectedButton} ${
            isWrongNetwork ? styles.wrongNetworkBlink : ""
          }`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {truncateAddress(address)}
        </button>
        {isDropdownOpen && (
          <div className={styles.dropdown}>
            <div className={styles.networkStatus}>
              <span
                className={`${styles.networkStatusText} ${
                  isCorrectNetwork ? styles.correctNetwork : styles.wrongNetwork
                }`}
              >
                {isCorrectNetwork ? (
                  <>
                    Connected to {chain?.name || "Base Sepolia"}
                  </>
                ) : (
                  <>
                    Switch to {EXPECTED_CHAIN_NAME}
                  </>
                )}
              </span>
            </div>

            <div className={styles.balanceSection}>
              <span className={styles.balanceLabel}>Balance:</span>
              <span className={styles.balanceValue}>
                {balance
                  ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
                  : "Loading..."}
              </span>
            </div>

            <button
              className={styles.disconnectButton}
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  if (detectedWallets.length === 1) {
    return (
      <button
        className={styles.singleWalletButton}
        onClick={() => handleConnect(detectedWallets[0].id)}
        disabled={isPending}
      >
        <span className={styles.walletIcon}>{detectedWallets[0].icon}</span>
      </button>
    );
  }

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button
        className={styles.dropdownButton}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isPending}
      >
        <span className={styles.dropdownIcon}>🔗</span>
      </button>
      {isDropdownOpen && (
        <div className={styles.walletMenu}>
          {detectedWallets.map((wallet) => (
            <button
              key={wallet.id}
              className={styles.walletMenuItem}
              onClick={() => handleConnect(wallet.id)}
              disabled={isPending}
            >
              <span className={styles.menuItemIcon}>{wallet.icon}</span>
              <span className={styles.menuItemName}>{wallet.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
