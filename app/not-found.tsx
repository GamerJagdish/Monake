"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Boxes } from '@/components/ui/BackgroundBoxes'; // Assuming this is the correct path
import { ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-slate-900 text-slate-200 overflow-hidden">
      <Boxes className="absolute top-0 left-0 w-full h-full z-0" />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center justify-center text-center p-4"
      >
        <h1 className="text-6xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          404
        </h1>
        <p className="mt-4 text-xl md:text-2xl text-slate-300">
          Oops! The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <p className="mt-2 text-md md:text-lg text-slate-400">
          It might have been moved, or perhaps you mistyped the URL.
        </p>
        <Link href="/" passHref legacyBehavior>
          <Button 
            variant="outline"
            className="mt-8 bg-slate-800/70 hover:bg-slate-700/90 border-slate-700 text-slate-200 py-3 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2"
          >
            <ArrowLeft size={20} />
            <span>Return to Main Menu</span>
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;