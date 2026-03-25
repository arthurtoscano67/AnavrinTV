import { Video } from '../types';
import { VideoCard } from '../components/VideoCard';
import { motion } from 'framer-motion';

interface HomePageProps {
  videos: Video[];
}

export function HomePage({ videos }: HomePageProps) {
  const publicVideos = videos.filter(v => v.isPublic);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {publicVideos.length > 0 ? (
          publicVideos.map((video, index) => (
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
            <div className="w-20 h-20 bg-yt-dark rounded-full flex items-center justify-center border border-yt-border">
              <span className="text-4xl">🎬</span>
            </div>
            <h3 className="text-xl font-bold text-white">No videos yet</h3>
            <p className="max-w-xs text-center text-sm">Be the first to upload a video to SuiTube and share it with the world!</p>
          </div>
        )}
      </div>
    </div>
  );
}
