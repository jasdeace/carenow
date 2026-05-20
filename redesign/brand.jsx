/* global React, CLMark, CLMarkSimple, CLLockup, CLHeaderLogo */
// Brand specimen artboards

function BrandLogos() {
  return (
    <div style={panel(640, 720)}>
      <Kicker>BRAND</Kicker>
      <h2 style={h2}>로고 시스템 · Logo</h2>
      <p style={lead}>둥근 사각 타일 안에 캡슐 약과 심장 박동을 결합한 마크. 진료·복약·돌봄의 따뜻한 모더니즘.</p>

      {/* Hero lockup */}
      <div style={{
        marginTop: 24, padding: '38px 28px', background: 'var(--paper)',
        borderRadius: 20, border: '1px solid var(--line-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CLLockup size={64} subtitle="내 건강 동반자" />
      </div>

      {/* Mark grid */}
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <SwatchTile bg="var(--paper)" label="Primary"><CLMark size={72} /></SwatchTile>
        <SwatchTile bg="var(--ink-900)" label="On dark"><CLMark size={72} bg="var(--teal-500)" /></SwatchTile>
        <SwatchTile bg="var(--cream-100)" label="On cream"><CLMarkSimple size={72} /></SwatchTile>
      </div>

      {/* Sizes */}
      <div style={{ marginTop: 18, padding: '20px 24px', background: 'var(--paper)', borderRadius: 16, border: '1px solid var(--line-soft)', display: 'flex', alignItems: 'flex-end', gap: 22, justifyContent: 'center' }}>
        <CLMark size={20} />
        <CLMark size={32} />
        <CLMark size={48} />
        <CLMark size={64} />
        <CLMark size={88} />
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-400)', textAlign: 'center' }}>20 · 32 · 48 · 64 · 88px</div>

      {/* Wordmark variants */}
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '16px 20px', background: 'var(--paper)', borderRadius: 14, border: '1px solid var(--line-soft)' }}>
          <CLHeaderLogo size={32} />
        </div>
        <div style={{ padding: '16px 20px', background: 'var(--teal-700)', borderRadius: 14 }}>
          <CLHeaderLogo size={32} color="white" />
        </div>
      </div>
    </div>
  );
}

function BrandFavicons() {
  const sizes = [16, 24, 32, 48, 64, 128];
  return (
    <div style={panel(480, 720)}>
      <Kicker>BRAND</Kicker>
      <h2 style={h2}>파비콘 · Favicon</h2>
      <p style={lead}>브라우저 탭, 홈 화면, 앱 아이콘에서 어떻게 보이는지.</p>

      {/* iOS-style icon */}
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 140, height: 140, borderRadius: 32,
          boxShadow: '0 18px 36px -10px rgba(15,44,46,0.4), 0 2px 0 rgba(255,255,255,0.6) inset',
          overflow: 'hidden',
        }}>
          <CLMark size={140} radius={0} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>iOS / Android app icon</div>
      </div>

      {/* Size grid */}
      <div style={{
        marginTop: 24, padding: 18,
        background: 'var(--paper)', borderRadius: 14, border: '1px solid var(--line-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 8,
      }}>
        {sizes.map(s => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <CLMarkSimple size={s} />
            <span style={{ fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--font-sans)' }}>{s}px</span>
          </div>
        ))}
      </div>

      {/* Browser tab mock */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>탭 미리보기</div>
        <div style={{
          background: 'var(--cream-100)', borderRadius: '14px 14px 0 0',
          padding: '8px 6px 0', display: 'flex', gap: 4,
        }}>
          <div style={{
            background: 'var(--paper)', borderRadius: '10px 10px 0 0',
            padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--line-soft)', borderBottom: 'none',
            fontSize: 12, color: 'var(--ink-700)',
          }}>
            <CLMarkSimple size={14} />
            <span>CareLink · 내 건강</span>
            <span style={{ marginLeft: 8, color: 'var(--ink-300)' }}>×</span>
          </div>
          <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--ink-400)' }}>+ 새 탭</div>
        </div>
      </div>
    </div>
  );
}

