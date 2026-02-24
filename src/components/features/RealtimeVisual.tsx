export default function RealtimeVisual() {
  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-20">
      {/* Baseline */}
      <line x1="20" y1="40" x2="260" y2="40" stroke="hsl(var(--border))" strokeWidth="0.5" />

      {/* Pulse / heartbeat signal */}
      <polyline
        points="20,40 50,40 60,40 70,38 80,42 90,40 100,40 110,40 120,18 130,58 140,28 150,48 160,40 170,40 180,40 190,38 200,42 210,40 220,40 230,40 240,40 250,40 260,40"
        stroke="hsl(var(--accent))"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />

      {/* Live dot */}
      <circle cx="260" cy="40" r="3" fill="hsl(var(--accent))" opacity="0.8" />
      <circle cx="260" cy="40" r="6" fill="hsl(var(--accent))" opacity="0.2" />

      {/* Subtle grid lines */}
      {[20, 30, 50, 60].map((y) => (
        <line key={y} x1="20" y1={y} x2="260" y2={y} stroke="hsl(var(--muted-foreground) / 0.06)" strokeWidth="0.5" />
      ))}
    </svg>
  );
}
