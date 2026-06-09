/**
 * Google Meet logo — inline SVG component.
 *
 * Replicates the current Google Meet brand icon using only Rect, Circle, and
 * Polygon primitives (no Path, no bezier curves, no fonts, no images).
 *
 * Full-color layout (onBackground=false):
 *   Camera body (left ~62% of icon) split into two Google colors:
 *     Blue   (#4285F4) — upper body
 *     Green  (#34A853) — lower body strip
 *   V-fin (right ~38%, two triangles meeting at vertical center):
 *     Red    (#EA4335) — upper fin triangle
 *     Yellow (#FBBC04) — lower fin triangle
 *
 * On-background layout (onBackground=true):
 *   Blue rounded-square tile with a white camera body + white fin.
 *   Matches Teams logo treatment on the Join CTA button.
 *
 * Two-tier rendering:
 *   ≤ 16px  →  body + fin, no lens (max legibility at tag-row scale)
 *   > 16px  →  body + fin + white lens circle (depth cue at card/CTA scale)
 *
 * Viewbox 40×40 — consistent with TeamsLogoSmall.
 */
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

// Google brand palette
const BLUE   = '#4285F4';
const RED    = '#EA4335';
const YELLOW = '#FBBC04';
const GREEN  = '#34A853';

// Meet CTA button color — matches MEET_COLOR in EventDetailSheet
const TILE_BLUE = '#1A73E8';

type GoogleMeetLogoProps = {
  size?: number;
  /** Set true when rendering on a filled colored background — uses a white icon on a blue tile. */
  onBackground?: boolean;
};

export function GoogleMeetLogo({ size = 24, onBackground = false }: GoogleMeetLogoProps) {
  if (onBackground) {
    return <GoogleMeetOnBackground size={size} />;
  }
  return size <= 16 ? (
    <GoogleMeetLogoSmall size={size} />
  ) : (
    <GoogleMeetLogoFull size={size} />
  );
}

// ─── Full-color small tier (≤ 16px) ──────────────────────────────────────────
// Body + fin only, no lens.
// Camera body: x=1..25, y=3..37  — chamfered corners on the left edge (≈3px bevel)
// Red fin:   triangle upper-right, points meeting at (25, 20)
// Yellow fin: triangle lower-right, points meeting at (25, 20)
// Green strip: bottom ~30% of body
function GoogleMeetLogoSmall({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Blue — upper camera body (chamfered top-left + bottom-left corners) */}
      <Polygon
        points="5,3 24,3 24,20 1,20 1,7"
        fill={BLUE}
      />
      {/* Green — lower camera body */}
      <Polygon
        points="1,20 24,20 24,37 5,37 1,33"
        fill={GREEN}
      />
      {/* Red — upper fin */}
      <Polygon points="25,7 37,16 25,20" fill={RED} />
      {/* Yellow — lower fin */}
      <Polygon points="25,20 37,26 25,33" fill={YELLOW} />
    </Svg>
  );
}

// ─── Full-color large tier (> 16px) ──────────────────────────────────────────
// Same geometry + white lens circle for depth at 18–24px.
function GoogleMeetLogoFull({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Blue — upper camera body */}
      <Polygon
        points="5,3 24,3 24,20 1,20 1,7"
        fill={BLUE}
      />
      {/* Green — lower camera body */}
      <Polygon
        points="1,20 24,20 24,37 5,37 1,33"
        fill={GREEN}
      />
      {/* Red — upper fin */}
      <Polygon points="25,7 37,16 25,20" fill={RED} />
      {/* Yellow — lower fin */}
      <Polygon points="25,20 37,26 25,33" fill={YELLOW} />
      {/* Lens circle — white, subtle, sits centred in the body */}
      <Circle cx={12} cy={20} r={7} fill="rgba(255,255,255,0.22)" />
    </Svg>
  );
}

// ─── On-background (white camera on blue tile) ────────────────────────────────
// Used inside the Join Google Meet CTA button.
// Tile: TILE_BLUE rounded square.
// Icon: white camera body (chamfered polygon) + white fin triangle.
// All sizes use the same geometry — the tile background makes it always legible.
function GoogleMeetOnBackground({ size }: { size: number }) {
  const body  = 'rgba(255,255,255,0.92)';
  const fin   = 'rgba(255,255,255,0.75)';

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Blue tile */}
      <Rect x={0} y={0} width={40} height={40} rx={8} ry={8} fill={TILE_BLUE} />
      {/* White camera body */}
      <Polygon
        points="5,10 24,10 24,30 5,30 1,26 1,14"
        fill={body}
      />
      {/* White fin */}
      <Polygon points="25,13 36,20 25,27" fill={fin} />
    </Svg>
  );
}
