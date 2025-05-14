"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { monadTestnet } from "viem/chains";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

const GRID_SIZE = 17;
const CELL_SIZE = 17; // pixels
const GAME_BG_COLOR = "#2d3748"; // Tailwind gray-800
const TEXT_COLOR = "#e2e8f0"; // Tailwind slate-200
const GAME_SPEED = 120; // milliseconds, for smoother movement
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

const SnakeGame: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState(() => ({
    ...getRandomPosition(),
    type: getRandomFoodType(),
  }));
  const [superFood, setSuperFood] = useState<SuperFoodState | null>(null);
  const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 }); // Right
  const [directionQueue, setDirectionQueue] = useState<{ x: number; y: number }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
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
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Ensure sound files are in public/sounds/ directory
    eatSoundRef.current = new Audio('/sounds/eat.wav');
    superEatSoundRef.current = new Audio('/sounds/super_eat.wav');
    startSoundRef.current = new Audio('/sounds/game_start.mp3'); // Updated path
    gameOverSoundRef.current = new Audio('/sounds/game_over.wav'); // Added game over sound
    // The start sound is played via playSound('start') in restartGame.
  }, [isMuted]);

  const playSound = useCallback((soundType: 'eat' | 'super_eat' | 'start' | 'game_over') => {
    if (isMuted) return;
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

    if (Math.abs(diffX) > Math.abs(diffY)) { // Horizontal swipe
      if (diffX > 0 && direction.x === 0) { // Swipe Right
        setDirection({ x: 1, y: 0 });
      } else if (diffX < 0 && direction.x === 0) { // Swipe Left
        setDirection({ x: -1, y: 0 });
      }
    } else { // Vertical swipe
      if (diffY > 0 && direction.y === 0) { // Swipe Down
        setDirection({ x: 0, y: 1 });
      } else if (diffY < 0 && direction.y === 0) { // Swipe Up
        setDirection({ x: 0, y: -1 });
      }
    }
    setTouchStart(null);
  };

  useEffect(() => {
    if (gameOver || isGameStarting) return; // Modified to include isGameStarting

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
          setScore(s => s + superFood.type.score);
          playSound('super_eat');
          setSuperFood(null); // Remove super food
          ateFood = true; // Snake grows
        } 
        // Normal Food collision
        else if (head.x === food.x && head.y === food.y) {
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
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-slate-200 p-2">
      {/* Wallet UI moved to CardHeader */}

      <Card className="w-full max-w-xs bg-gray-800 border-gray-700 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between p-4"> {/* Adjusted classes */}
          <CardTitle className="text-2xl md:text-3xl font-bold mr-4 flex-shrink-0 monake-title">Monake</CardTitle>
          <div className="flex flex-col items-end space-y-1 text-right min-w-0 flex-shrink"> {/* Adjusted classes, removed ml-auto, corrected flex-shrink-1 */} 
            {isConnected ? (
              <>
                <p className="text-xs md:text-sm">
                  {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                </p>
                <p className="text-xs md:text-sm text-slate-100 break-all">
                  Chain: {chainId === monadTestnet.id ? 'Monad Testnet' : (chainId ? `ID ${chainId}`: 'N/A')}
                </p>
                {chainId !== monadTestnet.id && chainId && switchChain && (
                  <Button variant="outline" size="sm" className="text-xs h-auto mt-1 py-1 px-2 border-slate-500 hover:bg-slate-700 text-white" onClick={() => switchChain({ chainId: monadTestnet.id })}>
                    Switch to Monad
                  </Button>
                )}
            {isGameStarting && countdownValue > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-md z-20">
                <p className="text-6xl font-bold text-white animate-ping" style={{ animationDuration: '1s' }}>{countdownValue}</p>
              </div>
            )}
                <Button variant="destructive" size="sm" className="text-xs h-auto mt-1 py-1 px-2 text-white" onClick={() => disconnect()}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="py-1 px-2"
                onClick={() => {
                  if (connectors && connectors.length > 0) {
                    connect({ connector: connectors[0] });
                  } else {
                    console.error('No connectors found.');
                  }
                }}
              >
                Connect Wallet
              </Button>
            )}
            {isGameStarting && countdownValue > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-md z-20">
                <p className="text-6xl font-bold text-white animate-ping" style={{ animationDuration: '1s' }}>{countdownValue}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent 
          className="flex flex-col items-center space-y-2 p-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <p className="text-xl">Score: <span className="font-semibold text-amber-400">{score}</span></p>
            <Button onClick={() => setIsMuted(!isMuted)} variant="outline" size="sm" className="p-2 h-auto text-xs">
              {isMuted ? '🔇 Unmute' : '🔊 Mute'}
            </Button>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 rounded-md">
                <h2 className="text-3xl font-bold text-red-500 mb-2">Game Over!</h2>
                <p className="text-xl mb-4 text-white">Your Score: {score}</p>
                <Button onClick={restartGame} variant="secondary" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Restart Game
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
        {!gameOver && (
        <CardFooter className="flex justify-center pt-4">
            <p className="text-xs text-gray-400">Use arrow keys or swipe to move</p>
        </CardFooter>
        )}
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
          background-image: linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet, red); // Extended gradient for smoother loop
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
