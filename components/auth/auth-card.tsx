import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
}

export default function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <Card
        variant="default"
        className="w-full max-w-md p-8 shadow-[rgba(0,0,0,0.06)_0px_0px_0px_1px,_rgba(0,0,0,0.04)_0px_1px_2px,_rgba(0,0,0,0.04)_0px_2px_4px]"
      >
        <CardHeader className="space-y-4 pb-6">
          <CardTitle className="text-section-heading font-waldenburg font-light text-center text-black">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-body text-[#4e4e4e] text-center tracking-[0.18px]">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
