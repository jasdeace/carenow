import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PrivacyPolicy() {
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
          <h1 className="text-2xl font-bold">개인정보처리방침</h1>
        </header>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제1조 (수집하는 개인정보 항목 및 수집 방법)</h2>
            <p>'CareNow'는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>필수 항목:</strong> 이름, 휴대전화번호, 이메일 주소, 접속 로그</li>
              <li><strong>민감정보 (건강 관련 정보):</strong> 복약 일정 및 기록, 혈압, 혈당, 체중, 처방전 또는 약 봉투 이미지(OCR 활용 시) 등 사용자가 직접 입력하거나 업로드한 데이터</li>
              <li><strong>수집 방법:</strong> 앱 내 회원가입 및 서비스 이용 과정 중 사용자 직접 입력, 카메라를 통한 이미지 업로드</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제2조 (개인정보의 수집 및 이용 목적)</h2>
            <p>수집된 개인정보는 오직 다음의 목적을 위해서만 활용됩니다.</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>핵심 기능 제공:</strong> 개인 맞춤형 복약 알림 생성, 건강 지표 데이터 시각화 및 모니터링</li>
              <li><strong>데이터 공유:</strong> 사용자가 명시적으로 동의하고 연결한 보호자에게 건강 데이터 전송</li>
              <li><strong>고객 지원:</strong> 서비스 관련 공지 전달 및 문의 사항 처리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제3조 (민감정보 처리에 대한 별도 동의)</h2>
            <p>사용자의 건강 정보는 개인정보보호법에 따른 '민감정보'에 해당하며, 회사는 서비스 이용 시작 시 일반 개인정보와 분리하여 이에 대한 명시적인 별도 동의를 받습니다. 동의하지 않을 경우 해당 건강 관리 기능을 이용할 수 없습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제4조 (개인정보의 제3자 제공)</h2>
            <div className="space-y-2">
              <p>1. 회사는 사용자의 사전 동의 없이 개인정보를 제3자에게 제공하거나 마케팅 목적으로 외부 기관에 공유하지 않습니다.</p>
              <p>2. 사용자가 직접 앱 내 기능을 통해 연결한 보호자에게만 사용자의 건강 데이터가 공유됩니다. 단, 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따른 수사기관의 요구가 있는 경우는 예외로 합니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제5조 (개인정보의 보유 및 파기)</h2>
            <div className="space-y-2">
              <p>1. 회원의 개인정보는 서비스 이용 계약 해지(회원 탈퇴) 시 또는 수집 및 이용 동의를 철회하는 경우 지체 없이 파기합니다.</p>
              <p>2. 단, 관련 법령(통신비밀보호법 등)에 따라 일정 기간 보존이 필요한 접속 로그 등의 정보는 해당 기간 경과 후 파기됩니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제6조 (사용자의 권리 및 행사 방법)</h2>
            <p>사용자는 언제든지 앱 내 설정을 통해 자신의 개인정보를 조회하거나 수정할 수 있으며, 데이터 삭제 및 가입 해지를 요청할 권리가 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제7조 (개인정보의 안전성 확보 조치)</h2>
            <p>회사는 사용자의 소중한 정보를 보호하기 위해 다음과 같은 기술적 조치를 취합니다.</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>비밀번호 등 주요 데이터의 암호화 저장</li>
              <li>개인정보 전송 시 암호화 통신(SSL/TLS) 적용</li>
              <li>외부 침입으로부터 데이터를 보호하기 위한 보안 시스템 운영</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground pb-20">
          최종 수정일: 2026년 5월 15일
        </div>
      </div>
    </div>
  )
}
