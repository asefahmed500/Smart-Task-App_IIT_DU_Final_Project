import Link from 'next/link'
import AuthCard from '@/components/auth/auth-card'
import RegisterForm from '@/components/auth/register-form'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create Account"
      description="Set up your Smart Task Manager account"
    >
      <RegisterForm />
      <div className="mt-6 text-center text-caption text-[#777169]">
        Already have an account?{' '}
        <Link href="/login">
          <Button variant="link" className="p-0 h-auto text-caption text-black underline">
            Sign in
          </Button>
        </Link>
      </div>
    </AuthCard>
  )
}
