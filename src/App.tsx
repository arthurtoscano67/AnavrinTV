import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SuiProvider } from './providers/SuiProvider';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { WatchPage } from './pages/WatchPage';
import { UploadPage } from './pages/UploadPage';
import { ChannelPage } from './pages/ChannelPage';
import { SearchPage } from './pages/SearchPage';
import { AuthFlow } from './components/AuthFlow';
import { CreateProfileModal } from './components/CreateProfileModal';
import { Video, UserProfile, VideoComment } from './types';
import { AnimatePresence } from 'framer-motion';

// Initial mock videos for the demo
const MOCK_VIDEOS: Video[] = [
  {
    blobId: 'mock-video-1',
    size: 100 * 1024 * 1024,
    title: 'Welcome to SuiTube: The Future of Video',
    description: 'SuiTube is a decentralized video platform built on Sui and Walrus. Your content, your rules.',
    tags: ['sui', 'walrus', 'web3'],
    uploaderAddress: '0x123...456',
    uploaderName: 'SuiTube Official',
    uploaderAvatar: '🎬',
    timestamp: Date.now() - 3600000,
    views: 1250,
    likes: 450,
    dislikes: 12,
    comments: [],
    duration: '2:45',
    isPublic: true,
    storageExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    storedEpochs: 4,
  },
  {
    blobId: 'mock-video-2',
    size: 50 * 1024 * 1024,
    title: 'Walrus Storage Explained in 60 Seconds',
    description: 'Learn how Walrus provides ultra-fast, decentralized storage for the Sui ecosystem.',
    tags: ['storage', 'tech', 'walrus'],
    uploaderAddress: '0xabc...def',
    uploaderName: 'WalrusDev',
    uploaderAvatar: '🐨',
    timestamp: Date.now() - 86400000,
    views: 8900,
    likes: 1200,
    dislikes: 5,
    comments: [],
    duration: '1:00',
    isPublic: true,
    storageExpiry: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now (Urgent)
    storedEpochs: 1,
  }
];

function SuiTubeApp() {
  const account = useCurrentAccount();
  const [videos, setVideos] = useState<Video[]>(() => {
    const saved = localStorage.getItem('suitube_videos');
    return saved ? JSON.parse(saved) : MOCK_VIDEOS;
  });
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('suitube_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);

  useEffect(() => {
    localStorage.setItem('suitube_videos', JSON.stringify(videos));
  }, [videos]);

  useEffect(() => {
    localStorage.setItem('suitube_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (account) {
      const profile = users.find(u => u.address === account.address);
      if (profile) {
        setCurrentUserProfile(profile);
        setShowCreateProfile(false);
      } else {
        setShowCreateProfile(true);
      }
    } else {
      setCurrentUserProfile(null);
      setShowCreateProfile(false);
    }
  }, [account, users]);

  const handleProfileCreated = (profile: UserProfile) => {
    setUsers([...users, profile]);
    setCurrentUserProfile(profile);
    setShowCreateProfile(false);
  };

  const handleUploadSuccess = (video: Video) => {
    setVideos([video, ...videos]);
  };

  const handleUpdateVideo = (updatedVideo: Video) => {
    setVideos(videos.map(v => v.blobId === updatedVideo.blobId ? updatedVideo : v));
  };

  const handleAddComment = (blobId: string, comment: VideoComment) => {
    setVideos(videos.map(v => 
      v.blobId === blobId ? { ...v, comments: [comment, ...v.comments] } : v
    ));
  };

  const handleLike = (blobId: string) => {
    setVideos(videos.map(v => 
      v.blobId === blobId ? { ...v, likes: v.likes + 1 } : v
    ));
  };

  const handleView = (blobId: string) => {
    setVideos(videos.map(v => 
      v.blobId === blobId ? { ...v, views: v.views + 1 } : v
    ));
  };

  const handleZKLogin = () => {
    alert('ZKLogin (Google OAuth) integration would happen here. For this demo, please use the Sui Wallet Connect button.');
  };

  if (!account) {
    return <AuthFlow onZKLogin={handleZKLogin} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-yt-black text-white">
        <Navbar userProfile={currentUserProfile} />
        <Sidebar />
        
        <main className="pt-14 lg:pl-64 min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage videos={videos} />} />
            <Route 
              path="/watch" 
              element={
                <WatchPage 
                  videos={videos} 
                  onAddComment={handleAddComment}
                  onLike={handleLike}
                  onView={handleView}
                  onUpdateVideo={handleUpdateVideo}
                  currentUser={currentUserProfile}
                />
              } 
            />
            <Route 
              path="/upload" 
              element={<UploadPage userProfile={currentUserProfile} onUploadSuccess={handleUploadSuccess} />} 
            />
            <Route path="/channel/:address" element={<ChannelPage videos={videos} users={users} onUpdateVideo={handleUpdateVideo} />} />
            <Route path="/search" element={<SearchPage videos={videos} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <AnimatePresence>
          {showCreateProfile && (
            <CreateProfileModal 
              address={account.address} 
              onCreated={handleProfileCreated}
              onClose={() => setShowCreateProfile(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <SuiProvider>
      <SuiTubeApp />
    </SuiProvider>
  );
}
