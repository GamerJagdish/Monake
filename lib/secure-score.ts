interface GameData {
  gameStartTime: number;
  gameEndTime: number;
  moves: Array<{
    timestamp: number;
    direction: { x: number; y: number };
    score: number;
  }>;
  finalScore: number;
  gameSession: string;
}

interface SignedScore {
  signature: string;
  timestamp: number;
  score: number;
  playerAddress: string;
  farcasterID: number;
  username: string;
  gameServerAddress: string;
  isEntryFee?: boolean;
  entryFeeAmount?: string;
}

export async function getSignedScore(
  playerAddress: string,
  score: number,
  gameData: GameData,
  farcasterID?: number,
  username?: string
): Promise<SignedScore> {
  const response = await fetch('/api/sign-score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerAddress,
      score,
      gameData,
      farcasterID: farcasterID || 0,
      username: username || '',
      isEntryFee: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get signed score');
  }

  return response.json();
}

export async function getSignedEntryFee(
  playerAddress: string,
  entryFeeAmount: string,
  gameData: GameData,
  farcasterID?: number,
  username?: string
): Promise<SignedScore> {
  const response = await fetch('/api/sign-score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerAddress,
      score: 0, // Not used for entry fee, but required by validation
      gameData,
      farcasterID: farcasterID || 0,
      username: username || '',
      isEntryFee: true,
      entryFeeAmount,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get signed entry fee');
  }

  return response.json();
}

export function generateGameSession(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}