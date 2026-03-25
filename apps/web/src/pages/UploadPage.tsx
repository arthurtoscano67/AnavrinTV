import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileVideo, CheckCircle2, AlertCircle, Loader2, Play, Shield, Coins, Clock } from 'lucide-react';
import { calculateStorageCost } from '../services/walrusService';
import { Video, UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { 
  STORAGE_DURATION_OPTIONS,
  EPOCH_DURATION_MS
} from '../constants';

interface UploadPageProps {
  userProfile: UserProfile | null;
  onUploadSuccess: (video: Video) => void;
}

type UploadStatus =
  | 'RECEIVED'
  | 'VALIDATED'
  | 'SCANNED'
  | 'TRANSCODED'
  | 'ENCRYPTED'
  | 'WALRUS_STORED'
  | 'MINTED'
  | 'INDEXED'
  | 'PUBLISHED'
  | 'FAILED';

interface UploadIntentCreateResponse {
  uploadIntentId: string;
}

interface UploadIntentStatusResponse {
  uploadIntentId: string;
  status: UploadStatus;
  failureReason: string | null;
  walrusManifestBlobId: string | null;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function apiUrl(relativePath: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${relativePath}` : relativePath;
}

function parseErrorMessage(input: unknown, fallback: string): string {
  if (!input || typeof input !== 'object') {
    return fallback;
  }
  const errorValue = (input as Record<string, unknown>).error;
  if (typeof errorValue === 'string' && errorValue.length > 0) {
    return errorValue;
  }
  return fallback;
}

async function uploadIntentBinary(
  uploadIntentId: string,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', apiUrl(`/uploads/intents/${uploadIntentId}/file`));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading file to backend intake.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      try {
        const parsed = JSON.parse(xhr.responseText);
        reject(new Error(parseErrorMessage(parsed, `Upload intake failed (${xhr.status})`)));
      } catch {
        reject(new Error(`Upload intake failed (${xhr.status})`));
      }
    };

    xhr.send(file);
  });
}

function statusToProgress(status: UploadStatus): number {
  switch (status) {
    case 'RECEIVED':
      return 74;
    case 'VALIDATED':
      return 78;
    case 'SCANNED':
      return 80;
    case 'TRANSCODED':
      return 84;
    case 'ENCRYPTED':
      return 90;
    case 'WALRUS_STORED':
      return 94;
    case 'MINTED':
      return 97;
    case 'INDEXED':
      return 99;
    case 'PUBLISHED':
      return 100;
    case 'FAILED':
      return 100;
    default:
      return 74;
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
  const [selectedDuration, setSelectedDuration] = useState(STORAGE_DURATION_OPTIONS[1]); // Default 1 month
  const [uploadedVideo, setUploadedVideo] = useState<Video | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const isEncrypted = true;

  useEffect(() => {
    const updateCost = async () => {
      if (file) {
        const cost = await calculateStorageCost(file.size, selectedDuration.epochs, suiClient);
        setStorageCost(cost);
      }
    };
    updateCost();
  }, [file, selectedDuration, suiClient]);

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
      // 1. Create upload intent on backend
      setUploadProgress(20);
      const intentResponse = await fetch(apiUrl('/uploads/intents'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userProfile.address,
          walletAddress: account.address,
          channelId: userProfile.address,
          title: title.trim(),
          description: description.trim(),
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: String(file.size),
          selector: {
            creatorId: userProfile.address,
            walletAddress: account.address,
          },
        }),
      });

      if (!intentResponse.ok) {
        const payload = await intentResponse.json().catch(() => ({}));
        throw new Error(parseErrorMessage(payload, `Failed to create upload intent (${intentResponse.status})`));
      }

      const intentPayload = (await intentResponse.json()) as UploadIntentCreateResponse;
      const uploadIntentId = intentPayload.uploadIntentId;
      if (!uploadIntentId) {
        throw new Error('Upload intent response missing uploadIntentId.');
      }

      // 2. Upload binary file to backend intake
      setUploadProgress(30);
      await uploadIntentBinary(uploadIntentId, file, (fraction) => {
        const uploadStageProgress = 30 + Math.round(Math.max(0, Math.min(1, fraction)) * 40);
        setUploadProgress(uploadStageProgress);
      });

      // 3. Poll backend workflow status until Walrus/chain pipeline reaches publish.
      let finalStatus: UploadIntentStatusResponse | null = null;
      for (let attempt = 0; attempt < 160; attempt += 1) {
        const statusResponse = await fetch(apiUrl(`/uploads/intents/${uploadIntentId}`));
        if (!statusResponse.ok) {
          throw new Error(`Failed to fetch upload status (${statusResponse.status})`);
        }

        const statusPayload = (await statusResponse.json()) as UploadIntentStatusResponse;
        setUploadProgress((current) => Math.max(current, statusToProgress(statusPayload.status)));

        if (statusPayload.status === 'FAILED') {
          throw new Error(statusPayload.failureReason ?? 'Upload pipeline failed.');
        }

        if (
          statusPayload.status === 'PUBLISHED' ||
          (statusPayload.status === 'WALRUS_STORED' && Boolean(statusPayload.walrusManifestBlobId))
        ) {
          finalStatus = statusPayload;
          break;
        }

        await wait(3000);
      }

      if (!finalStatus?.walrusManifestBlobId) {
        throw new Error('Upload pipeline timed out before Walrus blob was finalized.');
      }

      const storageExpiry = Date.now() + (selectedDuration.epochs * EPOCH_DURATION_MS);

      const newVideo: Video = {
        blobId: finalStatus.walrusManifestBlobId,
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
        sealPolicyId: isEncrypted ? 'backend-seal-policy' : undefined,
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
                    <span className="text-[10px] text-yt-gray">Mainnet uploads are backend-encrypted with Seal</span>
                  </div>
                  <button 
                    disabled
                    className="w-12 h-6 rounded-full transition-colors relative bg-yt-red opacity-80 cursor-not-allowed"
                  >
                    <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all left-7" />
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
                    <div className="text-[10px] font-bold text-emerald-400">
                      Sponsored by platform treasury
                    </div>
                    <div className="text-[9px] text-yt-gray mt-1">
                      WAL estimate shown for transparency only.
                    </div>
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
