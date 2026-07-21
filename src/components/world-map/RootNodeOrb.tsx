export function RootNodeOrb() {
  return (
    <div className="world-node__orb" aria-hidden="true">
      <span className="world-node__orb-aura" />
      <span className="world-node__orb-orbit world-node__orb-orbit--outer" />
      <span className="world-node__orb-orbit world-node__orb-orbit--mid" />
      <span className="world-node__orb-orbit world-node__orb-orbit--inner" />

      <svg
        className="world-node__orb-svg"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="root-orb-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="18%" stopColor="#cffafe" stopOpacity="0.95" />
            <stop offset="42%" stopColor="#38bdf8" stopOpacity="0.72" />
            <stop offset="72%" stopColor="#2563eb" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="root-orb-shell" cx="50%" cy="50%" r="50%">
            <stop offset="68%" stopColor="#0f172a" stopOpacity="0" />
            <stop offset="88%" stopColor="#38bdf8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.45" />
          </radialGradient>
        </defs>

        <circle cx="40" cy="40" r="34" fill="url(#root-orb-core)" />
        <circle cx="40" cy="40" r="34" fill="url(#root-orb-shell)" />

        <circle
          cx="40"
          cy="40"
          r="34"
          stroke="rgba(186, 230, 253, 0.35)"
          strokeWidth="0.5"
        />
        <circle
          cx="40"
          cy="40"
          r="26"
          stroke="rgba(125, 211, 252, 0.28)"
          strokeWidth="0.45"
        />
        <circle
          cx="40"
          cy="40"
          r="18"
          stroke="rgba(147, 197, 253, 0.22)"
          strokeWidth="0.4"
        />
        <circle
          cx="40"
          cy="40"
          r="10"
          stroke="rgba(186, 230, 253, 0.18)"
          strokeWidth="0.35"
        />

        <ellipse
          cx="40"
          cy="40"
          rx="34"
          ry="34"
          stroke="rgba(186, 230, 253, 0.14)"
          strokeWidth="0.35"
          strokeDasharray="2 5"
        />

        <circle cx="40" cy="40" r="7" fill="rgba(255, 255, 255, 0.92)" />
        <circle cx="40" cy="40" r="3.5" fill="#e0f2fe" />
      </svg>
    </div>
  );
}
