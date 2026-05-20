/* global React, StatusBar, TabBar, AppHeader, TimePill, Ring, Avatar, Ico, CLHeaderLogo, CLMark */
// Home screen — 3 variations exploring different layouts of the same data

// Shared sample data
const TODAY_MEDS = [
  { time: '09:00', name: '듀카브정', dose: '60/10mg', status: 'taken', tone: '혈압', tint: 'rose' },
  { time: '10:15', name: '오메가3', dose: '1000mg', status: 'taken', tone: '영양', tint: 'coral' },
  { time: '15:00', name: '크레아틴', dose: '5g', status: 'pending', tone: '운동', tint: 'teal' },
];
const WEEK = [
  { day: '목', date: '5.14', pct: null },
  { day: '금', date: '5.15', pct: 33 },
  { day: '토', date: '5.16', pct: 67 },
  { day: '일', date: '5.17', pct: 67 },
  { day: '월', date: '5.18', pct: 33 },
  { day: '화', date: '5.19', pct: 67 },
  { day: '수', date: '5.20', pct: 67 },
];

// ─────────────────────────────────────────────────────────────
// Variant A — "Editorial": serif greeting hero + single next-dose card
// ─────────────────────────────────────────────────────────────
function HomeA() {
  return (
    <div className="cl-screen">
      <StatusBar time="10:31" />
      <AppHeader right={<>
        <button style={iconBtn}><Ico.bell /></button>
        <Avatar name="장" size={32} />
      </>} />
      <div className="cl-scroll" style={{ padding: '0 20px 16px' }}>
        {/* Greeting */}
        <div style={{ paddingTop: 12, paddingBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
            5월 20일 · 수요일
          </div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 30, lineHeight: 1.15, margin: 0, letterSpacing: '-0.02em' }}>
            좋은 아침이에요,<br/>
            <span style={{  color: 'var(--teal-700)' }}>원석</span>님.
          </h1>
        </div>

        {/* Today's progress hero */}
        <div style={{
          background: 'var(--teal-800)',
          color: 'white',
          borderRadius: 24,
          padding: '20px 22px 22px',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 14,
        }}>
          <div style={{
            position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(94,234,212,0.25), transparent 70%)',
          }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>오늘의 복용</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, opacity: 0.7 }}>1 / 3</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}>
            <Ring size={84} stroke={9} value={0.33} color="var(--teal-300)" track="rgba(255,255,255,0.15)">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 26, lineHeight: 1, color: 'white' }}>33<span style={{ fontSize: 13, opacity: 0.7 }}>%</span></div>
              </div>
            </Ring>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, lineHeight: 1.15 }}>다음 복용까지<br/><span style={{ color: 'var(--teal-300)',  }}>4시간 29분</span></div>
            </div>
          </div>
          {/* dose pips */}
          <div style={{ display: 'flex', gap: 8 }}>
            {TODAY_MEDS.map((m, i) => (
              <div key={i} style={{
                flex: 1,
                background: m.status === 'taken' ? 'var(--teal-300)' : 'rgba(255,255,255,0.18)',
                height: 6, borderRadius: 3,
              }}/>
            ))}
          </div>
        </div>

        {/* Section */}
        <SectionHead title="오늘의 약" trailing="모두 보기" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TODAY_MEDS.map((m, i) => (
            <MedRowEditorial key={i} {...m} />
          ))}
        </div>

        {/* Adherence week */}
        <SectionHead title="주간 복용률" subtitle="지난 7일" trailing={<TimePill variant="mint">평균 56%</TimePill>} />
        <WeekStrip />
      </div>
      <TabBar active="home" />
    </div>
  );
}

function MedRowEditorial({ time, name, dose, status, tone, tint }) {
  const tintMap = {
    rose: { bg: 'var(--rose-100)', fg: '#A24652' },
    coral: { bg: 'var(--coral-100)', fg: '#A85A45' },
    teal: { bg: 'var(--teal-100)', fg: 'var(--teal-800)' },
  };
  const t = tintMap[tint];
  const taken = status === 'taken';
  return (
    <div style={{
      background: 'var(--paper)',
      borderRadius: 18,
      padding: '14px 16px',
      border: '1px solid var(--line-soft)',
      display: 'flex', alignItems: 'center', gap: 14,
      opacity: taken ? 0.78 : 1,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: t.bg, color: t.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Ico.pill />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 500 }}>{name}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{tone}</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="tabular">{time}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-300)' }}/>
          <span>{dose}</span>
        </div>
      </div>
      {taken ? (
        <span style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--teal-700)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Ico.check /></span>
      ) : (
        <button style={{
          padding: '8px 14px', borderRadius: 999,
          background: 'var(--teal-700)', color: 'white',
          border: 'none', fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
        }}>복용</button>
      )}
    </div>
  );
}

function SectionHead({ title, subtitle, trailing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '24px 0 12px' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 19, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.015em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {trailing && (
        typeof trailing === 'string'
          ? <span style={{ fontSize: 13, color: 'var(--teal-700)', fontWeight: 600 }}>{trailing}</span>
          : trailing
      )}
    </div>
  );
}

