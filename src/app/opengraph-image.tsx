import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Clario — AI-астрологические разборы';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background:
          'radial-gradient(circle at top, rgba(214, 187, 127, 0.22), transparent 34%), linear-gradient(135deg, #0e1726 0%, #132238 48%, #1d3044 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div
        style={{
          padding: '12px 22px',
          borderRadius: 999,
          border: '1px solid rgba(214, 187, 127, 0.35)',
          color: 'rgba(255,255,255,0.72)',
          fontSize: 18,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          marginBottom: 28,
        }}
      >
        Астрологическое пространство
      </div>

      <div
        style={{
          fontSize: 74,
          fontWeight: 700,
          color: 'white',
          letterSpacing: '-2px',
          marginBottom: 18,
        }}
      >
        Clario
      </div>

      <div
        style={{
          fontSize: 28,
          color: 'rgba(255,255,255,0.78)',
          textAlign: 'center',
          maxWidth: 780,
          lineHeight: 1.4,
        }}
      >
        Натальные карты, AI-разборы и персональные прогнозы на основе точных астрономических
        расчётов
      </div>

      <div
        style={{
          marginTop: 48,
          padding: '10px 28px',
          borderRadius: 40,
          border: '1px solid rgba(255,255,255,0.16)',
          color: 'rgba(255,255,255,0.56)',
          fontSize: 22,
        }}
      >
        tryclario.by
      </div>
    </div>,
    { ...size },
  );
}
