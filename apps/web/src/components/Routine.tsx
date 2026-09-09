import { useState } from 'react';

export type Activity = {
  label: string;
  start: number; // 0-24
  end: number;   // 0-24 (> start; no wrap-around for v1)
  type: 'eat' | 'stay' | 'work' | 'note';
};

type Props = {
  activities?: Activity[];
  size?: number;
};

const DEFAULT: Activity[] = [
  { label: 'Morning walk + sandwich', start: 7, end: 8, type: 'note' },
  { label: 'Personal work / reading', start: 9, end: 12, type: 'work' },
  { label: 'Lunch + break', start: 12, end: 13, type: 'eat' },
  { label: 'Day job', start: 16, end: 20, type: 'work' },
  { label: 'Dinner + social', start: 20, end: 23, type: 'eat' },
];

const TYPE_COLOR: Record<Activity['type'], string> = {
  eat: '#C68B3E',
  stay: '#96455B',
  work: '#1F3D6B',
  note: '#6A6862',
};

function angleForHour(h: number) {
  return (h / 24) * 2 * Math.PI - Math.PI / 2;
}

function arcPath(cx: number, cy: number, r: number, h1: number, h2: number) {
  const a1 = angleForHour(h1);
  const a2 = angleForHour(h2);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);
  const largeArc = h2 - h1 > 12 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default function Routine({ activities = DEFAULT, size = 320 }: Props) {
  const [active, setActive] = useState<Activity | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.4;
  const strokeW = 10;

  // 3 rings, outer = today (opaque, interactive), 2 inner = echoes
  const rings = [
    { r: R, opacity: 1, interactive: true },
    { r: R - strokeW - 3, opacity: 0.35, interactive: false },
    { r: R - 2 * (strokeW + 3), opacity: 0.15, interactive: false },
  ];

  return (
    <div style={{ margin: '2rem auto', maxWidth: size + 20 }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        role="img"
        aria-label="Daily routine — 24-hour dial, three-day overlay showing repetition"
      >
        {rings.map((ring, i) => (
          <circle
            key={`ring-${i}`}
            cx={cx}
            cy={cy}
            r={ring.r}
            fill="none"
            stroke="var(--rule)"
            strokeWidth={0.5}
            opacity={ring.opacity * 0.4}
          />
        ))}

        {[0, 6, 12, 18].map((h) => {
          const a = angleForHour(h);
          const rIn = R + 4;
          const rOut = R + 10;
          const x1 = cx + rIn * Math.cos(a);
          const y1 = cy + rIn * Math.sin(a);
          const x2 = cx + rOut * Math.cos(a);
          const y2 = cy + rOut * Math.sin(a);
          return (
            <line
              key={`tick-${h}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--muted)"
              strokeWidth={1}
              opacity={0.7}
            />
          );
        })}

        {rings.map((ring, ri) =>
          activities.map((act) => {
            const isActive = active === act && ri === 0;
            return (
              <path
                key={`arc-${ri}-${act.label}`}
                d={arcPath(cx, cy, ring.r, act.start, act.end)}
                stroke={TYPE_COLOR[act.type]}
                strokeWidth={isActive ? strokeW + 3 : strokeW}
                strokeLinecap="round"
                fill="none"
                opacity={ring.opacity}
                style={{
                  cursor: ring.interactive ? 'pointer' : 'default',
                  pointerEvents: ring.interactive ? 'auto' : 'none',
                  transition: 'stroke-width 0.15s ease',
                }}
                onClick={ring.interactive ? () => setActive(active === act ? null : act) : undefined}
                onKeyDown={ring.interactive ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActive(active === act ? null : act);
                  }
                } : undefined}
                role={ring.interactive ? 'button' : undefined}
                tabIndex={ring.interactive ? 0 : undefined}
                aria-label={ring.interactive ? `${act.label}, ${String(act.start).padStart(2, '0')}:00 - ${String(act.end).padStart(2, '0')}:00` : undefined}
              />
            );
          })
        )}
      </svg>

      <p
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontStyle: active ? 'italic' : 'normal',
          fontSize: active ? '1.05rem' : '0.85rem',
          marginTop: '1rem',
          minHeight: '3em',
          transition: 'all 0.2s ease',
        }}
      >
        {active
          ? `${active.label} · ${String(active.start).padStart(2, '0')}:00 – ${String(active.end).padStart(2, '0')}:00`
          : 'Three days overlaid — same rhythm, different noticing. Click an arc.'}
      </p>
    </div>
  );
}
