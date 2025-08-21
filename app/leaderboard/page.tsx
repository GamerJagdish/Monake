"use client";
import React, { useState, useEffect, useCallback } from 'react';

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BackgroundGradientAnimation } from '@/components/ui/BackgroundGradientAnimation';
import { useAccount, useSwitchChain, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
//import { monadTestnet } from 'viem/chains';
import { monadTestnet } from 'wagmi/chains'
import { parseEther, formatEther, createPublicClient, http } from 'viem';
import { ArrowLeft, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { SECURE_LEADERBOARD_ABI } from '@/lib/leaderboard-abi';
import { getSignedEntryFee, generateGameSession } from '@/lib/secure-score';
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { sdk } from '@farcaster/miniapp-sdk';

const LEADERBOARD_CONTRACT_ADDRESS = '0x9c36dd7af3c84727c43560f32f824067005a210c';
const LeaderboardABI = SECURE_LEADERBOARD_ABI;

interface LeaderboardEntry {
  rank: number;
  player: string; // Address
  score: number;
  displayName?: string;
  avatar?: string;
  identity?: string;
  farcasterID?: number;
}

// Define notification type
interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  title?: string;
}

const LeaderboardPage: React.FC = () => {
  // console.log('[LeaderboardPage] Component rendering/mounting.');
  const { address, isConnected, chainId } = useAccount();
  const { context: miniAppContext } = useMiniAppContext();
  const farcasterUser = miniAppContext?.user;
  // console.log('[LeaderboardPage] Account details: address:', address, 'isConnected:', isConnected, 'chainId:', chainId);
  const { switchChain } = useSwitchChain();
  const { writeContract, isPending: isConfirmingTx, data: writeData, reset: resetWriteContract } = useWriteContract();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [currentPrizePool, setCurrentPrizePool] = useState<string>('0');
  const [highestScoreToday, setHighestScoreToday] = useState<number>(0);
  const [hasPaid, setHasPaid] = useState<boolean>(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState<bigint>(parseEther('0.01'));
  const [currentDay, setCurrentDay] = useState<bigint | null>(null);
  const [lastKnownDay, setLastKnownDay] = useState<bigint | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  // console.log('[LeaderboardPage] usePublicClient hook called. Initial publicClient (is it null/undefined?):', publicClient === null ? 'null' : publicClient === undefined ? 'undefined' : 'defined');

  // Handle notification dismissal
  const dismissNotification = () => {
    setNotification(null);
  };

  // Auto-dismiss all notifications after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Helper function to get current day timestamp (client-side calculation)
  const getCurrentDayTimestamp = () => {
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return BigInt(Math.floor(utcMidnight.getTime() / 1000));
  };

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

  // Fetch entry fee
  const { data: fetchedEntryFee } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'entryFee',
    query: {
      refetchInterval: 600000, // 10 minutes
    }
  });

  useEffect(() => {
    if (fetchedEntryFee) {
      setEntryFeeAmount(fetchedEntryFee as bigint);
    }
  }, [fetchedEntryFee]);

  // Fetch current prize pool
  const { data: fetchedPrizePool, refetch: refetchPrizePool } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'getCurrentPrizePool',
    query: {
      refetchInterval: 600000, // 10 minutes
    }
  });

  useEffect(() => {
    if (fetchedPrizePool) {
      setCurrentPrizePool(formatEther(fetchedPrizePool as bigint));
    }
  }, [fetchedPrizePool]);

  // Fetch highest score today
  const { data: fetchedHighestScore, refetch: refetchHighestScore } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'getHighestScoreToday',
    query: {
      refetchInterval: 600000, // 10 minutes
    }
  });

  useEffect(() => {
    if (fetchedHighestScore) {
      setHighestScoreToday(Number(fetchedHighestScore));
    }
  }, [fetchedHighestScore]);

  // Fetch current day from contract
  const {
    data: fetchedCurrentDay,
    refetch: refetchCurrentDay,
    isLoading: isLoadingCurrentDay,
    isError: isErrorCurrentDay,
    error: errorCurrentDay
  } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'currentDayTimestamp',
    chainId: monadTestnet.id, // Explicitly set chainId
    query: {
      enabled: (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE',
      gcTime: 5000,
      refetchInterval: 600000, // 10 minutes
    }
  });

  useEffect(() => {
    console.log('[LeaderboardPage] currentDayTimestamp Hook Status: isLoading:', isLoadingCurrentDay, 'isError:', isErrorCurrentDay, 'data:', fetchedCurrentDay);
    if (errorCurrentDay) {
      console.error('[LeaderboardPage] Error fetching currentDay:', errorCurrentDay);
    }
  }, [isLoadingCurrentDay, isErrorCurrentDay, fetchedCurrentDay, errorCurrentDay]);

  useEffect(() => {
    console.log('[LeaderboardPage] useEffect for fetchedCurrentDay triggered. Raw fetchedCurrentDay:', fetchedCurrentDay, 'Type:', typeof fetchedCurrentDay);
    if (fetchedCurrentDay !== undefined && fetchedCurrentDay !== null) {
      try {
        const dayAsBigInt = BigInt(fetchedCurrentDay as any);
        
        // Check if day has changed
        if (lastKnownDay !== null && dayAsBigInt !== lastKnownDay) {
          console.log('[LeaderboardPage] Day changed detected! Clearing old data. Old day:', lastKnownDay, 'New day:', dayAsBigInt);
          // Clear old data when day changes
          setLeaderboardData([]);
          setCurrentPrizePool('0');
          setHighestScoreToday(0);
          setHasPaid(false);
        }
        
        setCurrentDay(dayAsBigInt);
        setLastKnownDay(dayAsBigInt);
        console.log('[LeaderboardPage] currentDay state successfully set to:', dayAsBigInt);
      } catch (e) {
        console.error('[LeaderboardPage] Error converting fetchedCurrentDay to BigInt:', fetchedCurrentDay, e);
        console.log('[LeaderboardPage] currentDay not set due to conversion error.');
      }
    } else {
      console.log('[LeaderboardPage] fetchedCurrentDay is undefined or null, currentDay not set. Value:', fetchedCurrentDay);
    }
  }, [fetchedCurrentDay, lastKnownDay]);

  // Check if player has paid today
  const { data: fetchedHasPaid, refetch: refetchHasPaid } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'hasPlayerPaidToday',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 600000, // 10 minutes
    }
  });

  useEffect(() => {
    if (typeof fetchedHasPaid === 'boolean') {
      setHasPaid(fetchedHasPaid);
    }
  }, [fetchedHasPaid]);

  const fetchLeaderboard = useCallback(async () => {
    console.log('[fetchLeaderboard] Called. Current state: publicClient available -', !!publicClient, ', currentDay -', currentDay, ', contract address -', LEADERBOARD_CONTRACT_ADDRESS);
    if (!publicClient || currentDay === null || (LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE') {
      console.error('[fetchLeaderboard] Aborting: Crucial data missing. publicClient:', !!publicClient, 'currentDay:', currentDay, 'contractAddress:', LEADERBOARD_CONTRACT_ADDRESS);
      setIsLoadingData(false); // Ensure loading is false if we can't proceed
      return;
    }

    console.log('[fetchLeaderboard] Conditions met, proceeding to fetch. Setting isLoadingData to true.');
    setIsLoadingData(true);

    try {
      // Get the list of participants for the current day using the contract function
      const contract = {
        abi: LeaderboardABI,
        address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
      };

      // First, verify contract is accessible by calling a simple function
      try {
        const contractCurrentDay = await publicClient.readContract({
          ...contract,
          functionName: 'currentDayTimestamp',
        }) as bigint;
        console.log('[fetchLeaderboard] Contract verification successful. Contract currentDay:', contractCurrentDay, 'Our currentDay:', currentDay);

        // Check if our currentDay matches the contract's currentDay
        if (contractCurrentDay !== currentDay) {
          console.warn('[fetchLeaderboard] WARNING: Our currentDay differs from contract currentDay. Using contract value.');
          // Optionally update our currentDay to match the contract
          // setCurrentDay(contractCurrentDay);
          // return; // Exit and let the useEffect re-trigger with the correct day
        }
      } catch (verifyError) {
        console.error('[fetchLeaderboard] Contract verification failed:', verifyError);
        throw new Error('Contract not accessible: ' + verifyError);
      }

      // Get daily participants list - try the most reliable approach first
      console.log('[fetchLeaderboard] About to call getDailyParticipantsList with day:', currentDay, 'type:', typeof currentDay);

      // Ensure currentDay is properly formatted as a number for the contract call
      const dayArg = typeof currentDay === 'bigint' ? currentDay : BigInt(currentDay);
      console.log('[fetchLeaderboard] Calling with dayArg:', dayArg, 'type:', typeof dayArg);

      let dailyParticipants: `0x${string}`[];
      
      // Try the most reliable approach first (fresh client with no multicall)
      try {
        console.log('[fetchLeaderboard] Trying with fresh client instance first...');
        const freshClient = createPublicClient({
          chain: monadTestnet,
          transport: http(),
          batch: {
            multicall: false,
          },
        });

        dailyParticipants = await freshClient.readContract({
          ...contract,
          functionName: 'getDailyParticipantsList',
          args: [dayArg],
        }) as `0x${string}`[];
        console.log('[fetchLeaderboard] Fresh client successful, got:', dailyParticipants?.length, 'participants');
      } catch (freshClientError) {
        console.warn('[fetchLeaderboard] Fresh client approach failed:', freshClientError);
        
        // Fallback to original publicClient
        try {
          console.log('[fetchLeaderboard] Trying with original publicClient...');
          dailyParticipants = await publicClient.readContract({
            ...contract,
            functionName: 'getDailyParticipantsList',
            args: [dayArg],
          }) as `0x${string}`[];
          console.log('[fetchLeaderboard] Original publicClient successful, got:', dailyParticipants?.length, 'participants');
        } catch (originalError) {
          console.warn('[fetchLeaderboard] Original publicClient approach failed:', originalError);
          
          // Final fallback using events
          try {
            console.log('[fetchLeaderboard] Trying alternative approach using EntryFeePaid events...');

            // Get EntryFeePaid events for today to reconstruct participant list
            const logs = await publicClient.getLogs({
              address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
              event: {
                type: 'event',
                name: 'EntryFeePaid',
                inputs: [
                  { name: 'player', type: 'address', indexed: true },
                  { name: 'amount', type: 'uint256', indexed: false },
                  { name: 'day', type: 'uint256', indexed: false }
                ]
              },
              fromBlock: 'earliest',
              toBlock: 'latest'
            });

            console.log('[fetchLeaderboard] Found', logs.length, 'EntryFeePaid events for today');

            // Extract unique participant addresses
            const participantSet = new Set<string>();
            logs.forEach((log: any) => {
              if (log.args?.player) {
                participantSet.add(log.args.player);
              }
            });

            dailyParticipants = Array.from(participantSet) as `0x${string}`[];
            console.log('[fetchLeaderboard] Event-based approach successful, got:', dailyParticipants.length, 'unique participants');

          } catch (eventError) {
            console.error('[fetchLeaderboard] All approaches failed:', eventError);
            // Final fallback - show error message
            setLeaderboardData([]);
            console.log('[fetchLeaderboard] All methods failed. Unable to load leaderboard.');
            return;
          }
        }
      }

      // Handle empty participants list
      if (!dailyParticipants || dailyParticipants.length === 0) {
        console.log('[fetchLeaderboard] No participants found for day:', currentDay);
        setLeaderboardData([]);
        return;
      }

      // Get scores and farcaster data for each participant (with batching for performance)
      console.log('[fetchLeaderboard] Getting scores and farcaster data for', dailyParticipants.length, 'participants');

      // Process in batches to avoid overwhelming the RPC
      const batchSize = 200;
      const playerData: { player: string; score: bigint; farcasterID: number; username: string }[] = [];

      for (let i = 0; i < dailyParticipants.length; i += batchSize) {
        const batch = dailyParticipants.slice(i, i + batchSize);
        console.log(`[fetchLeaderboard] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dailyParticipants.length / batchSize)} (${batch.length} participants)`);

        const batchPromises = batch.map(async (player) => {
          try {
            // Get player profile which includes score and farcaster ID
            const profile = await publicClient.readContract({
              ...contract,
              functionName: 'getPlayerProfile',
              args: [player],
            }) as [bigint, bigint, bigint, string, boolean]; // [currentScore, allTimeHighScore, farcasterID, username, hasPaidToday]
            
            const [currentScore, , farcasterID, username] = profile;
            return { 
              player, 
              score: currentScore, 
              farcasterID: Number(farcasterID),
              username: username || ''
            };
          } catch (error) {
            console.warn(`[fetchLeaderboard] Failed to get profile for player ${player}:`, error);
            // Fallback to just getting the score
            try {
              const score = await publicClient.readContract({
                ...contract,
                functionName: 'getPlayerScoreForDay',
                args: [player, currentDay],
              }) as bigint;
              return { player, score, farcasterID: 0, username: '' };
            } catch (scoreError) {
              console.warn(`[fetchLeaderboard] Failed to get score for player ${player}:`, scoreError);
              return { player, score: 0n, farcasterID: 0, username: '' };
            }
          }
        });

        const batchResults = await Promise.all(batchPromises);
        playerData.push(...batchResults);

        // Small delay between batches to be nice to the RPC
        if (i + batchSize < dailyParticipants.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('[fetchLeaderboard] Got scores and farcaster data for all participants:', playerData.length);

      // Sort playerData by score in descending order and limit to top 50
      const sortedPlayerData = [...playerData]
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 50);

      // Initial leaderboard with wallet addresses and farcaster IDs
      const initialLeaderboard: LeaderboardEntry[] = sortedPlayerData
        .map(({ player, score, farcasterID, username }, index) => ({
          rank: index + 1,
          player,
          score: Number(score),
          farcasterID: farcasterID > 0 ? farcasterID : undefined,
          displayName: undefined,
          avatar: undefined,
        }));

      setLeaderboardData(initialLeaderboard);

      // Function to fetch a single profile
      const fetchProfile = async (address: string, contractData?: { farcasterID?: number; username?: string }): Promise<{ displayName?: string; avatar?: string; identity?: string } | null> => {
        try {
          const response = await fetch(`/api/web3bio?address=${address}`);

          if (response.status === 404) {
            // Handle 404 by creating dummy profile from contract data
            if (contractData?.username && contractData.username.length > 0) {
              return {
                displayName: contractData.username,
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`, // Generate dummy avatar
                identity: contractData.username
              };
            } else if (contractData?.farcasterID && contractData.farcasterID > 0) {
              return {
                displayName: `User ${contractData.farcasterID}`,
                avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`, // Generate dummy avatar
                identity: `user-${contractData.farcasterID}`
              };
            }
            return null;
          }

          if (!response.ok) {
            return null;
          }

          const profile = await response.json();
          // Only return profile if it has a valid displayName
          if (profile?.displayName && typeof profile.displayName === 'string' && profile.displayName.length > 0) {
            return {
              displayName: profile.displayName,
              avatar: profile.avatar,
              identity: profile.identity
            };
          }
          return null;
        } catch (error) {
          console.error(`[fetchProfile] Error fetching profile for ${address}:`, error);
          return null;
        }
      };

      // Function to update leaderboard with profile data
      const updateLeaderboardWithProfile = (address: string, profile: { displayName?: string; avatar?: string; identity?: string }) => {
        // Only update if we have a valid displayName
        if (profile.displayName && typeof profile.displayName === 'string' && profile.displayName.length > 0) {
          setLeaderboardData(prevData =>
            prevData.map(entry =>
              entry.player.toLowerCase() === address.toLowerCase()
                ? { ...entry, displayName: profile.displayName, avatar: profile.avatar, identity: profile.identity }
                : entry
            )
          );
        }
      };

      // Fetch profiles in background
      const fetchProfilesInBackground = async () => {
        // Process profiles sequentially in order of rank
        for (const { player, farcasterID, username } of sortedPlayerData) {
          // Always try to fetch profile data from web3bio for display names and avatars
          const profile = await fetchProfile(player, { farcasterID, username });
          if (profile) {
            updateLeaderboardWithProfile(player, profile);
          }
        }
      };

      // Start background profile fetching
      fetchProfilesInBackground().catch(error => {
        console.error('[fetchProfilesInBackground] Error:', error);
      });

    } catch (error) {
      console.error('[fetchLeaderboard] Error fetching or processing leaderboard data:', error);
      setLeaderboardData([]); // Clear data on error
    } finally {
      setIsLoadingData(false);
    }

    console.log('[fetchLeaderboard] Starting refetches...');
    refetchPrizePool();
    console.log('[fetchLeaderboard] refetchPrizePool called.');
    refetchHighestScore();
    console.log('[fetchLeaderboard] refetchHighestScore called.');
    if (isConnected && address) {
      refetchHasPaid();
      console.log('[fetchLeaderboard] refetchHasPaid called.');
    }
    if ((LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE') {
      // refetchCurrentDay(); // Commented out to prevent potential re-render cycle
      // console.log('[fetchLeaderboard] refetchCurrentDay called.');
    }
    console.log('[fetchLeaderboard] Refetches complete.');

  }, [publicClient, currentDay, refetchPrizePool, refetchHighestScore, isConnected, address, refetchHasPaid, refetchCurrentDay, setIsLoadingData, setLeaderboardData]);

  // Effect to fetch leaderboard when currentDay or publicClient is available
  useEffect(() => {
    console.log('[LeaderboardPage] useEffect for fetchLeaderboard (on publicClient/currentDay change) triggered. publicClient:', !!publicClient, 'currentDay:', currentDay);
    if (publicClient && currentDay !== null) {
      console.log('[LeaderboardPage] Conditions met, calling fetchLeaderboard from publicClient/currentDay useEffect.');
      fetchLeaderboard();
    } else {
      console.log('[LeaderboardPage] Conditions NOT met for fetchLeaderboard in publicClient/currentDay useEffect.');
    }
  }, [publicClient, currentDay, fetchLeaderboard]);

  // Interval fetching and day change detection
  useEffect(() => {
    console.log('[LeaderboardPage] Setting up interval fetch. publicClient:', !!publicClient, 'currentDay:', currentDay);
    const interval = setInterval(() => {
      // Check if day has changed based on client-side calculation
      const clientCurrentDay = getCurrentDayTimestamp();
      if (currentDay !== null && clientCurrentDay !== currentDay) {
        console.log('[LeaderboardPage] Client-side day change detected! Clearing old data. Contract day:', currentDay, 'Client day:', clientCurrentDay);
        // Clear old data immediately when client detects day change
        setLeaderboardData([]);
        setCurrentPrizePool('0');
        setHighestScoreToday(0);
        setHasPaid(false);
        // Trigger contract day refetch
        refetchCurrentDay();
      }
      
      console.log('[LeaderboardPage] Interval: Checking conditions to fetchLeaderboard. publicClient:', !!publicClient, 'currentDay:', currentDay);
      if (publicClient && currentDay !== null) {
        console.log('[LeaderboardPage] Interval: Conditions met, calling fetchLeaderboard.');
        fetchLeaderboard();
      } else {
        console.log('[LeaderboardPage] Interval: Conditions NOT met for fetchLeaderboard.');
      }
    }, 300000); // Refresh every 5 minutes
    return () => {
      console.log('[LeaderboardPage] Clearing interval fetch.');
      clearInterval(interval);
    };
  }, [publicClient, currentDay, fetchLeaderboard, refetchCurrentDay]);

  // Log publicClient whenever it changes to ensure it's being created
  useEffect(() => {
    console.log('[LeaderboardPage] publicClient instance updated:', publicClient);
  }, [publicClient]);

  // Initial fetch and client-side day change detection on mount
  useEffect(() => {
    if ((LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE') {
      refetchCurrentDay(); // Initial fetch for current day
    }
    
    // Also check for day change on component mount
    const clientCurrentDay = getCurrentDayTimestamp();
    if (currentDay !== null && clientCurrentDay !== currentDay) {
      console.log('[LeaderboardPage] Mount: Day change detected! Clearing old data. Contract day:', currentDay, 'Client day:', clientCurrentDay);
      setLeaderboardData([]);
      setCurrentPrizePool('0');
      setHighestScoreToday(0);
      setHasPaid(false);
    }
  }, [refetchCurrentDay, currentDay]);

  // This useEffect was for the mock data, we'll replace its core logic
  // useEffect(() => {
  //   fetchLeaderboard();
  //   const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30 seconds
  //   return () => clearInterval(interval);
  // }, [fetchLeaderboard]);



  const handlePayEntryFee = async () => {
    try {
      if (!isConnected || !address) {
        setNotification({
          id: 'connect-wallet-error',
          type: 'error',
          message: 'Connect wallet first',
          title: 'Wallet Required',
        });
        return;
      }
      if (chainId !== monadTestnet.id) {
        setNotification({
          id: 'switch-network-error',
          type: 'error',
          message: 'Switch to Monad Testnet',
          title: 'Wrong Network',
        });
        
        // Try to switch chain with error handling for getChainId issues
        if (switchChain) {
          switchChain({ chainId: monadTestnet.id });
        } else {
          // Fallback: try to switch using window.ethereum directly
          if (typeof window !== 'undefined' && window.ethereum) {
            try {
              window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${monadTestnet.id.toString(16)}` }],
              });
            } catch (switchError: any) {
              // If the chain doesn't exist, add it
              if (switchError.code === 4902) {
                window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: `0x${monadTestnet.id.toString(16)}`,
                    chainName: 'Monad Testnet',
                    nativeCurrency: {
                      name: 'MON',
                      symbol: 'MON',
                      decimals: 18,
                    },
                    rpcUrls: ['https://testnet-rpc.monad.xyz'],
                    blockExplorerUrls: ['https://testnet.monvision.io'],
                  }],
                });
              }
            }
          }
        }
        return;
      }
      if ((LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE') {
        setNotification({
          id: 'contract-address-error',
          type: 'error',
          message: 'Service temporarily unavailable',
          title: 'System Error',
        });
        return;
      }

      // Secondary chain check before writing to contract
      if (chainId !== monadTestnet.id) {
        setNotification({
          id: 'network-error',
          type: 'error',
          message: 'Switch to Monad Testnet and try again',
          title: 'Network Error',
        });
        return;
      }

      console.log('Starting entry fee payment process...');
      resetWriteContract();
      
      // Get Farcaster user data if available
      const farcasterID = farcasterUser?.fid || 0;
      const username = farcasterUser?.username || '';
      
      console.log('Farcaster data:', { farcasterID, username });
      
      // Create dummy game data for entry fee
      const gameData = {
        gameStartTime: Date.now() - 1000,
        gameEndTime: Date.now(),
        moves: [],
        finalScore: 0,
        gameSession: generateGameSession()
      };

      console.log('Getting signed entry fee...');
      // Get signed entry fee from server
      const signedFee = await getSignedEntryFee(
        address,
        entryFeeAmount.toString(),
        gameData,
        farcasterID,
        username
      );

      console.log('Signed fee received:', signedFee);
      console.log('Calling writeContract...');

      writeContract({
        abi: LeaderboardABI,
        address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'payEntryFee',
        args: [
          BigInt(signedFee.farcasterID),
          signedFee.username,
          BigInt(signedFee.timestamp),
          signedFee.signature as `0x${string}`
        ],
        value: entryFeeAmount,
      });

      console.log('writeContract called successfully');
    } catch (error) {
      console.error('Error in handlePayEntryFee:', error);
      // Simplify error messages for users
      let errorMessage = 'Transaction failed';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please try again';
        } else if (error.message.includes('getChainId')) {
          errorMessage = 'Wallet connection issue - please refresh the page and reconnect';
        }
      }

      setNotification({
        id: 'pay-fee-error',
        type: 'error',
        message: errorMessage,
        title: 'Payment Failed',
      });
    }
  };

  // Effect to handle transaction submission
  useEffect(() => {
    if (writeData) { // Transaction sent
      setNotification({
        id: 'pay-fee-success',
        type: 'success',
        message: 'Entry fee transaction submitted! Waiting for confirmation...',
        title: 'Transaction Submitted',
      });
      // After confirmation, refetch payment status
      const checkConfirmation = async () => {
        // Simple timeout based refetch, ideally use useWaitForTransactionReceipt
        setTimeout(() => {
          // refetchHasPaid();
          // refetchPrizePool();
        }, 7000); // Check after 7s
      };
      checkConfirmation();
    }
  }, [writeData]);

  // Countdown to 00:00 UTC and frequent day change detection
  const [timeToReset, setTimeToReset] = useState('');
  useEffect(() => {
    const calculateTimeToReset = () => {
      const now = new Date();
      const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrowUTC.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeToReset(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      
      // Check for day change every second (when countdown is running)
      const clientCurrentDay = getCurrentDayTimestamp();
      if (currentDay !== null && clientCurrentDay !== currentDay) {
        console.log('[LeaderboardPage] Countdown: Day change detected! Clearing old data. Contract day:', currentDay, 'Client day:', clientCurrentDay);
        setLeaderboardData([]);
        setCurrentPrizePool('0');
        setHighestScoreToday(0);
        setHasPaid(false);
        // Trigger contract day refetch
        refetchCurrentDay();
      }
    };
    calculateTimeToReset();
    const intervalId = setInterval(calculateTimeToReset, 1000);
    return () => clearInterval(intervalId);
  }, [currentDay, refetchCurrentDay]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full text-slate-200 p-4 relative pb-24">
      {/* Notification Component */}
      {notification && (
        <motion.div
          className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
        >
          <div className={`p-3 rounded-lg shadow-lg border backdrop-blur-sm ${notification.type === 'success'
            ? 'bg-green-600/95 border-green-400 text-white'
            : notification.type === 'error'
              ? 'bg-red-600/95 border-red-400 text-white'
              : 'bg-blue-600/95 border-blue-400 text-white'
            }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {notification.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                {notification.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {notification.type === 'info' && <Info className="w-4 h-4 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <h4 className="font-medium text-xs mb-0.5 truncate">{notification.title}</h4>
                  )}
                  <p className="text-xs leading-tight">{notification.message}</p>
                </div>
              </div>
              <button
                onClick={dismissNotification}
                className="text-white/80 hover:text-white transition-colors flex-shrink-0 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

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
        className="w-full max-w-2xl bg-gray-800/80 border-gray-700 shadow-xl rounded-xl backdrop-blur-sm z-10 p-4 sm:p-6 relative"
      >
        <Link href="/" passHref className="absolute top-4 left-4 text-slate-300 hover:text-slate-100 transition-colors z-20">
          <ArrowLeft size={28} />
        </Link>

        <CardHeader className="pt-6 pb-4 text-center">
          <CardTitle className="text-4xl sm:text-5xl font-bold monake-title">Daily Leaderboard</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center space-y-6 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 w-full text-center">
            <Card className="bg-gray-700/50 p-2 sm:p-4 rounded-lg">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-400">Time to Reset</CardTitle>
              <p className="text-lg sm:text-2xl font-bold text-purple-300">{timeToReset}</p>
            </Card>
            <Card className="bg-gray-700/50 p-2 sm:p-4 rounded-lg">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-400">Prize Pool</CardTitle>
              <p className="text-lg sm:text-2xl font-bold text-green-400">{currentPrizePool} MON</p>
            </Card>
            <Card className="bg-gray-700/50 p-2 sm:p-4 rounded-lg col-span-2 sm:col-span-1">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-400">Highest Score</CardTitle>
              <p className="text-lg sm:text-2xl font-bold text-yellow-400">{highestScoreToday}</p>
            </Card>
          </div>

          <div className="w-full mt-6">
            <h3 className="text-2xl font-semibold text-center mb-4 text-slate-100">Top 50 Snakes</h3>
            {isLoadingData ? (
              <p className="text-center text-slate-400">Loading leaderboard...</p>
            ) : leaderboardData.length > 0 ? (
              <ul className="space-y-3">
                {leaderboardData.map((entry) => {
                  let bgClass = "bg-gray-700/70";
                  let textClass = "text-slate-300";
                  let hoverClass = "hover:text-purple-200";
                  if (entry.rank === 1) {
                    bgClass = "bg-gradient-to-r from-yellow-400 to-yellow-200";
                    textClass = "text-slate-900";
                    hoverClass = "hover:text-purple-400";
                  } else if (entry.rank === 2) {
                    bgClass = "bg-gradient-to-r from-gray-300 to-gray-100";
                    textClass = "text-slate-900";
                    hoverClass = "hover:text-purple-400";
                  } else if (entry.rank === 3) {
                    bgClass = "bg-gradient-to-r from-[#b87333] to-[#d7976a]"; // true bronze
                    textClass = "text-white";
                    hoverClass = "hover:text-purple-200";
                  }
                  return (
                    <li key={entry.rank} className={`flex flex-col ${bgClass} p-2 rounded-lg shadow min-h-0`}>
                      <div className="flex items-center w-full gap-2">
                        <span className={`font-medium text-xs w-6 text-center ${textClass}`}>{entry.rank}</span>
                        {entry.avatar && (
                          <img src={entry.avatar} alt={entry.displayName || entry.player} className="w-6 h-6 rounded-full mr-2 flex-shrink-0" />
                        )}
                        <div className="flex flex-col">
                          <span
                            className={`text-xs font-semibold truncate max-w-[100px] sm:max-w-[140px] ${textClass}`}
                            title={entry.displayName || (entry.farcasterID ? `Farcaster ID: ${entry.farcasterID}` : entry.player)}
                            style={{ wordBreak: 'break-word' }}
                          >
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
                                className={`transition-colors text-left ${textClass} ${hoverClass}`}
                                style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.95em' }}
                              >
                                {entry.displayName}
                              </button>
                            ) : (
                              <span className={textClass}>
                                {`${entry.player.slice(0, 6)}...${entry.player.slice(-4)}`}
                              </span>
                            )}
                          </span>
                          <span className={`font-bold text-[0.7rem] mt-0.5 ${textClass}`}>{entry.score} pts</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-slate-400">No scores submitted yet today. Be the first!</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-6 text-center">
          <p className="text-xs text-slate-500">
            Leaderboard resets daily at 00:00 UTC. Prize pool is distributed: 1st place (70%), 2nd place (20%), 3rd place (10%).
            Tied scores split their combined prize equally. Ensure you are on Monad Testnet to participate.
          </p>
        </CardFooter>
      </motion.div>

      {/* Floating Tab Banner */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-md md:max-w-lg lg:max-w-xl bg-gray-800/90 backdrop-blur-md border border-gray-700 p-4 z-50 rounded-xl shadow-2xl">
        <div className="w-full flex items-center justify-between">
          {!isConnected ? (
            <div className="w-full text-center text-yellow-400">
              Connect your wallet to participate.
            </div>
          ) : !hasPaid ? (
            <div className="w-full flex items-center justify-between">
              <span className="text-white font-semibold">Buy Pass to Join</span>
              <Button
                onClick={handlePayEntryFee}
                disabled={isConfirmingTx}
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                {isConfirmingTx ? 'Processing...' : `Buy (${formatEther(entryFeeAmount)} MON)`}
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Your Address</span>
                <span className="text-white font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-gray-400 text-sm">Your Score</span>
                <span className="text-yellow-400 font-bold text-xl">{leaderboardData.find(entry => entry.player.toLowerCase() === address?.toLowerCase())?.score || 0} pts</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;