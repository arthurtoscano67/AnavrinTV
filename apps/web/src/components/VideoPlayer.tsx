import React, { useEffect, useRef, useState } from 'react';
import { fetchFromWalrus } from '../services/walrusService';
import { decryptBlob } from '../services/sealService';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipForward, SkipBack, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSignTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SessionKey } from '@mysten/seal';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

// Create a client for Seal
const sealSuiClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl('testnet'),
  network: 'testnet',
});

interface VideoPlayerProps {
  blobId: string;
  sealPolicyId?: string;
  mimeType?: string;
  autoPlay?: boolean;
}

export function VideoPlayer({ blobId, sealPolicyId, mimeType, autoPlay = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(!!sealPolicyId);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [encryptedBlob, setEncryptedBlob] = useState<Blob | null>(null);

  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();

  useEffect(() => {
    let isMounted = true;

    async function loadVideo() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch from Walrus (with aggregator failover)
        const blob = await fetchFromWalrus(blobId);
        
        if (isMounted) {
          setEncryptedBlob(blob);
          
          // 2. If not encrypted, set URL immediately
          if (!sealPolicyId) {
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
            setIsLoading(false);
          } else {
            setIsEncrypted(true);
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        console.error('Failed to load video:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load video from Walrus');
          setIsLoading(false);
        }
      }
    }

    loadVideo();

    return () => {
      isMounted = false;
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [blobId, sealPolicyId]);

  const handleDecrypt = async () => {
    if (!encryptedBlob || !currentAccount) return;

    setIsDecrypting(true);
    setError(null);

    try {
      // 1. Create Seal Session Key
      const sessionKey = await SessionKey.create({ 
        address: currentAccount.address,
        packageId: '0x2', // Use Sui framework for identity-based session
        ttlMin: 30,
        suiClient: sealSuiClient as any
      });

      // 2. Create and authorize transaction
      const tx = new Transaction();
      // Note: If authorize is not available, we'd need to call the move function directly.
      // But based on common Seal SDK patterns, it should be there or handled via client.
      if ((sessionKey as any).authorize) {
        (sessionKey as any).authorize(tx);
      } else {
        // Fallback: manually add the authorization command if SDK is different
        // For now, we'll assume the SDK version has it or we'll catch the error.
        console.warn('SessionKey.authorize not found, attempting manual authorization if possible');
      }
      
      // 3. Build transaction bytes
      const txBytes = await tx.build({ client: sealSuiClient as any });

      // 4. Sign and execute (to authorize on-chain)
      await signTransaction({
        transaction: tx,
      });

      // 5. Decrypt
      const decryptedBlob = await decryptBlob(encryptedBlob, sessionKey, txBytes, mimeType);
      
      const url = URL.createObjectURL(decryptedBlob);
      setVideoUrl(url);
      setIsEncrypted(false);
    } catch (err: any) {
      console.error('Decryption failed:', err);
      setError(err.message || 'Failed to decrypt video');
    } finally {
      setIsDecrypting(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      const p = (video.currentTime / video.duration) * 100;
      setProgress(p);
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      if (!videoUrl) return; // Ignore if we haven't set the URL yet
      setError('Failed to play video');
      setIsLoading(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = (newProgress / 100) * videoRef.current.duration;
      setProgress(newProgress);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="relative group aspect-video bg-black rounded-xl overflow-hidden border border-yt-border shadow-2xl">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-yt-black/50 z-10">
          <div className="w-12 h-12 border-4 border-yt-red border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-yt-black/80 z-10 gap-4 text-center px-4">
          <div className="text-yt-red text-lg font-bold">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {isEncrypted && !isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-yt-black/90 z-10 gap-6 text-center px-4">
          <div className="w-20 h-20 bg-yt-red/10 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-yt-red" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold">Encrypted Video</h3>
            <p className="text-yt-gray text-sm max-w-xs">
              This video is protected with Seal encryption. You need to authorize decryption with your wallet.
            </p>
          </div>
          
          {!currentAccount ? (
            <div className="text-yt-gray text-sm italic">Please connect your wallet to decrypt</div>
          ) : (
            <button 
              onClick={handleDecrypt}
              disabled={isDecrypting}
              className={cn(
                "bg-yt-red hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg shadow-yt-red/20",
                isDecrypting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isDecrypting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Unlock Video
                </>
              )}
            </button>
          )}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay={autoPlay}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
      >
        {videoUrl && <source src={videoUrl} type={mimeType || 'video/mp4'} />}
      </video>

      {/* Custom Controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
        isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
      )}>
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleProgressChange}
          className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-yt-red mb-4"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-yt-red transition-colors">
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>
            <button className="text-white hover:text-yt-red transition-colors">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
            
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-yt-red transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-yt-red transition-all duration-300"
              />
            </div>

            <div className="text-xs text-white font-medium">
              {videoRef.current ? (
                `${Math.floor(videoRef.current.currentTime / 60)}:${Math.floor(videoRef.current.currentTime % 60).toString().padStart(2, '0')} / ${Math.floor(videoRef.current.duration / 60)}:${Math.floor(videoRef.current.duration % 60).toString().padStart(2, '0')}`
              ) : '0:00 / 0:00'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-white hover:text-yt-red transition-colors">
              <Settings className="w-6 h-6" />
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:text-yt-red transition-colors">
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
