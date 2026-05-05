/**
 * ChartWheel — React Native SVG natal chart wheel.
 * Direct port of apps/web/src/components/astrology/chart-wheel.tsx
 *
 * Renders a classical Western-style astrological wheel:
 *   - Outer ring: 12 zodiac signs, element-colored sectors
 *   - Middle zone: house lines
 *   - Planets at their ecliptic longitudes with degree numbers
 *   - Collision avoidance: nearby planets spread to inner/outer radii
 *   - Aspect web connecting planets
 *   - ASC/DSC (violet) and MC/IC (emerald) prominent markers
 *
 * Coordinate convention: ASC is at 9 o'clock (left).
 * Increasing ecliptic longitude goes counterclockwise.
 */

import Svg, { Circle, Defs, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useWindowDimensions } from 'react-native';

// ─── types ────────────────────────────────────────────────────────────────────

export interface WheelPosition {
  bodyKey: string;
  degreeDecimal: number;
  retrograde: boolean;
}

export interface WheelAspect {
  bodyA: string;
  bodyB: string;
  aspectKey: string;
  orbDecimal: number;
}

export interface ChartWheelProps {
  positions: WheelPosition[];
  aspects?: WheelAspect[];
  houseSystem?: string;
}

// ─── design tokens ────────────────────────────────────────────────────────────

const C = {
  card: '#FFFFFF',
  background: '#FAFAFA',
  foreground: '#0F1729',
  mutedFg: '#6B7280',
  primary: '#9A6500',
  border: '#D9DCE6',
} as const;

// ─── zodiac ring data ─────────────────────────────────────────────────────────

const SIGNS = [
  { key: 'aries', fill: 'rgba(239,68,68,0.14)', stroke: 'rgba(239,68,68,0.60)' },
  { key: 'taurus', fill: 'rgba(34,197,94,0.14)', stroke: 'rgba(34,197,94,0.60)' },
  { key: 'gemini', fill: 'rgba(234,179,8,0.14)', stroke: 'rgba(234,179,8,0.60)' },
  { key: 'cancer', fill: 'rgba(59,130,246,0.14)', stroke: 'rgba(59,130,246,0.60)' },
  { key: 'leo', fill: 'rgba(249,115,22,0.14)', stroke: 'rgba(249,115,22,0.60)' },
  { key: 'virgo', fill: 'rgba(16,185,129,0.14)', stroke: 'rgba(16,185,129,0.60)' },
  { key: 'libra', fill: 'rgba(168,85,247,0.14)', stroke: 'rgba(168,85,247,0.60)' },
  { key: 'scorpio', fill: 'rgba(99,102,241,0.14)', stroke: 'rgba(99,102,241,0.60)' },
  { key: 'sagittarius', fill: 'rgba(245,158,11,0.14)', stroke: 'rgba(245,158,11,0.60)' },
  { key: 'capricorn', fill: 'rgba(107,114,128,0.14)', stroke: 'rgba(107,114,128,0.60)' },
  { key: 'aquarius', fill: 'rgba(6,182,212,0.14)', stroke: 'rgba(6,182,212,0.60)' },
  { key: 'pisces', fill: 'rgba(139,92,246,0.14)', stroke: 'rgba(139,92,246,0.60)' },
] as const;

// ─── planet colors ────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  sun: '#F59E0B',
  moon: '#6366F1',
  mercury: '#0EA5E9',
  venus: '#EC4899',
  mars: '#EF4444',
  jupiter: '#8B5CF6',
  saturn: '#10B981',
  uranus: '#06B6D4',
  neptune: '#3B82F6',
  pluto: '#A78BFA',
  ascendant: '#A78BFA',
  midheaven: '#34D399',
};

const PLANET_ABBR: Record<string, string> = {
  sun: 'Солн',
  moon: 'Луна',
  mercury: 'Мерк',
  venus: 'Вен',
  mars: 'Марс',
  jupiter: 'Юп',
  saturn: 'Сат',
  uranus: 'Уран',
  neptune: 'Непт',
  pluto: 'Плут',
};

// ─── aspect styles ────────────────────────────────────────────────────────────

