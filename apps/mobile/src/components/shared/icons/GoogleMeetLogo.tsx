/**
 * Google Meet logo — official SVG geometry via react-native-svg.
 *
 * Paths and polygons are taken directly from the official Google Meet SVG
 * (google-meet-svgrepo-com.svg, viewBox "0 -22.5 256 256").
 *
 * Seven shapes, six Google brand colors:
 *   #00832D  green  — upper fin
 *   #0066DA  blue   — bottom-left corner
 *   #E94235  red    — top-left corner
 *   #2684FC  blue   — left column body
 *   #00AC47  green  — right fin + bottom area
 *   #FFBA00  yellow — top area
 */
import Svg, { Path, Polygon } from 'react-native-svg';

type GoogleMeetLogoProps = {
  size?: number;
};

export function GoogleMeetLogo({ size = 24 }: GoogleMeetLogoProps) {
  return <GoogleMeetFullColor size={size} />;
}

// ─── Full-color logo ──────────────────────────────────────────────────────────
// Official geometry, viewBox "0 -22.5 256 256".
function GoogleMeetFullColor({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 -22.5 256 256">
      {/* Upper fin — dark green */}
      <Polygon
        fill="#00832D"
        points="144.822496,105.321856 169.778926,133.848796 203.341343,155.294133 209.178931,105.50196 203.341343,56.8331137 169.136495,75.6715889"
      />
      {/* Bottom-left corner — blue */}
      <Path
        fill="#0066DA"
        d="M0.000557021739,150.659712 L0.000557021739,193.089915 C0.000557021739,202.77838 7.86384724,210.643527 17.5541688,210.643527 L59.9843714,210.643527 L68.7704609,178.585069 L59.9843714,150.659712 L30.8744153,141.873623 L0.000557021739,150.659712 Z"
      />
      {/* Top-left corner — red */}
      <Polygon
        fill="#E94235"
        points="59.9838143,0 0,59.9838143 30.875715,68.7494798 59.9838143,59.9838143 68.6102243,32.4390893"
      />
      {/* Left column body — blue */}
      <Polygon
        fill="#2684FC"
        points="0.000557021739,150.679394 59.9843714,150.679394 59.9843714,59.9832573 0.000557021739,59.9832573"
      />
      {/* Right fin — green */}
      <Path
        fill="#00AC47"
        d="M241.658683,25.3977775 L203.341157,56.8342278 L203.341157,155.29339 L241.818362,186.852385 C247.577967,191.364261 256.003849,187.251584 256.003849,179.930462 L256.003849,32.1785888 C256.003849,24.7757699 247.377439,20.6835169 241.658683,25.3977775"
      />
      {/* Bottom area — green */}
      <Path
        fill="#00AC47"
        d="M144.822496,105.321856 L144.822496,150.659712 L59.9843714,150.659712 L59.9843714,210.643527 L185.787731,210.643527 C195.478053,210.643527 203.341343,202.77838 203.341343,193.089915 L203.341343,155.294133 L144.822496,105.321856 Z"
      />
      {/* Top area — yellow */}
      <Path
        fill="#FFBA00"
        d="M185.787731,0 L59.9843714,0 L59.9843714,59.9838143 L144.822496,59.9838143 L144.822496,105.32167 L203.341343,56.832928 L203.341343,17.5536117 C203.341343,7.86329022 195.478053,0 185.787731,0"
      />
    </Svg>
  );
}

