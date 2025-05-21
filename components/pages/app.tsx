"use client";
import { SafeAreaContainer } from "@/components/safe-area-container";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import dynamic from "next/dynamic";
import { useState, useEffect } from 'react';
import { BackgroundGradientAnimation } from '../ui/BackgroundGradientAnimation';


const MainMenu = dynamic(() => import('../ui/MainMenu'), {
  ssr: false,
  loading: () => <div>  <BackgroundGradientAnimation 
  gradientBackgroundStart="rgb(25, 25, 36)" 
  gradientBackgroundEnd="rgb(15, 15, 25)"
  firstColor="18, 113, 255"
  secondColor="221, 74, 255"
  thirdColor="100, 220, 255"
  fourthColor="200, 50, 50"
  fifthColor="180, 180, 50"
/><div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-4 pointer-events-none text-3xl text-center md:text-4xl lg:text-7xl">
        <p className="bg-clip-text text-transparent drop-shadow-2xl bg-gradient-to-b from-white/80 to-white/20">
          Loading...
        </p>
      </div></div>,
});

export default function Home() {
  const { context } = useMiniAppContext();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    // SafeAreaContainer component makes sure that the app margins are rendered properly depending on which client is being used.
    <SafeAreaContainer insets={context?.client.safeAreaInsets}>
      {/* You replace the Demo component with your home component */}
      {/* <Demo /> */}
      {isClient ? <MainMenu /> : null}
    </SafeAreaContainer>
  );
}
