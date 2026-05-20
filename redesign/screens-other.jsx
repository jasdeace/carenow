/* global React, StatusBar, TabBar, AppHeader, TimePill, Ring, Avatar, Ico, iconBtn */
// Health metrics, medicine add/edit, AI chat, profile screens

// ─────────────────────────────────────────────────────────────
// Health metrics screen — blood pressure focus + collapsible cards
// ─────────────────────────────────────────────────────────────
function MetricsScreen() {
  return (
    <div className="cl-screen">
      <StatusBar time="10:33" />
      <div style={{ padding: '8px 20px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 28, margin: 0, letterSpacing: '-0.02em' }}>건강수치</h1>
        <button style={iconBtn}><Ico.plus /></button>
      </div>

      <div className="cl-scroll" style={{ padding: '12px 20px 16px' }}>
        {/* BP highlight card */}
        <div style={{
          background: 'var(--paper)', borderRadius: 22,
          border: '1px solid var(--line-soft)', padding: '18px 18px 14px',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--rose-100)', color: '#D85B66', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ico.heart />
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 500 }}>혈압</span>
                <span style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 500 }}>· 최근 측정 16:26</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 38, color: '#D85B66', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }} className="tabular">120</span>
                <span style={{ color: 'var(--ink-300)', fontSize: 22, fontFamily: 'var(--font-sans)' }}>/</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 38, color: '#4B6FD1', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }} className="tabular">80</span>
                <span style={{ fontSize: 12, color: 'var(--ink-500)', marginLeft: 4 }}>mmHg</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-500)' }}>맥박 72 bpm · <span style={{ color: 'var(--teal-700)', fontWeight: 600 }}>정상 범위</span></div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['7일', '30일', '90일'].map((p, i) => (
                <span key={p} style={{
                  padding: '4px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: i === 1 ? 'var(--teal-700)' : 'var(--cream-100)',
                  color: i === 1 ? 'white' : 'var(--ink-500)',
                }}>{p}</span>
              ))}
            </div>
          </div>
          {/* Mini chart */}
          <BPChart />
          <button style={{
            marginTop: 12, width: '100%', padding: '12px',
            background: 'var(--teal-700)', color: 'white', border: 'none',
            borderRadius: 14, fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Ico.plus /> 새 측정값 기록
          </button>
        </div>

        {/* Collapsible cards */}
        <MetricCard
          icon={<Ico.drop />} iconColor="#4B6FD1" iconBg="var(--sky-100)"
          name="혈당" value="98" unit="mg/dL" time="5/18 08:12" tag="공복" tagTone="teal"
        />
        <MetricCard
          icon={<Ico.weight />} iconColor="var(--teal-700)" iconBg="var(--teal-100)"
          name="체중" value="86.2" unit="kg" time="5/18 20:58" delta="-0.4kg" deltaTone="teal" expanded
        />
        <MetricCard
          icon={<Ico.pulse />} iconColor="#A85A45" iconBg="var(--coral-100)"
          name="심박수" value="68" unit="bpm" time="5/18 16:26" tag="안정시" tagTone="cream"
        />
      </div>
      <TabBar active="pulse" />
    </div>
  );
}

function MetricCard({ icon, iconColor, iconBg, name, value, unit, time, tag, tagTone, delta, deltaTone, expanded }) {
  return (
    <div style={{
      background: 'var(--paper)', borderRadius: 18,
      border: '1px solid var(--line-soft)',
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 32, height: 32, borderRadius: 10, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 1 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500 }}>{name}</span>
            {tag && <TimePill variant={tagTone}>{tag}</TimePill>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{time}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500, color: 'var(--ink-900)' }} className="tabular">{value}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{unit}</span>
          </div>
          {delta && <div style={{ fontSize: 11, color: 'var(--teal-700)', fontWeight: 600 }}>{delta}</div>}
        </div>
        <span style={{ color: 'var(--ink-300)', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}><Ico.chev /></span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <WeightSpark />
        </div>
      )}
    </div>
  );
}

