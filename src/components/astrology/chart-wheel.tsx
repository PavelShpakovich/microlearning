/**
 * ChartWheel — SVG natal chart wheel.
 *
 * Renders a classical Western-style astrological wheel:
 *   - Outer ring: 12 zodiac signs, element-colored sectors
 *   - Middle zone: house lines (equal houses from ASC + i*30°)
 *   - Planets at their ecliptic longitudes
 *   - Aspect web connecting planets
 *   - ASC (violet) and MC (emerald) prominent markers
 *
 * Coordinate convention: ASC is at 9 o'clock (left).
 * Increasing ecliptic longitude goes counterclockwise.
 */

interface WheelPosition {
  bodyKey: string;
  /** Full ecliptic longitude 0–360°, as stored in chart_positions.degree_decimal */
  degreeDecimal: number;
  retrograde: boolean;
}

interface WheelAspect {
  bodyA: string;
  bodyB: string;
  aspectKey: string;
  orbDecimal: number;
}

export interface ChartWheelProps {
  positions: WheelPosition[];
  aspects?: WheelAspect[];
}

// ─── zodiac ──────────────────────────────────────────────────────────────────

const SIGNS = [
  { symbol: '♈', fill: 'rgba(255,100,80,0.18)', stroke: 'rgba(255,100,80,0.5)' }, // Aries – fire
  { symbol: '♉', fill: 'rgba(168,140,90,0.18)', stroke: 'rgba(168,140,90,0.5)' }, // Taurus – earth
  { symbol: '♊', fill: 'rgba(90,180,220,0.18)', stroke: 'rgba(90,180,220,0.5)' }, // Gemini – air
  { symbol: '♋', fill: 'rgba(80,130,220,0.18)', stroke: 'rgba(80,130,220,0.5)' }, // Cancer – water
  { symbol: '♌', fill: 'rgba(255,160,60,0.18)', stroke: 'rgba(255,160,60,0.5)' }, // Leo – fire
  { symbol: '♍', fill: 'rgba(110,190,110,0.18)', stroke: 'rgba(110,190,110,0.5)' }, // Virgo – earth
  { symbol: '♎', fill: 'rgba(180,140,240,0.18)', stroke: 'rgba(180,140,240,0.5)' }, // Libra – air
  { symbol: '♏', fill: 'rgba(60,100,220,0.18)', stroke: 'rgba(60,100,220,0.5)' }, // Scorpio – water
  { symbol: '♐', fill: 'rgba(255,130,50,0.18)', stroke: 'rgba(255,130,50,0.5)' }, // Sagittarius – fire
  { symbol: '♑', fill: 'rgba(130,100,70,0.18)', stroke: 'rgba(130,100,70,0.5)' }, // Capricorn – earth
  { symbol: '♒', fill: 'rgba(60,210,220,0.18)', stroke: 'rgba(60,210,220,0.5)' }, // Aquarius – air
  { symbol: '♓', fill: 'rgba(160,100,230,0.18)', stroke: 'rgba(160,100,230,0.5)' }, // Pisces – water
] as const;

// ─── planets ─────────────────────────────────────────────────────────────────

const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
};

const PLANET_COLORS: Record<string, string> = {
  sun: '#F59E0B',
  moon: '#93C5FD',
  mercury: '#A78BFA',
  venus: '#F472B6',
  mars: '#F87171',
  jupiter: '#FB923C',
  saturn: '#9CA3AF',
  uranus: '#34D399',
  neptune: '#60A5FA',
  pluto: '#6B7280',
};

// ─── aspects ──────────────────────────────────────────────────────────────────

const ASPECT_STYLES: Record<string, { stroke: string; dash?: string; opacity: number }> = {
  conjunction: { stroke: '#8B5CF6', opacity: 0.55 },
  sextile: { stroke: '#3B82F6', dash: '4,3', opacity: 0.4 },
  square: { stroke: '#EF4444', opacity: 0.5 },
  trine: { stroke: '#22C55E', dash: '6,3', opacity: 0.4 },
  opposition: { stroke: '#F97316', opacity: 0.5 },
};

// ─── SVG layout ───────────────────────────────────────────────────────────────

const SZ = 400; // viewBox size
const CX = SZ / 2;
const CY = SZ / 2;
const R_OUTER = 188; // outer edge of zodiac ring
const R_ZODIAC = 156; // inner edge of zodiac ring / outer planet zone
const R_PLANET = 128; // planet symbol radius
const R_INNER = 108; // inner wheel edge
const R_ASPECT = 70; // aspect line circle radius
const R_CENTER = 20; // small center circle

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Round a number to 2 decimal places as a string for SVG attributes. */
const f = (n: number) => n.toFixed(2);

