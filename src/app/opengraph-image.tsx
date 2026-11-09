import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'LostLink — Campus Lost & Found';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#06140f',
          backgroundImage: 'radial-gradient(circle at 50% 25%, #064e3b 0%, #022c22 45%, #06140f 90%)',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#ffffff',
          padding: '60px',
        }}
      >
        {/* Brand Icon Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '96px',
            height: '96px',
            borderRadius: '24px',
            backgroundColor: 'rgba(2, 44, 34, 0.95)',
            border: '2px solid rgba(52, 211, 153, 0.4)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            marginBottom: '28px',
          }}
        >
          <span
            style={{
              fontSize: '54px',
              fontWeight: 900,
              color: '#f5f5f4',
              lineHeight: 1,
            }}
          >
            L
          </span>
          <span
            style={{
              fontSize: '40px',
              fontWeight: 900,
              color: '#34d399',
              lineHeight: 1,
              marginLeft: '-4px',
            }}
          >
            L
          </span>
        </div>

        {/* Brand Title & Subtitle */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '68px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              margin: '0',
              color: '#ffffff',
              lineHeight: 1.1,
            }}
          >
            LostLink
          </h1>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.28em',
              color: '#34d399',
              textTransform: 'uppercase',
              marginTop: '8px',
            }}
          >
            Campus Recovery
          </span>
        </div>

        {/* Mission Statement */}
        <p
          style={{
            fontSize: '24px',
            color: '#cbd5e1',
            margin: '24px 0 0 0',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          Campus Lost &amp; Found · Verified Ownership Recovery
        </p>

        {/* Feature Pills Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '36px',
            padding: '12px 28px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(6, 78, 59, 0.35)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#a7f3d0' }}>
            Two-Sided Confirmation
          </span>
          <span style={{ color: '#34d399', fontSize: '16px' }}>•</span>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#a7f3d0' }}>
            Private Proof Verification
          </span>
          <span style={{ color: '#34d399', fontSize: '16px' }}>•</span>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#a7f3d0' }}>
            Centralized Student Network
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
