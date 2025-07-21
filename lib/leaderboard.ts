/**
 * Fetch a backend-generated signature for leaderboard contract actions.
 * @param address The user's wallet address
 * @param day The current day timestamp (number or string)
 * @returns The backend-generated signature
 */
export async function getLeaderboardSignature(address: string, day: number | string): Promise<string> {
  const res = await fetch("/api/sign-leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, day }),
  });
  if (!res.ok) {
    throw new Error("Failed to get signature");
  }
  const data = await res.json();
  return data.signature;
} 