/* global React, CLMark, CLHeaderLogo */
// Shared UI components for CareLink screens

// ─────────────────────────────────────────────────────────────
// Icons (24px stroke) — minimal hand-drawn warmth
// ─────────────────────────────────────────────────────────────
const Ico = {
  home: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M3.5 11L12 4l8.5 7M5.5 10v9.5h5V14h3v5.5h5V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  pulse: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12h3l2-5 4 10 2.5-7 1.5 2H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  pill: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="9" width="18" height="8" rx="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 9v8" stroke="currentColor" strokeWidth="1.6"/></svg>,
  spark: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7L19 15z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  user: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6"/><path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  bell: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  check: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12.5L10 17.5 19.5 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  undo: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}><path d="M9 14L4 9l5-5M4 9h10a6 6 0 1 1 0 12h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  heart: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  drop: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  weight: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M5 8h14l-1.5 11.5a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5L5 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 8a3 3 0 1 1 6 0" stroke="currentColor" strokeWidth="1.6"/></svg>,
  plus: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  close: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  cam: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  send: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M4 12L20 4l-5 16-3-7-8-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/></svg>,
  trash: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dots: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></svg>,
  cog: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7L5.6 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  share: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" stroke="currentColor" strokeWidth="1.6"/></svg>,
};

// ─────────────────────────────────────────────────────────────
// Status bar (iOS-ish, no Dynamic Island)
// ─────────────────────────────────────────────────────────────
function StatusBar({ time = '9:41', dark = false }) {
  const c = dark ? '#fff' : 'var(--ink-900)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 22px 6px', height: 44, flexShrink: 0,
      fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15, color: c,
    }}>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{time}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none"><rect x="0" y="7" width="3" height="4" rx="1" fill={c}/><rect x="5" y="4" width="3" height="7" rx="1" fill={c}/><rect x="10" y="1" width="3" height="10" rx="1" fill={c}/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M8 9.5a1.5 1.5 0 1 0 0 .01M3.5 6.5a6.5 6.5 0 0 1 9 0M.8 3.5a10 10 0 0 1 14.4 0" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none"/></svg>
        <svg width="27" height="12" viewBox="0 0 27 12" fill="none"><rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={c} opacity="0.4" fill="none"/><rect x="2.5" y="2.5" width="18" height="7" rx="1.5" fill={c}/><rect x="23.5" y="4" width="1.5" height="4" rx="0.5" fill={c} opacity="0.4"/></svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar
// ─────────────────────────────────────────────────────────────
function TabBar({ active = 'home' }) {
  const tabs = [
    { id: 'home', label: '홈', icon: Ico.home },
    { id: 'pulse', label: '건강수치', icon: Ico.pulse },
    { id: 'pill', label: '약', icon: Ico.pill, big: true },
    { id: 'ai', label: 'AI', icon: Ico.spark },
    { id: 'user', label: '프로필', icon: Ico.user },
  ];
  return (
    <div style={{
      flexShrink: 0,
      borderTop: '1px solid var(--line)',
      background: 'rgba(250, 247, 241, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '8px 8px 22px',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 2,
    }}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        const color = isActive ? 'var(--teal-700)' : 'var(--ink-400)';
        return (
          <div key={t.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '8px 4px 4px',
            color,
          }}>
            {t.big ? (
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: isActive ? 'var(--teal-700)' : 'var(--cream-100)',
                color: isActive ? '#fff' : 'var(--ink-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: -6,
              }}>
                <t.icon />
              </div>
            ) : (
              <t.icon />
            )}
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// App header (logo + actions)
// ─────────────────────────────────────────────────────────────
function AppHeader({ title, right, left, transparent = false, size = 'md' }) {
  return (
    <div style={{
      padding: '8px 20px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      background: transparent ? 'transparent' : 'var(--cream-50)',
      flexShrink: 0,
      minHeight: 52,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{left || (title && <CLHeaderLogo size={size === 'sm' ? 24 : 28} />)}</div>
      {title !== undefined && (
        <div style={{ flex: 1 }}/>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status / time pill
// ─────────────────────────────────────────────────────────────
function TimePill({ children, variant = 'mint' }) {
  const map = {
    mint:  { bg: 'var(--teal-100)', fg: 'var(--teal-800)' },
    teal:  { bg: 'var(--teal-100)', fg: 'var(--teal-800)' },
    sand:  { bg: 'var(--sand-100)', fg: 'var(--warn-500)' },
    cream: { bg: 'var(--cream-100)', fg: 'var(--ink-700)' },
    coral: { bg: 'var(--coral-100)', fg: '#A85A45' },
    sky:   { bg: 'var(--sky-100)',   fg: '#4B6FD1' },
  };
  const styles = map[variant] || map.mint;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: styles.bg, color: styles.fg,
      padding: '4px 10px', borderRadius: 999,
      fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13,
      letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums',
    }}>{children}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// Ring chart (SVG)
// ─────────────────────────────────────────────────────────────
function Ring({ size = 80, stroke = 8, value = 0.67, color = 'var(--teal-700)', track = 'var(--teal-100)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={`${c * value} ${c}`} strokeLinecap="round"
                transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar / monogram circle
// ─────────────────────────────────────────────────────────────
function Avatar({ name = '장', size = 40, bg = 'var(--teal-100)', fg = 'var(--teal-800)' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: size * 0.42,
      flexShrink: 0,
    }}>{name}</div>
  );
}

Object.assign(window, { Ico, StatusBar, TabBar, AppHeader, TimePill, Ring, Avatar });
