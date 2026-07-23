export default function TeamPulseLogo({
  variant = "dark",
  showWordmark = true,
  size = 40,
  className = "",
  title = "TeamPulse",
}) {
  const isLight = variant === "light";
  const teamColor = isLight ? "#FFFFFF" : "#0B1220";
  const pulseColor = isLight ? "#21D4FD" : "#4F7CFF";

  return (
    <svg
      className={className}
      width={showWordmark ? size * 4.22 : size}
      height={size}
      viewBox={showWordmark ? "0 0 270 64" : "0 0 64 64"}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="tp-logo-gradient" x1="8" y1="8" x2="56" y2="56">
          <stop stopColor="#4F7CFF" />
          <stop offset="1" stopColor="#21D4FD" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="56" height="56" rx="17" fill="url(#tp-logo-gradient)" />
      <path
        d="M15 35h8l4-10 7 20 5-13 3 3h7"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="20" r="3.4" fill="#fff" />
      <circle cx="46" cy="20" r="3.4" fill="#fff" />
      <path
        d="M21 21.5 27 25M43 21.5 38 25"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".72"
      />

      {showWordmark && (
        <text
          x="78"
          y="42"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="30"
          fontWeight="750"
          letterSpacing="-1.2"
        >
          <tspan fill={teamColor}>Team</tspan>
          <tspan fill={pulseColor}>Pulse</tspan>
        </text>
      )}
    </svg>
  );
}
