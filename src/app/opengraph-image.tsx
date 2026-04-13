import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Clario — AI Astrology Readings';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Logo circle */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          fontSize: 48,
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        C
      </div>

      {/* Brand name */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: 'white',
          letterSpacing: '-2px',
          marginBottom: 16,
        }}
      >
        Clario
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 28,
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          maxWidth: 700,
          lineHeight: 1.4,
        }}
      >
        AI astrology readings for charts, insights, and follow-up guidance
      </div>

      {/* URL badge */}
      <div
        style={{
          marginTop: 48,
          padding: '10px 28px',
          borderRadius: 40,
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 22,
        }}
      >
        tryclario.by
      </div>
    </div>,
    { ...size },
  );
}
