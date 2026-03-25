import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileVideo, CheckCircle2, AlertCircle, Loader2, Play, Shield, Coins, Clock } from 'lucide-react';
import { uploadToWalrus, calculateStorageCost } from '../services/walrusService';
import { encryptBlob } from '../services/sealService';
import { Video, UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { 
  WAL_TOKEN_DECIMALS, 
  WALRUS_PACKAGE_ID, 
  WALRUS_STORAGE_OBJECT_ID, 
  STORAGE_DURATION_OPTIONS,
  EPOCH_DURATION_MS,
  WAL_COIN_TYPE
} from '../constants';

interface UploadPageProps {
  userProfile: UserProfile | null;
  onUploadSuccess: (video: Video) => void;
}

export function UploadPage({ userProfile, onUploadSuccess }: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [storageCost, setStorageCost] = useState<number>(0);
  const [userWalBalance, setUserWalBalance] = useState<bigint>(0n);
  const [selectedDuration, setSelectedDuration] = useState(STORAGE_DURATION_OPTIONS[1]); // Default 1 month
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [uploadedVideo, setUploadedVideo] = useState<Video | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  useEffect(() => {
    const updateCost = async () => {
      if (file) {
        const cost = await calculateStorageCost(file.size, selectedDuration.epochs, suiClient);
        setStorageCost(cost);
      }
    };
    updateCost();
  }, [file, selectedDuration, suiClient]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!account) {
        setUserWalBalance(0n);
        return;
      }
      try {
        // Use getAllBalances to see everything in the wallet at once
        const balances = await suiClient.getAllBalances({
          owner: account.address,
        });
        
        console.log('All wallet balances:', balances);
        
        // 1. Try exact match with WAL_COIN_TYPE
        let walBalance = balances.find(b => b.coinType === WAL_COIN_TYPE);
        
        // 2. If not found, try fuzzy match for anything containing "wal"
        if (!walBalance) {
          walBalance = balances.find(b => 
            b.coinType.toLowerCase().includes('::wal::wal') || 
            b.coinType.toLowerCase().includes('::wal')
          );
        }
        
        if (walBalance) {
          const total = BigInt(walBalance.totalBalance);
          setUserWalBalance(total);
          console.log(`Found WAL balance: ${total} for type: ${walBalance.coinType}`);
        } else {
          setUserWalBalance(0n);
          console.log('No WAL balance found in wallet.');
          
          // Debug SUI
          const suiBalance = balances.find(b => b.coinType === '0x2::sui::SUI');
          if (suiBalance) {
            console.log(`User has ${suiBalance.totalBalance} SUI but 0 WAL.`);
          }
        }
      } catch (err) {
        console.error('Error fetching WAL balance:', err);
      }
    };
    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [account, suiClient]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const videoFile = acceptedFiles[0];
    if (videoFile) {
      setFile(videoFile);
      setTitle(videoFile.name.replace(/\.[^/.]+$/, ""));
      
      const url = URL.createObjectURL(videoFile);
      setThumbnailUrl(url);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false,
    onDragEnter: () => {},
    onDragOver: () => {},
    onDragLeave: () => {}
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userProfile || !account) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(10); // Reading file

    try {
      // 1. Pay storage fee in WAL
      setUploadProgress(20);
      
      // Fetch all balances to find WAL resiliently
      const balances = await suiClient.getAllBalances({
        owner: account.address,
      });
      
      // Try exact match then fuzzy match
      let walBalance = balances.find(b => b.coinType === WAL_COIN_TYPE);
      if (!walBalance) {
        walBalance = balances.find(b => 
          b.coinType.toLowerCase().includes('::wal::wal') || 
          b.coinType.toLowerCase().includes('::wal')
        );
      }

      if (!walBalance || BigInt(walBalance.totalBalance) === 0n) {
        throw new Error('No WAL tokens found in your wallet. You need WAL to pay for Walrus storage.');
      }

      const actualWalCoinType = walBalance.coinType;

      // Fetch the actual coins for this type
      const { data: coins } = await suiClient.getCoins({
        owner: account.address,
        coinType: actualWalCoinType,
      });

      if (coins.length === 0) {
        throw new Error('No WAL tokens found in your wallet. You need WAL to pay for Walrus storage.');
      }

      // Calculate amount in MIST (WAL has 9 decimals)
      const cost = await calculateStorageCost(file.size, selectedDuration.epochs, suiClient);
      const amountInMist = BigInt(Math.floor(cost * Math.pow(10, WAL_TOKEN_DECIMALS)));
      
      const totalWalBalance = BigInt(walBalance.totalBalance);
      
      if (totalWalBalance < amountInMist) {
        const hasWal = Number(totalWalBalance) / Math.pow(10, WAL_TOKEN_DECIMALS);
        const needsWal = Number(amountInMist) / Math.pow(10, WAL_TOKEN_DECIMALS);
        throw new Error(`Insufficient WAL balance. You have ${hasWal.toFixed(4)} WAL but need ${needsWal.toFixed(4)} WAL for this upload.`);
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
        target: `${WALRUS_PACKAGE_ID}::system::reserve_space`,
        arguments: [
          tx.object(WALRUS_STORAGE_OBJECT_ID),
          tx.pure.u64(BigInt(file.size)),
          tx.pure.u32(selectedDuration.epochs),
          walPayment,
        ],
      });

      tx.transferObjects([storageObj], tx.pure.address(account.address));
      
      console.log(`Paying ${amountInMist} MIST for storage (${selectedDuration.epochs} epochs) using coin ${primaryCoinId}`);
      
      await new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              console.log('Storage fee paid:', result.digest);
              resolve(result);
            },
            onError: (err) => {
              console.error('Payment failed:', err);
              reject(new Error('Failed to pay storage fee in WAL. Make sure you have enough WAL tokens and have authorized the transaction.'));
            }
          }
        );
      });

      // 2. Encrypt with Seal
      setUploadProgress(30);
      let blobToUpload: Blob = file;
      let sealPolicyId: string | undefined;

      if (isEncrypted) {
        const { encryptedBlob, policyId } = await encryptBlob(file, account.address);
        blobToUpload = encryptedBlob;
        sealPolicyId = policyId;
      }

      // 3. Upload to Walrus (with failover and progress)
      const blobId = await uploadToWalrus(blobToUpload, selectedDuration.epochs, (progress) => {
        setUploadProgress(progress);
      });

      const storageExpiry = Date.now() + (selectedDuration.epochs * EPOCH_DURATION_MS);

      const newVideo: Video = {
        blobId,
        size: file.size,
        title,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        thumbnailUrl: undefined,
        uploaderAddress: userProfile.address,
        uploaderName: userProfile.displayName,
        uploaderAvatar: userProfile.avatar,
        timestamp: Date.now(),
        views: 0,
        likes: 0,
        dislikes: 0,
        comments: [],
        duration: '0:00',
        mimeType: file.type,
        isPublic: true,
        sealPolicyId,
        storageExpiry,
        storedEpochs: selectedDuration.epochs,
      };

      onUploadSuccess(newVideo);
      setUploadedVideo(newVideo);
      
      // Keep showing progress for a bit before redirecting
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(100);
      }, 500);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload video to Walrus');
      setIsUploading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6 px-4 text-center">
        <div className="w-20 h-20 bg-yt-dark rounded-full flex items-center justify-center border border-yt-border">
          <AlertCircle className="w-10 h-10 text-yt-red" />
        </div>
        <h2 className="text-2xl font-bold">Profile Required</h2>
        <p className="max-w-xs text-yt-gray text-sm">You need to create a SuiTube channel before you can upload videos.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Upload video</h1>
        {file && (
          <button 
            onClick={() => setFile(null)}
            className="text-yt-gray hover:text-white transition-colors flex items-center gap-2 text-sm font-bold"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>

      {!file ? (
        <div 
          {...getRootProps()} 
          className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-300 ${isDragActive ? 'border-yt-red bg-yt-red/5' : 'border-yt-border hover:border-yt-red hover:bg-white/5'}`}
        >
          <input {...getInputProps()} />
          <div className="w-20 h-20 bg-yt-dark rounded-full flex items-center justify-center border border-yt-border shadow-lg">
            <Upload className={`w-10 h-10 ${isDragActive ? 'text-yt-red animate-bounce' : 'text-yt-gray'}`} />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-bold">Drag and drop video files to upload</p>
            <p className="text-sm text-yt-gray">Your videos will be stored permanently on Walrus</p>
          </div>
          <button className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-white/90 transition-all shadow-lg">
            Select Files
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-yt-gray uppercase tracking-widest ml-1">Title (required)</label>
                <input
                  required
                  type="text"
                  placeholder="Add a title that describes your video"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-yt-black border border-yt-border rounded-xl px-4 py-3 outline-none focus:border-yt-red transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-yt-gray uppercase tracking-widest ml-1">Description</label>
                <textarea
                  placeholder="Tell viewers about your video"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-yt-black border border-yt-border rounded-xl px-4 py-3 outline-none focus:border-yt-red transition-colors min-h-[150px] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-yt-gray uppercase tracking-widest ml-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="sui, walrus, crypto, web3"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-yt-black border border-yt-border rounded-xl px-4 py-3 outline-none focus:border-yt-red transition-colors"
                />
              </div>
            </div>

            <div className="bg-yt-dark p-6 rounded-2xl border border-yt-border space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-yt-red" />
                Security & Storage
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-yt-black border border-yt-border">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold">Seal Encryption</span>
                    <span className="text-[10px] text-yt-gray">Encrypt video for your identity only</span>
                  </div>
                  <button 
                    onClick={() => setIsEncrypted(!isEncrypted)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isEncrypted ? 'bg-yt-red' : 'bg-yt-gray/20'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEncrypted ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-yt-black border border-yt-border">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yt-red" />
                      Storage Duration
                    </span>
                    <span className="text-[10px] text-yt-gray">How long to store on Walrus</span>
                  </div>
                  <select 
                    value={selectedDuration.label}
                    onChange={(e) => {
                      const option = STORAGE_DURATION_OPTIONS.find(o => o.label === e.target.value);
                      if (option) setSelectedDuration(option);
                    }}
                    className="bg-yt-dark border border-yt-border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-yt-red"
                  >
                    {STORAGE_DURATION_OPTIONS.map(option => (
                      <option key={option.label} value={option.label}>{option.label}</option>
                    ))}
                  </select>
                </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-yt-black border border-yt-border">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      Storage Fee
                    </span>
                    <span className="text-[10px] text-yt-gray">Estimated cost for {selectedDuration.label}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-sm font-bold text-white">
                      {storageCost.toFixed(6)} WAL
                    </div>
                    <div className={`text-[10px] font-bold ${userWalBalance < BigInt(Math.floor(storageCost * Math.pow(10, WAL_TOKEN_DECIMALS))) ? 'text-yt-red' : 'text-yt-gray'}`}>
                      Balance: {(Number(userWalBalance) / Math.pow(10, WAL_TOKEN_DECIMALS)).toFixed(4)} WAL
                    </div>
                    {userWalBalance === 0n && (
                      <div className="text-[9px] text-yt-red mt-1">
                        Need WAL tokens for storage. Get them from Walrus Testnet faucet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yt-dark p-6 rounded-2xl border border-yt-border space-y-4">
              <h3 className="font-bold">Visibility</h3>
              <div className="flex gap-4">
                <button className="flex-1 p-4 rounded-xl border border-yt-red bg-yt-red/5 flex flex-col gap-1 text-left">
                  <span className="font-bold text-sm">Public</span>
                  <span className="text-[10px] text-yt-gray">Everyone can see your video</span>
                </button>
                <button className="flex-1 p-4 rounded-xl border border-yt-border hover:border-white/20 flex flex-col gap-1 text-left transition-colors">
                  <span className="font-bold text-sm">Unlisted</span>
                  <span className="text-[10px] text-yt-gray">Only people with the link can see</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-yt-dark rounded-2xl border border-yt-border overflow-hidden shadow-xl">
              <div className="aspect-video bg-black relative group">
                {thumbnailUrl ? (
                  <video 
                    ref={videoRef}
                    src={thumbnailUrl} 
                    className="w-full h-full object-contain"
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileVideo className="w-12 h-12 text-yt-gray" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-10 h-10 text-white fill-white" />
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="text-[10px] font-bold text-yt-gray uppercase tracking-widest">Video Link</div>
                <div className="text-xs text-blue-400 truncate font-mono">walrus://uploading...</div>
                <div className="text-[10px] font-bold text-yt-gray uppercase tracking-widest mt-4">Filename</div>
                <div className="text-xs truncate">{file.name}</div>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={isUploading || !title.trim()}
              className="w-full bg-yt-red hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-yt-red/20 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Publish Video
                </>
              )}
            </button>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Upload Failed</span>
                    <p className="text-[10px] text-red-400 leading-tight">{error}</p>
                  </div>
                </motion.div>
              )}

              {uploadProgress === 100 && uploadedVideo && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl flex flex-col gap-4 shadow-lg shadow-emerald-500/5"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Upload Successful</span>
                      <p className="text-xs text-emerald-400 leading-tight">Your video is now live on Walrus!</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-yt-gray uppercase font-bold tracking-widest">Blob ID</span>
                      <span className="text-white font-mono truncate max-w-[180px]">{uploadedVideo.blobId}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-yt-gray uppercase font-bold tracking-widest">Storage Paid</span>
                      <span className="text-white font-bold">{storageCost.toFixed(6)} WAL</span>
                    </div>
                    {uploadedVideo.sealPolicyId && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-yt-gray uppercase font-bold tracking-widest">Seal Policy</span>
                        <span className="text-white font-mono truncate max-w-[180px]">{uploadedVideo.sealPolicyId}</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => navigate(`/watch?v=${uploadedVideo.blobId}`)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all text-sm mt-2"
                  >
                    Watch Video
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
