import { Link } from 'react-router-dom'
import { formatViewCount } from '@/lib/format'

export interface VideoCardData {
  id: string
  title: string
  thumbnailUrl: string
  videoUrl?: string
  viewCount: number
  createdAt?: string
  duration?: number
  channel: { id?: string; username: string; channelName?: string; avatarUrl: string }
}

export function VideoCard({ video, layout = 'grid' }: { video: VideoCardData; layout?: 'grid' | 'row' }) {
  if (layout === 'row') {
    return (
      <Link to={`/watch/${video.id}`} className="flex gap-2 group">
        <div className="relative w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-yt-surface">
          <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          {video.duration != null && video.duration > 0 && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-xs px-1 rounded">{Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}</span>
          )}
        </div>
        <div className="min-w-0 py-1">
          <p className="font-medium text-sm line-clamp-2 group-hover:text-white">{video.title}</p>
          <p className="text-yt-muted text-xs mt-1">{video.channel.channelName || video.channel.username}</p>
          <p className="text-yt-muted text-xs">{formatViewCount(video.viewCount)} views</p>
        </div>
      </Link>
    )
  }
  return (
    <Link to={`/watch/${video.id}`} className="group">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-yt-surface mb-2">
        <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      </div>
      <div className="flex gap-2">
        <img src={video.channel.avatarUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm line-clamp-2">{video.title}</p>
          <p className="text-yt-muted text-xs mt-0.5">{video.channel.channelName || video.channel.username}</p>
          <p className="text-yt-muted text-xs">{formatViewCount(video.viewCount)} views</p>
        </div>
      </div>
    </Link>
  )
}
