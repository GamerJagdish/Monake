import { NextResponse } from 'next/server';
import { fetchProfilesBatch, getProfileDisplay } from '@/lib/web3bio';

const NFT_CONTRACT_ADDRESS = '0x9d40e8d15af68f14fdf134120c03013cf0a16d00';
const ALCHEMY_URL = `https://monad-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

interface NFTLeaderboardEntry {
  rank: number;
  address: string;
  balance: number;
  displayName?: string;
  avatar?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    if (limit > 100) {
      return NextResponse.json({ error: 'Limit cannot exceed 100' }, { status: 400 });
    }

    // Call Alchemy NFT API
    const res = await fetch(
      `${ALCHEMY_URL}/getOwnersForCollection?contractAddress=${NFT_CONTRACT_ADDRESS}&withTokenBalances=true`
    );

    if (!res.ok) {
      throw new Error(`Alchemy API error: ${res.statusText}`);
    }

    const data = await res.json();

    // Alchemy response: { owners: [{ ownerAddress, tokenBalances: [{tokenId, balance}]}] }
    const holderBalances = new Map<string, number>();

    for (const owner of data.ownerAddresses || data.owners || []) {
      const address = owner.ownerAddress || owner;
      let balance = 0;

      if (owner.tokenBalances) {
        balance = owner.tokenBalances.reduce(
          (sum: number, t: { balance: string }) => sum + Number(t.balance || 1),
          0
        );
      } else {
        balance = 1; // fallback
      }

      holderBalances.set(address, balance);
    }

    // Enrich with profile info
    const addresses = Array.from(holderBalances.keys());
    const profilesMap = await fetchProfilesBatch(addresses);

    const leaderboardEntries: NFTLeaderboardEntry[] = [];

    for (const [address, balance] of holderBalances.entries()) {
      const profile = profilesMap.get(address.toLowerCase()) || null;
      const { displayName, avatar } = getProfileDisplay(profile, address);

      leaderboardEntries.push({
        rank: 0,
        address,
        balance,
        displayName,
        avatar,
      });
    }

    // Sort and rank
    leaderboardEntries.sort((a, b) => b.balance - a.balance);
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Apply limit
    const limitedEntries = leaderboardEntries.slice(0, limit);

    return NextResponse.json({
      leaderboard: limitedEntries,
      totalSupply: limitedEntries.reduce((acc, cur) => acc + cur.balance, 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching NFT leaderboard:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch NFT leaderboard',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
