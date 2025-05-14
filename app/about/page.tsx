"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundGradientAnimation } from '@/components/ui/BackgroundGradientAnimation';
// Import icons from react-icons
import { SiFarcaster, SiX, SiGithub } from 'react-icons/si'; // Using fa6 for potentially newer icons

// Define your social links here - replace with your actual URLs and handles
const socialLinks = [
  {
    name: 'Farcaster',
    icon: <SiFarcaster size={20} />,
    url: 'https://warpcast.com/gamerjagdish', // Replace with your Farcaster/Warpcast URL
    handle: '@gamerjagdish' // Replace with your Farcaster handle
  },
  {
    name: 'Twitter / X',
    icon: <SiX size={20} />,
    url: 'https:/x.com/jagdishhhhhhhh', // Replace with your Twitter URL
    handle: '@jagdishhhhhhhh' // Replace with your Twitter handle
  },
  {
    name: 'GitHub',
    icon: <SiGithub size={20} />,
    url: 'https://github.com/GamerJagdish', // Replace with your GitHub URL
    handle: 'GamerJagdish' // Replace with your GitHub username
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
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {socialLinks.map((social) => (
                <a 
                  key={social.name} 
                  href={social.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center p-3 bg-slate-700/60 hover:bg-slate-600/80 rounded-lg transition-colors duration-150 ease-in-out w-full sm:w-auto min-w-[120px] shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center justify-center text-purple-400 mb-1">
                    {social.icon}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">{social.handle}</span>
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