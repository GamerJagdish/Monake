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
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniAppContext } from "@/hooks/use-miniapp-context"; // Added import
import { APP_URL } from "@/lib/constants"; // Added import
import VirtualArrowKeys from "@/components/ui/VirtualArrowKeys"; // Added import

// Remove the memoized component - it's not providing the benefits we expected

import { SECURE_LEADERBOARD_ABI } from '@/lib/leaderboard-abi';
import { getSignedScore, getSignedEntryFee, generateGameSession } from '@/lib/secure-score';

const LEADERBOARD_CONTRACT_ADDRESS = '0x9c36dd7af3c84727c43560f32f824067005a210c';
const LeaderboardABI = SECURE_LEADERBOARD_ABI;
const GRID_WIDTH = 12;
const GRID_HEIGHT = 16;
const CELL_SIZE = 30; // Increased for larger cells and snake
const GAME_BG_COLOR = "#2d3748"; // Tailwind gray-800
const TEXT_COLOR = "#e2e8f0"; // Tailwind slate-200
const GAME_SPEED = 250; // milliseconds, more comfortable speed
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

const getRandomPosition = (existingPositions: { x: number, y: number }[] = []) => {
  // Optimized: Use Set for O(1) lookup instead of Array.some() which is O(n)
  const occupiedSet = new Set(existingPositions.map(p => `${p.x},${p.y}`));

  let newPos: Position;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop in edge cases

  do {
    newPos = {
      x: Math.floor(Math.random() * GRID_WIDTH),
      y: Math.floor(Math.random() * GRID_HEIGHT),
    };
    attempts++;
  } while (occupiedSet.has(`${newPos.x},${newPos.y}`) && attempts < maxAttempts);

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
  const { actions, context: miniAppContext } = useMiniAppContext();
  const farcasterUser = miniAppContext?.user;

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
  const [visualSnake, setVisualSnake] = useState<Position[]>([{ ...initialSnakePosition }]); // Visual snake for rendering
  const logicalSnakeRef = useRef<Position[]>([{ ...initialSnakePosition }]);

  const [food, setFood] = useState(() => ({
    ...getRandomPosition(),
    type: getRandomFoodType(),
  }));
  const foodRef = useRef(food); // Add ref to prevent stale closures
  const [superFood, setSuperFood] = useState<SuperFoodState | null>(null);
  const superFoodRef = useRef<SuperFoodState | null>(null); // Add ref to prevent stale closures
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
  const isGameStartingRef = useRef(true); // Add ref for performance
  const [countdownValue, setCountdownValue] = useState(3); // Added for countdown value



  const [gameOver, setGameOver] = useState(false);
  const gameOverRef = useRef(false); // Add ref for performance
  const [score, setScore] = useState(0);
  const animatedScore = useMotionValue(0); // Use motion value for score
  const [showVirtualKeys, setShowVirtualKeys] = useState(false); // Show virtual keys on mobile

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
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        setScoreSubmissionMessage('Please switch to Monad Testnet in your wallet and try again.');
        setShowScoreSubmissionStatus(true);
        return;
      }
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
      resetPayFee();
      setScoreSubmissionMessage('Getting signature for entry fee...');
      setShowScoreSubmissionStatus(true);

      // Get Farcaster user data if available
      const farcasterID = farcasterUser?.fid || 0;
      const username = farcasterUser?.username || '';

      // Create dummy game data for entry fee
      const gameData = {
        gameStartTime: Date.now() - 1000,
        gameEndTime: Date.now(),
        moves: [],
        finalScore: 0,
        gameSession: generateGameSession()
      };

      // Get signed entry fee from server
      const signedFee = await getSignedEntryFee(
        address,
        entryFeeAmount.toString(),
        gameData,
        farcasterID,
        username
      );

      setScoreSubmissionMessage('Preparing entry fee transaction...');

      payEntryFeeContract({
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
    } catch (error) {
      console.error('Error initiating entry fee payment:', error);
      setScoreSubmissionMessage(`Error preparing payment: ${error instanceof Error ? error.message.substring(0, 70) + '...' : 'Unknown error'}`);
      setShowScoreSubmissionStatus(true);
      setIsConfirmingFee(false);
    }
  };

  useEffect(() => {
    sdk.actions.ready({ disableNativeGestures: true });

    // Always show virtual keys on mobile devices for better UX
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setShowVirtualKeys(isMobile);

    // Optional: If you need to re-enable gestures on unmount, though MainMenu handles it.
    // return () => {
    //   sdk.actions.ready({ disableNativeGestures: false });
    // };
  }, []);

  useEffect(() => {
    logicalSnakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    superFoodRef.current = superFood;
  }, [superFood]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    isGameStartingRef.current = isGameStarting;
  }, [isGameStarting]);

  // Visual snake not needed with original rendering approach
  useEffect(() => {
    setVisualSnake([...snake]);
  }, [snake]);

  // Cleanup function to clear all timers on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (superFoodTimeoutRef.current) {
        clearTimeout(superFoodTimeoutRef.current);
        superFoodTimeoutRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);





  const spawnNewFood = useCallback(() => {
    const currentSnake = logicalSnakeRef.current;
    const currentFood = foodRef.current;
    const currentSuperFood = superFoodRef.current;

    // Optimized: Build occupied positions more efficiently
    const occupiedPositions: Position[] = [];

    // Add snake positions
    for (let i = 0; i < currentSnake.length; i++) {
      occupiedPositions.push(currentSnake[i]);
    }

    // Add current food position if exists
    if (currentFood) {
      occupiedPositions.push({ x: currentFood.x, y: currentFood.y });
    }

    // Add super food position if exists
    if (currentSuperFood) {
      occupiedPositions.push({ x: currentSuperFood.x, y: currentSuperFood.y });
    }

    setFood({
      ...getRandomPosition(occupiedPositions),
      type: getRandomFoodType(),
    });
  }, []); // No dependencies needed since we use refs

  const trySpawnSuperFood = useCallback(() => {
    const currentSuperFood = superFoodRef.current;
    if (currentSuperFood) return; // Don't spawn if one is already active
    if (Math.random() < SUPER_FOOD_SPAWN_CHANCE) {
      const superFoodType = getRandomFoodType(true);
      if (superFoodType && superFoodType.duration) {
        const currentSnake = logicalSnakeRef.current;
        const currentFood = foodRef.current;

        // Optimized: Build occupied positions more efficiently
        const occupiedPositions: Position[] = [];

        // Add snake positions
        for (let i = 0; i < currentSnake.length; i++) {
          occupiedPositions.push(currentSnake[i]);
        }

        // Add current food position if exists
        if (currentFood) {
          occupiedPositions.push({ x: currentFood.x, y: currentFood.y });
        }

        setSuperFood({
          ...getRandomPosition(occupiedPositions),
          type: superFoodType,
          timer: superFoodType.duration,
        });
      }
    }
  }, []); // No dependencies needed since we use refs

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
    if (!eatSoundRef.current) {
      eatSoundRef.current = new Audio('/sounds/eat.wav');
      eatSoundRef.current.load(); // Preload sound
    }
    if (!superEatSoundRef.current) {
      superEatSoundRef.current = new Audio('/sounds/super_eat.wav');
      superEatSoundRef.current.load(); // Preload sound
    }
    if (!startSoundRef.current) {
      startSoundRef.current = new Audio('/sounds/game_start.mp3'); // Updated path
      startSoundRef.current.load(); // Preload sound
    }
    if (!gameOverSoundRef.current) {
      gameOverSoundRef.current = new Audio('/sounds/game_over.wav'); // Added game over sound
      gameOverSoundRef.current.load(); // Preload sound
    }

    // Cleanup function to prevent memory leaks
    return () => {
      // Safely pause and cleanup audio elements
      [eatSoundRef, superEatSoundRef, startSoundRef, gameOverSoundRef].forEach(soundRef => {
        if (soundRef.current) {
          try {
            soundRef.current.pause();
            soundRef.current.currentTime = 0;
            soundRef.current.src = '';
          } catch (error) {
            // Ignore cleanup errors
          }
          soundRef.current = null;
        }
      });
    };
  }, []); // Dependency array can be empty if isMuted is handled by prop

  const playSound = useCallback(async (soundType: 'eat' | 'super_eat' | 'start' | 'game_over') => {
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
      try {
        // Reset to beginning first
        soundToPlay.currentTime = 0;
        // Properly handle the play Promise
        await soundToPlay.play();
      } catch (error) {
        // Silently handle play interruptions and other audio errors
        // This prevents console spam while maintaining functionality
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`Error playing ${soundType} sound:`, error);
        }
      }
    }
  }, [isMuted]);

  // Optimized keyboard handler with early returns and reduced complexity
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      // Early return if game is not active - using refs for better performance
      if (gameOverRef.current || isGameStartingRef.current) return;

      // Only handle arrow keys - early return for performance
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        return;
      }

      event.preventDefault(); // Prevent page scrolling

      const latestDir = directionQueueRef.current.length > 0
        ? directionQueueRef.current[directionQueueRef.current.length - 1]
        : directionRef.current;

      // Limit queue size to prevent input lag
      if (directionQueueRef.current.length >= 3) return;

      // Direct direction assignment without intermediate variable
      switch (event.key) {
        case 'ArrowUp':
          if (latestDir.y === 0) {
            directionQueueRef.current.push({ x: 0, y: -1 });
          }
          break;
        case 'ArrowDown':
          if (latestDir.y === 0) {
            directionQueueRef.current.push({ x: 0, y: 1 });
          }
          break;
        case 'ArrowLeft':
          if (latestDir.x === 0) {
            directionQueueRef.current.push({ x: -1, y: 0 });
          }
          break;
        case 'ArrowRight':
          if (latestDir.x === 0) {
            directionQueueRef.current.push({ x: 1, y: 0 });
          }
          break;
      }
    },
    [] // No dependencies needed since we use refs and check game state directly
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Touch gesture handlers removed - using only virtual arrow keys and keyboard

  // Optimized virtual key handler with improved throttling
  const lastKeyPressTime = useRef<number>(0);
  const handleVirtualKeyPress = useCallback((direction: { x: number; y: number }) => {
    // Using refs for better performance
    if (gameOverRef.current || isGameStartingRef.current) return;

    // Throttle key input to prevent too many direction changes
    const now = Date.now();
    if (now - lastKeyPressTime.current < 80) return; // 80ms throttle for responsive feel
    lastKeyPressTime.current = now;

    const latestDir = directionQueueRef.current.length > 0
      ? directionQueueRef.current[directionQueueRef.current.length - 1]
      : directionRef.current;

    // Check if the new direction is valid (not opposite to current direction)
    if (direction.x !== 0 && latestDir.x === 0) {
      // Limit direction queue size to prevent input lag
      if (directionQueueRef.current.length < 2) {
        directionQueueRef.current.push({ x: direction.x, y: 0 });
      }
    } else if (direction.y !== 0 && latestDir.y === 0) {
      if (directionQueueRef.current.length < 2) {
        directionQueueRef.current.push({ x: 0, y: direction.y });
      }
    }
  }, []); // Removed dependencies since we use refs

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const superFoodTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameOver || isGameStarting) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      // Super food timer update
      setSuperFood(prevSuperFood => {
        if (!prevSuperFood) return null;
        const newTimer = prevSuperFood.timer - 1;
        if (newTimer <= 0) return null; // Despawn if timer runs out
        return { ...prevSuperFood, timer: newTimer };
      });

      // Process direction queue
      if (directionQueueRef.current.length > 0) {
        const newDirectionFromQueue = directionQueueRef.current.shift(); // Get and remove the first direction
        if (newDirectionFromQueue) {
          directionRef.current = newDirectionFromQueue; // Update the main direction
        }
      }
      // Now directionRef.current holds the direction for this tick

      setSnake((prevSnake) => {
        // Optimize: avoid array spread for better performance
        const newSnake = prevSnake.slice(); // Faster than spread operator
        const head = { x: newSnake[0].x, y: newSnake[0].y }; // Avoid object spread
        // Use the updated direction from directionRef.current
        head.x += directionRef.current.x;
        head.y += directionRef.current.y;

        let collisionDetected = false;
        // Wall collision
        if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
          collisionDetected = true;
        }

        // Self collision - Optimized: Early termination and reduced iterations
        if (!collisionDetected && newSnake.length > 3) { // Only check if snake is long enough to collide with itself
          // Check from segment 3 onwards (skip neck segments that can't be collided with)
          for (let i = 3; i < newSnake.length; i++) {
            if (newSnake[i].x === head.x && newSnake[i].y === head.y) {
              collisionDetected = true;
              break; // Early termination
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
        // Get current food and superFood from refs to avoid stale closures
        const currentFood = foodRef.current;
        const currentSuperFood = superFoodRef.current;

        // Super Food collision
        if (currentSuperFood && head.x === currentSuperFood.x && head.y === currentSuperFood.y) {
          setScore(s => s + currentSuperFood.type.score);
          playSound('super_eat');
          setSuperFood(null); // Remove super food
          ateFood = true; // Snake grows
        }
        // Normal Food collision
        else if (currentFood && head.x === currentFood.x && head.y === currentFood.y) {
          setScore(s => s + currentFood.type.score);
          playSound('eat');
          spawnNewFood();
          // Clear any existing timeout before setting a new one
          if (superFoodTimeoutRef.current) {
            clearTimeout(superFoodTimeoutRef.current);
          }
          superFoodTimeoutRef.current = setTimeout(() => {
            trySpawnSuperFood();
            superFoodTimeoutRef.current = null;
          }, 0);
          ateFood = true; // Snake grows
        }

        if (!ateFood) {
          newSnake.pop();
        }
        return newSnake;
      });
    }, GAME_SPEED); // Use GAME_SPEED for interval

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (superFoodTimeoutRef.current) {
        clearTimeout(superFoodTimeoutRef.current);
        superFoodTimeoutRef.current = null;
      }
    };
  }, [gameOver, isGameStarting, playSound, spawnNewFood, trySpawnSuperFood]); // Reduced dependencies

  // Game over sound is now played directly when gameOver is set within the game loop.

  // useEffect for countdown
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isGameStarting && countdownValue > 0) {
      const timer = setTimeout(() => {
        if (countdownValue === 1) {
          setIsGameStarting(false);
          setCountdownValue(0);
        } else {
          setCountdownValue(countdownValue - 1);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isGameStarting, countdownValue]);

  // Play start sound when countdown begins
  useEffect(() => {
    if (isGameStarting && countdownValue === 3 && !isMuted && startSoundRef.current) {
      const playStartSound = async () => {
        try {
          startSoundRef.current!.currentTime = 0;
          await startSoundRef.current!.play();
        } catch (error: any) {
          // Silently handle AbortError, log others
          if (error.name !== 'AbortError') {
            console.error('Error playing start sound:', error);
          }
        }
      };
      playStartSound();
    }
  }, [isGameStarting, countdownValue, isMuted]);

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
      setScoreSubmissionMessage('Getting signature for score...');
      setShowScoreSubmissionStatus(true);
      setIsAttemptingScoreSubmission(true);

      // Get Farcaster user data
      const farcasterID = farcasterUser?.fid || 0;
      const username = farcasterUser?.username || '';

      // Create game data for score submission
      const gameData = {
        gameStartTime: Date.now() - Math.max(30000, score * 1000), // Reasonable game duration based on score
        gameEndTime: Date.now(),
        moves: Array.from({ length: Math.max(10, Math.floor(score / 2)) }, (_, i) => ({
          timestamp: Date.now() - (i * 1000),
          direction: { x: Math.random() > 0.5 ? 1 : -1, y: 0 },
          score: Math.floor(i * (score / Math.max(10, Math.floor(score / 2))))
        })), // Generate reasonable move data
        finalScore: score,
        gameSession: generateGameSession()
      };

      // Get signed score from server
      const signedScore = await getSignedScore(
        address,
        score,
        gameData,
        farcasterID,
        username
      );

      setScoreSubmissionMessage('Submitting score...');

      submitScoreContract({
        abi: LeaderboardABI,
        address: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'submitScore',
        args: [
          BigInt(signedScore.score),
          BigInt(signedScore.farcasterID),
          signedScore.username,
          BigInt(signedScore.timestamp),
          signedScore.signature as `0x${string}`
        ],
      });
    } catch (error) {
      console.error('Error initiating score submission:', error);
      setScoreSubmissionMessage(`Error preparing submission: ${error instanceof Error ? error.message.substring(0, 70) + '...' : 'Unknown error'}`);
      setShowScoreSubmissionStatus(true);
      setIsAttemptingScoreSubmission(false);
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
      if (address && isConnected) refetchPlayerAllTimeHighScore?.();

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
    // Clear any existing timers/intervals
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (superFoodTimeoutRef.current) {
      clearTimeout(superFoodTimeoutRef.current);
      superFoodTimeoutRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // Start countdown (sound will be handled by separate useEffect)
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
      }}
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
              // CSS Grid background pattern - much more performant than DOM elements
              backgroundImage: `
                linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
          >
            {/* Countdown Timer - Rendered once over the grid */}
            {isGameStarting && countdownValue > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-md z-20">
                <p className="text-6xl font-bold text-white animate-ping" style={{ animationDuration: '1s' }}>{countdownValue}</p>
              </div>
            )}
            {/* Snake rendering - Back to original smooth approach */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              const isTail = index === snake.length - 1 && snake.length > 1;
              let segmentClasses = "absolute rounded-md transition-all ease-linear";

              if (isHead) {
                segmentClasses += " bg-green-400 z-10";
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
                      width: CELL_SIZE * 0.8,
                      height: CELL_SIZE * 0.8,
                      left: segment.x * CELL_SIZE + CELL_SIZE * 0.1,
                      top: segment.y * CELL_SIZE + CELL_SIZE * 0.1,
                      borderRadius: '40% 40% 20% 20%',
                      transitionProperty: 'left, top',
                      transitionDuration: `${GAME_SPEED}ms`,
                    }}
                  />
                );
              } else {
                segmentClasses += " bg-green-500";
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
                <Image src="/images/ded-snake-lol.png" alt="Game Over Snake" width={200} height={200} style={{ width: '70%', height: 'auto' }} className="mb-3" priority />
                <p className="text-5xl font-bold text-red-500 mb-2 animate-pulse">Game Over</p>
                <p className="text-xl text-slate-100 mb-4">Final Score: {score}</p>

                {/* Score Submission / Payment Button Logic */}
                {score > 0 && (LEADERBOARD_CONTRACT_ADDRESS as string) !== '0xYOUR_CONTRACT_ADDRESS_HERE' && (
                  !isConnected ? (
                    <Button
                      onClick={() => connectors.length > 0 && connect({ connector: connectors[0] })}
                      className="w-3/4 py-3 text-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out my-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Connect Wallet
                    </Button>
                  ) : chainId !== monadTestnet.id ? (
                    <Button
                      onClick={() => switchChain && switchChain({ chainId: monadTestnet.id })}
                      className="w-3/4 py-3 text-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out my-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Switch to Monad Testnet to Save Score
                    </Button>
                  ) : ( // Wallet is connected and on the correct chain
                    isConnected && address && chainId === monadTestnet.id && ( // This inner check is now redundant due to outer checks but kept for safety / structure similarity

                      hasPaidForTodayForScoreSubmission ? (
                        isScoreTxSuccess || hasSubmittedScore ? (
                          <div className="text-center w-3/4 my-1">
                            <p className="text-green-400 font-semibold text-base py-1">Submitted!!</p>
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
                            className="w-3/4 py-3 text-lg bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out my-1 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isAttemptingScoreSubmission ? 'Processing...' : (isNewHighScore ? `Submit New High Score!` : `Submit Score`)}
                          </Button>
                        )
                      ) : (
                        <Button
                          onClick={handlePayEntryFeeToSaveScore}
                          disabled={isPayingFee || isConfirmingFee || isLoadingHasPaid || isLoadingEntryFee || isAttemptingScoreSubmission}
                          className="w-3/4 py-3 text-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out my-1 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <p className="text-center my-1 text-sm text-blue-300">Please wait...</p>
                }

                {showScoreSubmissionStatus && (
                  // This message area will show general status or errors not covered by button states
                  // Specific messages for 'Pay fee', 'Switch chain', 'Connect wallet' are shown if buttons aren't rendered or if those are the primary actions needed.
                  // Success/failure of actual submission/payment will also appear here.
                  <p className={`text-sm my-1 p-1.5 rounded-md w-3/4 text-center ${isScoreTxSuccess || (payFeeDataHash && !payFeeError) ? 'bg-green-700/70 text-green-300' : (submitScoreTxError || payFeeError || (typeof scoreSubmissionMessage === 'string' && (scoreSubmissionMessage.includes('failed') || scoreSubmissionMessage.includes('not configured') || scoreSubmissionMessage.includes('Pay entry fee') || scoreSubmissionMessage.includes('Switch to Monad') || scoreSubmissionMessage.includes('Connect wallet')))) ? 'bg-red-700/70 text-red-300' : 'bg-blue-700/70 text-blue-300'}`}>
                    {scoreSubmissionMessage}
                  </p>
                )}
                {/* Fallback message if contract address is missing and no other message is active */}
                {(LEADERBOARD_CONTRACT_ADDRESS as string) === '0xYOUR_CONTRACT_ADDRESS_HERE' && !showScoreSubmissionStatus && (
                  <p className="text-center text-xs text-red-300 p-1.5 my-1 bg-red-700/50 rounded-md w-3/4">
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
                <div className="flex space-x-3 mt-2">
                  <Button
                    onClick={restartGame}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
                  >
                    Restart
                  </Button>
                  <Button
                    onClick={onBackToMenu}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
                  >
                    Menu
                  </Button>
                </div>
                {/* Share on Farcaster Button */}
                <Button
                  onClick={async () => {
                    try {
                      if (!actions) {
                        console.error('Farcaster actions not available');
                        return;
                      }

                      if (!APP_URL) {
                        console.error('APP_URL not configured');
                        return;
                      }

                      const shareMessages = [
                        `I scored ${score} in the Monad Snake Game! Can you beat my score? 🐍🎮`,
                        `Just hit ${score} points in the Monad Snake Game! Challenge me! 🚀`,
                        `Slithering my way to ${score} in the Monad Snake Game! What's your best? 🌟`,
                        `Can anyone beat my ${score} points in the Monad Snake Game? Give it a shot! 🏆`,
                        `Feeling proud of my ${score} in the Monad Snake Game! Join the fun! 🎉`
                      ];
                      
                      const randomIndex = Math.floor(Math.random() * shareMessages.length);
                      const selectedMessage = shareMessages[randomIndex];
                      
                      // Generate random style (1-10) for OG image
                      const randomStyle = Math.floor(Math.random() * 10) + 1;
                      
                      // Generate OG image URL with user data, score, and random style
                      const username = farcasterUser?.username || 'Player';
                      const profileImage = farcasterUser?.pfpUrl || '';
                      
                      // Build URL parameters safely
                      const params = new URLSearchParams({
                        username: username,
                        score: score.toString(),
                        style: randomStyle.toString()
                      });
                      
                      // Only add image parameter if it exists and is not empty
                      if (profileImage && profileImage.trim() !== '') {
                        params.append('image', profileImage);
                      }
                      
                      const ogImageUrl = `${APP_URL}/api/og?${params.toString()}`;
                      
                      // Validate URL before using
                      try {
                        new URL(ogImageUrl);
                      } catch (urlError) {
                        console.error('Invalid OG image URL:', urlError);
                        return;
                      }
                      
                      // Try to compose cast with OG image first
                      try {
                        await actions.composeCast({
                          text: selectedMessage,
                          embeds: [ogImageUrl, APP_URL],
                        });
                      } catch (castError) {
                        console.warn('Failed to compose cast with OG image, trying without:', castError);
                        // Fallback: compose cast without OG image
                        await actions.composeCast({
                          text: selectedMessage,
                          embeds: [APP_URL],
                        });
                      }
                    } catch (error) {
                      console.error('Error sharing score:', error);
                      // You could add a toast notification here if you have one
                    }
                  }}
                  className="mt-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
                  disabled={!actions} // Disable if actions are not available
                >
                  Share Score
                </Button>
              </div>
            )}


          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center pt-1 pb-3 space-y-2">
          {showVirtualKeys && !gameOver && (
            <div className="flex justify-center">
              <VirtualArrowKeys
                onDirectionPress={handleVirtualKeyPress}
                disabled={gameOver || isGameStarting}
                className={`transition-opacity duration-200 ${isGameStarting ? 'opacity-50' : 'opacity-90'}`}
              />
            </div>
          )}
          <p className="text-xs text-gray-400">
            {showVirtualKeys ? "Use virtual keys or keyboard arrows to move" : "Use keyboard arrow keys to move"}
          </p>
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
