"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Remove wagmi imports as they are no longer used here
// import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'; 
// import { monadTestnet } from "viem/chains";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useMotionValue, motion, animate } from "motion/react"; // Updated import
import { BackgroundGradientAnimation } from "@/components/ui/BackgroundGradientAnimation";
import { Volume2, VolumeX } from 'lucide-react'; // Import icons

const GRID_SIZE = 18;
const CELL_SIZE = 18; // pixels
const GAME_BG_COLOR = "#2d3748"; // Tailwind gray-800
const TEXT_COLOR = "#e2e8f0"; // Tailwind slate-200
const GAME_SPEED = 130; // milliseconds, for smoother movement
const SUPER_FOOD_SPAWN_CHANCE = 0.15; // 20% chance to spawn super food after normal food
const SUPER_FOOD_BASE_DURATION = 50; // in game ticks (50 * 120ms = 6 seconds)

interface FoodItem {
  name: string;
  color: string; // Keep color for fallback or other uses
  score: number;
  emoji: string; // Added for visual representation
  isSuperFood?: boolean;
  duration?: number; // in game ticks
}

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
  let newPos;
  do {
    newPos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
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
  // Remove wagmi hook calls
  // const { address, isConnected, chainId } = useAccount();
  // const { connect, connectors } = useConnect();
  // const { disconnect } = useDisconnect();
  // const { switchChain } = useSwitchChain();
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState(() => ({
    ...getRandomPosition(),
    type: getRandomFoodType(),
  }));
  const [superFood, setSuperFood] = useState<SuperFoodState | null>(null);
  const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 }); // Right
  const [directionQueue, setDirectionQueue] = useState<{ x: number; y: number }[]>([]);
  // const [isMuted, setIsMuted] = useState(false); // Remove local state, use props instead
  const eatSoundRef = useRef<HTMLAudioElement | null>(null);
  const superEatSoundRef = useRef<HTMLAudioElement | null>(null);
  const startSoundRef = useRef<HTMLAudioElement | null>(null); // Added for start sound
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null); // Added for game over sound
  const [isGameStarting, setIsGameStarting] = useState(true); // Added for countdown phase
  const [countdownValue, setCountdownValue] = useState(3); // Added for countdown value

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

  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const animatedScore = useMotionValue(0); // Use motion value for score
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  // Removed prevScore state as it's not needed with useMotionValue

  useEffect(() => {
    // Animate score when it changes
    // Only run animation if the game is NOT over
    if (!gameOver) {
      const controls = animate(animatedScore, score, {
        duration: 0.5, // Adjust duration as needed
        ease: "easeOut", // Optional: specify easing
        onComplete: () => {
          // Optional: if you need to do something when animation completes normally
        }
      });
      return () => {
        controls.stop();
      };
    } else {
      // When game is over, immediately set animatedScore to the final score
      // This ensures that if the animatedScore is used elsewhere, it shows the final value.
      animatedScore.set(score);
    }
  }, [score, animatedScore, gameOver]);

  useEffect(() => {
    // Ensure sound files are in public/sounds/ directory
    eatSoundRef.current = new Audio('/sounds/eat.wav');
    superEatSoundRef.current = new Audio('/sounds/super_eat.wav');
    startSoundRef.current = new Audio('/sounds/game_start.mp3'); // Updated path
    gameOverSoundRef.current = new Audio('/sounds/game_over.wav'); // Added game over sound
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
      switch (event.key) {
        case 'ArrowUp':
          if (direction.y === 0 || (directionQueue.length > 0 && directionQueue[directionQueue.length - 1].y === 0)) newDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (direction.y === 0 || (directionQueue.length > 0 && directionQueue[directionQueue.length - 1].y === 0)) newDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (direction.x === 0 || (directionQueue.length > 0 && directionQueue[directionQueue.length - 1].x === 0)) newDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (direction.x === 0 || (directionQueue.length > 0 && directionQueue[directionQueue.length - 1].x === 0)) newDir = { x: 1, y: 0 };
          break;
      }
      if (newDir) {
        setDirectionQueue(q => [...q, newDir!]);
      }
    },
    [direction, directionQueue]
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

    // Determine the dominant swipe axis
    if (Math.abs(diffX) > Math.abs(diffY)) { // Horizontal swipe
      if (diffX > 0) { // Swipe Right
        // Check current direction or last queued direction to prevent direct reversal
        const lastEffectiveDirectionX = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1].x : direction.x;
        if (lastEffectiveDirectionX === 0) newDir = { x: 1, y: 0 };
      } else { // Swipe Left
        const lastEffectiveDirectionX = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1].x : direction.x;
        if (lastEffectiveDirectionX === 0) newDir = { x: -1, y: 0 };
      }
    } else { // Vertical swipe
      if (diffY > 0) { // Swipe Down
        const lastEffectiveDirectionY = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1].y : direction.y;
        if (lastEffectiveDirectionY === 0) newDir = { x: 0, y: 1 };
      } else { // Swipe Up
        const lastEffectiveDirectionY = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1].y : direction.y;
        if (lastEffectiveDirectionY === 0) newDir = { x: 0, y: -1 };
      }
    }

    if (newDir) {
      setDirectionQueue(q => [...q, newDir!]);
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

      setSnake((prevSnake) => {
        let nextDirection = direction;
        setDirectionQueue(q => {
          if (q.length > 0) {
            nextDirection = q[0];
            setDirection(nextDirection); // Update main direction when one is pulled from queue
            return q.slice(1);
          }
          return q;
        });
        const newSnake = [...prevSnake];
        const head = { ...newSnake[0] };
        head.x += nextDirection.x;
        head.y += nextDirection.y;

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          return prevSnake;
        }

        // Self collision
        for (let i = 1; i < newSnake.length; i++) {
          if (newSnake[i].x === head.x && newSnake[i].y === head.y) {
            setGameOver(true);
            return prevSnake;
          }
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
  }, [snake, direction, food, superFood, gameOver, spawnNewFood, trySpawnSuperFood, isGameStarting, playSound]); // Added playSound

  // useEffect to play game over sound
  useEffect(() => {
    if (gameOver) {
      playSound('game_over');
    }
  }, [gameOver, playSound]);

  // useEffect for countdown
  useEffect(() => {
    if (isGameStarting && countdownValue > 0) {
      const timer = setInterval(() => {
        setCountdownValue(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (isGameStarting && countdownValue === 0) {
      setIsGameStarting(false);
    }
  }, [isGameStarting, countdownValue]);

  const restartGame = () => {
    playSound('start'); // Play start sound before countdown
    setIsGameStarting(true);
    setCountdownValue(3);
    setSnake([{ x: 10, y: 10 }]);
    setFood({
        ...getRandomPosition([{ x: 10, y: 10 }]),
        type: getRandomFoodType(),
    });
    setSuperFood(null);
    setDirection({ x: 1, y: 0 });
    setDirectionQueue([]);
    setGameOver(false);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-slate-200 p-2 relative">
      <BackgroundGradientAnimation 
        gradientBackgroundStart="rgb(25, 25, 36)" 
        gradientBackgroundEnd="rgb(15, 15, 25)"
        firstColor="18, 113, 255"
        secondColor="221, 74, 255"
        thirdColor="100, 220, 255"
        fourthColor="0, 200, 50"
        fifthColor="180, 180, 50"
      />

      <Card className="w-full max-w-sm bg-gray-800/80 border-gray-700 shadow-xl backdrop-blur-sm z-10">
        <CardHeader className="flex flex-row items-center justify-center p-4"> 
          <CardTitle 
            className="text-4xl md:text-3xl font-bold flex-shrink-0 monake-title"
            style={{
              // Add textShadow for the glow effect
              // The color of the shadow can be adjusted. Using a white glow for general visibility.
              // You might want to experiment with colors that match the gradient if a white glow isn't ideal.
              textShadow: '0 0 8px rgba(203, 113, 255, 0.5), 0 0 12px rgba(182, 36, 255, 0.3)' 
            }}
          >
             Monake
          </CardTitle>
          <motion.div
            className="absolute top-2 right-2 z-20" 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button 
              onClick={() => setIsMuted(!isMuted)} 
              variant="outline" 
              size="icon" 
              className="p-1.5 h-auto bg-gray-800/60 hover:bg-gray-700/80 border-gray-600 text-slate-200 rounded-full"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </Button>
          </motion.div>
        </CardHeader>
        <CardContent 
          className="flex flex-col items-center space-y-2 p-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Score Display - Centered with new layout */}
          <div className="flex flex-col items-center w-full mb-2"> {/* Centering container */}
            <p 
              className="text-3xl font-bold text-cyan-400 mb-1"
              style={{
                textShadow: '0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3)',
              }} /* Bright cyan color with a subtle glow effect */
            >
              Score
            </p>
            <motion.span 
              className="text-4xl font-bold text-slate-100" /* Larger, bold, bright color for score value */
            >
              {/* Display final score if game is over, otherwise display animated score */}
              {gameOver ? score : (typeof animatedScore.get() === 'number' ? Math.round(animatedScore.get()) : 0)}
            </motion.span>
          </div>
          <div
            className="border border-gray-600 shadow-inner bg-gray-800 overflow-hidden"
            style={{
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              backgroundColor: GAME_BG_COLOR,
              position: 'relative', // Crucial for absolute positioning of children
            }}
          >
            {/* Grid Lines */}
            {Array.from({ length: GRID_SIZE }).map((_, i) => (
              <React.Fragment key={`grid-line-${i}`}>
                {i > 0 && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        left: i * CELL_SIZE,
                        top: 0,
                        width: 1,
                        height: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)', // Very subtle white
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: i * CELL_SIZE,
                        width: '100%',
                        height: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.03)', // Very subtle white
                        pointerEvents: 'none',
                      }}
                    />
                  </>
                )}
            {isGameStarting && countdownValue > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-md z-20">
                <p className="text-6xl font-bold text-white animate-ping" style={{ animationDuration: '1s' }}>{countdownValue}</p>
              </div>
            )}
              </React.Fragment>
            ))}
            {/* Snake rendering */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              const isTail = index === snake.length - 1 && snake.length > 1;
              let segmentClasses = "absolute rounded-md transition-all duration-100 ease-linear"; // Added transition

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
                      // transform: `rotate(${getRotationAngle(direction)}deg)` // Optional: rotate head
                    }}
                  >
                    {/* Eyes positioned based on direction */}
                    <div className={`eye ${direction.x === 1 ? 'eye-right-pos' : direction.x === -1 ? 'eye-left-pos' : direction.y === 1 ? 'eye-down-pos' : 'eye-up-pos'}`}></div>
                    <div className={`eye ${direction.x === 1 ? 'eye-right-pos' : direction.x === -1 ? 'eye-left-pos' : direction.y === 1 ? 'eye-down-pos' : 'eye-up-pos'}`}></div>
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
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 rounded-md z-20">
                <p className="text-4xl font-bold text-white mb-2">💀</p>
                <p className="text-4xl font-bold text-white mb-4">Game Over!</p>
                {/* This already correctly displays the final score */}
                <p className="text-2xl text-white mb-6">Your Score: {score}</p> 
                <Button onClick={restartGame} className="py-3 px-6 text-lg bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md mb-4">
                  Restart Game
                </Button>
                <Button onClick={onBackToMenu} className="py-3 px-6 text-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md">
                  Back to Main Menu
                </Button>
              </div>
            )}
            {isGameStarting && countdownValue > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-md z-20">
                <p className="text-6xl font-bold text-white animate-ping" style={{ animationDuration: '1s' }}>{countdownValue}</p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center pt-4">
            <p className="text-xs text-gray-400">Use arrow keys or swipe to move</p>
        </CardFooter>
        
      </Card>
      <style jsx global>{`
        html, body, #__next, div#__next > div {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
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
