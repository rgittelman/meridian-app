import type { LucideProps } from 'lucide-react-native';
import { Defs, LinearGradient, Mask, Rect, Stop, Svg } from 'react-native-svg';

type GradientIconProps = {
  Icon: React.ComponentType<LucideProps>;
  size?: number;
  gradient: readonly [string, string];
  strokeWidth?: number;
};

/**
 * Renders any Lucide icon with a two-stop linear gradient fill/stroke.
 *
 * Technique: render the icon in white inside an SVG Mask, then overlay a
 * gradient Rect clipped to the mask shape. No expo-linear-gradient needed.
 */
export function GradientIcon({
  Icon,
  size = 24,
  gradient,
  strokeWidth = 1.75,
}: GradientIconProps) {
  const maskId = `grad-mask-${gradient[0].replace(/[^a-z0-9]/gi, '')}`;
  const gradId = `grad-fill-${gradient[0].replace(/[^a-z0-9]/gi, '')}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={gradient[0]} stopOpacity="1" />
          <Stop offset="100%" stopColor={gradient[1]} stopOpacity="1" />
        </LinearGradient>
        <Mask id={maskId}>
          <Icon size={size} color="white" strokeWidth={strokeWidth} />
        </Mask>
      </Defs>
      <Rect
        x="0"
        y="0"
        width={size}
        height={size}
        fill={`url(#${gradId})`}
        mask={`url(#${maskId})`}
      />
    </Svg>
  );
}
