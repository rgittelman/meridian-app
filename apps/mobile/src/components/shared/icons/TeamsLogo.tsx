/**
 * Microsoft Teams logo — official SVG geometry via react-native-svg.
 *
 * Paths taken directly from microsoft-teams-svgrepo-com.svg (viewBox "0 0 16 16").
 * Shadow overlay paths (black, opacity 0.1–0.2) are omitted — imperceptible
 * at 12–24px and add unnecessary complexity.
 *
 * Elements (back to front):
 *   #5059C9  small person head (circle path, top-right)
 *   #5059C9  small person body (rounded rect path)
 *   #7B83EB  large person head (circle path)
 *   #7B83EB  large person body (rounded rect path)
 *   gradient T-tile (LinearGradient #5A62C3 → #4D55BD → #3940AB)
 *   #ffffff  T letterform
 */
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type TeamsLogoProps = {
  size?: number;
};

export function TeamsLogo({ size = 24 }: TeamsLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Defs>
        <LinearGradient
          id="teams-tile-grad"
          x1="2.244"
          x2="6.906"
          y1="4.46"
          y2="12.548"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#5A62C3" />
          <Stop offset=".5" stopColor="#4D55BD" />
          <Stop offset="1" stopColor="#3940AB" />
        </LinearGradient>
      </Defs>

      {/* Small person — head */}
      <Path
        fill="#5059C9"
        d="M13.21 6.225c.808 0 1.464-.655 1.464-1.462 0-.808-.656-1.463-1.465-1.463s-1.465.655-1.465 1.463c0 .807.656 1.462 1.465 1.462z"
      />
      {/* Small person — body */}
      <Path
        fill="#5059C9"
        d="M10.765 6.875h3.616c.342 0 .619.276.619.617v3.288a2.272 2.272 0 01-2.274 2.27h-.01a2.272 2.272 0 01-2.274-2.27V7.199c0-.179.145-.323.323-.323z"
      />
      {/* Large person — head */}
      <Path
        fill="#7B83EB"
        d="M8.651 6.225a2.114 2.114 0 002.117-2.112A2.114 2.114 0 008.65 2a2.114 2.114 0 00-2.116 2.112c0 1.167.947 2.113 2.116 2.113z"
      />
      {/* Large person — body */}
      <Path
        fill="#7B83EB"
        d="M11.473 6.875h-5.97a.611.611 0 00-.596.625v3.75A3.669 3.669 0 008.488 15a3.669 3.669 0 003.582-3.75V7.5a.611.611 0 00-.597-.625z"
      />
      {/* T-tile — gradient fill */}
      <Path
        fill="url(#teams-tile-grad)"
        d="M1.597 4.925h5.969c.33 0 .597.267.597.596v5.958a.596.596 0 01-.597.596h-5.97A.596.596 0 011 11.479V5.521c0-.33.267-.596.597-.596z"
      />
      {/* T letterform — white */}
      <Path
        fill="#ffffff"
        d="M6.152 7.193H4.959v3.243h-.76V7.193H3.01v-.63h3.141v.63z"
      />
    </Svg>
  );
}
