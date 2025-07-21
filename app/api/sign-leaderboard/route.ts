import { NextRequest, NextResponse } from "next/server";
import { Wallet, solidityPackedKeccak256 } from "ethers";

const PRIVATE_KEY = process.env.LEADERBOARD_SIGNER_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error("LEADERBOARD_SIGNER_PRIVATE_KEY is not set");
}

const signer = new Wallet(PRIVATE_KEY);

export async function POST(req: NextRequest) {
  try {
    const { address, day } = await req.json();
    if (!address || !day) {
      return NextResponse.json({ error: "Missing address or day" }, { status: 400 });
    }
    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    // Validate day is a number
    if (isNaN(Number(day))) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }
    const hash = solidityPackedKeccak256(["address", "uint256"], [address, day]);
    const signature = await signer.signMessage(Buffer.from(hash.slice(2), "hex"));
    return NextResponse.json({ signature });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 