const ASPECT_STYLES: Record<string, { stroke: string; dash?: string; opacity: number }> = {
  conjunction: { stroke: '#8B5CF6', opacity: 0.55 },
  sextile: { stroke: '#3B82F6', dash: '4,3', opacity: 0.4 },
  square: { stroke: '#EF4444', opacity: 0.5 },
  trine: { stroke: '#22C55E', dash: '6,3', opacity: 0.4 },
  opposition: { stroke: '#F97316', opacity: 0.5 },
};

// ─── SVG layout constants ──────────────────────────────────────────────────────

const SZ = 560;
const CX = SZ / 2;
const CY = SZ / 2;
const R_OUTER = 268;
const R_ZODIAC = 222;
const R_PLANET = 188;
const R_INNER = 158;
const R_ASPECT = 88;
const R_HOUSE = 124;
const R_CENTER = 24;

// ─── helpers ──────────────────────────────────────────────────────────────────

const f = (n: number) => n.toFixed(2);

function lonToXY(lon: number, ascDeg: number, r: number): [number, number] {
  const offset = (((lon - ascDeg) % 360) + 360) % 360;
  const angle = Math.PI - (offset * Math.PI) / 180;
  return [CX + r * Math.cos(angle), CY - r * Math.sin(angle)];
}

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
  return [
    `M${f(x1o)},${f(y1o)}`,
    `A${rOuter},${rOuter},0,${largeArc},0,${f(x2o)},${f(y2o)}`,
    `L${f(x2i)},${f(y2i)}`,
    `A${rInner},${rInner},0,${largeArc},1,${f(x1i)},${f(y1i)}`,
    'Z',
  ].join(' ');
}

function assignRadii(
  planets: WheelPosition[],
  defaultR: number,
  minGapDeg = 12,
  step = 22,
): Map<string, number> {
  const map = new Map(planets.map((p) => [p.bodyKey, defaultR]));
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const diff = Math.abs(planets[i].degreeDecimal - planets[j].degreeDecimal);
        const ang = Math.min(diff, 360 - diff);
        if (ang < minGapDeg) {
          const ki = planets[i].bodyKey;
          const kj = planets[j].bodyKey;
          const ri = map.get(ki) ?? defaultR;
          const rj = map.get(kj) ?? defaultR;
          if (ri === rj) {
            map.set(ki, defaultR + step);
            map.set(kj, defaultR - step);
          } else if (Math.abs(ri - rj) < step * 0.5) {
            map.set(ki, ri + Math.sign(ri - defaultR || 1) * step * 0.5);
          }
        }
      }
    }
  }
  return map;
}

// ─── zodiac sign SVG paths (24×24 coordinate space) ──────────────────────────

