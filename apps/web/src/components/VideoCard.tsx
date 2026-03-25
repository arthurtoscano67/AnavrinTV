import { Link } from 'react-router-dom';
import { Video } from '../types';
import { formatViews, formatTimestamp } from '../lib/utils';
import { Play, Clock } from 'lucide-react';
import { WalrusImage } from './WalrusImage';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { getDaysUntilExpiry } from './StorageExpiryBanner';

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  const account = useCurrentAccount();
  const isOwner = account?.address === video.uploaderAddress;
  const daysLeft = getDaysUntilExpiry(video.storageExpiry);

  return (
    <div className="group flex flex-col gap-3 cursor-pointer">
      <Link to={`/watch?v=${video.blobId}`} className="relative aspect-video rounded-xl overflow-hidden bg-yt-dark border border-yt-border">
        {video.thumbnailUrl ? (
          <WalrusImage 
            src={video.thumbnailUrl} 
            alt={video.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yt-dark to-yt-border group-hover:scale-105 transition-transform duration-300">
            <Play className="w-12 h-12 text-white/20 fill-white/10" />
          </div>
        )}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {video.duration}
          </div>
        )}
        {isOwner && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-md ${
            daysLeft <= 0 ? 'bg-red-500 text-white' :
            daysLeft < 7 ? 'bg-red-500/80 text-white' :
            daysLeft < 30 ? 'bg-yellow-500/80 text-black' :
            'bg-emerald-500/80 text-white'
          }`}>
            <Clock className="w-3 h-3" />
            {daysLeft <= 0 ? 'Expired' : `${daysLeft}d`}
          </div>
        )}
      </Link>

      <div className="flex gap-3 px-1">
        <Link to={`/channel/${video.uploaderAddress}`} className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-yt-dark border border-yt-border">
          {video.uploaderAvatar.startsWith('http') ? (
            <img src={video.uploaderAvatar} alt={video.uploaderName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">{video.uploaderAvatar}</div>
          )}
        </Link>

        <div className="flex flex-col gap-1 overflow-hidden">
          <Link to={`/watch?v=${video.blobId}`} className="text-sm font-semibold line-clamp-2 leading-tight group-hover:text-yt-red transition-colors">
            {video.title}
          </Link>
          <div className="flex flex-col text-xs text-yt-gray">
            <Link to={`/channel/${video.uploaderAddress}`} className="hover:text-white transition-colors">
              {video.uploaderName}
            </Link>
            <div className="flex items-center gap-1">
              <span>{formatViews(video.views)} views</span>
              <span className="text-[8px]">•</span>
              <span>{formatTimestamp(video.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
