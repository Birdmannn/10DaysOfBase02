"use client";
import { useEffect, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import styles from "./funding-contract.module.css";
import { CONTRACT_ADDRESS, FUNDING_ABI as ABI } from "./Funding";
import { useToast } from "@/app/context/ToastContext";

interface Donation {
  id: number;
  targetAmount: bigint;
  totalDonated: bigint;
  creator: string;
  timestamp: bigint;
  description: string;
  progress: number;
}

export function FundingContract() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { addToast } = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [selectedDonationId, setSelectedDonationId] = useState<number | null>(null);
  const [donateAmount, setDonateAmount] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [transactionPending, setTransactionPending] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      loadDonations();
    }
  }, [isClient]);

  const loadDonations = async () => {
    try {
      setLoading(true);
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      const totalCount = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        functionName: "totalDonations",
      });

      const count = Number(totalCount);
      console.log("Total donations count:", count);

      if (count === 0) {
        setDonations([]);
        return;
      }

      const donationsList: Donation[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const donation = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: ABI,
            functionName: "getDonation",
            args: [BigInt(i)],
          }) as {
            targetAmount: bigint;
            totalDonated: bigint;
            creator: string;
            timestamp: bigint;
            description: string;
          };

          const targetAmount = BigInt(donation.targetAmount);
          const totalDonated = BigInt(donation.totalDonated);
          const progress =
            targetAmount > BigInt(0)
              ? Number((totalDonated * BigInt(100)) / targetAmount)
              : 0;

          donationsList.push({
            id: i,
            targetAmount,
            totalDonated,
            creator: donation.creator,
            timestamp: BigInt(donation.timestamp),
            description: donation.description,
            progress: Math.min(progress, 100),
          });
        } catch (itemError) {
          console.error(`Error loading donation ${i}:`, itemError);
        }
      }

      setDonations(donationsList);
    } catch (error) {
      console.error("Error loading donations:", error);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDonation = async () => {
    if (!isConnected || !address) {
      addToast("Please connect your wallet first", "warning");
      return;
    }

    if (!createAmount || !createDescription) {
      addToast("Please fill in all fields", "warning");
      return;
    }

    if (!walletClient) {
      addToast("Wallet client not available", "error");
      return;
    }

    try {
      setTransactionPending(true);

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        functionName: "createDonation",
        args: [BigInt(createAmount), createDescription],
        account: address,
      });

      console.log("Transaction hash:", hash);
      setCreateAmount("");
      setCreateDescription("");
      setActiveTab("browse");

      setTimeout(() => loadDonations(), 2000);
      addToast("Donation campaign created successfully!", "success");
    } catch (error) {
      console.error("Error creating donation:", error);
      addToast("Failed to create donation campaign", "error");
    } finally {
      setTransactionPending(false);
    }
  };

  const updateDonationProgress = async (donationId: number) => {
    try {
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      const totalDonated = (await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        functionName: "getTotalDonated",
        args: [BigInt(donationId)],
      })) as bigint;

      setDonations((prevDonations) =>
        prevDonations.map((donation) => {
          if (donation.id === donationId) {
            const newTotalDonated = totalDonated;
            const progress =
              donation.targetAmount > BigInt(0)
                ? Number(
                    (newTotalDonated * BigInt(100)) / donation.targetAmount
                  )
                : 0;

            return {
              ...donation,
              totalDonated: newTotalDonated,
              progress: Math.min(progress, 100),
            };
          }
          return donation;
        })
      );
    } catch (error) {
      console.error("Error updating donation progress:", error);
    }
  };

  const handleDonate = async () => {
    if (!isConnected || !address) {
      addToast("Please connect your wallet first", "warning");
      return;
    }

    if (selectedDonationId === null || !donateAmount) {
      addToast("Please select a donation and enter an amount", "warning");
      return;
    }

    if (!walletClient) {
      addToast("Wallet client not available", "error");
      return;
    }

    try {
      setTransactionPending(true);

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        functionName: "donate",
        args: [BigInt(selectedDonationId), BigInt(donateAmount)],
        account: address,
      });

      console.log("Donation hash:", hash);
      setDonateAmount("");

      const donationIdToUpdate = selectedDonationId;
      setSelectedDonationId(null);
      setIsDonateModalOpen(false);

      setTimeout(() => updateDonationProgress(donationIdToUpdate), 2000);
      addToast("Donation sent successfully!", "success");
    } catch (error) {
      console.error("Error donating:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send donation";
      addToast(errorMessage, "error");
    } finally {
      setTransactionPending(false);
    }
  };

  if (!isClient) return null;

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <p className={styles.noWallet}>Please connect your wallet to use the funding platform</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "browse" ? styles.active : ""}`}
          onClick={() => setActiveTab("browse")}
        >
          Browse Campaigns
        </button>
        <button
          className={`${styles.tab} ${activeTab === "create" ? styles.active : ""}`}
          onClick={() => setActiveTab("create")}
        >
          Create Campaign
        </button>
      </div>

      {activeTab === "browse" && (
        <div className={styles.browseSection}>
          {loading ? (
            <p className={styles.loading}>Loading donations...</p>
          ) : donations.length === 0 ? (
            <p className={styles.empty}>No donation campaigns yet</p>
          ) : (
            <div className={styles.donationsList}>
              {donations.map((donation) => (
                <div key={donation.id} className={styles.donationCard}>
                  <h3 className={styles.cardTitle}>{donation.description}</h3>
                  <p className={styles.cardCreator}>
                    Creator: {donation.creator.slice(0, 6)}...{donation.creator.slice(-4)}
                  </p>
                  <div className={styles.progressContainer}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${donation.progress}%` }}
                    ></div>
                  </div>
                  <p className={styles.progressText}>
                    {Number(donation.totalDonated)} / {Number(donation.targetAmount)} donated
                    ({donation.progress}%)
                  </p>
                  <button
                    className={styles.donateButton}
                    onClick={() => {
                      setSelectedDonationId(donation.id);
                      setIsDonateModalOpen(true);
                    }}
                  >
                    Donate to This Campaign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className={styles.formSection}>
          <h2 className={styles.formTitle}>Create a New Campaign</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Target Amount</label>
            <input
              type="number"
              className={styles.input}
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
              placeholder="Enter target amount"
              disabled={transactionPending}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Describe your campaign"
              disabled={transactionPending}
            />
          </div>
          <button
            className={styles.submitButton}
            onClick={handleCreateDonation}
            disabled={transactionPending}
          >
            {transactionPending ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      )}

      {isDonateModalOpen && selectedDonationId !== null && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Donate to: {donations[selectedDonationId]?.description}
              </h2>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setIsDonateModalOpen(false);
                  setSelectedDonationId(null);
                  setDonateAmount("");
                }}
                disabled={transactionPending}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Donation Amount</label>
                <input
                  type="number"
                  className={styles.input}
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder="Enter donation amount"
                  disabled={transactionPending}
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.submitButton}
                onClick={handleDonate}
                disabled={transactionPending}
              >
                {transactionPending ? "Sending..." : "Send Donation"}
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setIsDonateModalOpen(false);
                  setSelectedDonationId(null);
                  setDonateAmount("");
                }}
                disabled={transactionPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
