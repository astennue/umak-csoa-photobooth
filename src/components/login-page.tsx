'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Eye,
  EyeOff,
  Camera,
  Users,
  CalendarCheck,
  BarChart3,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
} from 'lucide-react'
import Image from 'next/image'

const features = [
  {
    icon: Camera,
    label: 'Session Management',
    description: 'Organize and track photobooth sessions seamlessly',
  },
  {
    icon: Users,
    label: 'Queue System',
    description: 'Manage guest queues with real-time updates',
  },
  {
    icon: CalendarCheck,
    label: 'Event Coordination',
    description: 'Schedule and coordinate multiple events',
  },
  {
    icon: BarChart3,
    label: 'Analytics Dashboard',
    description: 'Track performance with insightful metrics',
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── LEFT PANEL: Institutional Branding ── */}
      <div className="relative flex flex-col justify-between bg-[#041f1a] p-8 lg:w-[48%] lg:p-12 xl:p-16 overflow-hidden">
        {/* Subtle diagonal line pattern overlay — architectural, institutional */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 28px,
                rgba(255,255,255,0.25) 28px,
                rgba(255,255,255,0.25) 29px
              ),
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 28px,
                rgba(255,255,255,0.15) 28px,
                rgba(255,255,255,0.15) 29px
              )
            `,
          }}
        />

        {/* Solid accent bar at top — institutional header strip */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600" />

        {/* Thin vertical accent line on right edge — clean separation hint */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-white/[0.04] hidden lg:block" />

        {/* ── Main content ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg">
          {/* Logo block — solid, professional container */}
          <div className="mb-12">
            <div className="w-[72px] h-[72px] lg:w-20 lg:h-20 rounded-xl overflow-hidden bg-white p-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] ring-1 ring-white/10">
              <Image
                src="/umak-csoa-logo.png"
                alt="UMak CSOA Logo"
                width={80}
                height={80}
                sizes="(max-width: 1024px) 72px, 80px"
                className="object-contain w-full h-full"
                priority
              />
            </div>
          </div>

          {/* System identity — strong institutional typography */}
          <div className="space-y-6">
            <div>
              <h1 className="text-[2.5rem] lg:text-[3.25rem] xl:text-[3.75rem] font-extrabold tracking-[-0.02em] text-white leading-[1.05]">
                UMak CSOA
              </h1>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-[2px] w-8 bg-emerald-500" />
                <p className="text-sm lg:text-[15px] font-semibold text-emerald-400 tracking-wide uppercase">
                  Photobooth Management System
                </p>
              </div>
            </div>

            <p className="text-[13px] lg:text-sm text-emerald-200/40 max-w-sm leading-relaxed">
              Center for Student Organization &amp; Activities — Streamlining event photobooth
              operations for the entire university community.
            </p>
          </div>

          {/* Separator */}
          <div className="my-10 h-px w-full max-w-[240px] bg-white/[0.06]" />

          {/* Feature highlights — clean, refined list */}
          <ul className="space-y-5">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.05] ring-1 ring-white/[0.06]">
                  <feature.icon className="h-3.5 w-3.5 text-emerald-400/60" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white/70">{feature.label}</p>
                  <p className="text-[11px] text-white/25 mt-0.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Institutional footer */}
        <div className="relative z-10 mt-10 pt-5 border-t border-white/[0.05]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-white/15" />
            <p className="text-[11px] text-white/15 tracking-wide">
              University of Makati &middot; Center for Student Organization &amp; Activities
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Login Form ── */}
      <div className="flex flex-1 flex-col justify-center bg-[#f8faf8] p-8 lg:p-12 xl:p-16">
        <div className="mx-auto w-full max-w-[400px]">
          {/* Mobile-only logo + branding */}
          <div className="mb-10 lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-emerald-100 p-1.5">
              <Image
                src="/umak-csoa-logo.png"
                alt="UMak CSOA"
                width={40}
                height={40}
                sizes="40px"
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-bold text-[#041f1a] tracking-tight">UMak CSOA</p>
              <p className="text-[10px] text-emerald-700/40 font-semibold uppercase tracking-wider">
                Photobooth Manager
              </p>
            </div>
          </div>

          {/* Sign-in header */}
          <div className="mb-9">
            <h2 className="text-2xl font-bold text-[#041f1a] tracking-tight">
              Sign in
            </h2>
            <p className="mt-2.5 text-[13px] text-emerald-900/35 leading-relaxed">
              Enter your credentials to access the photobooth management system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message — clean, professional alert */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200/80 px-4 py-3.5 text-[13px] flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="mt-px w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 ring-1 ring-red-200/60">
                  <span className="text-red-500 text-[10px] font-bold leading-none">!</span>
                </div>
                <div className="text-red-800">
                  <span className="font-semibold">Sign in failed.</span>{' '}
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-[13px] font-medium text-[#041f1a]/60"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-400/40 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@umak.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 pl-10 rounded-lg border-emerald-200/50 bg-white text-[#041f1a] placeholder:text-emerald-300/60 focus:border-emerald-500 focus:ring-emerald-500/10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors duration-200"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[13px] font-medium text-[#041f1a]/60"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-400/40 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 pl-10 pr-11 rounded-lg border-emerald-200/50 bg-white text-[#041f1a] placeholder:text-emerald-300/60 focus:border-emerald-500 focus:ring-emerald-500/10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors duration-200"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-emerald-400/50 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-11 text-white font-semibold text-sm rounded-lg bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-700/25 border-0 mt-2 shadow-[0_1px_4px_rgba(4,31,26,0.15)] transition-all duration-200 active:scale-[0.985] disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Institutional footer */}
          <div className="mt-14 pt-5 border-t border-emerald-100/50">
            <div className="flex items-center justify-center gap-1.5">
              <Building2 className="h-3 w-3 text-emerald-300/50" />
              <p className="text-[11px] text-emerald-800/20 tracking-wide">
                University of Makati &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
