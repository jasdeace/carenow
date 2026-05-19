import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TermsOfService() {
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
          <h1 className="text-2xl font-bold">이용약관</h1>
        </header>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제1조 (목적)</h2>
            <p>
              본 약관은 'CareNow'(이하 "서비스")가 제공하는 복약 관리 및 건강 지표 기록 서비스의 이용 조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제2조 (의료 정보에 관한 고지 및 면책)</h2>
            <div className="space-y-2">
              <p>1. 서비스는 사용자의 자가 건강 관리를 돕는 보조 도구이며, 전문적인 의료 진단, 조언 또는 치료를 대체하지 않습니다.</p>
              <p>2. 서비스에서 제공하는 모든 정보는 참고용입니다. 회원은 의학적 결정이나 복약 변경 전 반드시 전문 의료진과 상의해야 합니다.</p>
              <p>3. 서비스는 응급 의료 상황을 위한 기능이 아니며, 위급 상황 발생 시 회원은 즉시 응급 서비스(119 등)를 이용해야 합니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제3조 (이용 자격 및 연령 제한)</h2>
            <div className="space-y-2">
              <p>1. 서비스는 만 14세 이상의 사용자를 대상으로 합니다.</p>
              <p>2. 만 14세 미만의 아동이 서비스를 이용하고자 할 경우, 법정대리인의 동의를 얻는 별도의 절차를 거쳐야 하며, 회사는 이를 확인하기 위한 추가 정보를 요청할 수 있습니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제4조 (사용자의 의무)</h2>
            <div className="space-y-2">
              <p>1. 사용자는 본인의 정확한 건강 정보를 입력해야 하며, 허위 정보를 입력하여 발생하는 결과에 대한 책임은 사용자 본인에게 있습니다.</p>
              <p>2. 사용자는 계정 정보(ID, 비밀번호 등)를 안전하게 관리해야 하며, 타인에게 공유하거나 도용해서는 안 됩니다.</p>
              <p>3. 타인의 명의 도용, 서비스의 부정 이용, 시스템 해킹 시도 등 서비스 운영을 방해하는 행위는 엄격히 금지됩니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제5조 (서비스의 변경 및 중단)</h2>
            <div className="space-y-2">
              <p>1. 회사는 기술적 필요 또는 운영상 개선을 위해 서비스의 일부 또는 전부를 변경하거나 중단할 수 있습니다.</p>
              <p>2. 서비스의 중대한 변경이 있을 경우, 회사는 앱 내 공지사항 또는 전자우편을 통해 사전에 고지합니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제6조 (이용 제한 및 계약 해지)</h2>
            <div className="space-y-2">
              <p>1. 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해하는 경우, 회사는 사전 통지 후 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.</p>
              <p>2. 회원은 언제든지 앱 내 설정을 통해 이용 계약 해지(회원 탈퇴)를 요청할 수 있습니다.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">제7조 (책임의 한계)</h2>
            <div className="space-y-2">
              <p>1. 회사는 천재지변, 전시, 네트워크 장애 등 회사가 통제할 수 없는 사유로 인해 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.</p>
              <p>2. 회사는 사용자가 입력한 데이터의 오류나 사용자의 부주의로 인해 발생하는 문제에 대해 고의 또는 중과실이 없는 한 책임을 면합니다.</p>
            </div>
          </section>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground pb-20">
          최종 수정일: 2026년 5월 15일
        </div>
      </div>
    </div>
  )
}
