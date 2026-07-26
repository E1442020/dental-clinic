import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-primary">٤٠٤</p>
      <p className="text-muted-foreground">الصفحة غير موجودة</p>
      <Button asChild>
        <Link to="/">العودة للوحة التحكم</Link>
      </Button>
    </div>
  )
}
