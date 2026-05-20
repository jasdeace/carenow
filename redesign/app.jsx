/* global React, ReactDOM,
   DesignCanvas, DCSection, DCArtboard,
   HomeA, HomeB, HomeC,
   MetricsScreen, MedicineEditScreen, AIScreen, ProfileScreen,
   BrandLogos, BrandFavicons, BrandColors, BrandType */

// Phone dimensions for all app screens
const PHONE_W = 380;
const PHONE_H = 800;

function PhoneFrame({ children }) {
  return (
    <div style={{
      width: PHONE_W, height: PHONE_H,
      background: 'var(--cream-50)',
      borderRadius: 44,
      border: '10px solid #0F2C2E',
      boxShadow: '0 30px 60px -20px rgba(15,44,46,0.35), 0 0 0 1px rgba(15,44,46,0.05)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 105, height: 30, borderRadius: 999, background: '#0F2C2E',
        zIndex: 50,
      }}/>
      {children}
    </div>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="brand" title="01 · Brand" subtitle="로고 · 파비콘 · 색상 · 타이포그래피">
        <DCArtboard id="logos"    label="Logo system"    width={696} height={776}><BrandLogos /></DCArtboard>
        <DCArtboard id="favicons" label="Favicon set"    width={536} height={776}><BrandFavicons /></DCArtboard>
        <DCArtboard id="colors"   label="Color palette"  width={696} height={596}><BrandColors /></DCArtboard>
        <DCArtboard id="type"     label="Typography"     width={696} height={576}><BrandType /></DCArtboard>
      </DCSection>

      <DCSection id="home" title="02 · Home" subtitle="홈 — 같은 데이터, 세 가지 레이아웃">
        <DCArtboard id="home-a" label="A · Editorial" width={PHONE_W} height={PHONE_H}><PhoneFrame><HomeA /></PhoneFrame></DCArtboard>
        <DCArtboard id="home-b" label="B · Timeline"  width={PHONE_W} height={PHONE_H}><PhoneFrame><HomeB /></PhoneFrame></DCArtboard>
        <DCArtboard id="home-c" label="C · Refined original" width={PHONE_W} height={PHONE_H}><PhoneFrame><HomeC /></PhoneFrame></DCArtboard>
      </DCSection>

      <DCSection id="screens" title="03 · Core screens" subtitle="건강수치 · 약 수정 · AI · 프로필">
        <DCArtboard id="metrics"  label="건강수치"  width={PHONE_W} height={PHONE_H}><PhoneFrame><MetricsScreen /></PhoneFrame></DCArtboard>
        <DCArtboard id="medicine" label="약 수정"   width={PHONE_W} height={PHONE_H}><PhoneFrame><MedicineEditScreen /></PhoneFrame></DCArtboard>
        <DCArtboard id="ai"       label="AI 건강 도우미" width={PHONE_W} height={PHONE_H}><PhoneFrame><AIScreen /></PhoneFrame></DCArtboard>
        <DCArtboard id="profile"  label="프로필"   width={PHONE_W} height={PHONE_H}><PhoneFrame><ProfileScreen /></PhoneFrame></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
