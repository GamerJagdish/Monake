import hre from "hardhat";

async function main() {
  console.log("Deploying MonakeNFT contract...");

  const monakeNFT = await hre.viem.deployContract("MonakeNFT");

  console.log("MonakeNFT deployed to:", monakeNFT.address);

  // Verify the deployment
  console.log("Verifying deployment...");
  const publicClient = await hre.viem.getPublicClient();
  
  const totalSupply = await publicClient.readContract({
    address: monakeNFT.address,
    abi: monakeNFT.abi,
    functionName: 'totalSupply',
    args: [],
  }) as bigint;
  
  const name = await publicClient.readContract({
    address: monakeNFT.address,
    abi: monakeNFT.abi,
    functionName: 'name',
    args: [],
  }) as string;
  
  const symbol = await publicClient.readContract({
    address: monakeNFT.address,
    abi: monakeNFT.abi,
    functionName: 'symbol',
    args: [],
  }) as string;

  console.log("Initial total supply:", totalSupply.toString());
  console.log("NFT Name:", name);
  console.log("NFT Symbol:", symbol);

  console.log("Deployment completed successfully!");
  console.log("Contract Address:", monakeNFT.address);
  console.log("Please update the NFT_CONTRACT_ADDRESS in app/nft/page.tsx with this address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
