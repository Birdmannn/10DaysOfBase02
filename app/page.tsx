"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { useAccount } from "wagmi";
import { WalletConnect } from "./components/WalletConnect";
import { FundingContract } from "./components/FundingContract";

export default function Home() {

  const { address, isConnected, chain } = useAccount();

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        <WalletConnect />
      </header>

      <div className={styles.content}>
        <FundingContract />
      </div>
    </div>
  );
}
