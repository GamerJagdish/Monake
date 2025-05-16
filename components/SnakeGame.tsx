"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Remove wagmi imports as they are no longer used here
// import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'; 
// import { monadTestnet } from "viem/chains";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useMotionValue, motion, animate, AnimatePresence } from "motion/react"; // Updated import, added AnimatePresence
import { BackgroundGradientAnimation } from "@/components/ui/BackgroundGradientAnimation";
import { Volume2, VolumeX } from 'lucide-react'; // Import icons
import { sdk } from '@farcaster/frame-sdk';
import { useMiniAppContext } from "@/hooks/use-miniapp-context"; // Added import
import { APP_URL } from "@/lib/constants"; // Added import
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
  const { actions } = useMiniAppContext(); // Added to get Farcaster actions
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

  // Visual snake state and refs for smooth animation
  const visualSnakeSegmentsRef = useRef<Position[]>([]); // Holds current visual pixel positions
  const [renderedSnakeVisuals, setRenderedSnakeVisuals] = useState<Position[]>([]); // Triggers re-render
  const animationFrameIdRef = useRef<number | null>(null);
  const prevSnakeLengthRef = useRef(snake.length);

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

  // Initialize and synchronize visualSnakeSegmentsRef with the logical snake state
  useEffect(() => {
    const currentLogicalSnake = snake;
    const visualSegments = visualSnakeSegmentsRef.current;

    // Adjust length of visualSegments to match currentLogicalSnake
    if (currentLogicalSnake.length > visualSegments.length) { // Snake grew
      const diff = currentLogicalSnake.length - visualSegments.length;
      for (let i = 0; i < diff; i++) {
        if (visualSegments.length > 0) {
          visualSegments.push({ ...visualSegments[visualSegments.length - 1] });
        } else if (currentLogicalSnake.length > 0) {
          const firstLogicalSeg = currentLogicalSnake[visualSegments.length];
          if (firstLogicalSeg) { // Ensure segment exists
            visualSegments.push({ x: Math.round(firstLogicalSeg.x * CELL_SIZE), y: Math.round(firstLogicalSeg.y * CELL_SIZE) });
          }
        }
      }
    } else if (currentLogicalSnake.length < visualSegments.length) { // Snake shrank
      visualSegments.length = currentLogicalSnake.length;
    }

    prevSnakeLengthRef.current = currentLogicalSnake.length;

    if (gameOver || isGameStarting) {
      setRenderedSnakeVisuals(currentLogicalSnake.map(p => ({ x: Math.round(p.x * CELL_SIZE), y: Math.round(p.y * CELL_SIZE) })));
    } else if (!animationFrameIdRef.current && currentLogicalSnake.length > 0 && visualSegments.length > 0 && visualSegments.length === currentLogicalSnake.length) {
      setRenderedSnakeVisuals([...visualSegments]);
    }
  }, [snake, CELL_SIZE, gameOver, isGameStarting]);

  // Animation loop using requestAnimationFrame for smooth snake movement
  useEffect(() => {
    if (gameOver || isGameStarting || snake.length === 0) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      // Snap to final logical positions when game is not running or snake is empty
      setRenderedSnakeVisuals(snake.map(p => ({ x: Math.round(p.x * CELL_SIZE), y: Math.round(p.y * CELL_SIZE) })));
      return;
    }

    const animateRender = () => {
      if (visualSnakeSegmentsRef.current.length !== snake.length) {
        // If lengths mismatch, the other useEffect should handle synchronization.
        // For safety, request another frame and hope sync happens.
        animationFrameIdRef.current = requestAnimationFrame(animateRender);
        return;
      }

      const nextVisualSegments = visualSnakeSegmentsRef.current.map((visualSeg, index) => {
        const logicalSeg = snake[index];
        if (!logicalSeg) {
          return visualSeg; // Should not happen if synced
        }
        const targetPixelX = Math.round(logicalSeg.x * CELL_SIZE);
        const targetPixelY = Math.round(logicalSeg.y * CELL_SIZE);

        const dx = targetPixelX - visualSeg.x;
        const dy = targetPixelY - visualSeg.y;

        let newX = visualSeg.x + dx * SNAKE_INTERPOLATION_FACTOR;
        let newY = visualSeg.y + dy * SNAKE_INTERPOLATION_FACTOR;

        const snapThreshold = 0.5; // pixels
        if (Math.abs(dx) < snapThreshold && Math.abs(dy) < snapThreshold) {
          newX = targetPixelX;
          newY = targetPixelY;
        }
        
        return { x: newX, y: newY }; // Removed Math.round
      });
      
      visualSnakeSegmentsRef.current = nextVisualSegments;
      setRenderedSnakeVisuals(nextVisualSegments.map(p => ({ x: p.x, y: p.y }))); // Removed Math.round

      animationFrameIdRef.current = requestAnimationFrame(animateRender);
    };

    if (!animationFrameIdRef.current) {
      if (visualSnakeSegmentsRef.current.length === 0 && snake.length > 0) {
          visualSnakeSegmentsRef.current = snake.map(s => ({x: Math.round(s.x * CELL_SIZE), y: Math.round(s.y * CELL_SIZE)}));
      }
      if (visualSnakeSegmentsRef.current.length > 0 && visualSnakeSegmentsRef.current.length === snake.length) { 
        setRenderedSnakeVisuals(visualSnakeSegmentsRef.current.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })));
        animationFrameIdRef.current = requestAnimationFrame(animateRender);
      }
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [snake, gameOver, isGameStarting, CELL_SIZE]);

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
    (event: KeyboardEvent) => {
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
        directionQueueRef.current.push(newDir!);
      }
    },
    [] // Refs are stable, no need for them in dependency array
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    // Prevent scrolling while swiping
    if (touchStart) {
      event.preventDefault();
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
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full text-slate-200 p-2 relative"
       style={{ 
         backgroundColor: '#ad99ff', 
         backgroundImage: 'radial-gradient(at 71% 88%, hsla(198,92%,67%,1) 0px, transparent 50%), radial-gradient(at 69% 34%, hsla(281,80%,71%,1) 0px, transparent 50%), radial-gradient(at 83% 89%, hsla(205,61%,69%,1) 0px, transparent 50%), radial-gradient(at 23% 14%, hsla(234,83%,62%,1) 0px, transparent 50%), radial-gradient(at 18% 20%, hsla(302,94%,70%,1) 0px, transparent 50%), radial-gradient(at 1% 45%, hsla(196,99%,70%,1) 0px, transparent 50%), radial-gradient(at 34% 18%, hsla(316,72%,67%,1) 0px, transparent 50%)', 
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
                   <p className="text-6xl font-bold text-white mb-3">💀</p>
                  <p className="text-5xl font-bold text-red-500 mb-6 animate-pulse">Game Over</p>
                 
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
                          actions.composeCast({
                            text: `I scored ${score} in the Monad Snake Game! Can you beat my score? 🐍🎮`,
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
