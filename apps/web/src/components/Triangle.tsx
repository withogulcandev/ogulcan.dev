import { useState } from 'react';

type Corner = 'eat' | 'stay' | 'work';

const DESCRIPTIONS: Record<Corner, string> = {
  eat: 'Ne yiyorsun, nerede, kimle. Konfor değil, dikkat pratiği.',
  stay: 'Nerede uyuyorsun, nasıl konforlusun. Sessizlik, ışık, çalışma köşesi.',
  work: 'Ne inşa ediyorsun, nasıl çalışıyorsun. Kafe, oda, saat, ortam sesi.',
};

const VERTICES: Record<Corner, { x: number; y: number; labelDy: number }> = {
  stay: { x: 200, y: 60, labelDy: -24 },
  eat: { x: 44, y: 320, labelDy: 38 },
  work: { x: 356, y: 320, labelDy: 38 },
};

const CORNERS: Corner[] = ['stay', 'eat', 'work'];

export default function Triangle() {
  const [active, setActive] = useState<Corner | null>(null);

  const path = `M${VERTICES.stay.x},${VERTICES.stay.y} L${VERTICES.eat.x},${VERTICES.eat.y} L${VERTICES.work.x},${VERTICES.work.y} Z`;

  return (
    <div style={{ margin: '2rem auto', maxWidth: 480 }}>
      <svg
        viewBox="0 0 400 380"
        width="100%"
        role="img"
        aria-label="Eat, stay, work üçgeni — bir köşeye tıklayınca o boyutun tanımı görünür"
      >
        <path d={path} fill="none" stroke="var(--rule)" strokeWidth={1.5} />
        {CORNERS.map((corner) => {
          const v = VERTICES[corner];
          const isActive = active === corner;
          return (
            <g
              key={corner}
              onClick={() => setActive(isActive ? null : corner)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActive(isActive ? null : corner);
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`${corner.toUpperCase()} köşesi`}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <circle
                cx={v.x}
                cy={v.y}
                r={isActive ? 20 : 12}
                fill={isActive ? 'var(--indigo)' : 'var(--paper)'}
                stroke="var(--indigo)"
                strokeWidth={2}
                style={{ transition: 'r 0.2s ease, fill 0.2s ease' }}
              />
              <text
                x={v.x}
                y={v.y + v.labelDy}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="13"
                letterSpacing="4"
                fill={isActive ? 'var(--indigo)' : 'var(--muted)'}
                style={{ transition: 'fill 0.2s ease', userSelect: 'none' }}
              >
                {corner.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      <p
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontStyle: active ? 'italic' : 'normal',
          fontSize: active ? '1.05rem' : '0.85rem',
          marginTop: '1.5rem',
          minHeight: '3em',
          transition: 'all 0.2s ease',
        }}
      >
        {active ? DESCRIPTIONS[active] : 'Bir köşeye tıkla.'}
      </p>
    </div>
  );
}
