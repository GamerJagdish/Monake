"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image'; // Added for game over image
// Wagmi imports for leaderboard interaction
import { useAccount, useSwitchChain, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConnect, useDisconnect } from 'wagmi'; 
import { monadTestnet } from "viem/chains";
import { parseEther, formatEther } from 'viem';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useMotionValue, motion, animate, AnimatePresence } from "motion/react"; // Updated import, added AnimatePresence
import { BackgroundGradientAnimation } from "@/components/ui/BackgroundGradientAnimation";
import { Volume2, VolumeX } from 'lucide-react'; // Import icons
import { sdk } from '@farcaster/frame-sdk';
import { useMiniAppContext } from "@/hooks/use-miniapp-context"; // Added import
import { APP_URL } from "@/lib/constants"; // Added import

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
const GRID_WIDTH = 12;
const GRID_HEIGHT = 17;
const CELL_SIZE = 30; // Increased for larger cells and snake
const GAME_BG_COLOR = "#2d3748"; // Tailwind gray-800
const TEXT_COLOR = "#e2e8f0"; // Tailwind slate-200
const GAME_SPEED = 200; // milliseconds, for smoother movement
const SNAKE_INTERPOLATION_FACTOR = 0.25; // Added for smooth visual interpolation
const SUPER_FOOD_SPAWN_CHANCE = 0.2; // 20% chance to spawn super food after normal food
const SUPER_FOOD_BASE_DURATION = 50; // in game ticks (50 * 120ms = 6 seconds)

interface FoodItem {
  name: string;
  color: string; // Keep color for fallback or other uses
  score: number;
  emoji: string; // Added for visual representation
  isSuperFood?: boolean;
  duration?: number; // in game ticks
}

// sdk.actions.ready({ disableNativeGestures: true }); // Moved to useEffect

const availableFoodTypes: FoodItem[] = [
  { name: 'Apple', color: '#EF4444', score: 1, emoji: '🍎' },
  { name: 'Banana', color: '#F59E0B', score: 2, emoji: '🍌' },
  { name: 'Grape', color: '#8B5CF6', score: 3, emoji: '🍇' },
  { name: 'Orange', color: '#F97316', score: 1, emoji: '🍊' },
  { name: 'Cherry', color: '#DC2626', score: 2, emoji: '🍒' },
  { name: 'Strawberry', color: '#EC4899', score: 3, emoji: '🍓' },
  { name: 'Golden Egg', color: '#FFD700', score: 10, emoji: '🥚', isSuperFood: true, duration: SUPER_FOOD_BASE_DURATION },
];

const getRandomFoodType = (isSuper: boolean = false): FoodItem => {
  const foods = isSuper 
    ? availableFoodTypes.filter(f => f.isSuperFood)
    : availableFoodTypes.filter(f => !f.isSuperFood);
  return foods[Math.floor(Math.random() * foods.length)];
};

const getRandomPosition = (existingPositions: {x: number, y: number}[] = []) => {
  let newPos: Position; // Explicitly type newPos with the Position interface
  do {
    newPos = {
      x: Math.floor(Math.random() * GRID_WIDTH),
      y: Math.floor(Math.random() * GRID_HEIGHT),
    };
  } while (existingPositions.some(p => p.x === newPos.x && p.y === newPos.y));
  return newPos;
};

interface Position { x: number; y: number; }
interface SuperFoodState extends Position {
  type: FoodItem;
  timer: number;
}

interface SnakeGameProps {
  onBackToMenu: () => void;
  isMuted: boolean; // Add isMuted prop
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>; // Add setIsMuted prop
}

