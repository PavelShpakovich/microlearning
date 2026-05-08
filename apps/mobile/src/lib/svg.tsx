import type { ComponentType, PropsWithChildren } from 'react';
import BaseSvg, {
  Circle as BaseCircle,
  Defs as BaseDefs,
  G as BaseG,
  Line as BaseLine,
  LinearGradient as BaseLinearGradient,
  Path as BasePath,
  RadialGradient as BaseRadialGradient,
  Rect as BaseRect,
  Stop as BaseStop,
  Text as BaseText,
  type CircleProps,
  type GProps,
  type LineProps,
  type LinearGradientProps,
  type PathProps,
  type RadialGradientProps,
  type RectProps,
  type StopProps,
  type SvgProps,
  type TextProps,
} from 'react-native-svg';

type SvgComponent<Props> = ComponentType<Props>;

const Svg = BaseSvg as unknown as SvgComponent<SvgProps>;
const Circle = BaseCircle as unknown as SvgComponent<CircleProps>;
const Defs = BaseDefs as unknown as SvgComponent<PropsWithChildren>;
const G = BaseG as unknown as SvgComponent<GProps>;
const Line = BaseLine as unknown as SvgComponent<LineProps>;
const LinearGradient = BaseLinearGradient as unknown as SvgComponent<LinearGradientProps>;
const Path = BasePath as unknown as SvgComponent<PathProps>;
const RadialGradient = BaseRadialGradient as unknown as SvgComponent<RadialGradientProps>;
const Rect = BaseRect as unknown as SvgComponent<RectProps>;
const Stop = BaseStop as unknown as SvgComponent<StopProps>;
const SvgText = BaseText as unknown as SvgComponent<TextProps>;

export default Svg;
export {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  SvgText as Text,
};

export type {
  CircleProps,
  GProps,
  LineProps,
  LinearGradientProps,
  PathProps,
  RadialGradientProps,
  RectProps,
  StopProps,
  SvgProps,
  TextProps,
};
