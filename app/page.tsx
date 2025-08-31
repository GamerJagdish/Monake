import { Metadata } from "next";
import App from "@/components/pages/app";
import { APP_URL } from "@/lib/constants";

const frame = {
  version: "next",
  imageUrl: `${APP_URL}/images/feed.png`,
  button: {
    title: "Play Game",
    action: {
      type: "launch_frame",
      name: "Monake on Monad",
      url: APP_URL,
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#f7f7f7",
    },
  },
};
const miniapp = {
  version: "1",
  imageUrl: `${APP_URL}/images/feed.png`,
  button: {
    title: "Play Game",
    action: {
      type: "launch_miniapp",
      name: "Monake on Monad",
      url: APP_URL,
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#f7f7f7",
    },
  },
};
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Monake on Monad",
    openGraph: {
      title: "Monake on Monad",
      description: "Play Monake and climb up the leaderboard to earn $MON",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
      "fc:miniapp": JSON.stringify(miniapp),
    },
  };
}

export default function Home() {
  return <App />;
}
