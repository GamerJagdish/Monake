"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundGradientAnimation } from '@/components/ui/BackgroundGradientAnimation';
import { LoaderFive } from '@/components/ui/loader';
import { ArrowLeft, Trophy, Medal, Award, Crown } from 'lucide-react';

interface NFTLeaderboardEntry {
  rank: number;
  address: string;
  balance: number;
  displayName?: string;
  avatar?: string;
}

interface NFTLeaderboardData {
  leaderboard: NFTLeaderboardEntry[];
  totalSupply: number;
  message?: string;
  timestamp: string;
}

const NFTLeaderboardPage: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<NFTLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/nft-leaderboard?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      
      const data = await response.json();
      setLeaderboardData(data);
    } catch (err) {
      console.error('Error fetching NFT leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchLeaderboard, 300000);
    return () => clearInterval(interval);
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <Trophy className="w-4 h-4 text-purple-400" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border-yellow-400/50';
      case 2:
        return 'bg-gradient-to-r from-gray-300/20 to-gray-500/20 border-gray-300/50';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-800/20 border-amber-600/50';
      default:
        return 'bg-gray-800/50 border-gray-600/50';
    }
  };

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
        className="w-full max-w-2xl bg-gray-800/80 border-gray-700 shadow-xl rounded-xl backdrop-blur-sm z-10 relative"
      >
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold text-purple-300 flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            NFT Leaderboard
            <Trophy className="w-6 h-6" />
          </CardTitle>
          {leaderboardData && (
            <p className="text-slate-400 text-sm">
              Total NFTs Minted: {leaderboardData.totalSupply}
            </p>
          )}
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoaderFive text="Loading leaderboard..." />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchLeaderboard}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : leaderboardData?.leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No NFT holders found yet.</p>
              <p className="text-slate-500 text-sm">Be the first to mint an NFT!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData?.leaderboard.map((entry) => (
                <motion.div
                  key={entry.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: entry.rank * 0.1 }}
                  className={`p-4 rounded-lg border ${getRankColor(entry.rank)} transition-all duration-200 hover:scale-105`}
                >
                  <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2">
                       {getRankIcon(entry.rank)}
                       <span className="font-bold text-lg text-purple-300">
                         #{entry.rank}
                       </span>
                     </div>
                     <div className="flex items-center gap-3">
                       {entry.avatar && (
                         <img
                           src={entry.avatar}
                           alt={entry.displayName || entry.address}
                           className="w-8 h-8 rounded-full border-2 border-purple-400/50"
                           onError={(e) => {
                             e.currentTarget.style.display = 'none';
                           }}
                         />
                       )}
                       <div>
                         <p className="font-medium text-slate-200">
                           {entry.displayName || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                         </p>
                         <p className="text-xs text-slate-400">
                         {`${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                         </p>
                       </div>
                     </div>
                   </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-400">
                        {entry.balance} NFT{entry.balance !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          

          <div className="mt-6 flex justify-center">
            <Link href="/nft" passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to NFT Mint
              </motion.button>
            </Link>
          </div>
        </CardContent>
      </motion.div>
    </div>
  );
};

export default NFTLeaderboardPage;
