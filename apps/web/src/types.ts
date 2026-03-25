export interface VideoComment {
  id: string;
  authorAddress: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: number;
}

export interface Video {
  blobId: string;
  size: number;
  title: string;
  description: string;
  tags: string[];
  thumbnailUrl?: string;
  uploaderAddress: string;
  uploaderName: string;
  uploaderAvatar: string;
  timestamp: number;
  views: number;
  likes: number;
  dislikes: number;
  comments: VideoComment[];
  duration?: string;
  mimeType?: string;
  isPublic: boolean;
  sealPolicyId?: string;
  storageExpiry: number;
  storedEpochs: number;
}

export interface UserProfile {
  address: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  subscriberCount: number;
  subscribers: string[]; // addresses
  uploadedVideos: string[]; // blobIds
  createdAt: number;
}
