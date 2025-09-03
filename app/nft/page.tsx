"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundGradientAnimation } from '@/components/ui/BackgroundGradientAnimation';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWriteContract, useReadContract } from 'wagmi';
import { monadTestnet } from 'wagmi/chains';
import { useMiniAppContext } from '@/hooks/use-miniapp-context';
import { sdk } from '@farcaster/miniapp-sdk';
import { CheckCircle, AlertCircle, Info, X, Download, ExternalLink } from 'lucide-react';
import { MONAKE_NFT_ABI } from '@/lib/nft-abi';
import confetti from 'canvas-confetti';
import { NumberTicker } from '@/components/magicui/number-ticker';
import Image from 'next/image';

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

// Define notification type
interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  title?: string;
}

const NFT_CONTRACT_ADDRESS = '0x9d40e8d15af68f14fdf134120c03013cf0a16d00'; // Deployed NFT contract address

// Countdown Timer Component
const CountdownTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const targetDate = new Date('2025-09-30T23:59:59').getTime();

    // Calculate initial time immediately
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    } else {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    }
    
    setIsLoaded(true);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check if we're in the final 24 hours for extra urgency
  const isFinalDay = timeLeft.days === 0 && timeLeft.hours < 24;
  const isFinalHour = timeLeft.days === 0 && timeLeft.hours === 0;

  // Don't render until time is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <motion.div
      className="text-center space-y-2"
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* Compact Urgent Header */}
      <motion.div
        className="relative"
        animate={isFinalDay ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 1, repeat: isFinalDay ? Infinity : 0 }}
      >
                 <h3 className="text-xs font-bold">
           {isFinalHour ? (
             <>
               <span className="text-red-400">🚨FINAL HOUR! MINT NOW!🚨</span>
             </>
           ) : isFinalDay ? (
             <>
               <span className="text-orange-400">🔥LAST CHANCE! MINTING ENDS TODAY!🔥</span>
             </>
           ) : (
             <>
               <span className="text-yellow-400">⏰</span>
               <span className="bg-gradient-to-r from-red-400 via-pink-500 to-purple-600 bg-clip-text text-transparent"> MINTING ENDS SOON! DON&apos;T MISS OUT! </span>
               <span className="text-yellow-400">⏰</span>
             </>
           )}
         </h3>
        {isFinalDay && (
          <motion.div
            className="absolute -inset-1 bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 rounded-lg blur opacity-75"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Compact Countdown Grid */}
      <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
        <motion.div 
          className="flex flex-col items-center"
          whileHover={{ scale: 1.05 }}
          animate={isFinalDay ? { y: [0, -1, 0] } : {}}
          transition={{ duration: 0.5, repeat: isFinalDay ? Infinity : 0 }}
        >
          <div className={`relative overflow-hidden rounded-lg px-2 py-1.5 min-w-[50px] ${
            isFinalDay ? 'bg-gradient-to-br from-red-500/30 to-red-600/30 border-2 border-red-400/60' :
            'bg-gradient-to-br from-purple-600/30 to-purple-700/30 border border-purple-500/50'
          }`}>
            <NumberTicker
              value={timeLeft.days}
              className={`text-lg font-black ${
                isFinalDay ? 'text-red-300' : 'text-purple-300'
              }`}
            />
            {isFinalDay && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent"
                animate={{ x: [-100, 100] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <span className={`text-xs mt-1 font-medium ${
            isFinalDay ? 'text-red-400' : 'text-slate-400'
          }`}>DAYS</span>
        </motion.div>

        <motion.div 
          className="flex flex-col items-center"
          whileHover={{ scale: 1.05 }}
          animate={isFinalDay ? { y: [0, -1, 0] } : {}}
          transition={{ duration: 0.5, repeat: isFinalDay ? Infinity : 0, delay: 0.1 }}
        >
          <div className={`relative overflow-hidden rounded-lg px-2 py-1.5 min-w-[50px] ${
            isFinalDay ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/30 border-2 border-orange-400/60' :
            'bg-gradient-to-br from-purple-600/30 to-purple-700/30 border border-purple-500/50'
          }`}>
            <NumberTicker
              value={timeLeft.hours}
              className={`text-lg font-black ${
                isFinalDay ? 'text-green-300' : 'text-purple-300'
              }`}
            />
            {isFinalDay && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent"
                animate={{ x: [-100, 100] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            )}
          </div>
          <span className={`text-xs mt-1 font-medium ${
            isFinalDay ? 'text-orange-400' : 'text-slate-400'
          }`}>HOURS</span>
        </motion.div>

        <motion.div 
          className="flex flex-col items-center"
          whileHover={{ scale: 1.05 }}
          animate={isFinalDay ? { y: [0, -1, 0] } : {}}
          transition={{ duration: 0.5, repeat: isFinalDay ? Infinity : 0, delay: 0.2 }}
        >
          <div className={`relative overflow-hidden rounded-lg px-2 py-1.5 min-w-[50px] ${
            isFinalDay ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-400/60' :
            'bg-gradient-to-br from-purple-600/30 to-purple-700/30 border border-purple-500/50'
          }`}>
            <NumberTicker
              value={timeLeft.minutes}
              className={`text-lg font-black ${
                isFinalDay ? 'text-yellow-300' : 'text-purple-300'
              }`}
            />
            {isFinalDay && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent"
                animate={{ x: [-100, 100] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              />
            )}
          </div>
          <span className={`text-xs mt-1 font-medium ${
            isFinalDay ? 'text-yellow-400' : 'text-slate-400'
          }`}>MINUTES</span>
        </motion.div>

        <motion.div 
          className="flex flex-col items-center"
          whileHover={{ scale: 1.05 }}
          animate={isFinalDay ? { y: [0, -1, 0] } : {}}
          transition={{ duration: 0.5, repeat: isFinalDay ? Infinity : 0, delay: 0.3 }}
        >
          <div className={`relative overflow-hidden rounded-lg px-2 py-1.5 min-w-[50px] ${
            isFinalDay ? 'bg-gradient-to-br from-green-500/30 to-green-600/30 border-2 border-green-400/60' :
            'bg-gradient-to-br from-purple-600/30 to-purple-700/30 border border-purple-500/50'
          }`}>
            <NumberTicker
              value={timeLeft.seconds}
              className={`text-lg font-black ${
                isFinalDay ? 'text-green-300' : 'text-purple-300'
              }`}
            />
            {isFinalDay && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent"
                animate={{ x: [-100, 100] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
              />
            )}
          </div>
          <span className={`text-xs mt-1 font-medium ${
            isFinalDay ? 'text-green-400' : 'text-slate-400'
          }`}>SECONDS</span>
        </motion.div>
      </div>

      {/* Compact FOMO Message */}
      <motion.div
        className="text-center"
        animate={isFinalDay ? { scale: [1, 1.01, 1] } : {}}
        transition={{ duration: 2, repeat: isFinalDay ? Infinity : 0 }}
      >
        <p className={`text-xs font-medium ${
          isFinalDay ? 'text-red-300' : 'text-slate-300'
        }`}>
          {isFinalHour ? "⚡ONLY MINUTES LEFT! MINT NOW OR MISS FOREVER!⚡" :
           isFinalDay ? "🔥LAST DAY! DON'T BE THE ONE WHO MISSED OUT!🔥" :
           "Secure your OG status today!"}
        </p>
      </motion.div>
     
    </motion.div>
  );
};

const NFTPage: React.FC = () => {
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null);
  const [userBalance, setUserBalance] = useState<bigint | null>(null);

  const { address, isConnected, chainId, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContract, isPending: isMintingContract, data: mintData, error: mintError, reset: resetMint } = useWriteContract();

  const { context: miniAppContext } = useMiniAppContext();
  const farcasterUser = miniAppContext?.user;

  // Handle notification dismissal
  const dismissNotification = () => {
    setNotification(null);
  };

  // Trigger confetti animation
  const triggerConfetti = () => {
    const end = Date.now() + 1 * 1000; // 1 seconds
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      });

      requestAnimationFrame(frame);
    };

    frame();
  };

  // Fetch total supply with auto-refresh
  const { data: fetchedTotalSupply, isLoading: isLoadingTotalSupply, refetch: refetchTotalSupply } = useReadContract({
    abi: MONAKE_NFT_ABI,
    address: NFT_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'totalSupply',
    query: {
      enabled: (NFT_CONTRACT_ADDRESS as string) !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  });

  // Fetch user's NFT balance
  const { data: fetchedUserBalance, isLoading: isLoadingUserBalance } = useReadContract({
    abi: MONAKE_NFT_ABI,
    address: NFT_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean((NFT_CONTRACT_ADDRESS as string) !== '0x0000000000000000000000000000000000000000' && isConnected && address),
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  });

  useEffect(() => {
    if (fetchedTotalSupply !== undefined) {
      setTotalSupply(fetchedTotalSupply as bigint);
    }
  }, [fetchedTotalSupply]);

  useEffect(() => {
    if (fetchedUserBalance !== undefined) {
      setUserBalance(fetchedUserBalance as bigint);
    }
  }, [fetchedUserBalance]);

  // Handle mint transaction results
  useEffect(() => {
    if (mintData) {
      setNotification({
        id: 'mint-success',
        type: 'success',
        message: 'Successfully minted Monake NFT! Transaction submitted.',
        title: 'Mint Successful',
      });
      setIsMinting(false);
      triggerConfetti(); // Trigger confetti animation
    }
    if (mintError) {
      let errorMessage = 'Minting failed - please try again';
      if (mintError.message.includes('User rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (mintError.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds';
      } else if (mintError.message.includes('network')) {
        errorMessage = 'Network error - please try again';
      }

      setNotification({
        id: 'mint-error',
        type: 'error',
        message: errorMessage,
        title: 'Mint Error',
      });
      setIsMinting(false);
    }
  }, [mintData, mintError]);

  // Auto-dismiss notifications after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleMintNFT = async () => {
    try {
      if (!isConnected || !address) {
        setNotification({
          id: 'connect-wallet-error',
          type: 'error',
          message: 'Connect wallet first',
          title: 'Wallet Required',
        });
        if (connectors.length > 0 && !isConnected) {
          try {
            await connect({ connector: connectors[0] });
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (connectError) {
            console.error('Connection error:', connectError);
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

      // Check chain ID
      if (chainId !== monadTestnet.id) {
        setNotification({
          id: 'switch-network-error',
          type: 'error',
          message: 'Switch to Monad Testnet',
          title: 'Wrong Network',
        });
        if (!switchChain) {
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
          
          if (switchChain) {
            await switchChain({ chainId: monadTestnet.id });
          } else {
            if (typeof window !== 'undefined' && window.ethereum) {
              try {
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: `0x${monadTestnet.id.toString(16)}` }],
                });
              } catch (switchError: any) {
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
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to switch chain:', error);
          setNotification({
            id: 'switch-network-error',
            type: 'error',
            message: 'Switch network manually in wallet',
            title: 'Network Error',
          });
          return;
        }
      }

      if ((NFT_CONTRACT_ADDRESS as string) === '0x0000000000000000000000000000000000000000') {
        setNotification({
          id: 'contract-address-error',
          type: 'error',
          message: 'NFT contract not deployed yet',
          title: 'Contract Error',
        });
        return;
      }

      setIsMinting(true);
      resetMint();

      try {
        // Mint single NFT
        writeContract({
          abi: MONAKE_NFT_ABI,
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'mint',
          args: [address as `0x${string}`],
        });
      } catch (error) {
        console.error('Error calling writeContract:', error);
        setNotification({
          id: 'mint-error',
          type: 'error',
          message: 'Failed to initiate mint transaction',
          title: 'Mint Error',
        });
        setIsMinting(false);
      }
    } catch (error) {
      console.error('Error minting NFT:', error);
      setNotification({
        id: 'mint-error',
        type: 'error',
        message: 'Minting failed - please try again',
        title: 'Mint Error',
      });
      setIsMinting(false);
    }
  };

  const handleShareNFT = async () => {
    try {
      const shareText = `Just Minted the OG Monake NFT, Idk why but it's important for something...`;
      const shareUrl = 'https://monake.vercel.app/nft';
      
      await sdk.actions.composeCast({
        text: shareText,
        embeds: [shareUrl],
      });
      
      // setNotification({
      //   id: 'share-success',
      //   type: 'success',
      //   message: 'Share dialog opened!',
      //   title: 'Sharing NFT',
      // });
    } catch (error) {
      console.error('Error sharing NFT:', error);
      setNotification({
        id: 'share-error',
        type: 'error',
        message: 'Failed to open share dialog',
        title: 'Share Error',
      });
    }
  };

  // Auto-connect when component mounts
  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [isConnected, connectors, connect]);



  useEffect(() => {
    // Keep native gestures disabled
    sdk.actions.ready({ disableNativeGestures: true });
  }, []);

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-gray-800/80 border-gray-700 shadow-xl rounded-xl backdrop-blur-sm z-10 relative"
      >
                 

        <CardContent className="flex flex-col items-center space-y-6 p-6">
          {/* Countdown Timer */}
          <CountdownTimer />
          
          {/* NFT Image */}
           <motion.div
             className="relative group"
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.5, delay: 0.2 }}
           >
                           <Image
                src="/images/icon.png"
                alt="Monake NFT"
                width={192}
                height={192}
                className="w-48 h-48 rounded-lg shadow-lg border-2 border-purple-500/50 group-hover:border-purple-400 transition-all duration-300"
              />
           </motion.div>
                       <motion.div
               
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.2 }}
             >
                               <div className="text-center space-y-2">
                  <div>
                    <NumberTicker
                      value={totalSupply !== null ? Number(totalSupply) : 0}
                      startValue={totalSupply !== null ? Math.max(0, Number(totalSupply) - 1) : 0}
                      className="text-2xl font-bold text-purple-300"
                    />
                    <span className="text-2xl font-bold text-purple-300"> / </span>
                    <span className="text-2xl font-bold text-purple-300">∞</span>
                  </div>
                  {isConnected && (
                    <div className="text-sm text-slate-400">
                      You have: <NumberTicker
                        value={userBalance !== null ? Number(userBalance) : 0}
                        startValue={userBalance !== null ? Math.max(0, Number(userBalance) - 1) : 0}
                        className="text-sm text-slate-400"
                      />
                    </div>
                  )}
                </div>
             </motion.div>
                     {/* NFT Info */}
                       <motion.div
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-purple-300">Monake OG Free Mint</h2>
                             <p className="text-slate-300 text-sm">
                 The more you&apos;ve got, the better. <br/> It&apos;s important for something...
               </p>
            </motion.div>

                     {/* Network Switch - Only show if connected but wrong network */}
           {isConnected && chainId !== monadTestnet.id && chainId && (
             <motion.div
               className="w-full"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.4 }}
             >
               <motion.button
                 whileHover={{ scale: 1.05, backgroundColor: "#4A5568" }}
                 whileTap={{ scale: 0.95 }}
                 className="w-full py-2 text-xs bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out border border-slate-500"
                 onClick={async () => {
                   try {
                     if (switchChain) {
                       await switchChain({ chainId: monadTestnet.id });
                     } else {
                       if (typeof window !== 'undefined' && window.ethereum) {
                         try {
                           await window.ethereum.request({
                             method: 'wallet_switchEthereumChain',
                             params: [{ chainId: `0x${monadTestnet.id.toString(16)}` }],
                           });
                         } catch (switchError: any) {
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
             </motion.div>
           )}

           {/* Connect Wallet - Only show if not connected */}
           {!isConnected && (
             <motion.div
               className="w-full"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.4 }}
             >
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={async () => {
                   try {
                     if (connectors && connectors.length > 0) {
                       await connect({ connector: connectors[0] });
                       // Show success notification only for manual connection
                       setNotification({
                         id: 'connect-success',
                         type: 'success',
                         message: `Wallet connected: ${address?.substring(0, 6)}...${address?.substring(address.length - 4)}`,
                         title: 'Connected',
                       });
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
                 className="w-full py-3 text-lg sm:text-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
               >
                 Connect Wallet
               </motion.button>
             </motion.div>
           )}

                                 {/* Mint Button */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMintNFT}
                disabled={isMinting || isMintingContract || !isConnected || chainId !== monadTestnet.id}
                className="w-full py-3 text-lg sm:text-xl bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
              >
                {isMinting || isMintingContract ? 'Minting...' : 'Mint NFT'}
              </motion.button>
            </motion.div>

            {/* NFT Leaderboard Button */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
            >
              <Link href="/nft-leaderboard" passHref>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-3 text-lg sm:text-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
                >
                  OG Leaderboard
                </motion.button>
              </Link>
            </motion.div>

            {/* Share and Back Buttons */}
            <motion.div
              className="w-full flex space-x-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShareNFT}
                className="flex-1 py-3 text-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
              >
                Share
              </motion.button>

              <Link href="/" passHref className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-3 text-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
                >
                  Menu
                </motion.button>
              </Link>
            </motion.div>
        </CardContent>
      </motion.div>
    </div>
  );
};

export default NFTPage;
