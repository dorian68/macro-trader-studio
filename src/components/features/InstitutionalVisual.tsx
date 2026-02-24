export default function InstitutionalVisual() {
  const cols = 8;
  const rows = 4;
  const cellW = 26;
  const cellH = 14;
  const gap = 3;
  const startX = 20;
  const startY = 8;

  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-20">
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const isAccent = (r === 1 && c === 3) || (r === 2 && c === 5);
          return (
            <rect
              key={`${r}-${c}`}
              x={startX + c * (cellW + gap)}
              y={startY + r * (cellH + gap)}
              width={cellW}
              height={cellH}
              rx="1.5"
              fill={isAccent ? "hsl(var(--accent) / 0.35)" : "hsl(var(--muted-foreground) / 0.08)"}
              stroke={isAccent ? "hsl(var(--accent) / 0.5)" : "hsl(var(--border) / 0.4)"}
              strokeWidth="0.5"
            />
          );
        })
      )}
    </svg>
  );
}