function BPChart() {
  // Sparkline-style two-line chart with point labels
  const sys = [120, 105, 118, 120, 120];
  const dia = [80, 65, 69, 80, 80];
  const w = 320, h = 100, pad = 18;
  const sysMin = 100, sysMax = 125;
  const diaMin = 60, diaMax = 85;
  const sx = (i) => pad + (i * (w - pad * 2)) / (sys.length - 1);
  const sy = (v) => pad + ((sysMax - v) / (sysMax - sysMin)) * (h - pad * 2) * 0.4;
  const dy = (v) => 50 + ((diaMax - v) / (diaMax - diaMin)) * (h - pad * 2) * 0.4;
  const sysPath = sys.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(v)}`).join(' ');
  const diaPath = dia.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${dy(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 100, overflow: 'visible', marginTop: 6 }}>
      <line x1={pad} y1={50} x2={w - pad} y2={50} stroke="var(--line)" strokeDasharray="3 3" />
      <path d={sysPath} fill="none" stroke="#D85B66" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={diaPath} fill="none" stroke="#4B6FD1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {sys.map((v, i) => (
        <g key={`s${i}`}>
          <circle cx={sx(i)} cy={sy(v)} r="3" fill="white" stroke="#D85B66" strokeWidth="1.6" />
          <text x={sx(i)} y={sy(v) - 8} textAnchor="middle" fontSize="9.5" fill="#D85B66" fontFamily="Newsreader, serif" fontWeight="600">{v}</text>
        </g>
      ))}
      {dia.map((v, i) => (
        <g key={`d${i}`}>
          <circle cx={sx(i)} cy={dy(v)} r="3" fill="white" stroke="#4B6FD1" strokeWidth="1.6" />
          <text x={sx(i)} y={dy(v) + 14} textAnchor="middle" fontSize="9.5" fill="#4B6FD1" fontFamily="Newsreader, serif" fontWeight="600">{v}</text>
        </g>
      ))}
    </svg>
  );
}

function WeightSpark() {
  const data = [86.6, 86.5, 86.3, 86.4, 86.1, 86.2];
  const w = 320, h = 70, pad = 4;
  const min = 85.8, max = 86.8;
  const sx = (i) => pad + (i * (w - pad * 2)) / (data.length - 1);
  const sy = (v) => pad + ((max - v) / (max - min)) * (h - pad * 2);
  const pts = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(v)}`).join(' ');
  const fillPts = pts + ` L ${sx(data.length - 1)} ${h} L ${sx(0)} ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 70 }}>
      <defs>
        <linearGradient id="wsg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--teal-700)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--teal-700)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPts} fill="url(#wsg)" />
      <path d={pts} fill="none" stroke="var(--teal-700)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Medicine Add / Edit screen
// ─────────────────────────────────────────────────────────────
function MedicineEditScreen() {
  return (
    <div className="cl-screen">
      <StatusBar time="10:30" />
      <div style={{ padding: '8px 20px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 22, margin: 0, letterSpacing: '-0.02em' }}>약 수정</h1>
        <button style={{ ...iconBtn, background: 'transparent', border: 'none' }}><Ico.close /></button>
      </div>

      <div className="cl-scroll" style={{ padding: '16px 20px 16px' }}>
        {/* Prescription scan */}
        <div style={{
          background: 'var(--teal-50)', border: '1.5px dashed var(--teal-300)',
          borderRadius: 18, padding: '20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          marginBottom: 18,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--teal-700)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <Ico.cam />
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 15, color: 'var(--teal-800)' }}>처방전 스캔</div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', textAlign: 'center' }}>AI가 약 정보를 자동으로 채워드려요</div>
        </div>

        {/* Form fields */}
        <FieldGroup>
          <Field label="약 이름">
            <input defaultValue="오메가3" style={inputStyle} />
          </Field>
          <Field label="복용량 / 단위">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <input defaultValue="1000" style={inputStyle} />
              <input defaultValue="mg" style={inputStyle} />
            </div>
          </Field>
          <Field label="복용 시간" trailing={<span style={{ color: 'var(--teal-700)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}><Ico.plus /> 추가</span>}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <TimeChip>아침 08:00</TimeChip>
              <TimeChip>저녁 19:00</TimeChip>
            </div>
          </Field>
          <Field label="복용 기간">
            <div style={{ display: 'flex', gap: 8 }}>
              <PeriodChip active>매일</PeriodChip>
              <PeriodChip>요일별</PeriodChip>
              <PeriodChip>특정 날짜</PeriodChip>
            </div>
          </Field>
          <Field label="메모 (선택)">
            <textarea defaultValue="식후 30분 이내 복용" style={{ ...inputStyle, minHeight: 60, resize: 'none', fontFamily: 'inherit' }} />
          </Field>
        </FieldGroup>

        <button style={{
          width: '100%', padding: '14px', marginTop: 18,
          background: 'var(--teal-700)', color: 'white', border: 'none',
          borderRadius: 14, fontFamily: 'inherit', fontWeight: 600, fontSize: 15,
        }}>저장</button>
      </div>
      <TabBar active="pill" />
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'var(--cream-100)', border: '1px solid transparent',
  borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: 'var(--ink-900)',
  outline: 'none',
};

function FieldGroup({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>;
}

function Field({ label, children, trailing }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 600 }}>{label}</span>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function TimeChip({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', background: 'var(--teal-100)', color: 'var(--teal-800)',
      borderRadius: 999, fontSize: 12.5, fontWeight: 600,
    }}>
      {children}
      <span style={{ opacity: 0.5 }}>×</span>
    </span>
  );
}

function PeriodChip({ children, active }) {
  return (
    <span style={{
      padding: '8px 14px', borderRadius: 999,
      background: active ? 'var(--ink-900)' : 'var(--cream-100)',
      color: active ? 'white' : 'var(--ink-500)',
      fontSize: 12.5, fontWeight: 600,
    }}>{children}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// AI chat screen
// ─────────────────────────────────────────────────────────────
function AIScreen() {
  return (
    <div className="cl-screen">
      <StatusBar time="4:17" />
      <div style={{ padding: '4px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--teal-100)', color: 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico.spark /></span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.015em' }}>AI 건강 도우미</span>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', background: 'var(--coral-100)', color: '#A85A45',
            borderRadius: 999, fontSize: 12, fontWeight: 600,
          }}><Ico.spark /> 87 토큰</span>
        </div>
        {/* tabs */}
        <div style={{
          marginTop: 14, background: 'var(--cream-100)', padding: 4, borderRadius: 14,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
        }}>
          <div style={{ padding: '8px 10px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--ink-500)' }}>식단 관리</div>
          <div style={{
            background: 'var(--paper)', padding: '8px 10px', borderRadius: 11,
            textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--teal-700)',
            boxShadow: '0 1px 2px rgba(15,44,46,0.06)',
          }}>검사결과</div>
        </div>
      </div>

      {/* Suggestion chips */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.04em' }}>추천 질문</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {['이 검사 어떤가요?', '복용 중인 약과 연관?', '주의할 음식', '재검 시기'].map((s, i) => (
            <span key={i} style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 999,
              background: 'var(--paper)', border: '1px solid var(--line)',
              fontSize: 12.5, color: 'var(--ink-700)', fontWeight: 500,
            }}>{s}</span>
          ))}
        </div>
      </div>

      <div className="cl-scroll" style={{ padding: '16px 20px 16px' }}>
        <ChatBubble side="ai">
          <span style={{ fontFamily: 'var(--font-sans)',  fontSize: 13, color: 'var(--ink-500)', display: 'block', marginBottom: 4 }}>오전 9:14</span>
          무엇이든 물어보세요. <br/>이번 검사 결과를 함께 살펴볼 수 있어요.
        </ChatBubble>
        <ChatBubble side="me">어떤가요?</ChatBubble>
        <ChatBubble side="ai">
          <span style={{ fontFamily: 'var(--font-sans)',  fontSize: 13, color: 'var(--ink-500)', display: 'block', marginBottom: 4 }}>지금</span>
          전반적으로 양호하지만 <strong style={{ color: '#A85A45' }}>LDL 콜레스테롤 142mg/dL</strong>이 약간 높은 편이에요.
          <div style={{
            marginTop: 10, padding: '10px 12px', borderRadius: 12,
            background: 'var(--cream-50)', border: '1px solid var(--line-soft)',
            fontSize: 12.5, lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink-900)' }}>제안</div>
            <div style={{ color: 'var(--ink-700)' }}>• 포화지방 줄이기<br/>• 주 3회 30분 유산소<br/>• 3개월 후 재검</div>
          </div>
        </ChatBubble>
      </div>

      {/* Composer */}
      <div style={{
        padding: '10px 16px 16px', flexShrink: 0,
        borderTop: '1px solid var(--line-soft)', background: 'var(--cream-50)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paper)', borderRadius: 999, border: '1px solid var(--line)', padding: '6px 6px 6px 16px' }}>
          <input placeholder="질문을 입력하세요" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontFamily: 'inherit', padding: '8px 0' }}/>
          <button style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--teal-700)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico.send /></button>
        </div>
      </div>
      <TabBar active="ai" />
    </div>
  );
}

function ChatBubble({ side, children }) {
  const isMe = side === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{
        maxWidth: '80%',
        padding: '11px 14px',
        borderRadius: 18,
        borderTopLeftRadius: isMe ? 18 : 6,
        borderTopRightRadius: isMe ? 6 : 18,
        background: isMe ? 'var(--teal-700)' : 'var(--paper)',
        color: isMe ? 'white' : 'var(--ink-900)',
        border: isMe ? 'none' : '1px solid var(--line-soft)',
        fontSize: 13.5, lineHeight: 1.5,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile screen
// ─────────────────────────────────────────────────────────────
function ProfileScreen() {
  return (
    <div className="cl-screen">
      <StatusBar time="10:33" />
      <div style={{ padding: '8px 20px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 26, margin: 0, letterSpacing: '-0.02em' }}>프로필</h1>
        <button style={iconBtn}><Ico.cog /></button>
      </div>

      <div className="cl-scroll" style={{ padding: '12px 20px 16px' }}>
        {/* Profile card */}
        <div style={{
          background: 'var(--paper)', borderRadius: 22, padding: '22px 20px',
          border: '1px solid var(--line-soft)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          marginBottom: 14,
        }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Avatar name="장" size={76} bg="var(--teal-700)" fg="white" />
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--coral-500)', border: '3px solid var(--paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            }}><Ico.plus /></span>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500, marginBottom: 2 }}>장원석</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>1985년생 · 남성 · 178cm</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line-soft)', width: '100%', justifyContent: 'center' }}>
            <Stat value="12" label="연속 일수" />
            <Divider />
            <Stat value="3" label="복용 약" />
            <Divider />
            <Stat value="89" unit="%" label="평균 복용률" />
          </div>
        </div>

        {/* Care group */}
        <div style={{
          background: 'linear-gradient(135deg, var(--teal-800), var(--teal-700))',
          borderRadius: 18, padding: '16px 18px', color: 'white',
          marginBottom: 14, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(94,234,212,0.15)' }}/>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>케어 그룹</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500 }}>가족 공유</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 1 }}>2명이 보고 있어요</div>
            </div>
            <div style={{ display: 'flex' }}>
              <Avatar name="아" size={32} bg="var(--coral-300)" fg="white"/>
              <Avatar name="딸" size={32} bg="var(--sand-200)" fg="var(--ink-700)" />
            </div>
          </div>
        </div>

        {/* Settings list */}
        <SettingGroup title="건강 정보">
          <SettingRow icon={<Ico.pill />} label="복용 중인 약" value="3개" />
          <SettingRow icon={<Ico.heart />} label="기저 질환" value="고혈압" />
          <SettingRow icon={<Ico.share />} label="병원·약국 공유" />
        </SettingGroup>

        <SettingGroup title="알림">
          <SettingRow icon={<Ico.bell />} label="복용 알림" value="켜짐" />
          <SettingRow icon={<Ico.pulse />} label="측정 알림" value="매주 월요일" />
        </SettingGroup>
      </div>
      <TabBar active="user" />
    </div>
  );
}

function Stat({ value, unit, label }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500 }} className="tabular">{value}</span>
        {unit && <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 1 }}>{label}</div>
    </div>
  );
}

function Divider() { return <div style={{ width: 1, background: 'var(--line)', alignSelf: 'stretch' }}/>; }

function SettingGroup({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>{title}</div>
      <div style={{ background: 'var(--paper)', borderRadius: 16, border: '1px solid var(--line-soft)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: '1px solid var(--line-soft)' }}>
      <span style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--cream-100)', color: 'var(--ink-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{label}</span>
      {value && <span style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{value}</span>}
      <span style={{ color: 'var(--ink-300)' }}><Ico.chev /></span>
    </div>
  );
}

Object.assign(window, { MetricsScreen, MedicineEditScreen, AIScreen, ProfileScreen });
