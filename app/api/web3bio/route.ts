import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.web3.bio/ns/farcaster/${address}`, {
      headers: {
        'X-API-KEY': process.env.WEB3BIO_API_KEY as string
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Web3.bio profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 