function WeekStrip() {
  return (
    <div style={{
      background: 'var(--paper)',
      borderRadius: 18,
      border: '1px solid var(--line-soft)',
      padding: '16px 14px 14px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {WEEK.map((w) => (
          <div key={w.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>{w.day}</span>
            <WeekDot pct={w.pct} />
            <span style={{ fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--font-sans)' }}>{w.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekDot({ pct }) {
  if (pct === null) {
    return <div style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px dashed var(--ink-300)' }}/>;
  }
  const isFull = pct >= 100;
  const isHigh = pct >= 60;
  const bg = isFull ? 'var(--teal-700)' : isHigh ? 'var(--teal-200)' : 'var(--sand-100)';
  const fg = isFull ? 'white' : isHigh ? 'var(--teal-800)' : 'var(--warn-500)';
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
    }}>{pct}</div>
  );
}

const iconBtn = {
  width: 36, height: 36, borderRadius: 12,
  background: 'var(--paper)', border: '1px solid var(--line-soft)',
  color: 'var(--ink-700)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

// ─────────────────────────────────────────────────────────────
// Variant B — "Timeline": meds laid out along a time axis with markers
// ─────────────────────────────────────────────────────────────
function HomeB() {
  const allMeds = [
    { time: '07:00', name: '비타민D', dose: '2000IU', status: 'taken' },
    { time: '09:00', name: '듀카브정', dose: '60/10mg', status: 'taken' },
    { time: '10:15', name: '오메가3', dose: '1000mg', status: 'taken' },
    { time: '15:00', name: '크레아틴', dose: '5g', status: 'pending', isNext: true },
    { time: '22:00', name: '마그네슘', dose: '300mg', status: 'pending' },
  ];
  return (
    <div className="cl-screen" style={{ background: 'var(--cream-50)' }}>
      <StatusBar time="10:31" />
      <AppHeader right={<>
        <button style={iconBtn}><Ico.bell /></button>
        <Avatar name="장" size={32} />
      </>} />

      <div className="cl-scroll" style={{ padding: '0 20px 16px' }}>
        {/* Hero strip */}
        <div style={{ paddingTop: 8, paddingBottom: 18 }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 6 }}>2026년 5월 20일</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 26, margin: 0, letterSpacing: '-0.02em' }}>
            안녕하세요, 원석님
          </h1>
        </div>

        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 8, marginBottom: 22 }}>
          <StatCard kicker="오늘 복용" value="3 / 5" tone="teal" sub="60% 진행" />
          <StatCard kicker="연속 기록" value="12" unit="일" tone="coral" />
          <StatCard kicker="이번주" value="56" unit="%" tone="sand" />
        </div>

        {/* Section: timeline */}
        <SectionHead title="오늘의 일정" subtitle="시간순" trailing={<TimePill variant="coral">다음 15:00</TimePill>} />
        <div style={{ position: 'relative', paddingLeft: 6 }}>
          <div style={{
            position: 'absolute', left: 32, top: 6, bottom: 6, width: 2,
            background: 'linear-gradient(to bottom, var(--teal-200), var(--cream-100))',
            borderRadius: 1,
          }}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allMeds.map((m, i) => <TimelineRow key={i} {...m} />)}
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </div>
  );
}

