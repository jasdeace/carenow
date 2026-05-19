import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SensitiveInfoPolicy() {
  useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-screen bg-background overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="shrink-0" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      
      <div className="p-6 max-w-2xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold">민감정보 수집 및 이용 동의</h1>
        </header>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <p className="text-foreground font-medium">
            CareNow는 사용자의 원활한 복약 관리 및 건강 지표 모니터링 서비스 제공을 위해 아래와 같이 민감정보(건강정보)를 수집 및 이용합니다. 내용을 자세히 읽으신 후 동의 여부를 결정해 주시기 바랍니다.
          </p>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. 수집 및 이용 목적</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li>개인 맞춤형 복약 알림 생성 및 일정 관리</li>
              <li>혈압, 혈당, 체중 등 건강 지표 데이터의 기록, 모니터링 및 시각화 제공</li>
              <li>사용자가 지정한 보호자(피보호자)와의 건강 데이터 공유</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. 수집하는 민감정보 항목</h2>
            <ul className="list-disc ml-5 space-y-2">
              <li><strong>건강 관련 정보:</strong> 복약 정보(처방 내역, 약품명 등), 혈압, 혈당, 체중 등 사용자가 앱 내에 직접 입력하거나 동기화한 건강 지표</li>
              <li><strong>이미지 정보 (해당 기능 이용 시):</strong> 복약 정보 자동 입력을 위해 사용자가 촬영하거나 업로드한 처방전 및 약 봉투 이미지 (텍스트 추출용)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. 민감정보의 보유 및 이용 기간</h2>
            <p><strong>회원 탈퇴 시 또는 민감정보 수집 및 이용 동의 철회 시 지체 없이 파기</strong></p>
            <p className="mt-2 text-sm">(단, 관계 법령에 의해 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관합니다.)</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. 동의를 거부할 권리 및 불이익</h2>
            <p>사용자는 민감정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 해당 정보는 CareNow의 핵심 서비스(복약 및 건강 기록 관리) 제공을 위해 반드시 필요한 정보이므로, 동의를 거부하실 경우 서비스 가입 및 이용이 제한됩니다.</p>
          </section>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground pb-20">
          최종 수정일: 2026년 5월 15일
        </div>
      </div>
    </div>
  )
}
