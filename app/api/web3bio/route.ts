import { NextResponse } from 'next/server';
import { fetchProfilesBatch, fetchSingleProfile, Web3BioBatchResult } from '@/lib/web3bio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const addresses = searchParams.get('addresses'); // For batch requests

  // Handle batch request
  if (addresses) {
    try {
      const addressList = JSON.parse(addresses);
      
      if (!Array.isArray(addressList)) {
        return NextResponse.json({ error: 'Addresses must be an array' }, { status: 400 });
      }
      
      if (addressList.length > 30) {
        return NextResponse.json({ error: 'Maximum 30 addresses allowed per request' }, { status: 400 });
      }
      
      const profilesMap = await fetchProfilesBatch(addressList);
      
      // Convert map to array and include missing addresses
      const result = addressList.map(addr => {
        const profile = profilesMap.get(addr.toLowerCase());
        return profile || { 
          address: addr, 
          error: 'Profile not found',
          found: false as const
        };
      });
      
      const batchResult: Web3BioBatchResult = {
        profiles: result,
        found: result.filter(p => !('error' in p)).length,
        total: result.length
      };
      
      return NextResponse.json(batchResult);
    } catch (error) {
      console.error('Error parsing addresses:', error);
      return NextResponse.json({ error: 'Invalid addresses format' }, { status: 400 });
    }
  }

  // Handle single address request (backward compatibility)
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const profile = await fetchSingleProfile(address);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching Web3.bio profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 