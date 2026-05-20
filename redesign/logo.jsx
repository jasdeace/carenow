/* global React */
// CareLink — Brand mark, wordmark, favicon

// Primary monogram tile: rounded teal squircle + white capsule pill with
// heartbeat slash. Reads as "pill + pulse" — care + medication.
function CLMark({ size = 56, radius, bg = 'var(--teal-700)', tone = 'cream' }) {
  const r = radius ?? Math.round(size * 0.28);
  // tone changes the inner pill's color
  const pillFill = tone === 'cream' ? '#FAF7F1' : '#FFFFFF';
  const pillStroke = tone === 'cream' ? 'rgba(15,44,46,0.06)' : 'rgba(255,255,255,0.0)';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`clmg-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.05)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx={r} fill={bg} />
      <rect x="0" y="0" width="64" height="64" rx={r} fill={`url(#clmg-${size})`} />
      {/* capsule pill, rotated 35deg */}
      <g transform="translate(32 32) rotate(-32) translate(-22 -9)">
        <rect x="0" y="0" width="44" height="18" rx="9" fill={pillFill} stroke={pillStroke} />
        {/* split half coral */}
        <path d="M22 0 H44 a9 9 0 0 1 9 9 v0 a9 9 0 0 1 -9 9 H22 Z" fill="var(--coral-500)" transform="translate(-9 0)" />
        {/* center notch */}
        <rect x="21" y="0" width="2" height="18" fill="rgba(15,44,46,0.10)" />
        {/* heartbeat across */}
        <path d="M5 9 L13 9 L16 4 L20 14 L24 7 L28 9 L40 9"
              fill="none" stroke="rgba(15,44,46,0.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// Simpler alt mark (used as small favicon variant)
function CLMarkSimple({ size = 56, bg = 'var(--teal-700)' }) {
  const r = Math.round(size * 0.28);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="64" height="64" rx={r} fill={bg} />
      <g transform="translate(32 32) rotate(-32) translate(-18 -7)">
        <rect x="0" y="0" width="36" height="14" rx="7" fill="#FAF7F1" />
        <path d="M18 0 H36 a7 7 0 0 1 7 7 v0 a7 7 0 0 1 -7 7 H18 Z" fill="var(--coral-500)" transform="translate(-7 0)" />
        <rect x="17" y="0" width="2" height="14" fill="rgba(15,44,46,0.10)" />
      </g>
    </svg>
  );
}

// Wordmark with mark: "carelink" — lowercase, serif (warm), Korean subtitle
function CLLockup({ size = 56, color = 'var(--ink-900)', subtitle = '내 건강 동반자' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.22 }}>
      <CLMark size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          fontSize: size * 0.62,
          letterSpacing: '-0.025em',
          color,
        }}>
          carelink
        </span>
        {subtitle && (
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: size * 0.22,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-500)',
            marginTop: size * 0.08,
          }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// Compact horizontal lockup for app header
function CLHeaderLogo({ size = 28, color = 'var(--ink-900)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <CLMark size={size} />
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        fontSize: size * 0.78,
        letterSpacing: '-0.02em',
        color,
      }}>
        carelink
      </span>
    </div>
  );
}

Object.assign(window, { CLMark, CLMarkSimple, CLLockup, CLHeaderLogo });
