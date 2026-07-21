interface WorldThumbnailProps {
  worldId: string;
}

export function WorldThumbnail({ worldId }: WorldThumbnailProps) {
  return (
    <div
      className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-surface-inset shadow-[var(--inner-glow)] transition-transform duration-200 group-hover:scale-[1.02]"
      aria-hidden="true"
    >
      <WorldNetworkBg worldId={worldId} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--surface-inset)_100%)]" />
      {worldId === "universe-ai" && <UniverseAiThumb />}
      {worldId === "portfolio-site" && <PortfolioThumb />}
      {worldId === "research-notes" && <ResearchThumb />}
      {worldId === "side-project" && <AutomationThumb />}
    </div>
  );
}

function WorldNetworkBg({ worldId }: { worldId: string }) {
  if (worldId === "universe-ai") {
    return (
      <svg viewBox="0 0 96 96" className="absolute inset-0 size-full opacity-40">
        <circle cx="48" cy="48" r="30" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" />
        <circle cx="48" cy="48" r="20" fill="none" stroke="#22d3ee" strokeWidth="0.4" opacity="0.25" />
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1="48"
              y1="48"
              x2={48 + Math.cos(r) * 30}
              y2={48 + Math.sin(r) * 30}
              stroke="#7c3aed"
              strokeWidth="0.4"
              opacity="0.15"
            />
          );
        })}
      </svg>
    );
  }

  if (worldId === "portfolio-site") {
    return (
      <svg viewBox="0 0 96 96" className="absolute inset-0 size-full opacity-35">
        <line x1="20" y1="20" x2="76" y2="76" stroke="#3b82f6" strokeWidth="0.4" opacity="0.2" />
        <line x1="76" y1="20" x2="20" y2="76" stroke="#22d3ee" strokeWidth="0.4" opacity="0.15" />
        <polygon points="48,16 72,48 48,80 24,48" fill="none" stroke="#7c3aed" strokeWidth="0.5" opacity="0.2" />
      </svg>
    );
  }

  if (worldId === "research-notes") {
    return (
      <svg viewBox="0 0 96 96" className="absolute inset-0 size-full opacity-40">
        {[
          [48, 20],
          [72, 34],
          [72, 62],
          [48, 76],
          [24, 62],
          [24, 34],
        ].map(([x, y], i, arr) => {
          const [nx, ny] = arr[(i + 1) % arr.length];
          return (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={nx}
              y2={ny}
              stroke="#3b82f6"
              strokeWidth="0.4"
              opacity="0.18"
            />
          );
        })}
        {[48, 20, 72, 34, 72, 62, 48, 76, 24, 62, 24, 34].reduce<number[][]>(
          (acc, _, i, arr) => {
            if (i % 2 === 0) acc.push([arr[i], arr[i + 1]]);
            return acc;
          },
          [],
        ).map(([x, y], i) => (
          <line key={`spoke-${i}`} x1="48" y1="48" x2={x} y2={y} stroke="#22d3ee" strokeWidth="0.3" opacity="0.12" />
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 96" className="absolute inset-0 size-full opacity-35">
      <line x1="16" y1="32" x2="80" y2="32" stroke="#3b82f6" strokeWidth="0.4" opacity="0.15" />
      <line x1="16" y1="48" x2="80" y2="48" stroke="#22d3ee" strokeWidth="0.4" opacity="0.12" />
      <line x1="16" y1="64" x2="80" y2="64" stroke="#7c3aed" strokeWidth="0.4" opacity="0.15" />
      <circle cx="28" cy="32" r="2" fill="#60a5fa" opacity="0.4" />
      <circle cx="68" cy="48" r="2" fill="#22d3ee" opacity="0.35" />
      <circle cx="36" cy="64" r="2" fill="#8b5cf6" opacity="0.35" />
    </svg>
  );
}

function UniverseAiThumb() {
  return (
    <svg viewBox="0 0 64 64" className="relative size-12">
      <circle cx="32" cy="32" r="18" fill="none" stroke="#3b82f6" strokeWidth="0.75" opacity="0.45" />
      <circle cx="32" cy="32" r="10" fill="none" stroke="#22d3ee" strokeWidth="0.5" opacity="0.4" />
      <circle cx="32" cy="32" r="5" fill="#3b82f6" opacity="0.9" />
      <circle cx="32" cy="32" r="2" fill="#e0f2fe" />
      {[0, 72, 144, 216, 288].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 32 + Math.cos(rad) * 18;
        const y = 32 + Math.sin(rad) * 18;
        return (
          <circle key={angle} cx={x} cy={y} r="2.5" fill="#8b5cf6" opacity="0.75" />
        );
      })}
    </svg>
  );
}

function PortfolioThumb() {
  return (
    <svg viewBox="0 0 64 64" className="relative size-12">
      <polygon points="32,8 54,32 32,56 10,32" fill="none" stroke="#3b82f6" strokeWidth="0.75" opacity="0.55" />
      <polygon points="32,16 46,32 32,48 18,32" fill="none" stroke="#22d3ee" strokeWidth="0.55" opacity="0.45" />
      <circle cx="32" cy="32" r="3.5" fill="#60a5fa" opacity="0.9" />
    </svg>
  );
}

function ResearchThumb() {
  const hexPoints = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");

  const verts = [
    { x: 32, y: 12 },
    { x: 49, y: 22 },
    { x: 49, y: 42 },
    { x: 32, y: 52 },
    { x: 15, y: 42 },
    { x: 15, y: 22 },
  ];

  return (
    <svg viewBox="0 0 64 64" className="relative size-12">
      <polygon points={hexPoints(32, 32, 22)} fill="none" stroke="#3b82f6" strokeWidth="0.6" opacity="0.4" />
      {verts.map((p, i) => (
        <g key={i}>
          <line x1="32" y1="32" x2={p.x} y2={p.y} stroke="#22d3ee" strokeWidth="0.4" opacity="0.25" />
          <circle cx={p.x} cy={p.y} r="2.5" fill="#8b5cf6" opacity="0.7" />
        </g>
      ))}
      <circle cx="32" cy="32" r="4.5" fill="#3b82f6" opacity="0.9" />
    </svg>
  );
}

function AutomationThumb() {
  return (
    <svg viewBox="0 0 64 64" className="relative size-12">
      <rect x="12" y="20" width="40" height="5" rx="1" fill="#3b82f6" opacity="0.3" transform="rotate(-6 32 22)" />
      <rect x="12" y="29" width="40" height="5" rx="1" fill="#22d3ee" opacity="0.25" />
      <rect x="12" y="38" width="40" height="5" rx="1" fill="#7c3aed" opacity="0.25" transform="rotate(5 32 40)" />
      <circle cx="18" cy="22" r="2.5" fill="#60a5fa" opacity="0.85" />
      <circle cx="46" cy="31" r="2.5" fill="#22d3ee" opacity="0.75" />
      <circle cx="20" cy="40" r="2.5" fill="#8b5cf6" opacity="0.7" />
    </svg>
  );
}
