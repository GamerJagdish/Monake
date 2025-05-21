import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    
    accountAssociation: {
        header: "eyJmaWQiOjk5MDU4NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweGRCZTJkYjdkQjRFOTBiODY2MWI4NmZGNDlDNTk0NjhDZjIxZEFkZkUifQ",
        payload: "eyJkb21haW4iOiJtb25ha2UudmVyY2VsLmFwcCJ9",
        signature: "MHgyMzM2NDBlYmE0ZGE2NDQ1ZTg1OTU4ZDFiZjE5OGFhMDFhOTM3YjI5Y2JiOTI4NDg1MjJjMjMzMzhhY2E0MmE3MjdiZjQ0Y2M4NDBjMDhiMWI1YzNiYWQ1MGExNTFiZTA2ODZmMmUwYjFjZmQ0ZjJiYzFkOWM1NDIzYTM3YTgzNjFi"
      },
    
    frame: {
      version: "1",
      name: "Monad Snake - Monake",
      iconUrl: `${APP_URL}/images/icon.png`,
      homeUrl: `${APP_URL}`,
      imageUrl: `${APP_URL}/images/feed.png`,
      screenshotUrls: [],
      tags: ["monad", "reward", "airdrop", "token", "snake"],
      description: "popular snake game for Monad testnet",
      primaryCategory: "games",
      buttonTitle: "Launch game",
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#ffffff",
      webhookUrl: `${APP_URL}/api/webhook`,
    },
  };

  return NextResponse.json(farcasterConfig);
}
