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
import { Volume2, VolumeX, ArrowDown } from 'lucide-react';
import { SiFarcaster} from 'react-icons/si';
import { useReadContract, useWriteContract } from 'wagmi'; // Added for contract interaction
import { parseEther, formatEther } from 'viem'; // Added for ETH formatting
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { monadTestnet } from "viem/chains";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { sdk } from '@farcaster/frame-sdk';
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

// TODO: Replace with actual ABI and Contract Address after deployment
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

const MainMenu: React.FC = () => {
  const router = useRouter(); // Initialize useRouter
  const [showSnakeGame, setShowSnakeGame] = useState(false);
  const [isLoadingAbout, setIsLoadingAbout] = useState(false); // New state for About page loading
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false); // New state for Leaderboard page loading
  const [isMuted, setIsMuted] = useState(false);
  const [entryFeeAmount, setEntryFeeAmount] = useState<bigint>(parseEther('0.01'));
  const [hasPaidForToday, setHasPaidForToday] = useState<boolean>(false);
  const { writeContract, isPending: isPayingFee, data: payFeeData, reset: resetPayFee, error: payFeeError } = useWriteContract();
  

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const { context: miniAppContext } = useMiniAppContext();
  const farcasterUser = miniAppContext?.user;

  // Fetch entry fee amount
  const { data: fetchedEntryFee, isLoading: isLoadingEntryFee } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'entryFee',
    query: {
    enabled: (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE',
    }
  });

  useEffect(() => {
    if (fetchedEntryFee) {
      setEntryFeeAmount(fetchedEntryFee as bigint);
    }
  }, [fetchedEntryFee]);

  // Check if player has paid today
  const { data: fetchedHasPaid, refetch: refetchHasPaid, isLoading: isLoadingHasPaid } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'hasPlayerPaidToday',
    args: [address as `0x${string}`],
    query: {
    enabled: !!address && isConnected && (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE',
    }
  });

  useEffect(() => {
    if (typeof fetchedHasPaid === 'boolean') {
      setHasPaidForToday(fetchedHasPaid);
    }
  }, [fetchedHasPaid]);

  useEffect(() => {
    if (payFeeData) { // Transaction sent
      alert('Entry fee transaction submitted! Waiting for confirmation...');
      // After confirmation, refetch payment status
      const checkConfirmation = async () => {
        // Simple timeout based refetch, ideally use useWaitForTransactionReceipt
        setTimeout(() => {
          refetchHasPaid();
        }, 7000); // Check after 7s
      };
      checkConfirmation();
    }
    if (payFeeError) {
      alert(`Failed to send transaction: ${payFeeError.message}`);
    }
  }, [payFeeData, refetchHasPaid, payFeeError]);

  const handlePayEntryFee = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first.');
      if (connectors.length > 0 && !isConnected) {
        connect({ connector: connectors[0] });
      }
      return;
    }
    if (chainId !== monadTestnet.id) {
      try {
        await switchChain?.({ chainId: monadTestnet.id });
        // Wait a brief moment for chain switch to settle before proceeding
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        alert('Please switch to Monad Testnet in your wallet and try again.');
        return;
      }
    }
    if ((LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE') {
      alert('Leaderboard contract address is not set. Please inform the developer.');
      return;
    }
    if (hasPaidForToday) {
      alert('You have already paid the entry fee for today.');
      return;
    }
    if (isLoadingEntryFee || !entryFeeAmount || entryFeeAmount === 0n) {
      alert('Entry fee not loaded yet. Please wait a moment.');
      return;
    }

    try {
      resetPayFee();
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
    // Keep native gestures disabled all the time
    sdk.actions.ready({ disableNativeGestures: true });
    // No need for cleanup since we want gestures disabled consistently

    // Automatically add frame on load
    const addFrameOnLoad = async () => {
      try {
        await sdk.actions.addFrame();
      } catch (error: any) {
        if (error && error.message && error.message.includes("Cannot read properties of undefined (reading 'result')")) {
          // It's okay to not show an alert here if the user isn't explicitly clicking a button.
          // console.log("Frame SDK not available or not in Farcaster environment.");
        } else {
          console.error("Error adding frame automatically:", error);
        }
      }
    };
    addFrameOnLoad();
  }, []);

  const handlePlayClick = () => {
    setShowSnakeGame(true);
  };

  const handleAboutClick = () => {
    setIsLoadingAbout(true);
    // Simulate a small delay if needed, or directly push
    // setTimeout(() => router.push('/about'), 100); // Optional delay
    router.push('/about');
  };

  const handleLeaderboardClick = () => {
    setIsLoadingLeaderboard(true);
    router.push('/leaderboard');
  };

  useEffect(() => {
    if (router) { // You can add a check to be safe
      router.prefetch('/about');
      router.prefetch('/leaderboard'); // Prefetch leaderboard page
    }
  }, [router]);
  if (showSnakeGame) {
    return <SnakeGame onBackToMenu={() => {
      setShowSnakeGame(false);
      // Explicitly re-enable gestures when returning to menu
      sdk.actions.ready({ disableNativeGestures: false });
    }} isMuted={isMuted} setIsMuted={setIsMuted} />;
  }

  // isLoadingAbout and isLoadingLeaderboard will now be handled inline to show loading text over the background

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
      {isLoadingAbout || isLoadingLeaderboard ? (
        <div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-4 pointer-events-none text-3xl text-center md:text-4xl lg:text-7xl">
          <p className="bg-clip-text text-transparent drop-shadow-2xl bg-gradient-to-b from-white/80 to-white/20">
            {isLoadingAbout ? 'Crawling🐍...' : 'Fetching Leaderboard...'}
          </p>
        </div>
      ) : (
        <>
        {/* Removed redundant Crawling text here */}
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
            className="p-2 h-auto bg-gray-800/50 hover:bg-gray-50/80 border-gray-700 text-slate-200 rounded-full"
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
                  Connected: {address?.substring(0, 6)}...{address?.substring(address.length - 4)} ({chainId ? (chainIdToName[chainId] || `ID ${chainId}`) : 'N/A'})
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
            onClick={handleLeaderboardClick} // Use the new handler
            className="w-full py-3 text-lg sm:text-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
          >
            Leaderboard
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
          {/* Add to Farcaster button moved to top-left corner */}

          {isConnected && (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE' && (
            <motion.div 
              className="w-full mt-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              {!hasPaidForToday ? (
                <Button 
                  onClick={handlePayEntryFee} 
                  variant="default" 
                  className="w-full text-lg py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
                  disabled={isPayingFee || isLoadingEntryFee || isLoadingHasPaid || !entryFeeAmount || entryFeeAmount === 0n}
                >
                  {isPayingFee ? 'Processing...' : isLoadingEntryFee || isLoadingHasPaid ? 'Loading Status...' : `Get Daily Pass (${formatEther(entryFeeAmount)} MON)`}
                </Button>
              ) : (
                <p className="text-center text-green-400 py-2 text-md font-semibold">Daily Pass Active!</p>
              )}
            </motion.div>
          )}
        </CardContent>
      </motion.div>
        </>
      )}
    </div>
  );
};

export default MainMenu;