/**
 * Convert ecliptic longitude to SVG screen coordinates.
 * ASC is placed at the left (9 o'clock). Increasing longitude → counterclockwise.
 */
function lonToXY(lon: number, ascDeg: number, r: number): [number, number] {
  const offset = (((lon - ascDeg) % 360) + 360) % 360;
  const angle = Math.PI - (offset * Math.PI) / 180;
  return [CX + r * Math.cos(angle), CY - r * Math.sin(angle)];
}

/**
 * Build an SVG path for a ring sector from lon1 to lon2 (counterclockwise).
 */
function sectorPath(
  lon1: number,
  lon2: number,
  asc: number,
  rOuter: number,
  rInner: number,
): string {
  const [x1o, y1o] = lonToXY(lon1, asc, rOuter);
  const [x2o, y2o] = lonToXY(lon2, asc, rOuter);
  const [x2i, y2i] = lonToXY(lon2, asc, rInner);
  const [x1i, y1i] = lonToXY(lon1, asc, rInner);
  const span = (lon2 - lon1 + 360) % 360;
  const largeArc = span > 180 ? 1 : 0;
  // outer arc: CCW on screen (sweep=0); inner arc: CW back (sweep=1)
  return [
    `M${f(x1o)},${f(y1o)}`,
    `A${rOuter},${rOuter},0,${largeArc},0,${f(x2o)},${f(y2o)}`,
    `L${f(x2i)},${f(y2i)}`,
    `A${rInner},${rInner},0,${largeArc},1,${f(x1i)},${f(y1i)}`,
    'Z',
  ].join(' ');
}

// ─── component ────────────────────────────────────────────────────────────────

