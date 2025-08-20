"use client";
import React, { useState, useEffect } from 'react';

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
// import Link from 'next/link'; // No longer directly using Link for About button
// Import useRouter
import { BackgroundGradientAnimation } from './BackgroundGradientAnimation';
import { Volume2, VolumeX, ArrowDown, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { SiFarcaster } from 'react-icons/si';
import { useReadContract, useWriteContract } from 'wagmi'; // Added for contract interaction
import { parseEther, formatEther } from 'viem'; // Added for ETH formatting
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { monadTestnet } from "viem/chains";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { sdk } from '@farcaster/miniapp-sdk';
import { SECURE_LEADERBOARD_ABI } from '@/lib/leaderboard-abi';
import { getSignedEntryFee, generateGameSession } from '@/lib/secure-score';
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

const LEADERBOARD_CONTRACT_ADDRESS = '0x9c36dd7af3c84727c43560f32f824067005a210c';
const LeaderboardABI = SECURE_LEADERBOARD_ABI;

// Define notification type
interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  title?: string;
}

const MainMenu: React.FC = () => {
  const router = useRouter(); // Initialize useRouter
  const [showSnakeGame, setShowSnakeGame] = useState(false);
  const [isLoadingAbout, setIsLoadingAbout] = useState(false); // New state for About page loading
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false); // New state for Leaderboard page loading
  const [isMuted, setIsMuted] = useState(false);
  const [showBanner, setShowBanner] = useState(false); // State to control banner visibility
  const [entryFeeAmount, setEntryFeeAmount] = useState<bigint>(parseEther('0.01'));
  const [hasPaidForToday, setHasPaidForToday] = useState<boolean>(false);
  const [playerAllTimeHighScore, setPlayerAllTimeHighScore] = useState<bigint | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const { writeContract, isPending: isPayingFee, data: payFeeData, reset: resetPayFee, error: payFeeError } = useWriteContract();


  const { address, isConnected, chainId, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const { context: miniAppContext } = useMiniAppContext();
  const farcasterUser = miniAppContext?.user;

  // Check localStorage for banner dismissal on component mount
  useEffect(() => {
    const bannerDismissed = localStorage.getItem('monake-banner-dismissed');
    if (!bannerDismissed) {
      setShowBanner(true);
    }
  }, []);

  // Handle banner dismissal with localStorage persistence
  const handleBannerDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('monake-banner-dismissed', 'true');
  };

  // Handle notification dismissal
  const dismissNotification = () => {
    setNotification(null);
  };

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

  // Fetch player's all-time high score
  const { data: fetchedPlayerAllTimeHighScore, isLoading: isLoadingPlayerAllTimeHighScore } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'getPlayerAllTimeHighScore',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && isConnected && (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE',
    }
  });

  useEffect(() => {
    if (fetchedPlayerAllTimeHighScore !== undefined) {
      setPlayerAllTimeHighScore(fetchedPlayerAllTimeHighScore as bigint);
    }
  }, [fetchedPlayerAllTimeHighScore]);

  useEffect(() => {
    if (payFeeData) { // Transaction sent
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
          refetchHasPaid();
        }, 7000); // Check after 7s
      };
      checkConfirmation();
    }
    if (payFeeError) {
      // Simplify error messages for users
      let errorMessage = 'Transaction failed';
      if (payFeeError.message.includes('User rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (payFeeError.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds';
      } else if (payFeeError.message.includes('network')) {
        errorMessage = 'Network error - please try again';
      }

      setNotification({
        id: 'pay-fee-error',
        type: 'error',
        message: errorMessage,
        title: 'Payment Failed',
      });
    }
  }, [payFeeData, refetchHasPaid, payFeeError]);

  // Auto-dismiss all notifications after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handlePayEntryFee = async () => {
    try {
      if (!isConnected || !address) {
        // alert('Please connect your wallet first.');
        // Replace with a more user-friendly notification
        setNotification({
          id: 'connect-wallet-error',
          type: 'error',
          message: 'Connect wallet first',
          title: 'Wallet Required',
        });
        if (connectors.length > 0 && !isConnected) {
          // Try to connect with the first available connector
          try {
            await connect({ connector: connectors[0] });
            // Wait for connection to be established
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (connectError) {
            console.error('Connection error:', connectError);
            // alert('Failed to connect wallet. Please try again.');
            setNotification({
              id: 'connect-wallet-error',
              type: 'error',
              message: 'Connection failed',
              title: 'Wallet Error',
            });
            return;
          }
        } else {
          return;
        }
      }

      // Check chain ID first before proceeding with any other operations
      if (chainId !== monadTestnet.id) {
        // alert('Please switch to Monad Testnet to continue.');
        // Replace with a more user-friendly notification
        setNotification({
          id: 'switch-network-error',
          type: 'error',
          message: 'Switch to Monad Testnet',
          title: 'Wrong Network',
        });
        if (!switchChain) {
          // alert('Chain switching is not available with your current wallet setup. Please switch to Monad Testnet manually.');
          setNotification({
            id: 'switch-network-error',
            type: 'error',
            message: 'Switch to Monad Testnet manually',
            title: 'Network Switch',
          });
          return;
        }
        try {
          console.log(`Attempting to switch from chain ${chainId} to ${monadTestnet.id}`);
          
          // Try to switch chain with error handling for getChainId issues
          if (switchChain) {
            await switchChain({ chainId: monadTestnet.id });
          } else {
            // Fallback: try to switch using window.ethereum directly
            if (typeof window !== 'undefined' && window.ethereum) {
              try {
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: `0x${monadTestnet.id.toString(16)}` }],
                });
              } catch (switchError: any) {
                // If the chain doesn't exist, add it
                if (switchError.code === 4902) {
                  await window.ethereum.request({
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
          
          console.log(`Successfully switched to chain ${monadTestnet.id}`);
          // Wait a bit for the chain switch to be reflected
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to switch chain:', error);
          // alert('Failed to switch network. Please switch to Monad Testnet manually in your wallet.');
          setNotification({
            id: 'switch-network-error',
            type: 'error',
            message: 'Switch network manually in wallet',
            title: 'Network Error',
          });
          return;
        }
      }

      if ((LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE') {
        // alert('Leaderboard contract address is not set. Please inform the developer.');
        // Replace with a more user-friendly notification
        setNotification({
          id: 'contract-address-error',
          type: 'error',
          message: 'Service temporarily unavailable',
          title: 'System Error',
        });
        return;
      }
      if (hasPaidForToday) {
        // alert('You have already paid the entry fee for today.');
        // Replace with a more user-friendly notification
        setNotification({
          id: 'already-paid-error',
          type: 'info',
          message: 'Daily pass already active',
          title: 'Already Paid',
        });
        return;
      }
      if (isLoadingEntryFee || !entryFeeAmount || entryFeeAmount === 0n) {
        // alert('Entry fee not loaded yet. Please wait a moment.');
        // Replace with a more user-friendly notification
        setNotification({
          id: 'entry-fee-not-loaded-error',
          type: 'info',
          message: 'Loading fee info...',
          title: 'Please Wait',
        });
        return;
      }

      console.log('Starting entry fee payment process...');
      resetPayFee();

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
        address as string,
        entryFeeAmount.toString(),
        gameData,
        farcasterID,
        username
      );

      console.log('Signed fee received:', signedFee);
      console.log('Calling writeContract...');

      // Add a small delay to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 500));

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
      console.log('Current connector:', connector);
      console.log('Chain ID:', chainId);
      console.log('Is connected:', isConnected);
    } catch (error) {
      console.error('Error in handlePayEntryFee:', error);

      // Simplify error messages for users
      let errorMessage = 'Payment failed - please try again';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error';
        }
      }

      setNotification({
        id: 'pay-fee-error',
        type: 'error',
        message: errorMessage,
        title: 'Payment Error',
      });
    }
  };

  useEffect(() => {
    // Keep native gestures disabled all the time
    sdk.actions.ready({ disableNativeGestures: true });
    // No need for cleanup since we want gestures disabled consistently

    // Check if miniapp is already added before attempting to add it
    const addFrameOnLoad = async () => {
      try {
        // Get the context to check if miniapp is already added
        const context = await sdk.context;
        
        // Check if the miniapp is already added using context.client.added
        if (context?.client?.added) {
          console.log("MiniApp is already added to the client");
          return;
        }
        
        // Only add the miniapp if it's not already added
        await sdk.actions.addMiniApp();
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
                  className="flex flex-row items-center w-full max-w-sm p-3 bg-gray-700/60 rounded-lg shadow-lg mb-4 border border-gray-600/50"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  {farcasterUser.pfpUrl && (
                    <motion.img
                      src={farcasterUser.pfpUrl}
                      alt={`${farcasterUser.displayName}'s profile picture`}
                      className="w-16 h-16 rounded-full mr-4 border-2 border-purple-500 shadow-md flex-shrink-0"
                      whileHover={{ scale: 1.05, boxShadow: "0px 0px 15px rgba(192, 132, 252, 0.5)" }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                  )}
                  <div className="flex flex-col text-left overflow-hidden">
                    <p className="text-lg font-semibold text-purple-300 truncate" title={farcasterUser.displayName}>
                      {farcasterUser.displayName}
                    </p>
                    <p className="text-sm text-slate-400 truncate" title={`@${farcasterUser.username}`}>
                      @{farcasterUser.username}
                    </p>
                    <p className="text-sm text-yellow-400 mt-1 font-medium">
                      🏆 High Score: {playerAllTimeHighScore !== null ? playerAllTimeHighScore.toString() : (isLoadingPlayerAllTimeHighScore ? '...' : 'N/A')}
                    </p>
                  </div>
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

                    {chainId !== monadTestnet.id && chainId && (
                      <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: "#4A5568" }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full py-2 text-xs bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out border border-slate-500"
                        onClick={async () => {
                          try {
                            if (switchChain) {
                              await switchChain({ chainId: monadTestnet.id });
                            } else {
                              // Fallback: try to switch using window.ethereum directly
                              if (typeof window !== 'undefined' && window.ethereum) {
                                try {
                                  await window.ethereum.request({
                                    method: 'wallet_switchEthereumChain',
                                    params: [{ chainId: `0x${monadTestnet.id.toString(16)}` }],
                                  });
                                } catch (switchError: any) {
                                  // If the chain doesn't exist, add it
                                  if (switchError.code === 4902) {
                                    await window.ethereum.request({
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
                          } catch (error) {
                            console.error('Failed to switch chain:', error);
                          }
                        }}
                      >
                        Switch to Monad Testnet
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: "#C53030" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        try {
                          disconnect();
                          setNotification({
                            id: 'disconnect-success',
                            type: 'success',
                            message: 'Wallet disconnected successfully',
                            title: 'Disconnected',
                          });
                        } catch (error) {
                          console.error('Failed to disconnect:', error);
                          setNotification({
                            id: 'disconnect-error',
                            type: 'error',
                            message: 'Failed to disconnect wallet. Please try again.',
                            title: 'Disconnect Error',
                          });
                        }
                      }}
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
                      try {
                        if (connectors && connectors.length > 0) {
                          connect({ connector: connectors[0] });
                        } else {
                          console.error('No connectors found.');
                          setNotification({
                            id: 'connect-error',
                            type: 'error',
                            message: 'No wallet connectors available. Please refresh the page.',
                            title: 'Connection Error',
                          });
                        }
                      } catch (error) {
                        console.error('Failed to connect:', error);
                        setNotification({
                          id: 'connect-error',
                          type: 'error',
                          message: 'Failed to connect wallet. Please try again.',
                          title: 'Connection Error',
                        });
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
              {/* Update Banner */}
              {showBanner && (
                <motion.div
                  className="w-full p-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-md text-center relative"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <button
                    onClick={handleBannerDismiss}
                    className="absolute top-0.5 right-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm font-bold"
                    aria-label="Dismiss banner"
                  >
                    ×
                  </button>
                  <p className="text-xs text-slate-200 leading-tight pr-4">
                    🎮 <span className="font-medium text-purple-300">Virtual keypad added!</span><br /> <span className="text-yellow-300">Season 2</span> coming soon! (massive rewards) <br />Feedback in <span
                      className="text-blue-300 underline cursor-pointer hover:text-blue-200 transition-colors"
                      onClick={handleAboutClick}
                    >About</span> 🚀
                  </p>
                </motion.div>
              )}

              {/* Daily Pass Button - Show above Play Game only when not paid */}
              {isConnected && (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE' && !hasPaidForToday && (
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Button
                    onClick={handlePayEntryFee}
                    variant="default"
                    className="w-full text-lg py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
                    disabled={isPayingFee || isLoadingEntryFee || isLoadingHasPaid || !entryFeeAmount || entryFeeAmount === 0n}
                  >
                    {isPayingFee ? 'Processing...' : isLoadingEntryFee || isLoadingHasPaid ? 'Loading Status...' : `Get Daily Pass (${formatEther(entryFeeAmount)} MON)`}
                  </Button>
                </motion.div>
              )}

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

              {/* Daily Pass Active Message - Show below About button when paid */}
              {isConnected && (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE' && hasPaidForToday && (
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <p className="text-center text-green-400 py-2 text-md font-semibold">Daily Pass Active!</p>
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

