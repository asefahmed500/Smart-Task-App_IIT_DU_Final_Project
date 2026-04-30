import Link from 'next/link'
import AuthCard from '@/components/auth/auth-card'
import LoginForm from '@/components/auth/login-form'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign In"
      description="Enter your credentials to access your account"
    >
      <LoginForm />
      <div className="mt-6 text-center text-caption text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/register">
          <Button variant="link" className="p-0 h-auto text-caption text-primary underline">
            Sign up
          </Button>
        </Link>
      </div>
    </AuthCard>
  )
}
