import { Search, Menu, Video, Bell, User, Play } from 'lucide-react';
import { ConnectButton } from '@mysten/dapp-kit';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { WalrusImage } from './WalrusImage';

interface NavbarProps {
  userProfile: UserProfile | null;
}

export function Navbar({ userProfile }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-yt-black flex items-center justify-between px-4 z-50 border-b border-yt-border">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center gap-1">
          <div className="bg-yt-red p-1 rounded-lg">
            <Play className="w-5 h-5 fill-white text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">SuiTube</span>
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4 flex items-center">
        <div className="flex-1 flex items-center bg-yt-dark border border-yt-border rounded-l-full px-4 py-1.5 focus-within:border-blue-500">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-white placeholder-yt-gray"
          />
        </div>
        <button type="submit" className="bg-white/10 border border-l-0 border-yt-border px-5 py-1.5 rounded-r-full hover:bg-white/20 transition-colors">
          <Search className="w-5 h-5 text-yt-gray" />
        </button>
      </form>

      <div className="flex items-center gap-2">
        <Link to="/upload" className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block">
          <Video className="w-6 h-6" />
        </Link>
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block">
          <Bell className="w-6 h-6" />
        </button>
        
        <div className="ml-2 flex items-center gap-3">
          <ConnectButton />
          {userProfile && (
            <Link to={`/channel/${userProfile.address}`} className="w-8 h-8 rounded-full overflow-hidden bg-yt-dark flex items-center justify-center border border-yt-border">
              {userProfile.avatar.startsWith('http') ? (
                <WalrusImage src={userProfile.avatar} alt={userProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">{userProfile.avatar}</span>
              )}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