function StatCard({ kicker, value, unit, sub, tone = 'teal' }) {
  const tones = {
    teal: { bg: 'var(--teal-100)', accent: 'var(--teal-700)' },
    coral: { bg: 'var(--coral-100)', accent: '#A85A45' },
    sand: { bg: 'var(--sand-100)', accent: 'var(--warn-500)' },
  }[tone];
  return (
    <div style={{
      background: tones.bg, borderRadius: 16, padding: '12px 12px 14px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 86,
    }}>
      <div style={{ fontSize: 11, color: tones.accent, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{kicker}</div>
      <div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 26, fontWeight: 500, color: 'var(--ink-900)', letterSpacing: '-0.02em' }} className="tabular">{value}</span>
        {unit && <span style={{ fontSize: 13, color: 'var(--ink-500)', marginLeft: 3 }}>{unit}</span>}
        {sub && <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function TimelineRow({ time, name, dose, status, isNext }) {
  const taken = status === 'taken';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
        width: 44, color: taken ? 'var(--ink-400)' : 'var(--ink-900)',
        fontVariantNumeric: 'tabular-nums',
      }}>{time}</span>
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: taken ? 'var(--teal-700)' : isNext ? 'var(--coral-500)' : 'var(--paper)',
        border: taken ? 'none' : `2px solid ${isNext ? 'var(--coral-500)' : 'var(--ink-300)'}`,
        flexShrink: 0, position: 'relative', zIndex: 1,
        boxShadow: isNext ? '0 0 0 4px rgba(232,146,124,0.18)' : 'none',
      }}/>
      <div style={{
        flex: 1, background: 'var(--paper)', borderRadius: 14,
        border: '1px solid var(--line-soft)',
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        opacity: taken ? 0.72 : 1,
        borderColor: isNext ? 'var(--coral-300)' : 'var(--line-soft)',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink-900)', textDecoration: taken ? 'line-through' : 'none', textDecorationColor: 'var(--ink-300)' }}>{name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 1 }}>{dose}</div>
        </div>
        {taken
          ? <span style={{ color: 'var(--teal-600)', display: 'flex', alignItems: 'center', gap: 2, fontSize: 11.5, fontWeight: 600 }}><Ico.check /> 복용</span>
          : isNext
            ? <button style={{ padding: '7px 14px', borderRadius: 999, background: 'var(--teal-700)', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}>지금 복용</button>
            : <span style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>예정</span>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant C — "Refined original": closest to user's current layout but elevated
// ─────────────────────────────────────────────────────────────
function HomeC() {
  return (
    <div className="cl-screen" style={{ background: 'var(--cream-50)' }}>
      <StatusBar time="10:31" />
      {/* Logo header centered with toggle */}
      <div style={{ padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CLMark size={26} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 20, letterSpacing: '-0.02em', fontWeight: 500 }}>carelink</span>
          </div>
          <button style={iconBtn}><Ico.bell /></button>
        </div>
        {/* segmented */}
        <div style={{
          marginTop: 14,
          background: 'var(--cream-100)', padding: 4, borderRadius: 14,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
        }}>
          <div style={{
            background: 'var(--paper)', padding: '9px 10px', borderRadius: 11,
            textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: 'var(--teal-700)',
            boxShadow: '0 1px 2px rgba(15,44,46,0.06)',
          }}>내 건강</div>
          <div style={{ padding: '9px 10px', textAlign: 'center', fontSize: 13.5, fontWeight: 500, color: 'var(--ink-500)' }}>돌봄</div>
        </div>
      </div>

      <div className="cl-scroll" style={{ padding: '4px 20px 16px' }}>
        {/* Greeting */}
        <div style={{ paddingTop: 6, paddingBottom: 18 }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 26, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            좋은 아침이에요,<br/>
            <span style={{ color: 'var(--teal-700)' }}>장원석</span>님
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '5px 12px', background: 'var(--teal-100)', color: 'var(--teal-800)', borderRadius: 999, fontSize: 12.5, fontWeight: 600 }}>
            <Ico.check /> 컨디션 양호
          </div>
        </div>

        {/* Today's meds card */}
        <div style={{
          background: 'var(--paper)', borderRadius: 22,
          border: '1px solid var(--line-soft)',
          padding: '18px 18px 16px',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500 }}>오늘의 약</span>
            <span style={{
              padding: '4px 10px', borderRadius: 999,
              background: 'var(--cream-100)', color: 'var(--ink-700)',
              fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            }}>1 / 3</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TODAY_MEDS.map((m, i) => <MedRowCompact key={i} {...m} />)}
          </div>
        </div>

        {/* Week */}
        <div style={{
          background: 'var(--paper)', borderRadius: 22,
          border: '1px solid var(--line-soft)',
          padding: '18px 16px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500 }}>주간 복용률</span>
            <span style={{ fontSize: 12.5, color: 'var(--teal-700)', fontWeight: 600 }}>자세히</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEK.map((w) => (
              <div key={w.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>{w.day}</span>
                <WeekBar pct={w.pct} />
                <span style={{ fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--font-sans)' }}>{w.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </div>
  );
}

function MedRowCompact({ time, name, dose, status }) {
  const taken = status === 'taken';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 12px', borderRadius: 14,
      background: taken ? 'var(--teal-50)' : 'var(--cream-100)',
      border: taken ? '1px solid var(--teal-200)' : '1px solid transparent',
    }}>
      <TimePill variant={taken ? 'mint' : 'sand'}>{time}</TimePill>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{dose}</div>
      </div>
      {taken ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--teal-700)', fontSize: 12.5, fontWeight: 600 }}>
          <Ico.check /> 복용
        </span>
      ) : (
        <button style={{ padding: '7px 12px', borderRadius: 999, background: 'var(--teal-700)', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}>복용</button>
      )}
    </div>
  );
}

function WeekBar({ pct }) {
  if (pct === null) {
    return <div style={{ width: '100%', height: 56, borderRadius: 10, border: '1.5px dashed var(--ink-300)' }}/>;
  }
  const h = Math.max(8, (pct / 100) * 56);
  const isHigh = pct >= 60;
  return (
    <div style={{ width: '100%', height: 56, position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{
        width: '100%', height: h,
        background: isHigh ? 'var(--teal-700)' : 'var(--sand-200)',
        borderRadius: 8,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 4,
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
          color: isHigh ? 'white' : 'var(--warn-500)',
          fontVariantNumeric: 'tabular-nums',
        }}>{pct}</span>
      </div>
    </div>
  );
}

Object.assign(window, { HomeA, HomeB, HomeC, iconBtn });
