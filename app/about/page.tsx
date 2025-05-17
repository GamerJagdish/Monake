"use client";
import React, { useState, useEffect, useCallback } from 'react'; // Added useState, useEffect
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundGradientAnimation } from '@/components/ui/BackgroundGradientAnimation';
import { SiFarcaster, SiX, SiGithub } from 'react-icons/si';  // Added FaHeart for donate
import { FaTelegramPlane, FaHeart, FaExclamationCircle, FaCheckCircle, FaInfoCircle, FaWallet } from 'react-icons/fa';
import { BiNetworkChart } from 'react-icons/bi';
import { useMiniAppContext } from '@/hooks/use-miniapp-context'; // Added for Farcaster SDK actions

// Wagmi and Viem imports for donation
import { useAccount, useSendTransaction, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { monadTestnet } from 'viem/chains'; // Assuming monadTestnet is correctly set up

// Define your social links here - replace with your actual URLs and handles
const socialLinks = [
  {
    name: 'Farcaster',
    icon: <SiFarcaster size={18} />, // Slightly reduced icon size for consistency
    url: 'https://warpcast.com/gamerjagdish', 
    handle: 'gamerjagdish' 
  },
  {
    name: 'Twitter / X',
    icon: <SiX size={18} />, // Slightly reduced icon size
    url: 'https://x.com/jagdishhhhhhhh', 
    handle: 'jagdishhhhhhhh' 
  },
  {
    name: 'GitHub',
    icon: <SiGithub size={18} />, // Slightly reduced icon size
    url: 'https://github.com/GamerJagdish', 
    handle: 'GamerJagdish' 
  },
  {
    name: 'Telegram',
    icon: <FaTelegramPlane size={18} />,
    url: 'https://t.me/gamer_jagdish', // Replace with your Telegram URL/handle
    handle: 'gamer_jagdish' // Replace with your Telegram handle
  }
];

// Define your donation recipient address here
const DONATION_ADDRESS = '0x04AA78cd99a11BBc7b9D4CFE9D5599C0dd81e1f0'; // This is your actual address, ensure it's correct.

// Define notification types and interface
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  type: NotificationType;
  message: string;
  id: number;
}

