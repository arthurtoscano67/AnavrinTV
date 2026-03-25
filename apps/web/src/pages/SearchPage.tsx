import { useSearchParams, Link } from 'react-router-dom';
import { Video } from '../types';
import { VideoCard } from '../components/VideoCard';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';

interface SearchPageProps {
  videos: Video[];
}

export function SearchPage({ videos }: SearchPageProps) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() || '';
  
  const results = videos.filter(v => 
    v.title.toLowerCase().includes(query) || 
    v.description.toLowerCase().includes(query) ||
    v.tags.some(t => t.toLowerCase().includes(query))
  );

  return (
    <div className="max-w-[1284px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-yt-border">
        <div className="flex items-center gap-2 text-sm font-bold text-yt-gray">
          <span>About {results.length} results</span>
        </div>
        <button className="flex items-center gap-2 text-sm font-bold hover:bg-white/10 px-4 py-2 rounded-full transition-colors">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      <div className="flex flex-col gap-8">
        {results.length > 0 ? (
          results.map((video, index) => (
            <motion.div
              key={video.blobId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/watch?v=${video.blobId}`} className="flex flex-col sm:flex-row gap-4 group">
                <div className="relative w-full sm:w-80 aspect-video rounded-xl overflow-hidden bg-yt-dark flex-shrink-0 border border-yt-border">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yt-dark to-yt-border group-hover:scale-105 transition-transform duration-300">
                      <span className="text-4xl opacity-20">🎬</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 overflow-hidden py-1">
                  <h3 className="text-lg font-bold line-clamp-2 leading-tight group-hover:text-yt-red transition-colors">{video.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-yt-gray">
                    <span>{video.views} views</span>
                    <span>•</span>
                    <span>{new Date(video.timestamp).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 my-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-yt-dark flex items-center justify-center border border-yt-border">
                      {video.uploaderAvatar.startsWith('http') ? (
                        <img src={video.uploaderAvatar} alt={video.uploaderName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">{video.uploaderAvatar}</span>
                      )}
                    </div>
                    <span className="text-xs text-yt-gray hover:text-white transition-colors">{video.uploaderName}</span>
                  </div>

                  <p className="text-xs text-yt-gray line-clamp-2 leading-snug">{video.description}</p>
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-yt-gray gap-4">
            <div className="text-4xl">🔍</div>
            <h3 className="text-xl font-bold text-white">No results found for "{query}"</h3>
            <p className="max-w-xs text-center text-sm">Try different keywords or check your spelling.</p>
          </div>
        )}
      </div>
    </div>
  );
}
