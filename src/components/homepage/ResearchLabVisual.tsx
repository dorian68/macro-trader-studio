export default function ResearchLabVisual() {
  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-20">
      {/* Header row */}
      <rect x="20" y="8" width="120" height="4" rx="1" fill="hsl(var(--muted-foreground) / 0.25)" />
      <rect x="200" y="8" width="60" height="4" rx="1" fill="hsl(var(--accent) / 0.4)" />

      {/* Separator */}
      <line x1="20" y1="18" x2="260" y2="18" stroke="hsl(var(--border))" strokeWidth="0.5" />

      {/* Text rows */}
      {[24, 32, 40].map((y, i) => (
        <g key={i}>
          <rect x="20" y={y} width={180 - i * 20} height="3" rx="1" fill="hsl(var(--muted-foreground) / 0.12)" />
          <rect x={220 - i * 10} y={y} width={40 + i * 10} height="3" rx="1" fill="hsl(var(--muted-foreground) / 0.08)" />
        </g>
      ))}

      {/* Separator */}
      <line x1="20" y1="50" x2="260" y2="50" stroke="hsl(var(--border))" strokeWidth="0.5" />

      {/* Mini bar chart */}
      {[
        { x: 30, h: 14 },
        { x: 55, h: 22 },
        { x: 80, h: 18 },
        { x: 105, h: 26, accent: true },
        { x: 130, h: 16 },
        { x: 155, h: 20 },
      ].map((bar, i) => (
        <rect
          key={i}
          x={bar.x - 6}
          y={74 - bar.h}
          width="12"
          height={bar.h}
          rx="1"
          fill={bar.accent ? "hsl(var(--accent) / 0.6)" : "hsl(var(--muted-foreground) / 0.15)"}
        />
      ))}

      {/* Baseline for chart */}
      <line x1="20" y1="74" x2="170" y2="74" stroke="hsl(var(--muted-foreground) / 0.1)" strokeWidth="0.5" />
    </svg>
  );
}
