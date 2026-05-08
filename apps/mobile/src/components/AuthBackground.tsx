import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from '@/lib/svg';

/**
 * Full-screen radial gradient matching the web auth-shell:
 *   radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.22 0.06 268 / 50%) 0%, transparent 70%)
 *
 * oklch(0.22 0.06 268) ≈ rgb(15, 30, 122) — dark cosmic navy
 */
export function AuthBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <RadialGradient
          id="cosmicGlow"
          cx={width * 0.5}
          cy={0}
          rx={width * 0.7}
          ry={height * 0.5}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#0F1E7A" stopOpacity="0.5" />
          <Stop offset="0.7" stopColor="#0F1E7A" stopOpacity="0" />
          <Stop offset="1" stopColor="#0F1E7A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#cosmicGlow)" />
    </Svg>
  );
}
