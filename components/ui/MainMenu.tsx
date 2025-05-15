"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
// import Link from 'next/link'; // No longer directly using Link for About button
 // Import useRouter
import { BackgroundGradientAnimation } from './BackgroundGradientAnimation';
import { Volume2, VolumeX } from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { monadTestnet } from "viem/chains";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";

// Define chain ID to name mapping
const chainIdToName: Record<number, string> = {
  [monadTestnet.id]: 'Monad Testnet',
  1: 'Ethereum',
  42161: 'Arbitrum',
  8453: 'Base',
  666666666: 'Degen',
  100: 'Gnosis',
  10: 'Optimism',
  7777777: 'Zora',
  137: 'Polygon',
  11155111: 'Sepolia',
  421614: 'Arbitrum Sepolia',
  84532: 'Base Sepolia',
  11155420: 'Optimism Sepolia',
};

const SnakeGame = dynamic(() => import('../SnakeGame'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen">  <BackgroundGradientAnimation 
  gradientBackgroundStart="rgb(25, 25, 36)" 
  gradientBackgroundEnd="rgb(15, 15, 25)"
  firstColor="18, 113, 255"
  secondColor="221, 74, 255"
  thirdColor="100, 220, 255"
  fourthColor="200, 50, 50"
  fifthColor="180, 180, 50"
/> <div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-4 pointer-events-none text-3xl text-center md:text-4xl lg:text-7xl">
        <p className="bg-clip-text text-transparent drop-shadow-2xl bg-gradient-to-b from-white/80 to-white/20">
         Loading Game...
        </p>
      </div></div>,
});

const MainMenu: React.FC = () => {
  const router = useRouter(); // Initialize useRouter
  const [showSnakeGame, setShowSnakeGame] = useState(false);
  const [isLoadingAbout, setIsLoadingAbout] = useState(false); // New state for About page loading
  const [isMuted, setIsMuted] = useState(false);
  

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const { context: miniAppContext } = useMiniAppContext();
  const farcasterUser = miniAppContext?.user;

  const handlePlayClick = () => {
    setShowSnakeGame(true);
  };

  const handleAboutClick = () => {
    setIsLoadingAbout(true);
    // Simulate a small delay if needed, or directly push
    // setTimeout(() => router.push('/about'), 100); // Optional delay
    router.push('/about');
  };
  useEffect(() => {
    if (router) { // You can add a check to be safe
      router.prefetch('/about');
    }
  }, [router]);
  if (showSnakeGame) {
    return <SnakeGame onBackToMenu={() => setShowSnakeGame(false)} isMuted={isMuted} setIsMuted={setIsMuted} />;
  }

  if (isLoadingAbout) { // Show loading screen for About page
    return (
      <div className="flex items-center justify-center h-screen">
        <BackgroundGradientAnimation 
          gradientBackgroundStart="rgb(25, 25, 36)" 
          gradientBackgroundEnd="rgb(15, 15, 25)"
          firstColor="18, 113, 255"
          secondColor="221, 74, 255"
          thirdColor="100, 220, 255"
          fourthColor="200, 50, 50"
          fifthColor="180, 180, 50"
        />
        <div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-4 pointer-events-none text-3xl text-center md:text-4xl lg:text-7xl">
          <p className="bg-clip-text text-transparent drop-shadow-2xl bg-gradient-to-b from-white/80 to-white/20">
            Crawling🐍...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full text-slate-200 p-4 relative">
      <BackgroundGradientAnimation 
        gradientBackgroundStart="rgb(25, 25, 36)" 
        gradientBackgroundEnd="rgb(15, 15, 25)"
        firstColor="18, 113, 255"
        secondColor="221, 74, 255"
        thirdColor="100, 220, 255"
        fourthColor="200, 50, 50"
        fifthColor="180, 180, 50"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-gray-800/80 border-gray-700 shadow-xl rounded-xl backdrop-blur-sm z-10 relative"
      >
        <motion.div
          className="absolute top-3 right-3 z-20"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button 
            onClick={() => setIsMuted(!isMuted)} 
            variant="outline" 
            size="icon" 
            className="p-2 h-auto bg-gray-800/50 hover:bg-gray-700/70 border-gray-700 text-slate-200 rounded-full"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
        </motion.div>
        <CardHeader className="pt-10 pb-4">
          {/* Wrapper for logo and title to position them inline */}
          <div className="flex flex-row items-center justify-center"> {/* Changed to flex-row and added justify-center */}
            <motion.img
              src="/images/logo.png" 
              alt="Monake Logo"
              className="w-12 h-12" // Adjusted size and changed mb-4 to mr-3
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
            <CardTitle className="text-4xl sm:text-5xl font-bold text-center monake-title">Monake</CardTitle>
          </div>
          
          {farcasterUser && (
            <motion.div 
              className="mt-6 mb-4 text-center flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {farcasterUser.pfpUrl && (
                <motion.img
                  src={farcasterUser.pfpUrl}
                  alt={`${farcasterUser.displayName}'s profile picture`}
                  className="w-16 h-16 rounded-full border-2 border-purple-400 shadow-lg mb-2"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
              )}
              <p className="text-lg font-semibold text-purple-300">
                Welcome, {farcasterUser.displayName}!
              </p>
              <p className="text-xs text-slate-400">
                @{farcasterUser.username}
              </p>
            </motion.div>
          )}

          <motion.div 
            className="mt-4 text-center text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {isConnected ? (
              <div className="space-y-2">
                <p className="text-slate-300">
                  Connected: {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                </p>
                <p className="text-slate-400 text-xs">
                  Chain: {chainId ? (chainIdToName[chainId] || `ID ${chainId}`) : 'N/A'}
                </p>
                {chainId !== monadTestnet.id && chainId && switchChain && (
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "#4A5568" }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-2 text-xs bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out border border-slate-500"
                    onClick={() => switchChain({ chainId: monadTestnet.id })}
                  >
                    Switch to Monad Testnet
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: "#C53030" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => disconnect()}
                  className="w-full py-2 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
                >
                  Disconnect Wallet
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (connectors && connectors.length > 0) {
                    connect({ connector: connectors[0] });
                  } else {
                    console.error('No connectors found.');
                  }
                }}
                className="w-full py-3 text-lg sm:text-xl bg-indigo-500 hover:bg-indigo-600 mt-3 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
              >
                Connect Wallet
              </motion.button>
            )}
          </motion.div>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-6 sm:p-8 pt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayClick}
            className="w-full py-3 text-lg sm:text-xl bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
          >
            Play Game
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled
            className="w-full py-3 text-lg sm:text-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md opacity-50 cursor-not-allowed transition-colors duration-150 ease-in-out"
          >
            Leaderboard (Coming Soon)
          </motion.button>
          {/* Updated About Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAboutClick} // Use the new handler
            className="w-full py-3 text-lg sm:text-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
          >
            About
          </motion.button>
        </CardContent>
      </motion.div>
    </div>
  );
};

export default MainMenu;

