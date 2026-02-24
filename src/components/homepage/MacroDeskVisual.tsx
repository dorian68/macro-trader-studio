export default function MacroDeskVisual() {
  const bars = [
    { x: 50, h: 18 },
    { x: 90, h: 32 },
    { x: 130, h: 24 },
    { x: 170, h: 44, accent: true },
    { x: 210, h: 28 },
  ];

  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-20">
      {/* Baseline */}
      <line x1="30" y1="68" x2="250" y2="68" stroke="hsl(var(--border))" strokeWidth="0.5" />

      {/* Impact bars */}
      {bars.map((bar, i) => (
        <g key={i}>
          <rect
            x={bar.x - 8}
            y={68 - bar.h}
            width="16"
            height={bar.h}
            rx="1.5"
            fill={bar.accent ? "hsl(var(--accent))" : "hsl(var(--muted-foreground) / 0.2)"}
          />
          {/* Dot marker on baseline */}
          <circle cx={bar.x} cy="72" r="1.5" fill={bar.accent ? "hsl(var(--accent))" : "hsl(var(--muted-foreground) / 0.3)"} />
        </g>
      ))}

      {/* Timeline ticks */}
      {[50, 90, 130, 170, 210].map((x, i) => (
        <line key={i} x1={x} y1="68" x2={x} y2="70" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="0.5" />
      ))}
    </svg>
  );
}
