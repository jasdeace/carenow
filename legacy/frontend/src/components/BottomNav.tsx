import { Home, HeartPulse, Pill, Sparkles, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/vitals', label: t('nav.vitals'), icon: HeartPulse },
    { path: '/medications', label: t('nav.meds'), icon: Pill },
    { path: '/ai', label: 'AI', icon: Sparkles },
    { path: '/profile', label: t('nav.profile'), icon: User },
  ]

  return (
    <div className="shrink-0 border-t bg-background flex justify-between items-center z-50 px-4 h-14" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxSizing: 'content-box' }}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
