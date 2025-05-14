"use client";
import React, { useState } from 'react';
import { motion } from 'motion/react'; // Added motion import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';

const SnakeGame = dynamic(() => import('../SnakeGame'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen">Loading Game...</div>, // Centered loading
});

const MainMenu: React.FC = () => {
  const [showSnakeGame, setShowSnakeGame] = useState(false);

  const handlePlayClick = () => {
    setShowSnakeGame(true);
  };

  if (showSnakeGame) {
    return <SnakeGame />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-900 text-slate-200 p-4">
      <motion.div // Changed Card to motion.div for animation
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-gray-800 border-gray-700 shadow-xl rounded-xl" // Adjusted max-w and added rounded-xl
      >
        <CardHeader>
          <CardTitle className="text-4xl sm:text-5xl font-bold text-center monake-title">Monake</CardTitle> {/* Responsive text size */}
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-6 sm:p-8"> {/* Increased padding and spacing */}
          <motion.button // Changed Button to motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayClick}
            className="w-full py-3 text-lg sm:text-xl bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out"
          >
            Play Game
          </motion.button>
          <motion.button // Changed Button to motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled
            className="w-full py-3 text-lg sm:text-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md opacity-50 cursor-not-allowed transition-colors duration-150 ease-in-out"
          >
            Leaderboard (Coming Soon)
          </motion.button>
          <motion.button // Changed Button to motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled
            className="w-full py-3 text-lg sm:text-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg shadow-md opacity-50 cursor-not-allowed transition-colors duration-150 ease-in-out"
          >
            About (Coming Soon)
          </motion.button>
        </CardContent>
      </motion.div>
    </div>
  );
};

export default MainMenu;