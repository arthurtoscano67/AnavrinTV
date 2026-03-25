import React, { useState } from 'react';
import { AlertTriangle, Clock, Coins, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Video } from '../types';
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { 
  WAL_TOKEN_DECIMALS, 
  WALRUS_PACKAGE_ID, 
  WALRUS_STORAGE_OBJECT_ID, 
  WAL_COIN_TYPE, 
  STORAGE_DURATION_OPTIONS,
  EPOCH_DURATION_MS
} from '../constants';
import { calculateStorageCost } from '../services/walrusService';

interface StorageExpiryBannerProps {
  video: Video;
  onRenewed?: (newExpiry: number, newEpochs: number) => void;
}

export function getDaysUntilExpiry(storageExpiry: number): number {
  const now = Date.now();
  const diff = storageExpiry - now;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function StorageExpiryBanner({ video, onRenewed }: StorageExpiryBannerProps) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isRenewing, setIsRenewing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(STORAGE_DURATION_OPTIONS[1]); // Default 1 month
  const [userWalBalance, setUserWalBalance] = useState<bigint>(0n);
  const [error, setError] = useState<string | null>(null);

  const isOwner = account?.address === video.uploaderAddress;

  React.useEffect(() => {
    const fetchBalance = async () => {
      if (!account || !showModal) return;
      try {
        const { data: coins } = await suiClient.getCoins({
          owner: account.address,
          coinType: WAL_COIN_TYPE,
        });
        const total = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
        setUserWalBalance(total);
      } catch (err) {
        console.error('Error fetching WAL balance:', err);
      }
    };
    fetchBalance();
  }, [account, suiClient, showModal]);

  const [renewalCost, setRenewalCost] = useState<number>(0);

  React.useEffect(() => {
    const updateCost = async () => {
      const size = video.size || 100 * 1024 * 1024;
      const cost = await calculateStorageCost(size, selectedOption.epochs, suiClient);
      setRenewalCost(cost);
    };
    updateCost();
  }, [video.size, selectedOption, suiClient]);

  if (!isOwner) return null;

  const daysLeft = getDaysUntilExpiry(video.storageExpiry);
  const isExpired = daysLeft <= 0;
  const isUrgent = daysLeft < 7;
  const isWarning = daysLeft < 30;

  if (!isWarning && !isExpired) return null;

  const handleRenew = async () => {
    if (!account) return;
    setIsRenewing(true);
    setError(null);

    try {
      // Fetch WAL coins to use for payment
      const { data: coins } = await suiClient.getCoins({
        owner: account.address,
        coinType: WAL_COIN_TYPE,
      });

      if (coins.length === 0) {
        throw new Error('No WAL tokens found in your wallet. You need WAL to pay for storage extension.');
      }

      const size = video.size || 100 * 1024 * 1024;
      const cost = await calculateStorageCost(size, selectedOption.epochs, suiClient);
      const amountInMist = BigInt(Math.floor(cost * Math.pow(10, WAL_TOKEN_DECIMALS)));

      const totalWalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      
      if (totalWalBalance < amountInMist) {
        const hasWal = Number(totalWalBalance) / Math.pow(10, WAL_TOKEN_DECIMALS);
        const needsWal = Number(amountInMist) / Math.pow(10, WAL_TOKEN_DECIMALS);
        throw new Error(`Insufficient WAL balance. You have ${hasWal.toFixed(4)} WAL but need ${needsWal.toFixed(4)} WAL for this extension.`);
      }

      const tx = new Transaction();
      
      // Find a coin with enough balance or merge coins
      let primaryCoinId = coins[0].coinObjectId;
      if (BigInt(coins[0].balance) < amountInMist) {
        // Merge all other coins into the first one
        const otherCoinIds = coins.slice(1).map(c => c.coinObjectId);
        if (otherCoinIds.length > 0) {
          tx.mergeCoins(tx.object(primaryCoinId), otherCoinIds.map(id => tx.object(id)));
        }
      }

      // Split WAL coins for payment
      const [walPayment] = tx.splitCoins(tx.object(primaryCoinId), [tx.pure.u64(amountInMist)]);
      
      const storageObj = tx.moveCall({
        target: `${WALRUS_PACKAGE_ID}::system::extend_blob_storage`,
        arguments: [
          tx.object(WALRUS_STORAGE_OBJECT_ID),
          tx.pure.address(video.blobId), // Blob ID as address
          tx.pure.u32(selectedOption.epochs),
          walPayment,
        ],
      });

      tx.transferObjects([storageObj], tx.pure.address(account.address));

      await new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              console.log('Storage extended:', result.digest);
              const newExpiry = video.storageExpiry + (selectedOption.epochs * EPOCH_DURATION_MS);
              const newEpochs = video.storedEpochs + selectedOption.epochs;
              if (onRenewed) onRenewed(newExpiry, newEpochs);
              setShowModal(false);
              resolve(result);
            },
            onError: (err) => {
              console.error('Renewal failed:', err);
              reject(new Error('Failed to extend storage. Check your WAL balance.'));
            }
          }
        );
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <>
      <div className={`p-4 rounded-2xl flex items-center justify-between gap-4 mb-6 border ${
        isExpired ? 'bg-red-500/10 border-red-500/20 text-red-500' :
        isUrgent ? 'bg-red-500/10 border-red-500/20 text-red-500' :
        'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
      }`}>
        <div className="flex items-center gap-3">
          {isExpired ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <div className="flex flex-col">
            <span className="text-sm font-bold uppercase tracking-widest">
              {isExpired ? 'Storage Expired' : `Storage expires in ${daysLeft} days`}
            </span>
            <span className="text-[10px] opacity-80">
              {isExpired ? 'Your video may become unavailable soon.' : 'Renew now to keep your video online.'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
            isExpired || isUrgent ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-yellow-500 text-black hover:bg-yellow-600'
          }`}
        >
          Extend Storage
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-yt-dark w-full max-w-md rounded-3xl border border-yt-border p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-yt-red" />
                Extend Storage
              </h2>
              <button onClick={() => setShowModal(false)} className="text-yt-gray hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-yt-gray">Choose how much longer you want to store this video on Walrus.</p>
              
              <div className="grid grid-cols-2 gap-3">
                {STORAGE_DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setSelectedOption(option)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      selectedOption.label === option.label 
                        ? 'border-yt-red bg-yt-red/5' 
                        : 'border-yt-border hover:border-white/20'
                    }`}
                  >
                    <div className="text-sm font-bold">{option.label}</div>
                    <div className="text-[10px] text-yt-gray">{option.description}</div>
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-yt-black border border-yt-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-yt-gray uppercase tracking-widest">Extension Cost</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="font-bold text-white">
                    {renewalCost.toFixed(6)} WAL
                  </div>
                  <div className={`text-[10px] font-bold ${userWalBalance < BigInt(Math.floor(renewalCost * Math.pow(10, WAL_TOKEN_DECIMALS))) ? 'text-yt-red' : 'text-yt-gray'}`}>
                    Balance: {(Number(userWalBalance) / Math.pow(10, WAL_TOKEN_DECIMALS)).toFixed(4)} WAL
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold">
                  {error}
                </div>
              )}

              <button
                onClick={handleRenew}
                disabled={isRenewing}
                className="w-full bg-yt-red hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isRenewing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Confirm Extension
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
