"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BackgroundGradientAnimation } from '@/components/ui/BackgroundGradientAnimation';
import { useAccount, useSendTransaction, useSwitchChain, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { monadTestnet } from 'viem/chains';
import { parseEther, formatEther, createPublicClient, http, decodeEventLog } from 'viem';
import { ArrowLeft } from 'lucide-react';

const LEADERBOARD_CONTRACT_ADDRESS = '0x0aC28489445B4d1C55CF1B667BBdF6f20A31Abd9';
const LeaderboardABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newAllTimeHighScore",
          "type": "uint256"
        }
      ],
      "name": "AllTimeHighScoreUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "day",
          "type": "uint256"
        }
      ],
      "name": "EntryFeePaid",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "oldDay",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newDay",
          "type": "uint256"
        }
      ],
      "name": "PrizePoolReset",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "score",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "day",
          "type": "uint256"
        }
      ],
      "name": "ScoreSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "prizeAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "day",
          "type": "uint256"
        }
      ],
      "name": "WinnerDeclared",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "currentDayTimestamp",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "dailyHighestScore",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "dailyParticipants",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "dailyPlayerStats",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "score",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "hasPaidEntryFee",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "dailyPrizePool",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "dayToProcess",
          "type": "uint256"
        }
      ],
      "name": "declareWinnerAndDistributePrize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "entryFee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCurrentPrizePool",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "day",
          "type": "uint256"
        }
      ],
      "name": "getDailyParticipantsList",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getHighestScoreToday",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "getPlayerAllTimeHighScore",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "getPlayerScore",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "day",
          "type": "uint256"
        }
      ],
      "name": "getPlayerScoreForDay",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "hasPlayerPaidToday",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "payEntryFee",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "playerAllTimeHighScore",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_newFee",
          "type": "uint256"
        }
      ],
      "name": "setEntryFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "score",
          "type": "uint256"
        }
      ],
      "name": "submitScore",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address payable",
          "name": "to",
          "type": "address"
        }
      ],
      "name": "withdrawStuckFunds",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ];

interface LeaderboardEntry {
  rank: number;
  player: string; // Address
  score: number;
  displayName?: string;
  avatar?: string;
}

