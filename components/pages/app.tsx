"use client";
import { SafeAreaContainer } from "@/components/safe-area-container";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import dynamic from "next/dynamic";
import { useState, useEffect } from 'react';
const Demo = dynamic(() => import("@/components/Home"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

const MainMenu = dynamic(() => import('../ui/MainMenu'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
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
