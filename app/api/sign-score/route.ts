import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// This should be stored securely in environment variables
const GAME_SERVER_PRIVATE_KEY = process.env.GAME_SERVER_PRIVATE_KEY;

if (!GAME_SERVER_PRIVATE_KEY) {
  throw new Error('GAME_SERVER_PRIVATE_KEY environment variable is required');
}

// Type assertion since we've checked it exists above
const VALIDATED_PRIVATE_KEY: string = GAME_SERVER_PRIVATE_KEY;

interface RequestBody {
  playerAddress: string;
  score: number;
  gameData: any;
  farcasterID?: number;
  username?: string;
  isEntryFee?: boolean;
  entryFeeAmount?: string;
}

export async function POST(request: Request) {
  try {
    const { 
      playerAddress, 
      score, 
      gameData, 
      farcasterID, 
      username, 
      isEntryFee, 
      entryFeeAmount 
    }: RequestBody = await request.json();

    // Validate required fields
    if (!playerAddress || typeof score !== 'number' || !gameData) {
      return NextResponse.json(
        { error: 'Missing required fields: playerAddress, score, gameData' },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!ethers.isAddress(playerAddress)) {
      return NextResponse.json(
        { error: 'Invalid player address format' },
        { status: 400 }
      );
    }

    // Validate score is reasonable (adjust these limits as needed)
    if (score < 0 || score > 1000000) {
      return NextResponse.json(
        { error: 'Score out of valid range' },
        { status: 400 }
      );
    }

    // Validate optional Farcaster data
    const validatedFarcasterID = farcasterID && typeof farcasterID === 'number' ? farcasterID : 0;
    const validatedUsername = username && typeof username === 'string' ? username.slice(0, 32) : '';

    // Validate entry fee amount if this is an entry fee payment
    if (isEntryFee && (!entryFeeAmount || typeof entryFeeAmount !== 'string')) {
      return NextResponse.json(
        { error: 'Entry fee amount required for fee payments' },
        { status: 400 }
      );
    }

    // TODO: Add additional game validation logic here
    // For example, validate game session, check for suspicious patterns, etc.
    const isValidGame = await validateGameData(gameData, score, isEntryFee);
    if (!isValidGame) {
      return NextResponse.json(
        { error: 'Invalid game data or suspicious activity detected' },
        { status: 400 }
      );
    }

    // Create timestamp for the signature
    const timestamp = Math.floor(Date.now() / 1000);

    // Create the message to sign based on whether it's entry fee or score submission
    let messageHash: string;
    
    if (isEntryFee) {
      // For entry fee: hash(playerAddress, entryFeeAmount, farcasterID, username, timestamp)
      messageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'string', 'uint256'],
        [playerAddress, entryFeeAmount, validatedFarcasterID, validatedUsername, timestamp]
      );
    } else {
      // For score submission: hash(playerAddress, score, farcasterID, username, timestamp)
      messageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'string', 'uint256'],
        [playerAddress, score, validatedFarcasterID, validatedUsername, timestamp]
      );
    }

    // Sign the message
    const wallet = new ethers.Wallet(VALIDATED_PRIVATE_KEY);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return NextResponse.json({
      signature,
      timestamp,
      score,
      playerAddress,
      farcasterID: validatedFarcasterID,
      username: validatedUsername,
      gameServerAddress: wallet.address,
      isEntryFee: !!isEntryFee,
      entryFeeAmount: isEntryFee ? entryFeeAmount : undefined
    });

  } catch (error) {
    console.error('Error signing score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface GameData {
  gameStartTime: number;
  gameEndTime: number;
  moves: any[];
  finalScore: number;
  gameSession: string;
}

// Validate game data to prevent cheating
async function validateGameData(gameData: GameData, score: number, isEntryFee: boolean = false): Promise<boolean> {
  try {
    // Basic validation - you should expand this based on your game logic
    const {
      gameStartTime,
      gameEndTime,
      moves,
      finalScore,
      gameSession
    } = gameData;

    // For entry fee payments, we use dummy data so skip most validations
    if (isEntryFee) {
      // Just check that basic fields exist
      return !!(gameStartTime && gameEndTime && gameSession);
    }

    // Verify the score matches what was reported
    if (finalScore !== score) {
      return false;
    }

    // Check if the number of moves is reasonable for the score
    // This is game-specific logic - adjust based on your Snake game rules
    const minMovesForScore = Math.floor(score / 10); // Rough estimate
    const maxMovesForScore = score * 5; // Rough estimate
    
    if (moves.length < minMovesForScore || moves.length > maxMovesForScore) {
      return false;
    }

    // TODO: Add more sophisticated validation:
    // - Validate move sequences make sense
    // - Check for impossible score increases
    // - Validate timing between moves
    // - Check for bot-like patterns

    return true;
  } catch (error) {
    console.error('Error validating game data:', error);
    return false;
  }
}