import hre from "hardhat";
import { formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
    // Get the game server address from environment variable
    const gameServerPrivateKey = process.env.GAME_SERVER_PRIVATE_KEY;

    if (!gameServerPrivateKey) {
        throw new Error("GAME_SERVER_PRIVATE_KEY environment variable is required");
    }

    // Create wallet from private key to get the address (using viem)
    const gameServerAccount = privateKeyToAccount(gameServerPrivateKey as `0x${string}`);
    const gameServerAddress = gameServerAccount.address;

    console.log("Deploying MonakeLeaderboard with game server:", gameServerAddress);

    // Deploy the contract using Hardhat Viem
    const leaderboard = await hre.viem.deployContract("MonakeLeaderboard", [gameServerAddress]);

    console.log("MonakeLeaderboard deployed to:", leaderboard.address);
    console.log("Game server address:", gameServerAddress);

    // Verify the deployment
    const publicClient = await hre.viem.getPublicClient();
    
    const owner = await publicClient.readContract({
        address: leaderboard.address,
        abi: leaderboard.abi,
        functionName: 'owner',
        args: [],
    }) as string;
    
    const gameServer = await publicClient.readContract({
        address: leaderboard.address,
        abi: leaderboard.abi,
        functionName: 'gameServer',
        args: [],
    }) as string;
    
    const entryFee = await publicClient.readContract({
        address: leaderboard.address,
        abi: leaderboard.abi,
        functionName: 'entryFee',
        args: [],
    }) as bigint;

    console.log("Contract owner:", owner);
    console.log("Game server:", gameServer);
    console.log("Entry fee:", formatEther(entryFee), "ETH");

    console.log("\nDeployment Summary:");
    console.log("==================");
    console.log(`Contract Address: ${leaderboard.address}`);
    console.log(`Game Server: ${gameServerAddress}`);
    console.log(`Owner: ${owner}`);
    console.log("\nUpdate your frontend with the new contract address!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});