export function ChartWheel({ positions, aspects = [] }: ChartWheelProps) {
  const ascPos = positions.find((p) => p.bodyKey === 'ascendant');
  const mcPos = positions.find((p) => p.bodyKey === 'midheaven');
  /** If ASC is unknown, default to 0° (Aries rising) — zodiac ring still shows. */
  const asc = ascPos?.degreeDecimal ?? 0;
  const hasAsc = ascPos != null;

  const planets = positions.filter((p) =>
    Object.prototype.hasOwnProperty.call(PLANET_SYMBOLS, p.bodyKey),
  );

  return (
    <svg
      viewBox={`0 0 ${SZ} ${SZ}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[400px] mx-auto block"
      aria-label="Natal chart wheel"
      role="img"
    >
      {/* ── Background disk ─────────────────────────────────────────────── */}
      <circle cx={CX} cy={CY} r={R_OUTER} fill="#0B0B18" />

      {/* ── Zodiac ring sectors ─────────────────────────────────────────── */}
      {SIGNS.map((sign, i) => (
        <path
          key={i}
          d={sectorPath(i * 30, (i + 1) * 30, asc, R_OUTER, R_ZODIAC)}
          fill={sign.fill}
          stroke={sign.stroke}
          strokeWidth="0.6"
        />
      ))}

      {/* ── Sign boundary ticks (30° marks on outer ring) ───────────────── */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x1, y1] = lonToXY(i * 30, asc, R_OUTER);
        const [x2, y2] = lonToXY(i * 30, asc, R_ZODIAC);
        return (
          <line
            key={i}
            x1={f(x1)}
            y1={f(y1)}
            x2={f(x2)}
            y2={f(y2)}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* ── Zodiac sign symbols (at midpoint of each sector) ────────────── */}
      {SIGNS.map((sign, i) => {
        const [x, y] = lonToXY(i * 30 + 15, asc, (R_OUTER + R_ZODIAC) / 2);
        return (
          <text
            key={i}
            x={f(x)}
            y={f(y)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="13"
            fill="rgba(220,212,255,0.88)"
          >
            {sign.symbol}
          </text>
        );
      })}

      {/* ── Ring borders ────────────────────────────────────────────────── */}
      <circle
        cx={CX}
        cy={CY}
        r={R_ZODIAC}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
      <circle
        cx={CX}
        cy={CY}
        r={R_INNER}
        fill="#090914"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="0.8"
      />

      {/* ── House dividers (equal houses: ASC + i×30°) ──────────────────── */}
      {Array.from({ length: 12 }, (_, i) => {
        const cusp = asc + i * 30;
        const [x1, y1] = lonToXY(cusp, asc, R_ZODIAC);
        const [x2, y2] = lonToXY(cusp, asc, R_ASPECT * 0.55);
        const isAngular = i % 3 === 0; // houses 1, 4, 7, 10
        return (
          <line
            key={i}
            x1={f(x1)}
            y1={f(y1)}
            x2={f(x2)}
            y2={f(y2)}
            stroke="rgba(255,255,255,1)"
            strokeWidth={isAngular ? 1.2 : 0.4}
            strokeOpacity={isAngular ? 0.45 : 0.18}
            strokeDasharray={isAngular ? undefined : '2,5'}
          />
        );
      })}

      {/* ── House numbers ───────────────────────────────────────────────── */}
      {Array.from({ length: 12 }, (_, i) => {
        const mid = asc + i * 30 + 15;
        const [x, y] = lonToXY(mid, asc, (R_INNER + R_ASPECT) / 2);
        return (
          <text
            key={i}
            x={f(x)}
            y={f(y)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            fill="rgba(160,160,200,0.6)"
          >
            {i + 1}
          </text>
        );
      })}

      {/* ── Aspect web ──────────────────────────────────────────────────── */}
      {aspects.slice(0, 18).map((asp, i) => {
        const pa = planets.find((p) => p.bodyKey === asp.bodyA);
        const pb = planets.find((p) => p.bodyKey === asp.bodyB);
        if (!pa || !pb) return null;
        const [ax, ay] = lonToXY(pa.degreeDecimal, asc, R_ASPECT);
        const [bx, by] = lonToXY(pb.degreeDecimal, asc, R_ASPECT);
        const style = ASPECT_STYLES[asp.aspectKey] ?? { stroke: '#888', opacity: 0.3 };
        return (
          <line
            key={i}
            x1={f(ax)}
            y1={f(ay)}
            x2={f(bx)}
            y2={f(by)}
            stroke={style.stroke}
            strokeWidth="0.9"
            strokeOpacity={style.opacity}
            strokeDasharray={style.dash}
          />
        );
      })}

      {/* ── Planet symbols ──────────────────────────────────────────────── */}
      {planets.map((pos) => {
        const [x, y] = lonToXY(pos.degreeDecimal, asc, R_PLANET);
        const sym = PLANET_SYMBOLS[pos.bodyKey] ?? '?';
        const color = PLANET_COLORS[pos.bodyKey] ?? '#ffffff';
        return (
          <g key={pos.bodyKey}>
            <circle
              cx={f(x)}
              cy={f(y)}
              r="10"
              fill="#0B0B18"
              stroke={color}
              strokeWidth="1.3"
              strokeOpacity="0.85"
            />
            <text
              x={f(x)}
              y={f(y)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fill={color}
            >
              {sym}
            </text>
            {pos.retrograde && (
              <text x={f(x + 7)} y={f(y - 7)} fontSize="6" fill="#FB923C" fontWeight="bold">
                Rx
              </text>
            )}
          </g>
        );
      })}

      {/* ── ASC marker (violet) ─────────────────────────────────────────── */}
      {hasAsc &&
        (() => {
          const [x1, y1] = lonToXY(asc, asc, R_OUTER);
          const [x2, y2] = lonToXY(asc, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(asc - 14, asc, R_ZODIAC - 11);
          return (
            <>
              <line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#A78BFA"
                strokeWidth="2.2"
                strokeOpacity="0.9"
              />
              <text
                x={f(lx)}
                y={f(ly)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="7"
                fill="#A78BFA"
                fontWeight="bold"
                letterSpacing="-0.3"
              >
                ASC
              </text>
            </>
          );
        })()}

      {/* ── MC marker (emerald) ─────────────────────────────────────────── */}
      {mcPos &&
        (() => {
          const mc = mcPos.degreeDecimal;
          const [x1, y1] = lonToXY(mc, asc, R_OUTER);
          const [x2, y2] = lonToXY(mc, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(mc - 14, asc, R_ZODIAC - 11);
          return (
            <>
              <line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#34D399"
                strokeWidth="1.8"
                strokeOpacity="0.85"
              />
              <text
                x={f(lx)}
                y={f(ly)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="7"
                fill="#34D399"
                fontWeight="bold"
                letterSpacing="-0.3"
              >
                MC
              </text>
            </>
          );
        })()}

      {/* ── Center ornament ─────────────────────────────────────────────── */}
      <circle
        cx={CX}
        cy={CY}
        r={R_CENTER}
        fill="#0B0B18"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1"
      />
      <text
        x={CX}
        y={CY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        fill="rgba(200,192,255,0.35)"
      >
        ✦
      </text>
    </svg>
  );
}
