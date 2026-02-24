export default function SignalsEngineVisual() {
  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-20">
      {/* Risk/reward band zone */}
      <rect x="20" y="22" width="240" height="36" rx="2" fill="hsl(var(--muted-foreground) / 0.04)" />
      <line x1="20" y1="40" x2="260" y2="40" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 3" />

      {/* Candlestick-like bars */}
      {[
        { x: 40, o: 48, c: 30, h: 26, l: 54 },
        { x: 65, o: 35, c: 44, h: 28, l: 50 },
        { x: 90, o: 42, c: 36, h: 30, l: 48 },
        { x: 115, o: 38, c: 28, h: 22, l: 44 },
        { x: 140, o: 30, c: 38, h: 24, l: 46 },
        { x: 165, o: 36, c: 46, h: 30, l: 52 },
        { x: 190, o: 44, c: 32, h: 26, l: 50 },
        { x: 215, o: 34, c: 26, h: 20, l: 40 },
        { x: 240, o: 28, c: 34, h: 22, l: 42 },
      ].map((bar, i) => {
        const isAccent = i === 7;
        const color = isAccent ? "hsl(var(--accent))" : "hsl(var(--muted-foreground) / 0.35)";
        const bodyTop = Math.min(bar.o, bar.c);
        const bodyH = Math.abs(bar.o - bar.c);
        return (
          <g key={i}>
            <line x1={bar.x} y1={bar.h} x2={bar.x} y2={bar.l} stroke={color} strokeWidth="1" />
            <rect x={bar.x - 4} y={bodyTop} width="8" height={Math.max(bodyH, 2)} fill={color} rx="0.5" />
          </g>
        );
      })}

      {/* Trend line */}
      <polyline
        points="40,48 65,35 90,42 115,38 140,30 165,36 190,44 215,26 240,28"
        stroke="hsl(var(--accent))"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
