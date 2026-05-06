import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useColors } from '@/lib/colors';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

interface SkeletonControlProps {
  height?: number;
  borderRadius?: number;
  lineWidth?: number | `${number}%`;
  style?: ViewStyle;
}

export function Skeleton({ width, height = 16, borderRadius = 6, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ backgroundColor: colors.skeleton, width, height, borderRadius, opacity }, style]}
    />
  );
}

export function SkeletonInput({
  height = 40,
  borderRadius = 8,
  lineWidth = '58%',
  style,
}: SkeletonControlProps) {
  const colors = useColors();

  return (
    <View
      style={[
        {
          height,
          borderRadius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: 12,
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Skeleton width={lineWidth} height={14} borderRadius={6} />
    </View>
  );
}

export function SkeletonSelect({
  height = 40,
  borderRadius = 8,
  lineWidth = '54%',
  style,
}: SkeletonControlProps) {
  const colors = useColors();

  return (
    <View
      style={[
        {
          height,
          borderRadius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      <Skeleton width={lineWidth} height={14} borderRadius={6} />
      <Skeleton width={12} height={12} borderRadius={6} />
    </View>
  );
}

/** A row of skeleton blocks, useful for text lines */
export function SkeletonRow({
  widths,
  height = 12,
  gap = 8,
}: {
  widths: (number | `${number}%`)[];
  height?: number;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {widths.map((w, i) => (
        <Skeleton key={i} width={w} height={height} />
      ))}
    </View>
  );
}
