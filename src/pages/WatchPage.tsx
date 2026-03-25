import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Video, VideoComment } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { formatViews, formatTimestamp } from '../lib/utils';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, MessageSquare, Send, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WalrusImage } from '../components/WalrusImage';

import { StorageExpiryBanner } from '../components/StorageExpiryBanner';

interface WatchPageProps {
  videos: Video[];
  onAddComment: (blobId: string, comment: VideoComment) => void;
  onLike: (blobId: string) => void;
  onView: (blobId: string) => void;
  onUpdateVideo?: (video: Video) => void;
  currentUser: { address: string; displayName: string; avatar: string } | null;
}

export function WatchPage({ videos, onAddComment, onLike, onView, onUpdateVideo, currentUser }: WatchPageProps) {
  const [searchParams] = useSearchParams();
  const blobId = searchParams.get('v');
  const [commentText, setCommentText] = useState('');
  
  const video = videos.find(v => v.blobId === blobId);
  const recommendedVideos = videos.filter(v => v.blobId !== blobId).slice(0, 10);

  const handleRenewed = (newExpiry: number, newEpochs: number) => {
    if (video && onUpdateVideo) {
      onUpdateVideo({
        ...video,
        storageExpiry: newExpiry,
        storedEpochs: newEpochs
      });
    }
  };

  useEffect(() => {
    if (blobId) {
      onView(blobId);
    }
  }, [blobId]);

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="text-4xl">🔍</div>
        <h2 className="text-2xl font-bold">Video not found</h2>
        <Link to="/" className="bg-yt-red px-6 py-2 rounded-full font-bold hover:bg-red-600 transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;

    const newComment: VideoComment = {
      id: Math.random().toString(36).substr(2, 9),
      authorAddress: currentUser.address,
      authorName: currentUser.displayName,
      authorAvatar: currentUser.avatar,
      text: commentText,
      timestamp: Date.now(),
    };

    onAddComment(video.blobId, newComment);
    setCommentText('');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4">
        <VideoPlayer 
          blobId={video.blobId} 
          sealPolicyId={video.sealPolicyId} 
          mimeType={video.mimeType}
        />
        
        <div className="mt-2">
          <StorageExpiryBanner video={video} onRenewed={handleRenewed} />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold leading-tight">{video.title}</h1>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={`/channel/${video.uploaderAddress}`} className="w-10 h-10 rounded-full overflow-hidden bg-yt-dark border border-yt-border">
                {video.uploaderAvatar.startsWith('http') ? (
                  <img src={video.uploaderAvatar} alt={video.uploaderName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">{video.uploaderAvatar}</div>
                )}
              </Link>
              <div className="flex flex-col">
                <Link to={`/channel/${video.uploaderAddress}`} className="font-bold text-sm hover:text-yt-red transition-colors">
                  {video.uploaderName}
                </Link>
                <span className="text-xs text-yt-gray">1.2K subscribers</span>
              </div>
              <button className="ml-4 bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-white/90 transition-colors">
                Subscribe
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/10 rounded-full overflow-hidden">
                <button 
                  onClick={() => onLike(video.blobId)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 transition-colors border-r border-white/10"
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm font-bold">{formatViews(video.likes)}</span>
                </button>
                <button className="px-4 py-2 hover:bg-white/10 transition-colors">
                  <ThumbsDown className="w-5 h-5" />
                </button>
              </div>
              <button className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-colors">
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-bold">Share</span>
              </button>
              <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mt-2">
          <div className="flex items-center gap-2 text-sm font-bold mb-1">
            <span>{formatViews(video.views)} views</span>
            <span>{formatTimestamp(video.timestamp)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{video.description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {video.tags.map(tag => (
              <span key={tag} className="text-xs text-blue-400 font-medium cursor-pointer hover:underline">#{tag}</span>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold">{video.comments.length} Comments</h3>
            <div className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <MoreHorizontal className="w-4 h-4" />
              Sort by
            </div>
          </div>

          {currentUser ? (
            <form onSubmit={handleCommentSubmit} className="flex gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-yt-dark flex items-center justify-center border border-yt-border">
                {currentUser.avatar.startsWith('http') ? (
                  <img src={currentUser.avatar} alt={currentUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">{currentUser.avatar}</span>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="bg-transparent border-b border-yt-border py-2 outline-none focus:border-white transition-colors text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setCommentText('')}
                    className="px-4 py-2 text-sm font-bold hover:bg-white/10 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!commentText.trim()}
                    className="bg-blue-500 disabled:bg-white/10 disabled:text-yt-gray text-white px-4 py-2 text-sm font-bold rounded-full transition-colors"
                  >
                    Comment
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-yt-dark p-4 rounded-xl border border-yt-border text-center">
              <p className="text-sm text-yt-gray">Please connect your wallet to join the conversation.</p>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {video.comments.map((comment, index) => (
              <motion.div 
                key={comment.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-4"
              >
                <Link to={`/channel/${comment.authorAddress}`} className="w-10 h-10 rounded-full overflow-hidden bg-yt-dark flex items-center justify-center border border-yt-border">
                  {comment.authorAvatar.startsWith('http') ? (
                    <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{comment.authorAvatar}</span>
                  )}
                </Link>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Link to={`/channel/${comment.authorAddress}`} className="text-xs font-bold hover:text-yt-red transition-colors">
                      @{comment.authorName}
                    </Link>
                    <span className="text-[10px] text-yt-gray">{formatTimestamp(comment.timestamp)}</span>
                  </div>
                  <p className="text-sm leading-snug">{comment.text}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <button className="flex items-center gap-1 text-yt-gray hover:text-white transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-[10px]">12</span>
                    </button>
                    <button className="text-yt-gray hover:text-white transition-colors">
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                    <button className="text-[10px] font-bold text-yt-gray hover:text-white transition-colors">Reply</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Recommendations */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4">
        <h3 className="text-lg font-bold">Up next</h3>
        <div className="flex flex-col gap-3">
          {recommendedVideos.map((rec, index) => (
            <motion.div 
              key={rec.blobId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/watch?v=${rec.blobId}`} className="flex gap-2 group">
                <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-yt-dark flex-shrink-0 border border-yt-border">
                  {rec.thumbnailUrl ? (
                    <WalrusImage src={rec.thumbnailUrl} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yt-dark to-yt-border group-hover:scale-105 transition-transform duration-300">
                      <Play className="w-6 h-6 text-white/20 fill-white/10" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  <h4 className="text-sm font-bold line-clamp-2 leading-tight group-hover:text-yt-red transition-colors">{rec.title}</h4>
                  <div className="flex flex-col text-[10px] text-yt-gray">
                    <span className="hover:text-white transition-colors">{rec.uploaderName}</span>
                    <div className="flex items-center gap-1">
                      <span>{formatViews(rec.views)} views</span>
                      <span>•</span>
                      <span>{formatTimestamp(rec.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