function ZodiacSignPaths({ sign, color }: { sign: string; color: string }) {
  const props = {
    stroke: color,
    fill: 'none',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (sign) {
    case 'aries':
      return (
        <>
          <Path d="M12 20V10" {...props} />
          <Path d="M12 10C12 7 9 4 6 5C4 5.5 3 8 4 10C5 12 8 12 8 12" {...props} />
          <Path d="M12 10C12 7 15 4 18 5C20 5.5 21 8 20 10C19 12 16 12 16 12" {...props} />
        </>
      );
    case 'taurus':
      return (
        <>
          <Circle cx="12" cy="14" r="5" {...props} />
          <Path d="M7 9C7 9 8 7 12 7C16 7 17 9 17 9" {...props} />
          <Path d="M5 7C5 7 6 4 12 4C18 4 19 7 19 7" {...props} />
        </>
      );
    case 'gemini':
      return (
        <>
          <Path d="M8 5V19" {...props} />
          <Path d="M16 5V19" {...props} />
          <Path d="M6 8C8 7 10 7 12 7C14 7 16 7 18 8" {...props} />
          <Path d="M6 16C8 17 10 17 12 17C14 17 16 17 18 16" {...props} />
        </>
      );
    case 'cancer':
      return (
        <>
          <Path
            d="M17 8C17 6.5 15.5 5 13 5C10.5 5 9 6.5 9 8C9 9.5 10 11 12 11C14 11 15 12.5 15 14C15 15.5 13.5 17 11 17C8.5 17 7 15.5 7 14"
            {...props}
          />
          <Circle cx="7" cy="8" r="1.5" fill={color} stroke="none" />
          <Circle cx="17" cy="16" r="1.5" fill={color} stroke="none" />
        </>
      );
    case 'leo':
      return (
        <>
          <Path
            d="M6 14C6 11 8 9 10 9C12 9 13 11 13 11C13 11 14 8 17 8C19 8 20 10 19 12C18 14 16 14 15 14"
            {...props}
          />
          <Path d="M15 14C15 16 13.5 18 12 18C10.5 18 9 16.5 9 15" {...props} />
        </>
      );
    case 'virgo':
      return (
        <>
          <Path d="M5 7V15" {...props} />
          <Path d="M5 7C5 7 7 5 9 7V15" {...props} />
          <Path d="M9 7C9 7 11 5 13 7V15" {...props} />
          <Path d="M13 12C13 14 15 16 17 15C19 14 19 12 17 11" {...props} />
          <Path d="M13 15C15 17 16 18 16 18" {...props} />
        </>
      );
    case 'libra':
      return (
        <>
          <Path d="M5 16H19" {...props} />
          <Path d="M5 19H19" {...props} />
          <Path d="M8 16C8 16 7 13 8 11C9.5 8 14.5 8 16 11C17 13 16 16 16 16" {...props} />
        </>
      );
    case 'scorpio':
      return (
        <>
          <Path d="M4 7V15" {...props} />
          <Path d="M4 7C4 7 6 5 8 7V15" {...props} />
          <Path d="M8 7C8 7 10 5 12 7V15" {...props} />
          <Path d="M12 15C12 17 14 19 16 18C18 17 19 15 18 13L20 11" {...props} />
          <Path d="M20 11L18 11" {...props} />
          <Path d="M20 11L20 13" {...props} />
        </>
      );
    case 'sagittarius':
      return (
        <>
          <Path d="M13 5H19V11" {...props} />
          <Path d="M19 5L8 16" {...props} />
          <Path d="M5 12H14" {...props} />
        </>
      );
    case 'capricorn':
      return (
        <>
          <Path d="M5 7V16" {...props} />
          <Path
            d="M5 7C5 5 8 4 10 7V12C10 14 13 16 15 14C17 12 17 10 15 9C13 8 12 10 12 12C12 16 15 18 18 17"
            {...props}
          />
        </>
      );
    case 'aquarius':
      return (
        <>
          <Path d="M4 10C5.5 8 7.5 8 9 10C10.5 12 12.5 12 14 10C15.5 8 17.5 8 19 10" {...props} />
          <Path
            d="M4 15C5.5 13 7.5 13 9 15C10.5 17 12.5 17 14 15C15.5 13 17.5 13 19 15"
            {...props}
          />
        </>
      );
    case 'pisces':
      return (
        <>
          <Path d="M7 5C4 8 4 16 7 19" {...props} />
          <Path d="M17 5C20 8 20 16 17 19" {...props} />
          <Path d="M5 12H19" {...props} />
        </>
      );
    default:
      return <Path d="M12,2 L15,9 L22,9 L16,14 L18,21 L12,17 L6,21 L8,14 L2,9 L9,9 Z" {...props} />;
  }
}

// ─── planet SVG paths (24×24 coordinate space) ───────────────────────────────

function PlanetSvgPaths({ planet, color }: { planet: string; color: string }) {
  const props = {
    stroke: color,
    fill: 'none',
    strokeWidth: '1.8',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (planet) {
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="5" {...props} />
          <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
          <Line x1="12" y1="3" x2="12" y2="5" {...props} />
          <Line x1="12" y1="19" x2="12" y2="21" {...props} />
          <Line x1="3" y1="12" x2="5" y2="12" {...props} />
          <Line x1="19" y1="12" x2="21" y2="12" {...props} />
        </>
      );
    case 'moon':
      return <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...props} />;
    case 'mercury':
      return (
        <>
          <Circle cx="12" cy="12" r="4" {...props} />
          <Path d="M12 16V21" {...props} />
          <Path d="M9 19H15" {...props} />
          <Path d="M9 8C9 8 10 6 12 6C14 6 15 8 15 8" {...props} />
        </>
      );
    case 'venus':
      return (
        <>
          <Circle cx="12" cy="10" r="5" {...props} />
          <Line x1="12" y1="15" x2="12" y2="21" {...props} />
          <Line x1="9" y1="19" x2="15" y2="19" {...props} />
        </>
      );
    case 'mars':
      return (
        <>
          <Circle cx="10" cy="14" r="5" {...props} />
          <Line x1="14" y1="10" x2="20" y2="4" {...props} />
          <Path d="M15 4L20 4 20 9" {...props} />
        </>
      );
    case 'jupiter':
      return (
        <>
          <Path d="M13 4V20" {...props} />
          <Path d="M7 8C7 8 6 14 11 14H18" {...props} />
          <Path d="M10 4C8 4 6 6 7 8" {...props} />
        </>
      );
    case 'saturn':
      return (
        <>
          <Path d="M12 3V14" {...props} />
          <Path d="M9 6H15" {...props} />
          <Path d="M12 14C12 14 9 16 9 18C9 20 11 21 13 20C15 19 16 17 15 15" {...props} />
        </>
      );
    case 'uranus':
      return (
        <>
          <Circle cx="12" cy="16" r="4" {...props} />
          <Line x1="12" y1="12" x2="12" y2="4" {...props} />
          <Line x1="9" y1="4" x2="9" y2="9" {...props} />
          <Line x1="15" y1="4" x2="15" y2="9" {...props} />
          <Line x1="9" y1="7" x2="15" y2="7" {...props} />
          <Circle cx="12" cy="4" r="1.2" fill={color} stroke="none" />
        </>
      );

    case 'neptune':
      return (
        <>
          <Line x1="12" y1="4" x2="12" y2="20" {...props} />
          <Line x1="5" y1="17" x2="19" y2="17" {...props} />
          <Path d="M6 8C6 8 5 12 8 13L12 8L16 13C19 12 18 8 18 8" {...props} />
        </>
      );
    case 'pluto':
      return (
        <>
          <Circle cx="12" cy="7" r="3" {...props} />
          <Path d="M9 13C9 13 8 16 12 16C16 16 15 13 15 13" {...props} />
          <Line x1="12" y1="16" x2="12" y2="21" {...props} />
          <Line x1="9" y1="19" x2="15" y2="19" {...props} />
        </>
      );
    default:
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...props} />
          <Circle cx="12" cy="12" r="3" {...props} />
        </>
      );
  }
}

