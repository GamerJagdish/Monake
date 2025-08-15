import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const dynamic = "force-dynamic";

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);
  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status == 200) {
      return await response.arrayBuffer();
    }
  }
  throw new Error('failed to load font data');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || 'Player';
    const score = searchParams.get('score') || '0';
    const imageUrl = searchParams.get('image') || '';
    const style = searchParams.get('style') || '1';

    // Helper function to get the correct base URL
    const getBaseUrl = () => {
      if (process.env.NEXT_PUBLIC_URL) {
        return process.env.NEXT_PUBLIC_URL;
      }
      // Fallback for development
      return request.nextUrl.origin || 'http://localhost:3000';
    };

    // Load Poppins font from Google Fonts
    const text = `${username} ${score} Monake Monad Snake Game Can you beat this score? 🐍🏆`;
    const poppinsFontData = await loadGoogleFont('Poppins:wght@400;600;700', text);

    // Helper function to render profile image with proper dimensions
    const renderProfileImage = (imageUrl: string, username: string) => {
      if (imageUrl && imageUrl.trim() !== '') {
        return (
          <img 
            src={imageUrl} 
            alt={username} 
            width={240}
            height={240}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        );
      }
      return <div style={{ fontSize: '96px' }}>🐍</div>;
    };

    // Helper function to render logo with proper dimensions
    const renderLogo = () => (
      <img
        src={`${getBaseUrl()}/images/logo.png`}
        alt="Monake Logo"
        width={64}
        height={64}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '12px',
        }}
      />
    );

    // Style 1: Monad Blue (Layout 6 - Top-right logo)
    if (style === '1') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#200052',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(32, 0, 82, 0.4)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                {renderLogo()}
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'rgba(251, 250, 249, 0.8)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flex: 1, width: '100%', paddingLeft: '20px' }}>
                <div
                  style={{
                    width: '240px',
                    height: '240px',
                    borderRadius: '32px',
                    border: '8px solid #836EF9',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FBFAF9',
                    marginRight: '48px',
                    boxShadow: '0 12px 40px rgba(131, 110, 249, 0.4)',
                  }}
                >
                  {renderProfileImage(imageUrl, username)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '56px', fontWeight: '700', color: '#FBFAF9', marginBottom: '16px', lineHeight: '1.1' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '96px', fontWeight: '700', color: '#836EF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(251, 250, 249, 0.8)', marginTop: '16px' }}>
                    Can you beat this score?
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 2: Monad Purple (Layout 6 - Top-right logo)
    if (style === '2') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#836EF9',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(131, 110, 249, 0.4)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                {renderLogo()}
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'rgba(251, 250, 249, 0.8)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flex: 1, width: '100%', paddingLeft: '20px' }}>
                <div
                  style={{
                    width: '240px',
                    height: '240px',
                    borderRadius: '32px',
                    border: '8px solid #FBFAF9',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FBFAF9',
                    marginRight: '48px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                  }}
                >
                  {renderProfileImage(imageUrl, username)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '56px', fontWeight: '700', color: '#FBFAF9', marginBottom: '16px', lineHeight: '1.1' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '96px', fontWeight: '700', color: '#FBFAF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(251, 250, 249, 0.8)', marginTop: '16px' }}>
                    Can you beat this score?
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 3: Monad Berry (Layout 6 - Top-right logo)
    if (style === '3') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#A0055D',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(160, 5, 93, 0.4)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                {renderLogo()}
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'rgba(251, 250, 249, 0.8)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flex: 1, width: '100%', paddingLeft: '20px' }}>
                <div
                  style={{
                    width: '240px',
                    height: '240px',
                    borderRadius: '32px',
                    border: '8px solid #FBFAF9',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FBFAF9',
                    marginRight: '48px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                  }}
                >
                  {renderProfileImage(imageUrl, username)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '56px', fontWeight: '700', color: '#FBFAF9', marginBottom: '16px', lineHeight: '1.1' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '96px', fontWeight: '700', color: '#FBFAF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(251, 250, 249, 0.8)', marginTop: '16px' }}>
                    Can you beat this score?
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 4: Monad Black (Layout 6 - Top-right logo)
    if (style === '4') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#0E100F',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(14, 16, 15, 0.6)',
                border: '2px solid rgba(131, 110, 249, 0.3)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                {renderLogo()}
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'rgba(251, 250, 249, 0.8)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flex: 1, width: '100%', paddingLeft: '20px' }}>
                <div
                  style={{
                    width: '240px',
                    height: '240px',
                    borderRadius: '32px',
                    border: '8px solid #836EF9',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FBFAF9',
                    marginRight: '48px',
                    boxShadow: '0 0 40px rgba(131, 110, 249, 0.4)',
                  }}
                >
                  {renderProfileImage(imageUrl, username)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '56px', fontWeight: '700', color: '#FBFAF9', marginBottom: '16px', lineHeight: '1.1' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '96px', fontWeight: '700', color: '#836EF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(251, 250, 249, 0.8)', marginTop: '16px' }}>
                    Can you beat this score?
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 5: Monad White (Layout 6 - Top-right logo)
    if (style === '5') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#FBFAF9',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.15)',
                border: '4px solid rgba(131, 110, 249, 0.2)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                {renderLogo()}
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'rgba(32, 0, 82, 0.8)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flex: 1, width: '100%', paddingLeft: '20px' }}>
                <div
                  style={{
                    width: '240px',
                    height: '240px',
                    borderRadius: '32px',
                    border: '8px solid #836EF9',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFFFFF',
                    marginRight: '48px',
                    boxShadow: '0 12px 40px rgba(131, 110, 249, 0.3)',
                  }}
                >
                  {renderProfileImage(imageUrl, username)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '56px', fontWeight: '700', color: '#200052', marginBottom: '16px', lineHeight: '1.1' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '96px', fontWeight: '700', color: '#836EF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(32, 0, 82, 0.7)', marginTop: '16px' }}>
                    Can you beat this score?
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 6: Purple-Berry Gradient (Layout 9 - Bottom-right logo)
    if (style === '6') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                background: 'linear-gradient(135deg, #836EF9 0%, #A0055D 100%)',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(131, 110, 249, 0.3)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', bottom: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                <img
                  src={`${getBaseUrl()}/images/logo.png`}
                  alt="Monake Logo"
                  width={56}
                  height={56}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                  }}
                />
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '22px', fontWeight: '600', color: 'rgba(251, 250, 249, 0.7)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingLeft: '20px', gap: '48px' }}>
                <div
                  style={{
                    width: '260px',
                    height: '260px',
                    borderRadius: '32px',
                    border: '8px solid rgba(251, 250, 249, 0.9)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FBFAF9',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                  }}
                >
                  {imageUrl && imageUrl.trim() !== '' ? (
                    <img 
                      src={imageUrl} 
                      alt={username} 
                      width={260}
                      height={260}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ fontSize: '104px' }}>🐍</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '64px', fontWeight: '700', color: '#FBFAF9', marginBottom: '16px', lineHeight: '1.1', textShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '104px', fontWeight: '700', color: '#FBFAF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1', textShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(251, 250, 249, 0.9)', marginTop: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    Beat this score!
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 7: Blue-Purple Gradient (Layout 9 - Bottom-right logo)
    if (style === '7') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                background: 'linear-gradient(135deg, #200052 0%, #836EF9 100%)',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(32, 0, 82, 0.4)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', bottom: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                <img
                  src={`${getBaseUrl()}/images/logo.png`}
                  alt="Monake Logo"
                  width={56}
                  height={56}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                  }}
                />
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '22px', fontWeight: '600', color: 'rgba(251, 250, 249, 0.7)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingLeft: '20px', gap: '48px' }}>
                <div
                  style={{
                    width: '260px',
                    height: '260px',
                    borderRadius: '32px',
                    border: '8px solid rgba(251, 250, 249, 0.9)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FBFAF9',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                  }}
                >
                  {imageUrl && imageUrl.trim() !== '' ? (
                    <img 
                      src={imageUrl} 
                      alt={username} 
                      width={260}
                      height={260}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ fontSize: '104px' }}>🐍</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '64px', fontWeight: '700', color: '#FBFAF9', marginBottom: '16px', lineHeight: '1.1', textShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '104px', fontWeight: '700', color: '#FBFAF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1', textShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(251, 250, 249, 0.9)', marginTop: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    Beat this score!
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 8: Berry-Black Gradient (Layout 9 - Bottom-right logo)
    if (style === '8') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                background: 'linear-gradient(135deg, #A0055D 0%, #0E100F 100%)',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(160, 5, 93, 0.4)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', bottom: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                <img
                  src={`${getBaseUrl()}/images/logo.png`}
                  alt="Monake Logo"
                  width={56}
                  height={56}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                  }}
                />
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '22px', fontWeight: '600', color: 'rgba(251, 250, 249, 0.7)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingLeft: '20px', gap: '48px' }}>
                <div
                  style={{
                    width: '260px',
                    height: '260px',
                    borderRadius: '32px',
                    border: '8px solid rgba(251, 250, 249, 0.9)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FBFAF9',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                  }}
                >
                  {imageUrl && imageUrl.trim() !== '' ? (
                    <img 
                      src={imageUrl} 
                      alt={username} 
                      width={260}
                      height={260}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ fontSize: '104px' }}>🐍</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '64px', fontWeight: '700', color: '#FBFAF9', marginBottom: '16px', lineHeight: '1.1', textShadow: '0 4px 8px rgba(0,0,0,0.4)' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '104px', fontWeight: '700', color: '#FBFAF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1', textShadow: '0 4px 8px rgba(0,0,0,0.4)' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(251, 250, 249, 0.9)', marginTop: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                    Beat this score!
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 9: Purple-White Gradient (Layout 9 - Bottom-right logo)
    if (style === '9') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                background: 'linear-gradient(135deg, #836EF9 0%, #FBFAF9 100%)',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(131, 110, 249, 0.3)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', bottom: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                <img
                  src={`${getBaseUrl()}/images/logo.png`}
                  alt="Monake Logo"
                  width={56}
                  height={56}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                  }}
                />
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '22px', fontWeight: '600', color: 'rgba(32, 0, 82, 0.8)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingLeft: '20px', gap: '48px' }}>
                <div
                  style={{
                    width: '260px',
                    height: '260px',
                    borderRadius: '32px',
                    border: '8px solid #200052',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFFFFF',
                    boxShadow: '0 16px 48px rgba(32, 0, 82, 0.3)',
                  }}
                >
                  {imageUrl && imageUrl.trim() !== '' ? (
                    <img 
                      src={imageUrl} 
                      alt={username} 
                      width={260}
                      height={260}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ fontSize: '104px' }}>🐍</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '64px', fontWeight: '700', color: '#200052', marginBottom: '16px', lineHeight: '1.1', textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '104px', fontWeight: '700', color: '#200052', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1', textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(32, 0, 82, 0.8)', marginTop: '16px' }}>
                    Beat this score!
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Style 10: Black-Purple Gradient (Layout 9 - Bottom-right logo)
    if (style === '10') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              padding: '40px',
              fontFamily: 'Poppins, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                background: 'linear-gradient(135deg, #0E100F 0%, #836EF9 100%)',
                borderRadius: '40px',
                padding: '48px',
                boxShadow: '0 24px 80px rgba(14, 16, 15, 0.5)',
                width: '1120px',
                height: '320px',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', bottom: '32px', right: '40px', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                <img
                  src={`${getBaseUrl()}/images/logo.png`}
                  alt="Monake Logo"
                  width={56}
                  height={56}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                  }}
                />
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '22px', fontWeight: '600', color: 'rgba(251, 250, 249, 0.7)', lineHeight: '1' }}>
                    Monake
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingLeft: '20px', gap: '48px' }}>
                <div
                  style={{
                    width: '260px',
                    height: '260px',
                    borderRadius: '32px',
                    border: '8px solid rgba(251, 250, 249, 0.9)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FBFAF9',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                  }}
                >
                  {imageUrl && imageUrl.trim() !== '' ? (
                    <img 
                      src={imageUrl} 
                      alt={username} 
                      width={260}
                      height={260}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ fontSize: '104px' }}>🐍</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '64px', fontWeight: '700', color: '#FBFAF9', marginBottom: '16px', lineHeight: '1.1', textShadow: '0 4px 8px rgba(0,0,0,0.4)' }}>
                    {username}
                  </div>
                  <div style={{ fontSize: '104px', fontWeight: '700', color: '#FBFAF9', display: 'flex', alignItems: 'center', gap: '24px', lineHeight: '1', textShadow: '0 4px 8px rgba(0,0,0,0.4)' }}>
                    🏆 {score}
                  </div>
                  <div style={{ fontSize: '28px', color: 'rgba(251, 250, 249, 0.9)', marginTop: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                    Beat this score!
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 400, fonts: [{ name: 'Poppins', data: poppinsFontData, style: 'normal' }] }
      );
    }

    // Default fallback
    return new ImageResponse(
      (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#836EF9', color: 'white', fontSize: '48px' }}>
          Invalid style parameter. Use styles 1-10.
        </div>
      ),
      { width: 1200, height: 400 }
    );

  } catch (e) {
    console.error('Error generating OG image:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}