const SnakeGame: React.FC<SnakeGameProps> = ({ onBackToMenu, isMuted, setIsMuted }) => {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  // Renaming writeContract for submitScore for clarity
  const { writeContract: submitScoreContract, isPending: isSubmittingScoreTx, data: submitScoreTxHash, reset: resetSubmitScoreTx, error: submitScoreTxError } = useWriteContract();
  const { writeContract: payEntryFeeContract, isPending: isPayingFee, data: payFeeDataHash, reset: resetPayFee, error: payFeeError } = useWriteContract();

  const [entryFeeAmount, setEntryFeeAmount] = useState<bigint>(parseEther('0.01'));
  // Renaming hasPaidEntryFee state to hasPaidForTodayForScoreSubmission for clarity within SnakeGame context
  const [hasPaidForTodayForScoreSubmission, setHasPaidForTodayForScoreSubmission] = useState<boolean>(false);
  const [isConfirmingFee, setIsConfirmingFee] = useState(false); // Added for fee confirmation tracking 
  const [isConfirmingScore, setIsConfirmingScore] = useState(false); // Added for score confirmation tracking 
  const [scoreSubmissionMessage, setScoreSubmissionMessage] = useState<React.ReactNode>(''); 
  const [showScoreSubmissionStatus, setShowScoreSubmissionStatus] = useState(false);
  const [isAttemptingScoreSubmission, setIsAttemptingScoreSubmission] = useState<boolean>(false);
  const [hasSubmittedScore, setHasSubmittedScore] = useState<boolean>(false); // Track if score has been submitted for current game
  const [playerAllTimeHighScore, setPlayerAllTimeHighScore] = useState<bigint | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  // Hook to wait for the transaction receipt for fee payment
  const { data: feeTxReceipt, isLoading: isLoadingFeeTxReceipt, isSuccess: isFeeTxSuccess } = useWaitForTransactionReceipt({
    hash: payFeeDataHash,
    query: {
      enabled: !!payFeeDataHash, // Only enable when there's a hash
      // Custom selector to determine success based on receipt status
      // This ensures isFeeTxSuccess is true only if the transaction was actually successful on-chain.
      select: (receipt) => receipt.status === 'success',
    },
    confirmations: 1, // Wait for 1 confirmation
  });

  // Hook to wait for the transaction receipt for score submission
  const { data: scoreTxReceipt, isLoading: isLoadingScoreTxReceipt, isSuccess: isScoreTxSuccess } = useWaitForTransactionReceipt({
    hash: submitScoreTxHash,
    query: {
      enabled: !!submitScoreTxHash, // Only enable when there's a hash
      select: (receipt) => receipt.status === 'success',
    },
    confirmations: 1, // Wait for 1 confirmation
  });

  // Fetch player's all-time high score
  const { data: fetchedPlayerAllTimeHighScore, isLoading: isLoadingPlayerAllTimeHighScore, refetch: refetchPlayerAllTimeHighScore } = useReadContract({
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

  // Check if player has paid today
  const { data: hasPaidEntryFee, refetch: refetchHasPaidEntryFee, isLoading: isLoadingHasPaid } = useReadContract({
    abi: LeaderboardABI,
    address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'hasPlayerPaidToday',
    args: [address as `0x${string}`],
    query: {
    enabled: !!address && isConnected && (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE',
    }
  });

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

  // Effect to update local payment status for score submission
  useEffect(() => {
    // Use hasPaidEntryFee (the direct result from useReadContract) to update the local state
    if (typeof hasPaidEntryFee === 'boolean') {
      setHasPaidForTodayForScoreSubmission(hasPaidEntryFee);
    }
  }, [hasPaidEntryFee]);

  // Effect to handle fee payment submission (initial step when hash is received)
  useEffect(() => {
    if (payFeeDataHash) {
      // Transaction has been submitted
      setScoreSubmissionMessage('Entry fee transaction sent! Waiting for confirmation...');
      setShowScoreSubmissionStatus(true);
      setIsConfirmingFee(true); // Indicate we are now waiting for confirmation
    }
    // Handling payFeeError here is important for immediate feedback if submission itself errored
    if (payFeeError && !payFeeDataHash) { // Ensure this only runs if submission itself errored
      setScoreSubmissionMessage(`Failed to pay entry fee: ${payFeeError.message.substring(0, 70)}...`);
      setShowScoreSubmissionStatus(true);
      setIsConfirmingFee(false); // No longer confirming
      resetPayFee(); // Reset wagmi hook state
    }
  }, [payFeeDataHash, payFeeError, setScoreSubmissionMessage, setShowScoreSubmissionStatus, setIsConfirmingFee, resetPayFee]);

  // Effect to handle fee transaction confirmation (when useWaitForTransactionReceipt updates)
  useEffect(() => {
    if (!payFeeDataHash) return; // Only proceed if there's a hash we are waiting for

    if (isLoadingFeeTxReceipt) {
      setScoreSubmissionMessage('Confirming entry fee transaction...');
      setShowScoreSubmissionStatus(true); // Ensure status is shown
      return;
    }

    if (isFeeTxSuccess) { // This is true if select returned true (receipt.status === 'success')
      setScoreSubmissionMessage('Entry fee confirmed! You can now submit your score.');
      setShowScoreSubmissionStatus(true);
      setIsConfirmingFee(false);
      refetchHasPaidEntryFee(); // Refetch payment status to update UI and enable score submission
      resetPayFee(); // Reset the fee payment hook state as the transaction is processed
    } else if (!isFeeTxSuccess && !isLoadingFeeTxReceipt && payFeeDataHash) {
      // This condition means: not loading, not successful (could be reverted or select returned false), and there was a hash.
      setScoreSubmissionMessage('Entry fee transaction failed or was reverted. Please try again.');
      setShowScoreSubmissionStatus(true);
      setIsConfirmingFee(false);
      resetPayFee(); // Reset the fee payment hook state
    }
  }, [
    payFeeDataHash,
    isLoadingFeeTxReceipt,
    isFeeTxSuccess,
    refetchHasPaidEntryFee,
    setScoreSubmissionMessage,
    setShowScoreSubmissionStatus,
    setIsConfirmingFee,
    resetPayFee
  ]);

  // Effect to handle score submission transaction (initial step when hash is received)
  useEffect(() => {
    if (submitScoreTxHash) {
      // Don't show initial transaction message, wait for confirmation
      setIsConfirmingScore(true);
      setIsAttemptingScoreSubmission(true); // Keep button disabled
    }
    if (submitScoreTxError && !submitScoreTxHash) {
      setScoreSubmissionMessage(`Failed to submit score: ${submitScoreTxError.message.substring(0, 70)}...`);
      setShowScoreSubmissionStatus(true);
      setIsConfirmingScore(false);
      setIsAttemptingScoreSubmission(false); // Re-enable button
      resetSubmitScoreTx();
    }
  }, [submitScoreTxHash, submitScoreTxError, resetSubmitScoreTx]);

  // Function to handle transaction hash click
  const { actions } = useMiniAppContext();

  const handleTxHashClick = useCallback((txHash: string) => {
    actions?.openUrl(`https://testnet.monvision.io/tx/${txHash}`);
  }, [actions]);

  // Effect to handle score transaction confirmation (when useWaitForTransactionReceipt updates)
  useEffect(() => {
    if (!submitScoreTxHash) return;

    if (isLoadingScoreTxReceipt) {
      setScoreSubmissionMessage(
        <span>
          Confirming score submission... (TX: <button 
            onClick={() => handleTxHashClick(submitScoreTxHash)}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {`${submitScoreTxHash.slice(0, 10)}...${submitScoreTxHash.slice(-8)}`}
          </button>)
        </span>
      );
      setShowScoreSubmissionStatus(true);
      setIsAttemptingScoreSubmission(true);
      return;
    }

    if (isScoreTxSuccess) {
      setScoreSubmissionMessage(
        <span>
          {isNewHighScore ? 'New High Score submitted successfully! 🎉' : 'Score submitted successfully! ✔️'} (TX: <button 
            onClick={() => handleTxHashClick(submitScoreTxHash)}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {`${submitScoreTxHash.slice(0, 10)}...${submitScoreTxHash.slice(-8)}`}
          </button>)
        </span>
      );
      if (isNewHighScore) {
        setPlayerAllTimeHighScore(BigInt(score)); // Update local high score immediately
        // setIsNewHighScore(false); // Reset for next game - this will be reset in restartGame or if game over logic runs again
      }
      refetchPlayerAllTimeHighScore?.(); // Refetch player's all-time high score after successful submission
      setShowScoreSubmissionStatus(true);
      setIsConfirmingScore(false);
      setHasSubmittedScore(true); // Set the submitted state to true
      setIsAttemptingScoreSubmission(false);
      // Keep the transaction hash visible but don't reset it
      // Don't reset the submit score transaction state to keep the UI showing submitted
    } else if (!isScoreTxSuccess && !isLoadingScoreTxReceipt && submitScoreTxHash) {
      // This condition implies the transaction was mined but failed (e.g., reverted)
      setScoreSubmissionMessage(`Score submission transaction failed or was reverted. Please try again. ❌ (TX: ${submitScoreTxHash.slice(0, 10)}...${submitScoreTxHash.slice(-8)})`);
      setShowScoreSubmissionStatus(true);
      setIsConfirmingScore(false);
      setIsAttemptingScoreSubmission(false); // Re-enable button
      resetSubmitScoreTx();
    }
  }, [
    submitScoreTxHash,
    isLoadingScoreTxReceipt,
    isScoreTxSuccess,
    resetSubmitScoreTx,
    setScoreSubmissionMessage, 
    setShowScoreSubmissionStatus, 
    setIsConfirmingScore, 
    setIsAttemptingScoreSubmission
  ]);

  // Remove wagmi hook calls
  // const { address, isConnected, chainId } = useAccount();
  const initialSnakePosition = { x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) };
  const [snake, setSnake] = useState<Position[]>([initialSnakePosition]); // Logical snake
  const [visualSnake, setVisualSnake] = useState<Position[]>([{...initialSnakePosition}]); // Visual snake for rendering
  const logicalSnakeRef = useRef<Position[]>([{...initialSnakePosition}]);

  const [food, setFood] = useState(() => ({
    ...getRandomPosition(),
    type: getRandomFoodType(),
  }));
  const [superFood, setSuperFood] = useState<SuperFoodState | null>(null);
  // const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 }); // Right
  // const [directionQueue, setDirectionQueue] = useState<{ x: number; y: number }[]>([]);
  const directionRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });
  const directionQueueRef = useRef<{ x: number; y: number }[]>([]);



  // const [isMuted, setIsMuted] = useState(false); // Remove local state, use props instead
  const eatSoundRef = useRef<HTMLAudioElement | null>(null);
  const superEatSoundRef = useRef<HTMLAudioElement | null>(null);
  const startSoundRef = useRef<HTMLAudioElement | null>(null); // Added for start sound
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null); // Added for game over sound
  const [isGameStarting, setIsGameStarting] = useState(true); // Added for countdown phase
  const [countdownValue, setCountdownValue] = useState(3); // Added for countdown value

  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const animatedScore = useMotionValue(0); // Use motion value for score
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handlePayEntryFeeToSaveScore = async () => {
    if (!isConnected || !address) {
      setScoreSubmissionMessage('Please connect your wallet first.');
      setShowScoreSubmissionStatus(true);
      return;
    }
    if (chainId !== monadTestnet.id) {
      try {
        setScoreSubmissionMessage('Switching to Monad Testnet...');
        setShowScoreSubmissionStatus(true);
        await switchChain?.({ chainId: monadTestnet.id });
        // Wait for chain switch to reflect, then re-evaluate or let user retry
        // For now, we'll let the useEffect for gameOver handle re-evaluation of messages
        // or the user can click the button again.
        // A brief timeout might be needed if the chain switch isn't immediate in wagmi's state.
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        // After switch, the main gameOver useEffect should update messages if still on gameOver screen
        // Or, if not on gameOver, the button states will be re-evaluated if clicked again.
      } catch (e) {
        setScoreSubmissionMessage('Please switch to Monad Testnet in your wallet and try again.');
        setShowScoreSubmissionStatus(true);
        return;
      }
      // Re-check chainId after attempting switch, as it might be needed if the component doesn't re-render fast enough
      // For simplicity, we assume the gameOver useEffect or next button click will handle the updated state.
    }
    if ((LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE') {
      setScoreSubmissionMessage('Leaderboard contract address is not set.');
      setShowScoreSubmissionStatus(true);
      return;
    }
    if (isLoadingEntryFee || !entryFeeAmount || entryFeeAmount === 0n) {
      setScoreSubmissionMessage('Entry fee not loaded. Please wait.');
      setShowScoreSubmissionStatus(true);
      return;
    }

    try {
      resetPayFee(); // Resets isPayingFee, payFeeDataHash, payFeeError from the hook
      // isPayingFee will become true via the hook upon calling payEntryFeeContract
      // isConfirmingFee will be set by the useEffect watching payFeeDataHash
      setScoreSubmissionMessage('Preparing entry fee transaction...'); // Initial message before wagmi takes over
      setShowScoreSubmissionStatus(true);

      payEntryFeeContract({
        abi: LeaderboardABI,
        address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'payEntryFee',
        value: entryFeeAmount,
      });
      // Subsequent messages ('Sending Tx...', 'Confirming Tx...') are handled by useEffects
    } catch (error) {
      // This catch is for synchronous errors during payEntryFeeContract setup, if any.
      // Asynchronous errors (like user rejection) are handled by payFeeError in its useEffect.
      console.error('Error initiating entry fee payment:', error);
      setScoreSubmissionMessage(`Error preparing payment: ${error instanceof Error ? error.message.substring(0,70)+'...' : 'Unknown error'}`);
      setShowScoreSubmissionStatus(true);
      setIsConfirmingFee(false); // Ensure confirming state is false
      // isPayingFee should be false if resetPayFee() was effective or if the hook handles it.
    }
  };

  useEffect(() => {
    sdk.actions.ready({ disableNativeGestures: true });
    // Optional: If you need to re-enable gestures on unmount, though MainMenu handles it.
    // return () => {
    //   sdk.actions.ready({ disableNativeGestures: false });
    // };
  }, []);

  useEffect(() => {
    logicalSnakeRef.current = snake;
  }, [snake]);

  // useEffect for animation loop (visual snake)
  useEffect(() => {
    if (gameOver || isGameStarting) {
      // When game is over, starting, or paused, visual snake should exactly match logical snake
      setVisualSnake([...logicalSnakeRef.current]);
      return;
    }

    let animationFrameId: number;

    const animateVisualSnake = () => {
      setVisualSnake(prevVisualSnake => {
        const currentLogicalSnake = logicalSnakeRef.current;

        if (currentLogicalSnake.length === 0) {
          return []; // If logical snake is empty, visual snake is empty
        }

        let nextVisualSnake = [...prevVisualSnake];

        // Adjust length of visualSnake to match logicalSnake
        if (nextVisualSnake.length < currentLogicalSnake.length) {
          const diff = currentLogicalSnake.length - nextVisualSnake.length;
          for (let i = 0; i < diff; i++) {
            // Add new visual segment at the position of the new logical head
            nextVisualSnake.unshift({ ...currentLogicalSnake[0] });
          }
        } else if (nextVisualSnake.length > currentLogicalSnake.length) {
          const diff = nextVisualSnake.length - currentLogicalSnake.length;
          for (let i = 0; i < diff; i++) {
            nextVisualSnake.pop(); // Remove from tail
          }
        }
        
        // If after adjustment, logical snake is empty but visual isn't (or vice-versa due to async state),
        // ensure consistency before interpolation.
        if (currentLogicalSnake.length === 0) return [];
        if (nextVisualSnake.length === 0 && currentLogicalSnake.length > 0) {
           nextVisualSnake = currentLogicalSnake.map(p => ({...p}));
        }
        if (nextVisualSnake.length === 0) return []; // Still empty, nothing to interpolate


        const finalVisualSnake = nextVisualSnake.map((visualSegment, index) => {
          const logicalSegment = currentLogicalSnake[index];
          // This check should ideally not be needed if length syncing is perfect
          if (!logicalSegment) return visualSegment; 

          const targetX = logicalSegment.x;
          const targetY = logicalSegment.y;

          const currentX = visualSegment.x;
          const currentY = visualSegment.y;

          let newX = currentX + (targetX - currentX) * SNAKE_INTERPOLATION_FACTOR;
          let newY = currentY + (targetY - currentY) * SNAKE_INTERPOLATION_FACTOR;

          // Snap to target if very close to prevent micro-drifting
          if (Math.abs(targetX - newX) < 0.001) newX = targetX;
          if (Math.abs(targetY - newY) < 0.001) newY = targetY;

          return { x: newX, y: newY }; // Removed Math.round
        });
        return finalVisualSnake;
      });
      animationFrameId = requestAnimationFrame(animateVisualSnake);
    };

    // Initial sync when effect (re)starts and game is active
    setVisualSnake([...logicalSnakeRef.current]); 
    animationFrameId = requestAnimationFrame(animateVisualSnake);

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, isGameStarting]); // Relies on logicalSnakeRef.current for the latest logical snake

  // Call restartGame on initial mount to ensure game starts correctly with sound
  useEffect(() => {
    restartGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount





  const spawnNewFood = useCallback(() => {
    const occupiedPositions = [...snake, food ? {x: food.x, y: food.y} : null, superFood ? {x: superFood.x, y: superFood.y} : null].filter(p => p !== null) as Position[];
    setFood({
      ...getRandomPosition(occupiedPositions),
      type: getRandomFoodType(),
    });
  }, [snake, food, superFood]);

  const trySpawnSuperFood = useCallback(() => {
    if (superFood) return; // Don't spawn if one is already active
    if (Math.random() < SUPER_FOOD_SPAWN_CHANCE) {
      const superFoodType = getRandomFoodType(true);
      if (superFoodType && superFoodType.duration) {
        const occupiedPositions = [...snake, food ? {x: food.x, y: food.y} : null].filter(p => p !== null) as Position[];
        setSuperFood({
          ...getRandomPosition(occupiedPositions),
          type: superFoodType,
          timer: superFoodType.duration,
        });
      }
    }
  }, [snake, food, superFood]);

  // const [gameOver, setGameOver] = useState(false);
  // const [score, setScore] = useState(0);
  // const animatedScore = useMotionValue(0); // Use motion value for score
  // const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  // Removed prevScore state as it's not needed with useMotionValue

  useEffect(() => {
    // Animate score when it changes
    // Only run animation if the game is NOT over
    if (!gameOver) {
      const controls = animate(animatedScore, score, {
        duration: 0.5, // Adjust duration as needed
        ease: "easeOut", // Optional: specify easing
        onUpdate: (latest) => {
          animatedScore.set(Math.round(latest));
        },
        onComplete: () => {
          // Ensure final value is rounded and set
          animatedScore.set(Math.round(score));
        }
      });
      return () => {
        controls.stop();
      };
    } else {
      // When game is over, immediately set animatedScore to the final score (rounded)
      animatedScore.set(Math.round(score));
    }
  }, [score, animatedScore, gameOver]);

  useEffect(() => {
    // Ensure sound files are in public/sounds/ directory
    eatSoundRef.current = new Audio('/sounds/eat.wav');
    eatSoundRef.current.load(); // Preload sound
    superEatSoundRef.current = new Audio('/sounds/super_eat.wav');
    superEatSoundRef.current.load(); // Preload sound
    startSoundRef.current = new Audio('/sounds/game_start.mp3'); // Updated path
    startSoundRef.current.load(); // Preload sound
    gameOverSoundRef.current = new Audio('/sounds/game_over.wav'); // Added game over sound
    gameOverSoundRef.current.load(); // Preload sound
    // The start sound is played via playSound('start') in restartGame.
  }, []); // Dependency array can be empty if isMuted is handled by prop

  const playSound = useCallback((soundType: 'eat' | 'super_eat' | 'start' | 'game_over') => {
    if (isMuted) return; // Uses the isMuted prop
    let soundToPlay: HTMLAudioElement | null = null;
    if (soundType === 'eat') {
      soundToPlay = eatSoundRef.current;
    } else if (soundType === 'super_eat') {
      soundToPlay = superEatSoundRef.current;
    } else if (soundType === 'start') {
      soundToPlay = startSoundRef.current;
    } else if (soundType === 'game_over') { // Added case for game over sound
      soundToPlay = gameOverSoundRef.current;
    }

    if (soundToPlay) {
      soundToPlay.currentTime = 0; // Rewind to start
      soundToPlay.play().catch(error => console.error(`Error playing ${soundType} sound:`, error));
    }
  }, [isMuted]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      // Prevent default for arrow keys to stop page scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }

      let newDir: { x: number; y: number } | null = null;
      const latestDir = directionQueueRef.current.length > 0 
        ? directionQueueRef.current[directionQueueRef.current.length - 1] 
        : directionRef.current;

      switch (event.key) {
        case 'ArrowUp':
          if (latestDir.y === 0) newDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (latestDir.y === 0) newDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (latestDir.x === 0) newDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (latestDir.x === 0) newDir = { x: 1, y: 0 };
          break;
      }
      if (newDir) {
        // setDirectionQueue(q => [...q, newDir!]);
        directionQueueRef.current.push(newDir!); // Keeping newDir! as per original logic
      }
    },
    [] // Refs are stable, no need for them in dependency array
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    } else {
      setTouchStart(null); // Reset if more than one touch
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    // Prevent scrolling while swiping.
    // touchAction: 'none' on the div should handle this.
    if (touchStart) {
      // event.preventDefault(); // Removed to avoid passive listener error, as touchAction: 'none' should suffice
    }
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStart || event.changedTouches.length === 0) return;

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const diffX = touchEndX - touchStart.x;
    const diffY = touchEndY - touchStart.y;

    let newDir: { x: number; y: number } | null = null;
    const latestDir = directionQueueRef.current.length > 0
      ? directionQueueRef.current[directionQueueRef.current.length - 1]
      : directionRef.current;

    // Determine the dominant swipe axis
    if (Math.abs(diffX) > Math.abs(diffY)) { // Horizontal swipe
      if (diffX > 0) { // Swipe Right
        if (latestDir.x === 0) newDir = { x: 1, y: 0 };
      } else { // Swipe Left
        if (latestDir.x === 0) newDir = { x: -1, y: 0 };
      }
    } else { // Vertical swipe
      if (diffY > 0) { // Swipe Down
        if (latestDir.y === 0) newDir = { x: 0, y: 1 };
      } else { // Swipe Up
        if (latestDir.y === 0) newDir = { x: 0, y: -1 };
      }
    }

    if (newDir) {
      // setDirectionQueue(q => [...q, newDir!]);
      directionQueueRef.current.push(newDir!);
    }

    setTouchStart(null);
  };

  useEffect(() => {
    if (gameOver || isGameStarting) return; 

    const gameLoop = setInterval(() => {
      // Super food timer update
      if (superFood) {
        setSuperFood(prevSuperFood => {
          if (!prevSuperFood) return null;
          const newTimer = prevSuperFood.timer - 1;
          if (newTimer <= 0) return null; // Despawn if timer runs out
          return { ...prevSuperFood, timer: newTimer };
        });
      }

      // Process direction queue
      if (directionQueueRef.current.length > 0) {
        const newDirectionFromQueue = directionQueueRef.current.shift(); // Get and remove the first direction
        if (newDirectionFromQueue) {
          directionRef.current = newDirectionFromQueue; // Update the main direction
        }
      }
      // Now directionRef.current holds the direction for this tick

      setSnake((prevSnake) => {
        const newSnake = [...prevSnake];
        const head = { ...newSnake[0] };
        // Use the updated direction from directionRef.current
        head.x += directionRef.current.x;
        head.y += directionRef.current.y;

        let collisionDetected = false;
        // Wall collision
        if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
          collisionDetected = true;
        }

        // Self collision
        if (!collisionDetected) { // Only check self-collision if no wall collision
          for (let i = 1; i < newSnake.length; i++) {
            if (newSnake[i].x === head.x && newSnake[i].y === head.y) {
              collisionDetected = true;
              break;
            }
          }
        }

        if (collisionDetected) {
          setGameOver(true);
          playSound('game_over');
          return prevSnake; // Return current snake state before collision to prevent moving into wall/self
        }

        newSnake.unshift(head);

        let ateFood = false;
        // Super Food collision
        if (superFood && head.x === superFood.x && head.y === superFood.y) {
          // Removed setPrevScore(score);
          setScore(s => s + superFood.type.score);
          playSound('super_eat');
          setSuperFood(null); // Remove super food
          ateFood = true; // Snake grows
        } 
        // Normal Food collision
        else if (head.x === food.x && head.y === food.y) {
          // Removed setPrevScore(score);
          setScore(s => s + food.type.score);
          playSound('eat');
          spawnNewFood();
          trySpawnSuperFood(); // Attempt to spawn super food after normal food is eaten
          ateFood = true; // Snake grows
        }

        if (!ateFood) {
          newSnake.pop();
        }
        return newSnake;
      });
    }, GAME_SPEED); // Use GAME_SPEED for interval
    return () => clearInterval(gameLoop);
  }, [snake, food, superFood, gameOver, spawnNewFood, trySpawnSuperFood, isGameStarting, playSound, setSnake, setFood, setSuperFood, setGameOver, animatedScore, score]);

  // Game over sound is now played directly when gameOver is set within the game loop.

  // useEffect for countdown
  useEffect(() => {
    if (isGameStarting && countdownValue > 0) {
      const timer = setInterval(() => {
        setCountdownValue(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (isGameStarting && countdownValue === 0) {
      setIsGameStarting(false);
      // Start sound is now played in restartGame
    }
  }, [isGameStarting, countdownValue]); // playSound removed from dependencies as it's no longer called here

  const submitPlayerScore = useCallback(async () => {
    if (hasSubmittedScore) {
      setScoreSubmissionMessage('Score already submitted for this game. Start a new game to submit again.');
      setShowScoreSubmissionStatus(true);
      return;
    }
    if (!isConnected || !address) {
      setScoreSubmissionMessage('Connect wallet to submit score.');
      setShowScoreSubmissionStatus(true);
      return; // No need to set isAttemptingScoreSubmission false, as it wasn't set true yet
    }
    if (chainId !== monadTestnet.id) {
      // Attempt to switch chain first
      try {
        setScoreSubmissionMessage('Switching to Monad Testnet to submit score...');
        setShowScoreSubmissionStatus(true);
        await switchChain?.({ chainId: monadTestnet.id });
        // Add a small delay to allow wagmi state to update
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Re-check chainId after switch attempt by checking wagmi's reactive state or window.ethereum if needed
        // For simplicity, we'll let the next click re-evaluate or the gameOver useEffect update the message.
        // If the component re-renders due to chainId change, this function might be called again if button is clicked.
        // A more robust way is to check the current chainId from useAccount() again here if it's available immediately after switch.
        // However, wagmi's state updates might not be instant.
        // For now, if switch fails or user cancels, the message will persist.
        // If successful, the next interaction or gameOver useEffect should reflect the change.
      } catch (e) {
        setScoreSubmissionMessage('Failed to switch network. Please switch to Monad Testnet in your wallet and try again.');
        setShowScoreSubmissionStatus(true);
        return;
      }
      // After attempting switch, if still not on the correct chain, show message and return.
      // This check relies on the chainId from useAccount() being updated.
      if (chainId !== monadTestnet.id) { // Re-check after switch attempt
         setScoreSubmissionMessage('Please switch to Monad Testnet in your wallet and try again.');
         setShowScoreSubmissionStatus(true);
         return;
      }
    }
    if ((LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE') {
        setScoreSubmissionMessage('Leaderboard contract not configured.');
        setShowScoreSubmissionStatus(true);
        return;
    }
    if (!hasPaidForTodayForScoreSubmission) {
      setScoreSubmissionMessage('You need to get a daily pass to submit your score.');
      setShowScoreSubmissionStatus(true);
      return;
    }
    if (score <= 0) {
      setScoreSubmissionMessage('Score must be greater than 0 to submit.');
      setShowScoreSubmissionStatus(true);
      return;
    }

    // Enforce Monad Testnet for score submission
    if (chainId !== monadTestnet.id) {
      setScoreSubmissionMessage('Please switch to Monad Testnet to submit your score.');
      setShowScoreSubmissionStatus(true);
      if (switchChain) {
        try {
          await switchChain({ chainId: monadTestnet.id });
          // User will need to click "Submit Score" again after switching.
        } catch (error) {
          console.error("Failed to switch chain during score submission:", error);
        }
      } else {
        console.error('Switch chain function not available for score submission.');
      }
      return; // Prevent submission if not on Monad Testnet or if switch is initiated
    }

    // setIsAttemptingScoreSubmission(true); // This will be handled by useEffect watching submitScoreTxHash
    // setScoreSubmissionMessage('Submitting score...'); // This will be handled by useEffect watching submitScoreTxHash
    // setShowScoreSubmissionStatus(true); // This will be handled by useEffect watching submitScoreTxHash
    resetSubmitScoreTx(); // Use the new reset function for the correct hook

    try {
      submitScoreContract({ // Use the new contract hook instance
        abi: LeaderboardABI,
        address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'submitScore',
        args: [BigInt(score)],
      });
      // Message updates and isAttemptingScoreSubmission are now handled by the dedicated useEffects
      // for submitScoreTxHash, isLoadingScoreTxReceipt, isScoreTxSuccess, submitScoreTxError.
    } catch (error) {
      // This catch is for synchronous errors during submitScoreContract setup.
      console.error('Error initiating score submission:', error);
      setScoreSubmissionMessage(`Error preparing submission: ${error instanceof Error ? error.message.substring(0,70)+'...' : 'Unknown error'}`);
      setShowScoreSubmissionStatus(true);
      setIsAttemptingScoreSubmission(false); // Ensure button is re-enabled on sync error
    }
  }, [isConnected, address, chainId, score, hasPaidForTodayForScoreSubmission, submitScoreContract, resetSubmitScoreTx, switchChain, setScoreSubmissionMessage, setShowScoreSubmissionStatus, setIsAttemptingScoreSubmission]);

  // The old useEffect for submitScoreData and submitScoreError is removed as its logic is now in the
  // useEffects watching submitScoreTxHash, isLoadingScoreTxReceipt, isScoreTxSuccess, and submitScoreTxError (added in toolcall_3)


  // useEffect for handling game over state and UI messages for score submission
  useEffect(() => {
    if (gameOver) {
      // Check for new high score first when game is over
      if (playerAllTimeHighScore !== null && score > 0 && BigInt(score) > playerAllTimeHighScore) {
        setIsNewHighScore(true);
      } else {
        setIsNewHighScore(false);
      }
      // It's good to refetch here in case the user restarts without submitting, or to have the latest for comparison.
      if(address && isConnected) refetchPlayerAllTimeHighScore?.();

      // Show status card unless a score submission is already successful or actively being confirmed.
      if (!isScoreTxSuccess && !isConfirmingScore) {
        setShowScoreSubmissionStatus(true);
      }

      // Prioritize messages from active transaction states (fee or score)
      if (isPayingFee || isConfirmingFee || isSubmittingScoreTx || isConfirmingScore || isLoadingScoreTxReceipt) {
        // Messages are handled by their respective useEffects, so don't overwrite here.
      } else if (isScoreTxSuccess) {
        // Message handled by score submission useEffect: "Score submitted successfully!"
        // Button will be hidden or replaced by a success message.
      } else if (isLoadingHasPaid) {
        setScoreSubmissionMessage('Checking payment status...');
      } else if ((LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE') {
        setScoreSubmissionMessage('Leaderboard not configured. Scores cannot be saved.');
      } else if (!isConnected || !address) {
        setScoreSubmissionMessage('Connect wallet to save your score.');
      } else if (chainId !== monadTestnet.id) {
        setScoreSubmissionMessage('Switch to Monad Testnet to save your score.');
      } else if (score <= 0) {
        setScoreSubmissionMessage('Game Over! No score to submit.');
      } else if (!hasPaidForTodayForScoreSubmission) {
        setScoreSubmissionMessage(`Final Score: ${score}. Get pass to submit.`);
      } else {
        // Paid, connected, correct network, score > 0, and no active submission process or success
        setScoreSubmissionMessage(`Final Score: ${score}. Ready to submit!`);
      }
    } else {
      // When game is not over, hide submission status unless a transaction is confirming
      if (!isConfirmingFee && !isConfirmingScore && !isLoadingFeeTxReceipt && !isLoadingScoreTxReceipt) {
         setShowScoreSubmissionStatus(false);
         setScoreSubmissionMessage('');
      }
    }
  }, [
    gameOver,
    isConnected,
    address,
    hasPaidForTodayForScoreSubmission,
    score,
    chainId,
    isLoadingHasPaid,
    // Score submission states
    isScoreTxSuccess,
    isSubmittingScoreTx,
    isConfirmingScore,
    isLoadingScoreTxReceipt,
    // Fee payment states
    isPayingFee,
    isConfirmingFee,
    isLoadingFeeTxReceipt,
    // High score related states
    playerAllTimeHighScore, 
    isNewHighScore, // Add isNewHighScore to dependencies
    // refetchPlayerAllTimeHighScore is stable, setIsNewHighScore is stable
    // State setters are stable, but including for completeness if their logic changes
    setShowScoreSubmissionStatus, 
    setScoreSubmissionMessage   
  ]);


  const restartGame = () => {
    playSound('start'); // Play start sound when game restarts and countdown begins
    setIsGameStarting(true);
    setCountdownValue(3);
    const initialSnakePos = { x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) };
    setSnake([initialSnakePos]);
    setFood({
        ...getRandomPosition([initialSnakePos]),
        type: getRandomFoodType(),
    });
    setSuperFood(null);
    // setDirection({ x: 1, y: 0 });
    // setDirectionQueue([]);
    directionRef.current = { x: 1, y: 0 };
    directionQueueRef.current = [];
    setGameOver(false);
    setScore(0);
    
    // Reset score submission states
    setScoreSubmissionMessage('');
    setShowScoreSubmissionStatus(false);
    setIsAttemptingScoreSubmission(false);
    setIsConfirmingScore(false);
    setHasSubmittedScore(false);
    setIsNewHighScore(false); // Reset new high score flag
    if (resetSubmitScoreTx) resetSubmitScoreTx(); // Reset the wagmi hook state
    if (address && isConnected) refetchPlayerAllTimeHighScore?.(); // Refetch high score on restart
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full text-slate-200 p-2 relative"
       style={{ 
         backgroundColor: '#ad99ff', 
         backgroundImage: 'radial-gradient(at 71% 88%, hsla(198,92%,67%,1) 0px, transparent 50%), radial-gradient(at 69% 34%, hsla(281,80%,71%,1) 0px, transparent 50%), radial-gradient(at 83% 89%, hsla(205,61%,69%,1) 0px, transparent 50%), radial-gradient(at 23% 14%, hsla(234,83%,62%,1) 0px, transparent 50%), radial-gradient(at 18% 20%, hsla(302,94%,70%,1) 0px, transparent 50%), radial-gradient(at 1% 45%, hsla(196,99%,70%,1) 0px, transparent 50%), radial-gradient(at 34% 18%, hsla(316,72%,67%,1) 0px, transparent 50%)', 
         touchAction: 'none' // Prevent passive listener error for touchmove
       }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* <BackgroundGradientAnimation 
        gradientBackgroundStart="rgb(25, 25, 36)" 
        gradientBackgroundEnd="rgb(15, 15, 25)"
        firstColor="18, 113, 255"
        secondColor="221, 74, 255"
        thirdColor="100, 220, 255"
        fourthColor="200, 50, 50"
      /> */}

      <Card className="w-full max-w-sm bg-gray-800/80 border-gray-700 shadow-xl backdrop-blur-sm z-10">
        <CardHeader className="pt-3 pb-1 relative">
          <div className="flex items-center w-full">
            <div className="flex-initial "> {/* Title on the left */}
              <CardTitle className="text-2xl font-bold monake-title">Monake</CardTitle>
            </div>
            <div className="flex-initial mx-auto"> {/* Score in the middle */}
               <motion.div
                 className="text-2xl font-bold text-yellow-400 tabular-nums" // Changed to yellow and kept tabular-nums
                 key={score} // Add key to trigger re-render and animation on score change
                 initial={{ scale: 1 }}
                 animate={{ scale: [1, 1.2, 1] }} // Grow and shrink effect
                 transition={{ duration: 0.3 }} // Animation duration
               >
                 {animatedScore.get()} {/* Display the score value */}
               </motion.div>
            </div>
            <div className="flex-initial ml-auto"> {/* Button on the right */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  variant="outline"
                  size="icon"
                  className="p-2 h-auto bg-gray-800/50 hover:bg-gray-50/80 border-gray-700 text-slate-200 rounded-full"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </Button>
              </motion.div>
            </div>
          </div>
        </CardHeader>
        <CardContent 
          className="flex flex-col items-center space-y-0 px-2 py-1"
        >
          {/* Score Display Removed */}

          {/* Game Grid Container */}
          <div
            className="border border-gray-600 shadow-inner bg-gray-800 overflow-hidden"
            style={{
              width: GRID_WIDTH * CELL_SIZE,
              height: GRID_HEIGHT * CELL_SIZE,
              backgroundColor: GAME_BG_COLOR,
              position: 'relative', // Crucial for absolute positioning of children
            }}
          >
            {/* Vertical Grid Lines */}
            {Array.from({ length: GRID_WIDTH }).map((_, colIndex) => (
              colIndex > 0 && (
                <div
                  key={`vline-${colIndex}`}
                  style={{
                    position: 'absolute',
                    left: colIndex * CELL_SIZE,
                    top: 0,
                    width: 1,
                    height: '100%', 
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    pointerEvents: 'none',
                  }}
                />
              )
            ))}
            {/* Horizontal Grid Lines */}
            {Array.from({ length: GRID_HEIGHT }).map((_, rowIndex) => (
              rowIndex > 0 && (
                <div
                  key={`hline-${rowIndex}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: rowIndex * CELL_SIZE,
                    width: '100%',
                    height: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    pointerEvents: 'none',
                  }}
                />
              )
            ))}
            {/* Countdown Timer - Rendered once over the grid */}
            {isGameStarting && countdownValue > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-md z-20">
                <p className="text-6xl font-bold text-white animate-ping" style={{ animationDuration: '1s' }}>{countdownValue}</p>
              </div>
            )}
            {/* Snake rendering */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              const isTail = index === snake.length - 1 && snake.length > 1;
              let segmentClasses = "absolute rounded-md transition-all ease-linear"; // duration-100 removed, transition duration now in style

              if (isHead) {
                segmentClasses += " bg-green-400 z-10";
                let eyeRotationStyle = {};
                // Determine eye position based on direction for a more dynamic look
                // This is a simplified representation. For true rotation, SVG or more complex CSS might be needed.
                // For now, we'll use fixed positions and rely on the parent's rotation if implemented.
                return (
                  <div
                    key={index}
                    className={`${segmentClasses} flex items-center justify-center`}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      left: segment.x * CELL_SIZE,
                      top: segment.y * CELL_SIZE,
                      transitionProperty: 'left, top, transform',
                      transitionDuration: `${GAME_SPEED}ms`,
                      // transform: `rotate(${getRotationAngle(directionRef.current)}deg)` // Optional: rotate head, using directionRef.current
                    }}
                  >
                    {/* Eyes positioned based on direction */}
                    <div className={`eye ${directionRef.current.x === 1 ? 'eye-right-pos' : directionRef.current.x === -1 ? 'eye-left-pos' : directionRef.current.y === 1 ? 'eye-down-pos' : 'eye-up-pos'}`}></div>
                    <div className={`eye ${directionRef.current.x === 1 ? 'eye-right-pos' : directionRef.current.x === -1 ? 'eye-left-pos' : directionRef.current.y === 1 ? 'eye-down-pos' : 'eye-up-pos'}`}></div>
                  </div>
                );
              } else if (isTail) {
                segmentClasses += " bg-green-600";
                return (
                  <div
                    key={index}
                    className={segmentClasses}
                    style={{
                      width: CELL_SIZE * 0.8, // Smaller tail
                      height: CELL_SIZE * 0.8,
                      left: segment.x * CELL_SIZE + CELL_SIZE * 0.1, // Centered
                      top: segment.y * CELL_SIZE + CELL_SIZE * 0.1, // Centered
                      borderRadius: '40% 40% 20% 20%', // Tapered tail shape
                      transitionProperty: 'left, top',
                      transitionDuration: `${GAME_SPEED}ms`,
                    }}
                  />
                );
              } else {
                segmentClasses += " bg-green-500"; // Body color
                return (
                  <div
                    key={index}
                    className={segmentClasses}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      left: segment.x * CELL_SIZE,
                      top: segment.y * CELL_SIZE,
                      transitionProperty: 'left, top',
                      transitionDuration: `${GAME_SPEED}ms`,
                    }}
                  />
                );
              }
            })}
            <div
              className="absolute text-2xl flex items-center justify-center shadow-md transition-transform duration-200 ease-in-out"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            >
              {food.type.emoji}
            </div>
            {superFood && (
              <div 
                className="absolute text-2xl flex flex-col items-center justify-center shadow-lg transition-transform duration-200 ease-in-out"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE * 1.5, // Make space for timer bar
                  left: superFood.x * CELL_SIZE,
                  top: superFood.y * CELL_SIZE - CELL_SIZE * 0.25, // Adjust top for timer bar
                  animation: 'pulse 1s infinite ease-in-out',
                }}
              >
                <div 
                  className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden mb-0.5"
                  style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                >
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-100 ease-linear"
                    style={{ width: `${(superFood.timer / (superFood.type.duration || SUPER_FOOD_BASE_DURATION)) * 100}%` }}
                  ></div>
                </div>
                <span style={{ marginTop: '6px' }}>{superFood.type.emoji}</span>
              </div>
            )}
            {isGameStarting && countdownValue > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-md z-20">
                <p className="text-6xl font-bold text-white animate-ping" style={{ animationDuration: '1s' }}>{countdownValue}</p>
              </div>
            )}
              {/* Game Over Modal */}
              {gameOver && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 rounded-lg">
                   <Image src="/images/ded-snake-lol.png" alt="Game Over Snake" width={200} height={200} className="mb-3" priority/>
                  <p className="text-5xl font-bold text-red-500 mb-2 animate-pulse">Game Over</p>
                  <p className="text-xl text-slate-100 mb-4">Final Score: {score}</p>

                  {/* Score Submission / Payment Button Logic */} 
                  {score > 0 && (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE' && (
                    !isConnected ? (
                      <Button 
                        onClick={() => connectors.length > 0 && connect({ connector: connectors[0] })}
                        className="w-3/4 py-3 text-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out my-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Connect Wallet
                      </Button>
                    ) : chainId !== monadTestnet.id ? (
                      <Button 
                        onClick={() => switchChain && switchChain({ chainId: monadTestnet.id })}
                        className="w-3/4 py-3 text-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out my-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Switch to Monad Testnet to Save Score
                      </Button>
                    ) : ( // Wallet is connected and on the correct chain
                      isConnected && address && chainId === monadTestnet.id && ( // This inner check is now redundant due to outer checks but kept for safety / structure similarity
                    
                    hasPaidForTodayForScoreSubmission ? (
                      isScoreTxSuccess || hasSubmittedScore ? (
                        <div className="text-center w-3/4 my-2">
                          <p className="text-green-400 font-semibold text-lg py-2">Submitted!!</p>
                          {submitScoreTxHash && (
                            <p className="text-sm text-green-300">
                              TX: {submitScoreTxHash.slice(0, 10)}...{submitScoreTxHash.slice(-8)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button 
                          onClick={submitPlayerScore} 
                          disabled={isAttemptingScoreSubmission || score <= 0 || isPayingFee || isConfirmingFee}
                          className="w-3/4 py-3 text-lg bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out my-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isAttemptingScoreSubmission ? 'Processing...' : (isNewHighScore ? `Submit New High Score!` : `Submit Score`)}
                        </Button>
                      )
                    ) : (
                      <Button 
                        onClick={handlePayEntryFeeToSaveScore}
                        disabled={isPayingFee || isConfirmingFee || isLoadingHasPaid || isLoadingEntryFee || isAttemptingScoreSubmission}
                        className="w-3/4 py-3 text-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out my-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isPayingFee ? 'Sending Tx...' 
                          : isConfirmingFee ? 'Confirming Tx...' 
                          : (isLoadingHasPaid || isLoadingEntryFee) ? 'Loading Status...' 
                          : `Save Score (${formatEther(entryFeeAmount)} MON)`}
                      </Button>
                    )
                  )
                  ))}
                  {/* End of new connect/switch logic wrapper */}

                  {(isAttemptingScoreSubmission || isPayingFee || isConfirmingFee) && !isScoreTxSuccess &&
                    <p className="text-center my-2 text-sm text-blue-300">Please wait...</p> 
                  }
                  
                  {showScoreSubmissionStatus && (
                    // This message area will show general status or errors not covered by button states
                    // Specific messages for 'Pay fee', 'Switch chain', 'Connect wallet' are shown if buttons aren't rendered or if those are the primary actions needed.
                    // Success/failure of actual submission/payment will also appear here.
                    <p className={`text-sm my-2 p-2 rounded-md w-3/4 text-center ${isScoreTxSuccess || (payFeeDataHash && !payFeeError) ? 'bg-green-700/70 text-green-300' : (submitScoreTxError || payFeeError || (typeof scoreSubmissionMessage === 'string' && (scoreSubmissionMessage.includes('failed') || scoreSubmissionMessage.includes('not configured') || scoreSubmissionMessage.includes('Pay entry fee') || scoreSubmissionMessage.includes('Switch to Monad') || scoreSubmissionMessage.includes('Connect wallet')))) ? 'bg-red-700/70 text-red-300' : 'bg-blue-700/70 text-blue-300'}`}>
                      {scoreSubmissionMessage}
                    </p>
                  )}
                  {/* Fallback message if contract address is missing and no other message is active */}
                  {(LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE' && !showScoreSubmissionStatus && (
                     <p className="text-center text-xs text-red-300 p-2 my-2 bg-red-700/50 rounded-md w-3/4">
                      Leaderboard contract not configured. Scores will not be saved.
                    </p>
                  )}
                 
                  {/* Original showScoreSubmissionStatus block, now integrated above or covered by button logic */}
                  {/* {showScoreSubmissionStatus && (
                    <p className={`text-sm my-2 p-2 rounded-md w-3/4 text-center ${submitScoreData ? 'bg-green-700/70 text-green-300' : (submitScoreError || scoreSubmissionMessage.includes('failed') || scoreSubmissionMessage.includes('not configured') || scoreSubmissionMessage.includes('Pay entry fee') || scoreSubmissionMessage.includes('Switch to Monad') || scoreSubmissionMessage.includes('Connect wallet')) ? 'bg-red-700/70 text-red-300' : 'bg-blue-700/70 text-blue-300'}`}>
                      {scoreSubmissionMessage}
                    </p>
                  )} */}
                  {/* {(LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE' && !showScoreSubmissionStatus && (
                     <p className="text-center text-xs text-red-300 p-2 my-2 bg-red-700/50 rounded-md w-3/4">
                      Leaderboard contract not configured. Scores will not be saved.
                    </p>
                  )} */}

                 
                  {/* <p className="text-2xl text-slate-300 mb-1">Final Score</p> */}
                  {/* <p className="text-3xl font-bold text-cyan-400 mb-4">{score}</p> */}
                  <div className="flex space-x-3">
                    <Button 
                      onClick={restartGame} 
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
                    >
                      Restart
                    </Button>
                    <Button 
                      onClick={onBackToMenu} 
                      className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
                    >
                      Menu
                    </Button>
                  </div>
                  {/* Share on Farcaster Button */} 
                  <Button 
                      onClick={() => {
                        if (actions) {
                          const shareMessages = [
                            `I scored ${score} in the Monad Snake Game! Can you beat my score? 🐍🎮`,
                            `Just hit ${score} points in the Monad Snake Game! Challenge me! 🚀`,
                            `Slithering my way to ${score} in the Monad Snake Game! What's your best? 🌟`,
                            `Can anyone beat my ${score} points in the Monad Snake Game? Give it a shot! 🏆`,
                            `Feeling proud of my ${score} in the Monad Snake Game! Join the fun! 🎉`
                          ];
                          const randomIndex = Math.floor(Math.random() * shareMessages.length);
                          const selectedMessage = shareMessages[randomIndex];
                          actions.composeCast({
                            text: selectedMessage,
                            embeds: [`${APP_URL}`],
                          });
                        }
                      }}
                      className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
                      disabled={!actions} // Disable if actions are not available
                    >
                    Share Score
                  </Button>
                </div>
              )}

              
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center pt-1 pb-3">
            <p className="text-xs text-gray-400 ">Use arrow keys or swipe to move</p>
        </CardFooter>
        
      </Card>
      <style jsx global>{`
        html, body, #__next, div#__next > div {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          overscroll-behavior: contain;
          overflow: hidden; /* Prevent body scrollbars, rely on app's internal scroll */
          box-sizing: border-box;
        }
        *, *::before, *::after {
          box-sizing: inherit;
        }

        .monake-title {
          animation: rgb-text 5s infinite linear;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          background-image: linear-gradient(90deg, #6E54FFff, #6651FAff, #5F4EF5ff, #574AF0ff, #4F47EBff, #6E54FFff); // Extended gradient for smoother loop
          background-size: 400% 100%; // Increased size for smoother animation
        }

        @keyframes pingOnce {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.7;
          }
        }

        .animate-pingOnce {
          animation: pingOnce 1s ease-in-out;
        }

        .eye {
          width: 4px;
          height: 4px;
          background-color: white;
          border-radius: 50%;
          border: 1px solid black;
          position: absolute;
        }
        .eye-right:first-child { top: 3px; right: 3px; }
        .eye-right:last-child { bottom: 3px; right: 3px; }
        .eye-left:first-child { top: 3px; left: 3px; }
        .eye-left:last-child { bottom: 3px; left: 3px; }
        .eye-up:first-child { top: 3px; left: 3px; }
        .eye-up:last-child { top: 3px; right: 3px; }
        .eye-down:first-child { bottom: 3px; left: 3px; }
        .eye-down:last-child { bottom: 3px; right: 3px; }

        /* Eye positioning based on direction */
        .eye-right-pos:first-child { top: 20%; right: 20%; }
        .eye-right-pos:last-child { bottom: 20%; right: 20%; }
        .eye-left-pos:first-child { top: 20%; left: 20%; }
        .eye-left-pos:last-child { bottom: 20%; left: 20%; }
        .eye-up-pos:first-child { top: 20%; left: 20%; }
        .eye-up-pos:last-child { top: 20%; right: 20%; }
        .eye-down-pos:first-child { bottom: 20%; left: 20%; }
        .eye-down-pos:last-child { bottom: 20%; right: 20%; }

        @keyframes rgb-text {
          0% {
            background-position: 0% 50%;
          }
          /*50% { // Removed to make it a continuous scroll
            background-position: 100% 50%;
          }*/
          100% {
            background-position: 400% 50%; // Match increased background-size
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};

export default SnakeGame;
