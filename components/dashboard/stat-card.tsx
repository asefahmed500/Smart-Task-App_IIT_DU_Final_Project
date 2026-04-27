import { Card } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  iconColor?: string
  iconBgColor?: string
}

export function StatCard({ icon: Icon, label, value, iconColor, iconBgColor }: StatCardProps) {
  return (
    <Card className="p-6 rounded-[20px]">
      <div className="flex items-center gap-3">
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', iconBgColor)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div>
          <p className="text-caption text-muted-foreground">{label}</p>
          <p className="text-section-heading font-waldenburg font-light">{value}</p>
        </div>
      </div>
    </Card>
  )
}
