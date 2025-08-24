export interface Web3BioProfile {
  address: string;
  identity: string;
  platform: string;
  displayName: string;
  avatar: string;
  description: string;
  aliases: string[];
}

export interface Web3BioBatchResult {
  profiles: (Web3BioProfile | { address: string; error: string; found: false })[];
  found: number;
  total: number;
}

/**
 * Fetch profiles in batches using the web3bio batch API
 * Handles missing profiles by cross-matching returned results with original addresses
 */
export async function fetchProfilesBatch(addresses: string[]): Promise<Map<string, Web3BioProfile>> {
  const profilesMap = new Map<string, Web3BioProfile>();
  
  // Process addresses in batches of 30 (web3bio limit)
  const batchSize = 30;
  
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    
    try {
      // Format addresses for web3bio batch API
      const ids = batch.map(address => `farcaster,${address}`);
      
      const url = `https://api.web3.bio/ns/batch/${encodeURIComponent(JSON.stringify(ids))}`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.WEB3BIO_API_KEY as string
        }
      });
      
      if (response.ok) {
        const profiles: Web3BioProfile[] = await response.json();
        
        // Cross-match returned profiles with original addresses
        for (const profile of profiles) {
          if (profile.address) {
            // Normalize both addresses to lowercase for comparison
            const profileAddressLower = profile.address.toLowerCase();
            
            // First, try to match the primary address
            let matchingOriginalAddress = batch.find(addr => addr.toLowerCase() === profileAddressLower);
            
            if (matchingOriginalAddress) {
              profilesMap.set(matchingOriginalAddress.toLowerCase(), profile);
            } else {
              // If no primary match, check aliases for secondary addresses
              // Extract addresses from aliases (format: "farcaster,0xaddress")
              const aliasAddresses = profile.aliases
                .filter(alias => alias.startsWith('farcaster,0x'))
                .map(alias => alias.replace('farcaster,', '').toLowerCase());
              
              // Find any original address that matches any alias
              for (const originalAddr of batch) {
                const originalAddrLower = originalAddr.toLowerCase();
                if (aliasAddresses.includes(originalAddrLower)) {
                  matchingOriginalAddress = originalAddr;
                  break;
                }
              }
              
              if (matchingOriginalAddress) {
                profilesMap.set(matchingOriginalAddress.toLowerCase(), profile);
              }
            }
          }
        }
        
      } else {
        console.warn(`Web3Bio batch API failed: HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(`Failed to fetch batch profiles:`, error);
    }
  }
  
  return profilesMap;
}

/**
 * Fetch a single profile using the individual web3bio API
 */
export async function fetchSingleProfile(address: string): Promise<Web3BioProfile | null> {
  try {
    const response = await fetch(`https://api.web3.bio/ns/farcaster/${address}`, {
      headers: {
        'X-API-KEY': process.env.WEB3BIO_API_KEY as string
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching single profile:', error);
    return null;
  }
}

/**
 * Get display name and avatar for an address, with fallback to truncated address
 */
export function getProfileDisplay(profile: Web3BioProfile | null, address: string): {
  displayName: string;
  avatar?: string;
} {
  if (profile?.displayName && typeof profile.displayName === 'string' && profile.displayName.length > 0) {
    return {
      displayName: profile.displayName,
      avatar: profile.avatar
    };
  }
  
  return {
    displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    avatar: profile?.avatar
  };
}