const LeaderboardPage: React.FC = () => {
  // console.log('[LeaderboardPage] Component rendering/mounting.');
  const { address, isConnected, chainId } = useAccount();
  // console.log('[LeaderboardPage] Account details: address:', address, 'isConnected:', isConnected, 'chainId:', chainId);
  const { switchChain } = useSwitchChain();
  const { data: hash, sendTransaction, isPending: isSendingEth, reset: resetSendTx } = useSendTransaction();
  const { writeContract, isPending: isConfirmingTx, data: writeData, reset: resetWriteContract } = useWriteContract();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [currentPrizePool, setCurrentPrizePool] = useState<string>('0');
  const [highestScoreToday, setHighestScoreToday] = useState<number>(0);
  const [hasPaid, setHasPaid] = useState<boolean>(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState<bigint>(parseEther('0.01'));
  const [currentDay, setCurrentDay] = useState<bigint | null>(null);
  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  // console.log('[LeaderboardPage] usePublicClient hook called. Initial publicClient (is it null/undefined?):', publicClient === null ? 'null' : publicClient === undefined ? 'undefined' : 'defined');

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
        setCurrentDay(dayAsBigInt);
        console.log('[LeaderboardPage] currentDay state successfully set to:', dayAsBigInt);
      } catch (e) {
        console.error('[LeaderboardPage] Error converting fetchedCurrentDay to BigInt:', fetchedCurrentDay, e);
        console.log('[LeaderboardPage] currentDay not set due to conversion error.');
      }
    } else {
      console.log('[LeaderboardPage] fetchedCurrentDay is undefined or null, currentDay not set. Value:', fetchedCurrentDay);
    }
  }, [fetchedCurrentDay]);

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

      // Get daily participants list
      const dailyParticipants = await publicClient.readContract({
        ...contract,
        functionName: 'getDailyParticipantsList',
        args: [currentDay],
      }) as `0x${string}`[];

      // Get scores for each participant
      const playerScoresPromises = dailyParticipants.map(async (player) => {
        const score = await publicClient.readContract({
          ...contract,
          functionName: 'getPlayerScoreForDay',
          args: [player, currentDay],
        }) as bigint;
        return { player, score };
      });

      const playerScores = await Promise.all(playerScoresPromises);

      // Sort playerScores by score in descending order and limit to top 50
      const sortedPlayerScores = [...playerScores]
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 50);

      // Initial leaderboard with wallet addresses
      const initialLeaderboard: LeaderboardEntry[] = sortedPlayerScores
        .map(({ player, score }, index) => ({
          rank: index + 1,
          player,
          score: Number(score),
          displayName: `${player.slice(0, 6)}...${player.slice(-4)}`,
          avatar: undefined,
        }));

      setLeaderboardData(initialLeaderboard);

      // Function to fetch a single profile
      const fetchProfile = async (address: string): Promise<{ displayName?: string; avatar?: string } | null> => {
        try {
          const response = await fetch(`/api/web3bio?address=${address}`);
          
          if (response.status === 404) {
            console.log(`[fetchProfile] No profile found for ${address}`);
            return null;
          }

          if (!response.ok) {
            console.error(`[fetchProfile] Error fetching profile for ${address}:`, response.status);
            return null;
          }
          
          const profile = await response.json();
          if (profile && profile.displayName) {
            console.log(`[fetchProfile] Successfully fetched profile for ${address}`);
            return {
              displayName: profile.displayName,
              avatar: profile.avatar
            };
          }
          return null;
        } catch (error) {
          console.error(`[fetchProfile] Error fetching profile for ${address}:`, error);
          return null;
        }
      };

      // Function to update leaderboard with profile data
      const updateLeaderboardWithProfile = (address: string, profile: { displayName?: string; avatar?: string }) => {
        setLeaderboardData(prevData => 
          prevData.map(entry => 
            entry.player.toLowerCase() === address.toLowerCase()
              ? { ...entry, displayName: profile.displayName || entry.displayName, avatar: profile.avatar }
              : entry
          )
        );
      };

      // Fetch profiles in background
      const fetchProfilesInBackground = async () => {
        // Process all profiles in parallel since we have API key
        const profilePromises = sortedPlayerScores.map(async ({ player }) => {
          const profile = await fetchProfile(player);
          if (profile) {
            updateLeaderboardWithProfile(player, profile);
          }
        });
        
        await Promise.all(profilePromises);
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

  // Interval fetching
  useEffect(() => {
    console.log('[LeaderboardPage] Setting up interval fetch. publicClient:', !!publicClient, 'currentDay:', currentDay);
    const interval = setInterval(() => {
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
  }, [publicClient, currentDay, fetchLeaderboard]);

  // Log publicClient whenever it changes to ensure it's being created
  useEffect(() => {
    console.log('[LeaderboardPage] publicClient instance updated:', publicClient);
  }, [publicClient]);

  // Initial fetch if not covered by above
  useEffect(() => {
    if ((LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE') {
        refetchCurrentDay(); // Initial fetch for current day
    }
  }, [refetchCurrentDay]);

  // This useEffect was for the mock data, we'll replace its core logic
  // useEffect(() => {
  //   fetchLeaderboard();
  //   const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30 seconds
  //   return () => clearInterval(interval);
  // }, [fetchLeaderboard]);



  const handlePayEntryFee = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet.');
      return;
    }
    if (chainId !== monadTestnet.id) {
      alert('WRONG NETWORK: Please switch to Monad Testnet to pay the entry fee.');
      switchChain?.({ chainId: monadTestnet.id });
      return;
    }
    if ((LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE') {
      alert('Leaderboard contract address is not set. Please inform the developer.');
      return;
    }

    // Secondary chain check before writing to contract
    if (chainId !== monadTestnet.id) {
      alert('CRITICAL: Transaction halted. You are not on the Monad Testnet. Please switch and try again.');
      return;
    }

    try {
      resetWriteContract();
      writeContract({
        abi: LeaderboardABI,
        address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'payEntryFee',
        value: entryFeeAmount,
      });
    } catch (error) {
      console.error('Error paying entry fee:', error);
      alert(`Error paying entry fee: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  useEffect(() => {
    if (writeData) { // Transaction sent
      alert('Entry fee transaction submitted! Waiting for confirmation.');
      // Optionally, you can use useWaitForTransactionReceipt here for better UX
    }
    // After confirmation (or if writeContract hook provides success status directly)
    // refetchHasPaid();
    // refetchPrizePool();
  }, [writeData]);

  // Countdown to 00:00 UTC
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
    };
    calculateTimeToReset();
    const intervalId = setInterval(calculateTimeToReset, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full text-slate-200 p-4 relative pb-24">
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
        className="w-full max-w-2xl bg-gray-800/80 border-gray-700 shadow-xl rounded-xl backdrop-blur-sm z-10 p-6 sm:p-8 relative"
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
                {leaderboardData.map((entry) => (
                  <li key={entry.rank} className="flex justify-between items-center bg-gray-700/70 p-3 rounded-lg shadow">
                    <span className="font-medium text-slate-300">#{entry.rank}</span>
                    <div className="flex items-center truncate w-1/2 px-2">
                      {entry.avatar && (
                        <img src={entry.avatar} alt={entry.displayName || entry.player} className="w-6 h-6 rounded-full mr-2 flex-shrink-0" />
                      )}
                      <span className="text-purple-300 text-sm sm:text-base truncate">
                        {entry.displayName || `${entry.player?.slice(0, 6)}...${entry.player?.slice(-4)}`}
                      </span>
                    </div>
                    <span className="font-bold text-yellow-400">{entry.score} pts</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-slate-400">No scores submitted yet today. Be the first!</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-6 text-center">
          <p className="text-xs text-slate-500">
            Leaderboard resets daily at 00:00 UTC. Highest score of the day wins the prize pool.
            Ensure you are on Monad Testnet to participate.
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
                disabled={isSendingEth || isConfirmingTx}
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                {isSendingEth || isConfirmingTx ? 'Processing...' : `Buy (${formatEther(entryFeeAmount)} MON)`}
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