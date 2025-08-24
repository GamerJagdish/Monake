import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monake OG - Free Mint',
  description: 'Mint your free Monake OG NFT on Monad Testnet.',
  openGraph: {
    title: 'Monake OG - Free Mint',
    description: 'Mint your free Monake OG NFT on Monad Testnet.',
    images: ['https://monake.vercel.app/images/monake-og.png'],
    url: 'https://monake.vercel.app/nft',
  },
  other: {
    'fc:miniapp': '{"version":"1","imageUrl":"https://monake.vercel.app/images/monake-og-feed.png","button":{"title":"Mint NFT","action":{"type":"launch_miniapp","name":"Monake","url":"https://monake.vercel.app/nft","splashImageUrl":"https://monake.vercel.app/images/splash.png","splashBackgroundColor":"#6e4bed"}}}',
    'fc:frame': '{"version":"1","imageUrl":"https://monake.vercel.app/images/monake-og-feed.png","button":{"title":"Mint NFT","action":{"type":"launch_frame","name":"Monake","url":"https://monake.vercel.app/nft","splashImageUrl":"https://monake.vercel.app/images/splash.png","splashBackgroundColor":"#6e4bed"}}}',
  },
};

export default function NFTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
