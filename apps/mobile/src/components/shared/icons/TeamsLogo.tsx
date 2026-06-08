/**
 * Microsoft Teams logo — inline SVG component.
 * Reproduced from the official Teams brand mark (purple/indigo palette).
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type TeamsLogoProps = {
  size?: number;
};

export function TeamsLogo({ size = 24 }: TeamsLogoProps) {
  // Viewbox 100×100 for easy coordinate math
  const vb = 100;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}>
      {/* Large person (left) — light purple body */}
      <Circle cx={44} cy={22} r={13} fill="#7B83EB" />
      {/* Large person body / robe shape */}
      <Path
        d="M20 88 C20 65 28 54 44 54 C60 54 68 65 68 88 Z"
        fill="#7B83EB"
      />

      {/* Small person (right) — deeper blue */}
      <Circle cx={72} cy={19} r={10} fill="#5059C9" />
      {/* Small person body */}
      <Path
        d="M55 88 C55 68 62 58 72 58 C82 58 89 68 89 88 Z"
        fill="#5059C9"
      />

      {/* T tile — rounded rectangle with white T */}
      <Rect x={8} y={30} width={46} height={46} rx={9} ry={9} fill="#4B53BC" />
      {/* White T — horizontal bar */}
      <Rect x={17} y={43} width={28} height={6} rx={3} ry={3} fill="#fff" />
      {/* White T — vertical stem */}
      <Rect x={27} y={43} width={8} height={22} rx={3} ry={3} fill="#fff" />
    </Svg>
  );
}
