import { Home, HeartPulse, Pill, FileText, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/vitals', label: t('nav.vitals'), icon: HeartPulse },
    { path: '/medications', label: t('nav.meds'), icon: Pill },
    { path: '/labs', label: t('nav.labs'), icon: FileText },
    { path: '/profile', label: t('nav.profile'), icon: User },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-2 flex justify-between items-center z-50">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`flex flex-col items-center justify-center w-full py-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