function BrandColors() {
  const palette = [
    { name: 'Teal 700', value: '#0F766E', use: 'Primary', light: false },
    { name: 'Teal 800', value: '#0E5C5A', use: 'Pressed', light: false },
    { name: 'Teal 100', value: '#DDF4F1', use: 'Tint', light: true },
    { name: 'Coral 500', value: '#E8927C', use: 'Warm accent', light: false },
    { name: 'Coral 100', value: '#FBE5DC', use: 'Warm tint', light: true },
    { name: 'Cream 50',  value: '#FAF7F1', use: 'Surface', light: true },
    { name: 'Cream 100', value: '#F3EEE3', use: 'Surface alt', light: true },
    { name: 'Ink 900',   value: '#0F2C2E', use: 'Text', light: false },
    { name: 'Ink 500',   value: '#5C6F71', use: 'Muted', light: false },
    { name: 'Rose 500',  value: '#D85B66', use: 'Systolic', light: false },
    { name: 'Sky 500',   value: '#4B6FD1', use: 'Diastolic', light: false },
    { name: 'Sand 500',  value: '#D6A85F', use: 'Caution', light: false },
  ];
  return (
    <div style={panel(640, 540)}>
      <Kicker>BRAND</Kicker>
      <h2 style={h2}>색상 · Palette</h2>
      <p style={lead}>차분한 의료 청록을 중심으로, 따뜻한 코랄과 크림이 균형을 잡아요.</p>

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {palette.map(p => (
          <div key={p.value} style={{
            background: p.value, color: p.light ? 'var(--ink-900)' : 'white',
            borderRadius: 14, padding: '14px 12px', minHeight: 96,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            border: p.light ? '1px solid var(--line)' : 'none',
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', opacity: 0.7 }}>{p.use.toUpperCase()}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 10.5, opacity: 0.7, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{p.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandType() {
  return (
    <div style={panel(640, 520)}>
      <Kicker>BRAND</Kicker>
      <h2 style={h2}>타이포그래피 · Type</h2>
      <p style={lead}>한글에 최적화된 Pretendard 한 가족으로, 굵기 변주만으로 모든 위계를 잡아요.</p>

      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ padding: '20px 22px', background: 'var(--paper)', borderRadius: 16, border: '1px solid var(--line-soft)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-500)', fontWeight: 700, letterSpacing: '0.06em' }}>DISPLAY · PRETENDARD 700</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 42, fontWeight: 700, marginTop: 8, letterSpacing: '-0.03em', lineHeight: 1.05 }}>좋은 아침이에요</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 600, color: 'var(--teal-700)', marginTop: 2, letterSpacing: '-0.02em' }}>120 / 80</div>
        </div>
        <div style={{ padding: '20px 22px', background: 'var(--paper)', borderRadius: 16, border: '1px solid var(--line-soft)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-500)', fontWeight: 700, letterSpacing: '0.06em' }}>BODY · PRETENDARD 400 / 600</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>약을 잊지 않게,</div>
          <div style={{ fontSize: 14, color: 'var(--ink-700)', marginTop: 4, lineHeight: 1.55 }}>매일의 복용 기록과 건강 수치를 가족과 함께 부드럽게 챙겨요.</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 8, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>CAPTION · 12 / 0.04em</div>
        </div>
      </div>

      {/* Type scale */}
      <div style={{ marginTop: 16, padding: '16px 20px', background: 'var(--paper)', borderRadius: 14, border: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'baseline' }}>
          {[
            { s: 32, l: 'H1' },
            { s: 24, l: 'H2' },
            { s: 18, l: 'H3' },
            { s: 15, l: 'Body' },
            { s: 12, l: 'Cap' },
          ].map(t => (
            <div key={t.l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: t.s, fontWeight: 500, lineHeight: 1.1 }}>Aa가</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 4 }}>{t.l} · {t.s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// helpers
const panel = (w, h) => ({
  width: w, height: h,
  background: 'var(--cream-50)',
  padding: '28px 28px 24px',
  display: 'flex', flexDirection: 'column',
});

const h2 = {
  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 30,
  margin: '6px 0 4px', letterSpacing: '-0.025em', lineHeight: 1.1,
};

const lead = {
  fontSize: 14, color: 'var(--ink-500)', margin: 0, lineHeight: 1.5,
  maxWidth: 420,
};

function Kicker({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--teal-700)' }}>{children}</div>;
}

function SwatchTile({ bg, children, label }) {
  const isDark = bg === 'var(--ink-900)';
  return (
    <div style={{
      background: bg, borderRadius: 16,
      border: '1px solid var(--line-soft)',
      height: 130, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: 12,
    }}>
      {children}
      <span style={{ fontSize: 10.5, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.6)' : 'var(--ink-400)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

Object.assign(window, { BrandLogos, BrandFavicons, BrandColors, BrandType });
