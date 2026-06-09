/**
 * Google Meet logo — inline SVG component.
 *
 * Shape: video camera body (rounded rect) + V-fin (right-pointing triangle).
 * This mirrors the actual Meet icon silhouette: a camera body with the
 * distinctive angular fin that identifies the product at a glance.
 *
 * Two-tier rendering based on size:
 *   ≤ 16px  →  Camera body + fin only (maximum legibility at small scale)
 *   > 16px  →  Body + fin + subtle lens circle (adds depth at card/CTA sizes)
 *
 * onBackground prop: renders fills in white/semi-white for use inside
 * a colored button (e.g. the Join Google Meet CTA).
 *
 * Primary brand color: #1A73E8 — Google's Meet blue, already used as
 * MEET_COLOR in EventDetailSheet for the CTA button background.
 */
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

const MEET_BLUE = '#1A73E8';

type GoogleMeetLogoProps = {
  size?: number;
  /** Set true when rendering on a filled colored background — uses white fills. */
  onBackground?: boolean;
};

export function GoogleMeetLogo({ size = 24, onBackground = false }: GoogleMeetLogoProps) {
  const simplified = size <= 16;
  return simplified ? (
    <GoogleMeetLogoSmall size={size} onBackground={onBackground} />
  ) : (
    <GoogleMeetLogoFull size={size} onBackground={onBackground} />
  );
}

/**
 * Small tier (≤ 16px): camera body + V-fin.
 * Viewbox 40×40 — matches TeamsLogoSmall convention.
 *
 * Layout:
 *   Camera body: rounded rect, left ~60% of width
 *   V-fin:       right-pointing triangle, attached at right edge of body
 */
function GoogleMeetLogoSmall({ size, onBackground }: { size: number; onBackground: boolean }) {
  const bodyColor = onBackground ? 'rgba(255,255,255,0.90)' : MEET_BLUE;
  const finColor  = onBackground ? 'rgba(255,255,255,0.70)' : MEET_BLUE;

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Camera body */}
      <Rect x={1} y={9} width={24} height={22} rx={5} ry={5} fill={bodyColor} />
      {/* V-fin — right-pointing triangle */}
      <Polygon points="26,12 38,20 26,28" fill={finColor} />
    </Svg>
  );
}

/**
 * Large tier (> 16px): body + fin + lens circle for depth.
 * Same 40×40 viewbox — the lens adds recognisability at 18–22px.
 */
function GoogleMeetLogoFull({ size, onBackground }: { size: number; onBackground: boolean }) {
  const bodyColor = onBackground ? 'rgba(255,255,255,0.90)' : MEET_BLUE;
  const finColor  = onBackground ? 'rgba(255,255,255,0.70)' : MEET_BLUE;
  const lensColor = onBackground ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.28)';

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Camera body */}
      <Rect x={1} y={9} width={24} height={22} rx={5} ry={5} fill={bodyColor} />
      {/* Lens circle — subtle depth cue, sits inside body */}
      <Circle cx={12} cy={20} r={7} fill={lensColor} />
      {/* V-fin — right-pointing triangle */}
      <Polygon points="26,12 38,20 26,28" fill={finColor} />
    </Svg>
  );
}