// ─── main component ───────────────────────────────────────────────────────────

export function ChartWheel({ positions, aspects = [], houseSystem = 'equal' }: ChartWheelProps) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 360); // max 360px, respects screen padding

  const ascPos = positions.find((p) => p.bodyKey === 'ascendant');
  const mcPos = positions.find((p) => p.bodyKey === 'midheaven');
  const asc = ascPos?.degreeDecimal ?? 0;
  const mc = mcPos?.degreeDecimal;

  const planets = positions.filter((p) =>
    Object.prototype.hasOwnProperty.call(PLANET_ABBR, p.bodyKey),
  );

  const radiiMap = assignRadii(planets, R_PLANET);

  // dy compensation for missing dominantBaseline="central" support in react-native-svg
  // Approximates vertical centering: ~35% of font size
  const dy = (fs: number) => fs * 0.35;

  return (
    <Svg viewBox={`0 0 ${SZ} ${SZ}`} width={size} height={size}>
      <Defs />

      {/* Background disk */}
      <Circle cx={CX} cy={CY} r={R_OUTER + 6} fill={C.card} stroke={C.border} strokeWidth="1" />

      {/* Zodiac ring sectors */}
      {SIGNS.map((sign, i) => (
        <Path
          key={i}
          d={sectorPath(i * 30, (i + 1) * 30, asc, R_OUTER, R_ZODIAC)}
          fill={sign.fill}
          stroke={sign.stroke}
          strokeWidth="0.6"
        />
      ))}

      {/* Outer degree tick marks */}
      {Array.from({ length: 72 }, (_, i) => {
        const lon = i * 5;
        const isBoundary = lon % 30 === 0;
        const tickLen = isBoundary ? 9 : 4;
        const [x1, y1] = lonToXY(lon, asc, R_OUTER - 1);
        const [x2, y2] = lonToXY(lon, asc, R_OUTER - 1 - tickLen);
        return (
          <Line
            key={i}
            x1={f(x1)}
            y1={f(y1)}
            x2={f(x2)}
            y2={f(y2)}
            stroke={C.foreground}
            strokeWidth={isBoundary ? 0.8 : 0.4}
            strokeOpacity={isBoundary ? 0.25 : 0.12}
          />
        );
      })}

      {/* Zodiac sign icons */}
      {SIGNS.map((sign, i) => {
        const [x, y] = lonToXY(i * 30 + 15, asc, (R_OUTER + R_ZODIAC) / 2);
        const sz = 19;
        const sc = sz / 24;
        return (
          <G
            key={i}
            transform={`translate(${f(x - sz / 2)},${f(y - sz / 2)}) scale(${sc})`}
            stroke={sign.stroke}
          >
            <ZodiacSignPaths sign={sign.key} color={sign.stroke} />
          </G>
        );
      })}

      {/* Ring borders */}
      <Circle
        cx={CX}
        cy={CY}
        r={R_ZODIAC}
        fill="none"
        stroke={C.foreground}
        strokeWidth="1"
        strokeOpacity="0.15"
      />
      <Circle
        cx={CX}
        cy={CY}
        r={R_INNER}
        fill={`rgba(250,250,250,0.4)`}
        stroke={C.foreground}
        strokeWidth="0.8"
        strokeOpacity="0.12"
      />

      {/* House dividers */}
      {Array.from({ length: 12 }, (_, i) => {
        const baseCusp = houseSystem === 'whole_sign' ? Math.floor(asc / 30) * 30 : asc;
        const cusp = baseCusp + i * 30;
        const [x1, y1] = lonToXY(cusp, asc, R_ZODIAC);
        const [x2, y2] = lonToXY(cusp, asc, R_ASPECT * 0.55);
        const isAngular = i % 3 === 0;
        return (
          <Line
            key={i}
            x1={f(x1)}
            y1={f(y1)}
            x2={f(x2)}
            y2={f(y2)}
            stroke={C.foreground}
            strokeWidth={isAngular ? 1.2 : 0.5}
            strokeOpacity={isAngular ? 0.35 : 0.15}
            strokeDasharray={isAngular ? undefined : '2,5'}
          />
        );
      })}

      {/* House numbers */}
      {Array.from({ length: 12 }, (_, i) => {
        const baseCusp = houseSystem === 'whole_sign' ? Math.floor(asc / 30) * 30 : asc;
        const mid = baseCusp + i * 30 + 15;
        const [x, y] = lonToXY(mid, asc, R_HOUSE);
        const fs = 9.5;
        return (
          <SvgText
            key={i}
            x={f(x)}
            y={f(y + dy(fs))}
            textAnchor="middle"
            fontSize={fs}
            fill={C.mutedFg}
            fillOpacity="0.70"
          >
            {i + 1}
          </SvgText>
        );
      })}

      {/* Aspect web */}
      {aspects
        .filter((a) =>
          ['conjunction', 'trine', 'square', 'opposition', 'sextile'].includes(a.aspectKey),
        )
        .slice(0, 24)
        .map((asp, i) => {
          const pa = planets.find((p) => p.bodyKey === asp.bodyA);
          const pb = planets.find((p) => p.bodyKey === asp.bodyB);
          if (!pa || !pb) return null;
          const [ax, ay] = lonToXY(pa.degreeDecimal, asc, R_ASPECT);
          const [bx, by] = lonToXY(pb.degreeDecimal, asc, R_ASPECT);
          const style = ASPECT_STYLES[asp.aspectKey] ?? { stroke: '#888', opacity: 0.3 };
          return (
            <Line
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

      {/* Planet icons */}
      {planets.map((pos) => {
        const r = radiiMap.get(pos.bodyKey) ?? R_PLANET;
        const [x, y] = lonToXY(pos.degreeDecimal, asc, r);
        const color = PLANET_COLORS[pos.bodyKey] ?? '#888';
        const abbr = PLANET_ABBR[pos.bodyKey] ?? pos.bodyKey;
        const degInSign = Math.floor(pos.degreeDecimal % 30);
        const sz = 16;
        const sc = sz / 24;
        const fs7 = 7;
        const fs8 = 8;

        return (
          <G key={pos.bodyKey}>
            {/* Degree label */}
            <SvgText
              x={f(x)}
              y={f(y - 20 + dy(fs7))}
              textAnchor="middle"
              fontSize={fs7}
              fill={color}
              fillOpacity="0.80"
              fontWeight="600"
            >
              {degInSign}°
            </SvgText>

            {/* Planet background circle */}
            <Circle
              cx={f(x)}
              cy={f(y)}
              r="14"
              fill={C.card}
              stroke={color}
              strokeWidth="1.4"
              strokeOpacity="0.90"
            />

            {/* Planet icon */}
            <G
              transform={`translate(${f(x - sz / 2)},${f(y - sz / 2)}) scale(${sc})`}
              stroke={color}
            >
              <PlanetSvgPaths planet={pos.bodyKey} color={color} />
            </G>

            {/* Planet abbreviation */}
            <SvgText
              x={f(x)}
              y={f(y + 23 + dy(fs8))}
              textAnchor="middle"
              fontSize={fs8}
              fill={color}
              fillOpacity="0.80"
              fontWeight="600"
            >
              {abbr}
            </SvgText>

            {/* Retrograde marker */}
            {pos.retrograde && (
              <SvgText
                x={f(x + 11)}
                y={f(y - 11 + dy(7.5))}
                fontSize="7.5"
                fill="#FB923C"
                fontWeight="bold"
              >
                Rx
              </SvgText>
            )}
          </G>
        );
      })}

      {/* ASC marker (violet) */}
      {ascPos &&
        (() => {
          const [x1, y1] = lonToXY(asc, asc, R_OUTER);
          const [x2, y2] = lonToXY(asc, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(asc - 14, asc, R_ZODIAC - 13);
          const fs8 = 8;
          return (
            <>
              <Line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#A78BFA"
                strokeWidth="2.5"
              />
              <SvgText
                x={f(lx)}
                y={f(ly + dy(fs8))}
                textAnchor="middle"
                fontSize={fs8}
                fill="#A78BFA"
                fontWeight="bold"
              >
                ASC
              </SvgText>
            </>
          );
        })()}

      {/* DSC marker (violet) */}
      {ascPos &&
        (() => {
          const dsc = asc + 180;
          const [x1, y1] = lonToXY(dsc, asc, R_OUTER);
          const [x2, y2] = lonToXY(dsc, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(dsc + 14, asc, R_ZODIAC - 13);
          const fs8 = 8;
          return (
            <>
              <Line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#A78BFA"
                strokeWidth="1.5"
                strokeOpacity="0.65"
              />
              <SvgText
                x={f(lx)}
                y={f(ly + dy(fs8))}
                textAnchor="middle"
                fontSize={fs8}
                fill="#A78BFA"
                fontWeight="bold"
                fillOpacity="0.75"
              >
                DSC
              </SvgText>
            </>
          );
        })()}

      {/* MC marker (emerald) */}
      {mcPos &&
        mc !== undefined &&
        (() => {
          const [x1, y1] = lonToXY(mc, asc, R_OUTER);
          const [x2, y2] = lonToXY(mc, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(mc - 14, asc, R_ZODIAC - 13);
          const fs8 = 8;
          return (
            <>
              <Line x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="#34D399" strokeWidth="2" />
              <SvgText
                x={f(lx)}
                y={f(ly + dy(fs8))}
                textAnchor="middle"
                fontSize={fs8}
                fill="#34D399"
                fontWeight="bold"
              >
                MC
              </SvgText>
            </>
          );
        })()}

      {/* IC marker (emerald) */}
      {mcPos &&
        mc !== undefined &&
        (() => {
          const ic = mc + 180;
          const [x1, y1] = lonToXY(ic, asc, R_OUTER);
          const [x2, y2] = lonToXY(ic, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(ic + 14, asc, R_ZODIAC - 13);
          const fs8 = 8;
          return (
            <>
              <Line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#34D399"
                strokeWidth="1.5"
                strokeOpacity="0.55"
              />
              <SvgText
                x={f(lx)}
                y={f(ly + dy(fs8))}
                textAnchor="middle"
                fontSize={fs8}
                fill="#34D399"
                fontWeight="bold"
                fillOpacity="0.70"
              >
                IC
              </SvgText>
            </>
          );
        })()}

      {/* Center ornament */}
      <Circle
        cx={CX}
        cy={CY}
        r={R_CENTER}
        fill={C.card}
        stroke="rgba(167,139,250,0.25)"
        strokeWidth="1"
      />
      <SvgText
        x={CX}
        y={f(CY + dy(11))}
        textAnchor="middle"
        fontSize="11"
        fill={C.primary}
        fillOpacity="0.40"
      >
        ✦
      </SvgText>
    </Svg>
  );
}
