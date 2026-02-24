export default function MultiAssetVisual() {
  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-20">
      {/* Labels */}
      <text x="20" y="16" fontSize="7" fill="hsl(var(--muted-foreground))" opacity="0.5" fontFamily="monospace">FX</text>
      <text x="20" y="40" fontSize="7" fill="hsl(var(--muted-foreground))" opacity="0.5" fontFamily="monospace">CRYPTO</text>
      <text x="20" y="64" fontSize="7" fill="hsl(var(--muted-foreground))" opacity="0.5" fontFamily="monospace">INDEX</text>

      {/* FX sparkline */}
      <polyline
        points="55,18 80,12 105,15 130,10 155,13 180,8 205,11 230,6 255,9"
        stroke="hsl(var(--muted-foreground) / 0.3)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="255" cy="9" r="2" fill="hsl(var(--accent))" />

      {/* Crypto sparkline */}
      <polyline
        points="55,42 80,36 105,44 130,32 155,38 180,30 205,35 230,28 255,33"
        stroke="hsl(var(--muted-foreground) / 0.3)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="255" cy="33" r="2" fill="hsl(var(--accent))" />

      {/* Index sparkline */}
      <polyline
        points="55,66 80,62 105,68 130,58 155,64 180,56 205,60 230,54 255,57"
        stroke="hsl(var(--muted-foreground) / 0.3)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="255" cy="57" r="2" fill="hsl(var(--accent))" />

      {/* Vertical separator */}
      <line x1="48" y1="4" x2="48" y2="76" stroke="hsl(var(--border))" strokeWidth="0.5" />
    </svg>
  );
}
