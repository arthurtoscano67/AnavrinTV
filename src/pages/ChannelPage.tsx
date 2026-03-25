import { useParams, Link } from 'react-router-dom';
import { Video, UserProfile } from '../types';
import { VideoCard } from '../components/VideoCard';
import { formatViews } from '../lib/utils';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { WalrusImage } from '../components/WalrusImage';

interface ChannelPageProps {
  videos: Video[];
  users: UserProfile[];
  onUpdateVideo?: (video: Video) => void;
}

import { StorageExpiryBanner } from '../components/StorageExpiryBanner';

export function ChannelPage({ videos, users, onUpdateVideo }: ChannelPageProps) {
  const { address } = useParams();
  const [activeTab, setActiveTab] = useState<'videos' | 'about'>('videos');
  
  const user = users.find(u => u.address === address);
  const userVideos = videos.filter(v => v.uploaderAddress === address);
  
  // Find the video that expires soonest to show in the banner
  const expiringVideos = userVideos
    .filter(v => {
      const diff = v.storageExpiry - Date.now();
      return diff < 30 * 24 * 60 * 60 * 1000; // Less than 30 days
    })
    .sort((a, b) => a.storageExpiry - b.storageExpiry);

  const handleRenewed = (video: Video) => (newExpiry: number, newEpochs: number) => {
    if (onUpdateVideo) {
      onUpdateVideo({
        ...video,
        storageExpiry: newExpiry,
        storedEpochs: newEpochs
      });
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="text-4xl">🔍</div>
        <h2 className="text-2xl font-bold">Channel not found</h2>
        <Link to="/" className="bg-yt-red px-6 py-2 rounded-full font-bold hover:bg-red-600 transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Banner */}
      <div className="h-40 sm:h-60 lg:h-80 bg-gradient-to-r from-yt-dark to-yt-border relative">
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Channel Header */}
      <div className="max-w-[1284px] mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-12 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-yt-border">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-yt-black border-4 border-yt-black overflow-hidden shadow-2xl flex items-center justify-center text-7xl">
            {user.avatar.startsWith('http') ? (
              <WalrusImage src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              <span>{user.avatar}</span>
            )}
          </div>
          
          <div className="flex-1 flex flex-col items-center sm:items-start gap-2 text-center sm:text-left mb-4">
            <h1 className="text-3xl font-bold tracking-tight">{user.displayName}</h1>
            <div className="flex items-center gap-2 text-yt-gray text-sm font-medium">
              <span>@{user.username}</span>
              <span>•</span>
              <span>{formatViews(user.subscriberCount)} subscribers</span>
              <span>•</span>
              <span>{userVideos.length} videos</span>
            </div>
            <button className="mt-2 bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-white/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 mt-2">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'videos' ? 'border-white text-white' : 'border-transparent text-yt-gray hover:text-white'}`}
          >
            VIDEOS
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'about' ? 'border-white text-white' : 'border-transparent text-yt-gray hover:text-white'}`}
          >
            ABOUT
          </button>
        </div>

        {/* Content */}
        <div className="py-8">
          {activeTab === 'videos' ? (
            <div className="space-y-8">
              {expiringVideos.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-yt-gray uppercase tracking-widest mb-4">Expiring Soon</h3>
                  <StorageExpiryBanner 
                    video={expiringVideos[0]} 
                    onRenewed={handleRenewed(expiringVideos[0])} 
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {userVideos.length > 0 ? (
                  userVideos.map((video, index) => (
                    <motion.div
                      key={video.blobId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <VideoCard video={video} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-yt-gray gap-4">
                    <h3 className="text-xl font-bold text-white">No videos yet</h3>
                    <p className="max-w-xs text-center text-sm">This channel hasn't uploaded any videos yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl space-y-8">
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Description</h3>
                <p className="text-sm text-yt-gray leading-relaxed whitespace-pre-wrap">{user.bio || 'No description provided.'}</p>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Stats</h3>
                <div className="flex flex-col gap-2 text-sm text-yt-gray">
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  <span>{userVideos.reduce((acc, v) => acc + v.views, 0)} total views</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