const AboutPage: React.FC = () => {
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState('0.01');

  const { address, isConnected, chainId } = useAccount();
  const {
    data: newDonationTxHash, // Renamed to avoid conflict if user has donationTxHash elsewhere
    isSuccess: isTransactionSuccess,
    isPending: isSendingTransaction,
    error: transactionError,
    sendTransaction,
    reset: resetTransactionState,
  } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  const { actions } = useMiniAppContext(); // Added for Farcaster SDK actions

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [displayedTxHash, setDisplayedTxHash] = useState<string | null>(null);

  // Add notification handler
  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prevNotifications => [...prevNotifications, { type, message, id }]);
    setTimeout(() => {
      setNotifications(prevInnerNotifications => prevInnerNotifications.filter(notification => notification.id !== id));
    }, 5000); // Remove after 5 seconds
  }, []); // useCallback with empty dependency array as setNotifications is stable

  const handleDonateClick = () => {
    if (!isConnected) {
      addNotification('warning', 'Please connect your wallet first');
      return;
    }
    if (chainId !== monadTestnet.id) {
      if (switchChain) {
        switchChain({ chainId: monadTestnet.id });
        addNotification('info', 'Please switch to Monad Testnet');
      } else {
        addNotification('error', 'Please switch to Monad Testnet to donate');
      }
      return;
    }
    setDisplayedTxHash(null); // Reset any previous tx hash
    if (resetTransactionState) resetTransactionState(); // Reset wagmi hook state
    setShowDonateModal(true);
  };
  const presetAmounts = [0.01, 0.1, 1];
  const handleSendDonation = async () => { // Made async if needed, though sendTransaction itself is async internally
    if (resetTransactionState) resetTransactionState(); // Reset before new transaction
    setDisplayedTxHash(null); // Clear previous hash before new attempt
    // Updated check: Ensure DONATION_ADDRESS is not the placeholder or empty
    // The original placeholder was '0x04AA78cd99a11BBc7b9D4CFE9D5599C0dd81e1f0' with a comment '<<< REPLACE THIS >>>'
    // A more robust check would be against the initial placeholder value if it was different, 
    // or simply ensuring it's not an obviously invalid address.
    // For now, we'll assume any non-empty string that isn't the exact placeholder string is valid.
    // The user mentioned their address IS '0x04AA78cd99a11BBc7b9D4CFE9D5599C0dd81e1f0', so the original check was problematic.
    // We will simplify the check to ensure the address is not empty and not the placeholder comment itself.
    if (!DONATION_ADDRESS) { 
      addNotification('error', 'Donation address is not configured. Please replace the placeholder.');
      return;
    }
    if (parseFloat(donationAmount) <= 0) {
      addNotification('error', 'Please enter a valid donation amount');
      return;
    }
    try {
      // sendTransaction is asynchronous, but we'll rely on isSuccess and newDonationTxHash from the hook
      sendTransaction({
        to: DONATION_ADDRESS,
        value: parseEther(donationAmount as `${number}`),
      });
      // Notification for initiation can be kept or removed depending on desired UX
      // addNotification('info', 'Transaction submitted...'); 
    } catch (e) { // This catch might not be hit if sendTransaction itself doesn't throw for network errors handled by wagmi
      console.error('Error preparing donation transaction:', e);
      addNotification('error', 'Failed to prepare transaction. Please try again');
    }
  };

  // Effect to handle transaction success
  useEffect(() => {
    if (isTransactionSuccess && newDonationTxHash && displayedTxHash !== newDonationTxHash) {
      setDisplayedTxHash(newDonationTxHash);
      addNotification('success', 'Donation successful! Thank you!');
      // Modal will update based on displayedTxHash
    }
  }, [isTransactionSuccess, newDonationTxHash, displayedTxHash, addNotification]);

  // Effect to handle transaction error
  useEffect(() => {
    if (transactionError) {
      const errorMessage = transactionError.message.includes('User rejected the request') 
        ? 'Transaction rejected by user.' 
        : transactionError.message.substring(0, 100) + '...';
      addNotification('error', `Donation failed: ${errorMessage}`);
      setDisplayedTxHash(null); // Ensure no tx hash is shown on error
    }
  }, [transactionError, addNotification]);

  // Effect to reset states when modal is closed
  useEffect(() => {
    if (!showDonateModal) {
      setDisplayedTxHash(null);
      if (resetTransactionState) resetTransactionState();
      setDonationAmount('0.01'); // Reset donation amount input
    }
  }, [showDonateModal, resetTransactionState]);

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
        className="w-full max-w-lg bg-gray-800/80 border-gray-700 shadow-xl rounded-xl backdrop-blur-sm z-10 p-6 sm:p-8"
      >
        <CardHeader className="pt-6 pb-4 text-center">
          <CardTitle className="text-4xl sm:text-5xl font-bold monake-title">About Monake</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 pt-4">
          <p className="text-center text-slate-300">
            Monake is a classic snake game reimagined with a modern sus twist, built on the Monad blockchain.
          </p>
          <p className="text-center text-slate-300">
            Enjoy the game and try to get the highest score!
          </p>
          
          <div className="text-center mt-6 w-full">
            <p className="text-slate-100 text-lg font-semibold mb-1">
              Developed by
            </p>
            <p className="text-slate-50 text-xl font-bold mb-4">
              Gamer Jagdish Sharma
            </p>
            {/* Social Links Section */}
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
              {socialLinks.map((social) => (
                <a 
                  key={social.name} 
                  href={social.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center p-2.5 bg-slate-700/60 hover:bg-slate-600/80 rounded-lg transition-colors duration-150 ease-in-out w-[calc(50%-0.5rem)] sm:w-auto min-w-[90px] sm:min-w-[110px] shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center justify-center text-purple-400 mb-0.5">
                    {social.icon}
                  </div>
                  <span className="text-[10px] sm:text-xs text-slate-300 font-medium w-full text-center px-1 break-all">{social.handle}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Donate Button */}
          <motion.button
            onClick={handleDonateClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3 mt-6 text-lg sm:text-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out flex items-center justify-center space-x-2"
          >
            <FaHeart />
            <span>Donate</span>
          </motion.button>

          <Link href="/" passHref className="w-full mt-4"> {/* Reduced margin top */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 text-lg sm:text-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
            >
              Back to Home
            </motion.button>
          </Link>
        </CardContent>
      </motion.div>

      {/* Notifications Container - Increased z-index */}
      <div className="fixed top-4 right-4 z-[60] space-y-2 max-w-sm w-full">
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`p-4 rounded-lg shadow-lg flex items-center space-x-3 ${{
              'success': 'bg-green-500/90',
              'error': 'bg-red-500/90',
              'warning': 'bg-yellow-500/90',
              'info': 'bg-blue-500/90'
            }[notification.type]}`}
          >
            {{
              'success': <FaCheckCircle className="text-white text-xl flex-shrink-0" />,
              'error': <FaExclamationCircle className="text-white text-xl flex-shrink-0" />,
              'warning': <FaExclamationCircle className="text-white text-xl flex-shrink-0" />,
              'info': <FaInfoCircle className="text-white text-xl flex-shrink-0" />
            }[notification.type]}
            <p className="text-white font-medium text-sm flex-1">{notification.message}</p>
          </motion.div>
        ))}
      </div>

      {/* Donate Modal - Conditionally rendered */}
      {showDonateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDonateModal(false)} // Allow closing by clicking backdrop
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md space-y-4 border border-slate-700 relative"
          >
            {/* Close button for the modal itself, always visible */} 
            <button 
              onClick={() => setShowDonateModal(false)} 
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 transition-colors p-1"
              aria-label="Close donation modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {displayedTxHash ? (
              <>
                <h3 className="text-2xl font-bold text-green-400 text-center flex items-center justify-center space-x-2">
                  <FaCheckCircle className="text-green-400" />
                  <span>Thank You Nad!</span>
                </h3>
                <p className="text-center text-slate-300">
                  Your donation has been successfully processed. This will help me build on Monad with more passion and power.💜
                </p>
                <div className="text-center text-sm text-slate-300 break-all">
                  <p className="font-semibold">Transaction Hash:</p>
                  <a 
                    href={`https://testnet.monvision.io/tx/${displayedTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      if (actions) {
                        actions.openUrl(`https://testnet.monvision.io/tx/${displayedTxHash}`);
                      } else {
                        // Fallback if actions are not available
                        window.open(`https://testnet.monvision.io/tx/${displayedTxHash}`, '_blank');
                      }
                    }}
                    className="text-pink-400 hover:text-pink-300 underline cursor-pointer"
                  >
                    {displayedTxHash}
                  </a>
                </div>
                <button 
                  onClick={() => setShowDonateModal(false)} 
                  className="w-full py-2.5 mt-4 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md font-semibold transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-pink-400 text-center flex items-center justify-center space-x-2">
                  <FaHeart className="text-pink-400" />
                  <span>Support Monake!</span>
                </h3>
                
                {/* Connection Status */}
                <div className="flex items-center space-x-2 text-sm text-slate-300 justify-center">
                  <FaWallet className={isConnected ? 'text-green-400' : 'text-red-400'} />
                  <span>{isConnected ? 'Wallet Connected' : 'Wallet Not Connected'}</span>
                  <BiNetworkChart className={chainId === monadTestnet.id ? 'text-green-400' : 'text-yellow-400'} />
                  <span>{chainId === monadTestnet.id ? 'Monad Testnet' : 'Wrong Network'}</span>
                </div>

                <div className="space-y-2">
                  <label htmlFor="donationAmount" className="block text-sm font-medium text-slate-300">Amount (MONAD Testnet Token)</label>
                  <input 
                    type="number"
                    id="donationAmount"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="e.g., 0.5"
                    className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-pink-500 focus:border-pink-500"
                    disabled={isSendingTransaction || !!displayedTxHash}
                  />
                </div>

                <div className="flex justify-around space-x-2">
                  {presetAmounts.map(amount => (
                    <button 
                      key={amount}
                      onClick={() => setDonationAmount(String(amount))}
                      disabled={isSendingTransaction || !!displayedTxHash}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors
                                  ${parseFloat(donationAmount) === amount 
                                    ? 'bg-pink-500 text-white ring-2 ring-pink-300'
                                    : 'bg-slate-600 hover:bg-slate-500 text-slate-200'}
                                  disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                
                {transactionError && !displayedTxHash && (
                    <p className="text-xs text-red-400 text-center">Error: {transactionError.message.substring(0,100)}...</p>
                )}

                <div className="flex space-x-3 pt-2">
                  <button 
                    onClick={() => setShowDonateModal(false)} // Explicitly set state to false
                    className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md font-semibold transition-colors"
                    disabled={isSendingTransaction}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSendDonation}
                    disabled={isSendingTransaction || !isConnected || chainId !== monadTestnet.id || !!displayedTxHash || parseFloat(donationAmount) <= 0}
                    className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingTransaction ? 'Sending...' : 'Send Love'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
      
    </div>
  );
};

export default AboutPage;