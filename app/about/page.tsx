"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundGradientAnimation } from '@/components/ui/BackgroundGradientAnimation';
// Import icons from react-icons
import { SiFarcaster, SiX, SiGithub } from 'react-icons/si'; 
import { FaTelegramPlane } from 'react-icons/fa'; // Added Telegram icon

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
    icon: <FaTelegramPlane size={18} />, // Added Telegram icon
    url: 'https://t.me/gamer_jagdish', // Replace with your Telegram URL/handle
    handle: 'gamer_jagdish' // Replace with your Telegram handle
  }
];

const AboutPage: React.FC = () => {
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

          <Link href="/" passHref className="w-full mt-8">
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
    </div>
  );
};

export default AboutPage;