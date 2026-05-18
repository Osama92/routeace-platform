import logo from "@/assets/routeace-logo.png";

/**
 * Animated brand mark - RouteAce hexagon logo with vehicles
 * (truck, bike, van) tracing curved delivery routes across it.
 * Uses SVG SMIL <animate> on textPath startOffset for smooth path following.
 */
const RouteAceLogoMotion = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`routeace-logo-motion relative inline-block ${className}`}>
      <img
        src={logo}
        alt="RouteAce - distribution intelligence infrastructure"
        className="logo-bg w-full h-auto block select-none"
        draggable={false}
      />
      <svg
        className="motion-layer absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1024 1024"
        aria-hidden="true"
      >
        <defs>
          <path id="ra-route1" d="M290 420 C420 300, 610 310, 740 430" />
          <path id="ra-route2" d="M250 520 C430 620, 620 600, 790 500" />
          <path id="ra-route3" d="M350 360 C500 470, 610 520, 710 640" />
        </defs>

        <use href="#ra-route1" stroke="hsl(var(--primary) / 0.35)" strokeWidth="2" fill="none" strokeDasharray="4 6" />
        <use href="#ra-route2" stroke="hsl(var(--infra-orange) / 0.4)" strokeWidth="2" fill="none" strokeDasharray="4 6" />
        <use href="#ra-route3" stroke="hsl(var(--primary) / 0.3)" strokeWidth="2" fill="none" strokeDasharray="4 6" />

        <text fontSize="38" dominantBaseline="middle">
          <textPath href="#ra-route1" startOffset="0%">
            🚚
            <animate attributeName="startOffset" from="0%" to="100%" dur="6s" repeatCount="indefinite" />
          </textPath>
        </text>
        <text fontSize="34" dominantBaseline="middle">
          <textPath href="#ra-route2" startOffset="0%">
            🏍️
            <animate attributeName="startOffset" from="0%" to="100%" dur="5s" repeatCount="indefinite" />
          </textPath>
        </text>
        <text fontSize="36" dominantBaseline="middle">
          <textPath href="#ra-route3" startOffset="0%">
            🚐
            <animate attributeName="startOffset" from="0%" to="100%" dur="7s" repeatCount="indefinite" />
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default RouteAceLogoMotion;
