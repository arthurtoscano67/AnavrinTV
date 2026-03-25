import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, Camera, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateProfileModalProps {
  address: string;
  onCreated: (profile: UserProfile) => void;
  onClose: () => void;
}

const EMOJIS = ['🎬', '🎥', '📺', '🎮', '🎨', '🎵', '🍕', '🚀', '🔥', '✨', '🌈', '💎', '🦊', '🐼', '🐨', '🦁'];

export function CreateProfileModal({ address, onCreated, onClose }: CreateProfileModalProps) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(EMOJIS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate on-chain profile creation
    setTimeout(() => {
      const newProfile: UserProfile = {
        address,
        username: username.toLowerCase().replace(/\s+/g, '_'),
        displayName,
        bio,
        avatar,
        subscriberCount: 0,
        subscribers: [],
        uploadedVideos: [],
        createdAt: Date.now(),
      };
      onCreated(newProfile);
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-yt-dark rounded-3xl overflow-hidden border border-yt-border shadow-2xl"
      >
        <div className="p-6 border-b border-yt-border flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Create your channel</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-24 h-24 rounded-full bg-yt-black border-2 border-yt-red flex items-center justify-center text-5xl shadow-lg shadow-yt-red/20">
              {avatar}
              <div className="absolute -bottom-1 -right-1 bg-yt-red p-1.5 rounded-full border-2 border-yt-dark">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatar(e)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${avatar === e ? 'bg-yt-red scale-110 shadow-lg shadow-yt-red/30' : 'bg-yt-black hover:bg-white/10'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-yt-gray uppercase tracking-widest ml-1">Username</label>
              <input
                required
                type="text"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-yt-black border border-yt-border rounded-xl px-4 py-3 outline-none focus:border-yt-red transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-yt-gray uppercase tracking-widest ml-1">Display Name</label>
              <input
                required
                type="text"
                placeholder="How you'll appear"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-yt-black border border-yt-border rounded-xl px-4 py-3 outline-none focus:border-yt-red transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-yt-gray uppercase tracking-widest ml-1">Bio</label>
              <textarea
                placeholder="Tell the world about your channel"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-yt-black border border-yt-border rounded-xl px-4 py-3 outline-none focus:border-yt-red transition-colors min-h-[100px] resize-none"
              />
            </div>
          </div>

          <button
            disabled={isSubmitting}
            type="submit"
            className="w-full bg-yt-red hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-yt-red/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                Create Channel
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
