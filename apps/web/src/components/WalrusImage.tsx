import React, { useState, useEffect } from 'react';
import { WALRUS_AGGREGATORS } from '../constants';

interface WalrusImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  blobId?: string;
  src?: string;
  alt?: string;
  className?: string;
}

export function WalrusImage({ blobId, src, ...props }: WalrusImageProps) {
  const [currentAggregatorIndex, setCurrentAggregatorIndex] = useState(0);
  const [error, setError] = useState(false);

  const imageUrl = blobId 
    ? `${WALRUS_AGGREGATORS[currentAggregatorIndex]}/v1/${blobId}`
    : src;

  const handleError = () => {
    if (blobId && currentAggregatorIndex < WALRUS_AGGREGATORS.length - 1) {
      setCurrentAggregatorIndex(prev => prev + 1);
    } else {
      setError(true);
    }
  };

  if (error && !src) {
    return <div className="w-full h-full bg-yt-dark flex items-center justify-center text-yt-gray text-xs">Failed to load</div>;
  }

  return (
    <img 
      {...props} 
      src={imageUrl} 
      onError={handleError} 
      referrerPolicy="no-referrer"
    />
  );
}
