import { Home, Compass, PlaySquare, Library, History, Clock, ThumbsUp, Upload, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils'; // I'll create this helper

interface SidebarItemProps {
  icon: any;
  label: string;
  to: string;
  active?: boolean;
}

function SidebarItem({ icon: Icon, label, to, active }: SidebarItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-5 px-3 py-2.5 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-white/10 text-white font-semibold" 
          : "text-yt-gray hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("w-6 h-6", active ? "text-yt-red" : "group-hover:text-yt-red")} />
      <span className="text-sm tracking-tight">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-yt-black p-3 z-40 overflow-y-auto border-r border-yt-border hidden lg:block">
      <div className="space-y-1">
        <SidebarItem icon={Home} label="Home" to="/" active={location.pathname === '/'} />
        <SidebarItem icon={Compass} label="Explore" to="/explore" active={location.pathname === '/explore'} />
        <SidebarItem icon={PlaySquare} label="Subscriptions" to="/subscriptions" active={location.pathname === '/subscriptions'} />
      </div>

      <div className="my-4 border-t border-yt-border" />

      <div className="space-y-1">
        <SidebarItem icon={Library} label="Library" to="/library" active={location.pathname === '/library'} />
        <SidebarItem icon={History} label="History" to="/history" active={location.pathname === '/history'} />
        <SidebarItem icon={Clock} label="Watch later" to="/watch-later" active={location.pathname === '/watch-later'} />
        <SidebarItem icon={ThumbsUp} label="Liked videos" to="/liked" active={location.pathname === '/liked'} />
      </div>

      <div className="my-4 border-t border-yt-border" />

      <div className="space-y-1">
        <SidebarItem icon={Upload} label="Upload Video" to="/upload" active={location.pathname === '/upload'} />
        <SidebarItem icon={User} label="My Channel" to="/my-channel" active={location.pathname === '/my-channel'} />
      </div>
    </aside>
  );
}
