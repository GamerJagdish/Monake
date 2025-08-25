"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { LoaderFive } from '@/components/ui/loader';
import { ArrowLeft, Trophy, Medal, Award, Crown, Users, Sparkles } from 'lucide-react';
import { useReadContract } from 'wagmi';
import { MONAKE_NFT_ABI } from '@/lib/nft-abi';
import { useMiniAppContext } from '@/hooks/use-miniapp-context';
import { sdk } from '@farcaster/miniapp-sdk';

interface NFTLeaderboardEntry {
  rank: number;
  address: string;
  balance: number;
  displayName?: string;
  avatar?: string;
  farcasterID?: number;
  identity?: string;
}

interface NFTLeaderboardData {
  leaderboard: NFTLeaderboardEntry[];
  totalSupply: number;
  totalHolders: number;
  message?: string;
  timestamp: string;
}

const NFT_CONTRACT_ADDRESS = '0x9d40e8d15af68f14fdf134120c03013cf0a16d00';

const NFTLeaderboardPage: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<NFTLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalHolders, setTotalHolders] = useState<number>(0);

  const { context: miniAppContext } = useMiniAppContext();
  const farcasterUser = miniAppContext?.user;

  // Fetch total supply with auto-refresh from smart contract
  const { data: fetchedTotalSupply, isLoading: isLoadingTotalSupply } = useReadContract({
    abi: MONAKE_NFT_ABI,
    address: NFT_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'totalSupply',
    query: {
      enabled: (NFT_CONTRACT_ADDRESS as string) !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 5000,
    }
  });

  // Function to handle Farcaster SDK profile viewing
  const handleFarcasterProfile = async (fid: number) => {
    // Check if we have current user's Farcaster context - this indicates SDK is working
    const isSdkWorking = farcasterUser && farcasterUser.fid && farcasterUser.username;
    
    if (!isSdkWorking) {
      console.log(`[handleFarcasterProfile] SDK not working (no user context), falling back to URL for FID: ${fid}`);
      // For URL fallback, we need a username, not FID - this will be handled in the click handler
      return false; // Return false to indicate SDK not available
    }

    try {
      console.log(`[handleFarcasterProfile] SDK working (user context available), attempting to view profile for FID: ${fid}`);
      await sdk.actions.viewProfile({ fid });
      console.log(`[handleFarcasterProfile] Successfully opened profile for FID: ${fid}`);
      return true; // Return true to indicate success
    } catch (error) {
      console.warn(`[handleFarcasterProfile] SDK viewProfile failed for FID ${fid}:`, error);
      return false; // Return false to indicate failure
    }
  };

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
      setTotalHolders(data.totalHolders || 0);
    } catch (err) {
      console.error('Error fetching NFT leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 300000);
    return () => clearInterval(interval);
  }, []);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-bold text-sm">
            1
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-black font-bold text-sm">
            2
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white font-bold text-sm">
            3
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-slate-300 font-bold text-sm">
            {rank}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-slate-200">
      

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-700">
        <div className="flex items-center justify-between p-4">
          <Link href="/nft" passHref>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all duration-200 border border-purple-500/30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </motion.button>
          </Link>
          
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <Trophy className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-bold text-purple-300 whitespace-nowrap">OG Leaderboard</h1>
          </div>
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-6 px-4">
        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Card className="bg-gray-800/60 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Total NFTs Minted</p>
                    <p className="text-xl font-bold text-purple-300">
                      {fetchedTotalSupply !== undefined ? Number(fetchedTotalSupply) : '...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Holders</p>
                    <p className="text-xl font-bold text-green-300">
                      {totalHolders}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-gray-800/60 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex text-white items-center justify-center py-12">
                  <LoaderFive text="Loading OG leaderboard..." />
                </div>
              ) : error ? (
                <div className="text-center py-12 px-4">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={fetchLeaderboard}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : leaderboardData?.leaderboard.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No NFT holders yet</p>
                  <p className="text-slate-500 text-sm">Be the first to mint an NFT!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {leaderboardData?.leaderboard.map((entry, index) => (
                    <motion.div
                      key={entry.address}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 hover:bg-gray-700/30 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank Badge */}
                        <div className="flex-shrink-0">
                          {getRankBadge(entry.rank)}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            {entry.avatar && (
                              <img
                                src={entry.avatar}
                                alt={entry.displayName || entry.address}
                                className="w-10 h-10 rounded-full border-2 border-purple-400/50 flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-200 truncate">
                                {entry.displayName ? (
                                  <button
                                    onClick={async () => {
                                      if (entry.farcasterID && entry.farcasterID > 0) {
                                        // Try SDK first when we have farcaster ID
                                        const sdkSuccess = await handleFarcasterProfile(entry.farcasterID);
                                        if (!sdkSuccess && entry.identity) {
                                          // Fallback to URL with username if SDK fails
                                          window.open(`https://farcaster.xyz/${entry.identity}`, '_blank');
                                        }
                                      } else if (entry.identity) {
                                        // Direct URL approach when no farcaster ID but have identity
                                        window.open(`https://farcaster.xyz/${entry.identity}`, '_blank');
                                      }
                                      // If no farcaster ID and no identity, do nothing
                                    }}
                                    className="text-left hover:text-purple-300 transition-colors cursor-pointer"
                                    title={entry.displayName}
                                  >
                                    {entry.displayName}
                                  </button>
                                ) : (
                                  <span className="text-slate-200">
                                    {`${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {`${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* NFT Count */}
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-green-400">
                              {entry.balance}
                            </span>
                            <span className="text-sm text-slate-400">
                              NFT{entry.balance !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Bottom Spacing */}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default NFTLeaderboardPage;
