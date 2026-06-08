/**
 * Microsoft Teams logo — inline SVG component.
 *
 * Two-tier rendering based on size:
 *   ≤ 16px  →  T-tile only (the most legible element at small scale)
 *   > 16px  →  Full mark: T-tile + two simplified person shapes (primitives only,
 *              no bezier curves, which collapse below ~24px)
 *
 * onBackground prop: renders fills in white/semi-white for use inside
 * a colored button (e.g. the Join Teams CTA).
 */
import Svg, { Circle, Rect } from 'react-native-svg';

type TeamsLogoProps = {
  size?: number;
  /** Set true when rendering on a filled colored background — uses white fills. */
  onBackground?: boolean;
};

export function TeamsLogo({ size = 24, onBackground = false }: TeamsLogoProps) {
  const simplified = size <= 16;

  return simplified ? (
    <TeamsLogoSmall size={size} onBackground={onBackground} />
  ) : (
    <TeamsLogoFull size={size} onBackground={onBackground} />
  );
}

/**
 * Small tier (≤ 16px): T-tile only.
 * Viewbox 40×40 so the T letterform has maximum pixel coverage at 12–16px.
 */
function TeamsLogoSmall({ size, onBackground }: { size: number; onBackground: boolean }) {
  const tileColor = onBackground ? 'rgba(255,255,255,0.90)' : '#4B53BC';
  const tColor = onBackground ? '#4B53BC' : '#ffffff';

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Rounded square tile */}
      <Rect x={2} y={2} width={36} height={36} rx={7} ry={7} fill={tileColor} />
      {/* T — horizontal bar */}
      <Rect x={9} y={13} width={22} height={5} rx={2} ry={2} fill={tColor} />
      {/* T — vertical stem */}
      <Rect x={17} y={13} width={6} height={15} rx={2} ry={2} fill={tColor} />
    </Svg>
  );
}

/**
 * Full tier (> 16px): T-tile + two person silhouettes.
 * All shapes are Circle + Rect primitives — no Path/bezier curves.
 * Viewbox 56×56.
 *
 * Layout (left→right):
 *   [T tile 28×28 at top-left]
 *   [large person: head circle at (35,11) r=8, body rounded-rect below]
 *   [small person (right, behind): head circle at (47,9) r=6, body rounded-rect]
 */
function TeamsLogoFull({ size, onBackground }: { size: number; onBackground: boolean }) {
  const tileColor = onBackground ? 'rgba(255,255,255,0.95)' : '#4B53BC';
  const tColor    = onBackground ? '#4B53BC'                : '#ffffff';
  const largePerson = onBackground ? 'rgba(255,255,255,0.75)' : '#7B83EB';
  const smallPerson = onBackground ? 'rgba(255,255,255,0.55)' : '#5059C9';

  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      {/* Small person (right, partially behind large) — drawn first so large occludes */}
      <Circle cx={46} cy={11} r={7}  fill={smallPerson} />
      <Rect   x={38} y={21} width={14} height={16} rx={7} ry={7} fill={smallPerson} />

      {/* Large person */}
      <Circle cx={35} cy={12} r={9}  fill={largePerson} />
      <Rect   x={24} y={24} width={22} height={18} rx={11} ry={11} fill={largePerson} />

      {/* T tile — on top of everything */}
      <Rect x={2} y={16} width={28} height={28} rx={6} ry={6} fill={tileColor} />
      {/* T — horizontal bar */}
      <Rect x={7} y={24} width={18} height={4} rx={2} ry={2} fill={tColor} />
      {/* T — vertical stem */}
      <Rect x={13} y={24} width={6} height={14} rx={2} ry={2} fill={tColor} />
    </Svg>
  );
}
