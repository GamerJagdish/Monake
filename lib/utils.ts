import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ethers } from "ethers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper to sign a leaderboard message for the Monake contract.
 * @param signer ethers.Signer (from ethers.js, e.g. from MetaMask or WalletConnect)
 * @param userAddress The user's wallet address (string)
 * @param currentDayTimestamp The current day timestamp (number or string)
 * @returns The signature as a string
 */
export async function signLeaderboardMessage(
  signer: ethers.Signer,
  userAddress: string,
  currentDayTimestamp: string | number
): Promise<string> {
  // The contract expects keccak256(abi.encodePacked(user, day))
  const abiEncoded = ethers.solidityPacked(
    ["address", "uint256"],
    [userAddress, currentDayTimestamp]
  );
  const hash = ethers.solidityPackedKeccak256(
    ["address", "uint256"],
    [userAddress, currentDayTimestamp]
  );

  // The contract expects an Ethereum Signed Message
  return await signer.signMessage(ethers.getBytes(hash));
}
