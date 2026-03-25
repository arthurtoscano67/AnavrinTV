import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Play, Shield, Zap, Globe, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthFlowProps {
  onZKLogin: () => void;
}

export function AuthFlow({ onZKLogin }: AuthFlowProps) {
  const account = useCurrentAccount();

  return (
    <div className="min-h-screen bg-yt-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yt-red/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-lg text-center space-y-12 relative z-10"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="bg-yt-red p-4 rounded-3xl shadow-2xl shadow-yt-red/20 animate-pulse">
            <Play className="w-16 h-16 fill-white text-white" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter italic">SuiTube</h1>
          <p className="text-yt-gray text-lg font-medium max-w-sm mx-auto leading-tight">
            The next generation of video sharing, powered by <span className="text-white font-bold">Sui</span> & <span className="text-white font-bold">Walrus</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-yt-dark p-6 rounded-3xl border border-yt-border hover:border-yt-red transition-all group shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-yt-black rounded-2xl flex items-center justify-center border border-yt-border group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-yt-red" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Web3 Native</h3>
                <p className="text-xs text-yt-gray">Connect your Sui wallet for full ownership of your content.</p>
              </div>
              <div className="w-full flex justify-center pt-2">
                <ConnectButton />
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-yt-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-yt-black px-4 text-yt-gray font-bold tracking-widest">OR</span>
            </div>
          </div>

          <button 
            onClick={onZKLogin}
            className="w-full bg-white text-black hover:bg-white/90 font-black py-5 rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 group"
          >
            <Zap className="w-6 h-6 fill-black group-hover:scale-110 transition-transform" />
            Sign in with ZKLogin
          </button>
        </div>

        <div className="flex items-center justify-center gap-8 pt-8">
          <div className="flex flex-col items-center gap-2 text-yt-gray">
            <Globe className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Decentralized</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-yt-gray">
            <Lock className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-yt-gray">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Lightning Fast</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
