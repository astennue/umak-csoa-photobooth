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
      <div className="relative flex flex-col justify-between bg-emerald-950 p-8 lg:w-[50%] lg:p-12 xl:p-16 overflow-hidden">
        {/* Subtle cross-hatch pattern overlay for texture — NOT a gradient */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Solid accent strip at the very top — clean, institutional */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />

        {/* Soft radial light source behind logo for depth — very subtle */}
        <div className="pointer-events-none absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-700/[0.08] blur-[100px]" />

        {/* ── Main content ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          {/* Logo block */}
          <div className="mb-10">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-white p-2 shadow-lg shadow-black/20">
              <Image
                src="/umak-csoa-logo.png"
                alt="UMak CSOA Logo"
                width={96}
                height={96}
                sizes="(max-width: 1024px) 80px, 96px"
                className="object-contain w-full h-full"
                priority
              />
            </div>
          </div>

          {/* System identity */}
          <div className="space-y-5">
            <div>
              <h1 className="text-4xl lg:text-5xl xl:text-[3.4rem] font-extrabold tracking-tight text-white leading-[1.08]">
                UMak CSOA
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-[2px] w-10 bg-emerald-500 rounded-full" />
              <p className="text-base lg:text-lg font-semibold text-emerald-400">
                Photobooth Management System
              </p>
            </div>

            <p className="text-sm text-emerald-200/50 max-w-md leading-relaxed">
              Center for Student Organization &amp; Activities — Streamlining event photobooth
              operations for the entire university community.
            </p>
          </div>

          {/* Separator */}
          <div className="my-10 h-px w-full max-w-xs bg-white/[0.06]" />

          {/* Feature highlights */}
          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                  <feature.icon className="h-4 w-4 text-emerald-400/70" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">{feature.label}</p>
                  <p className="text-xs text-white/30 mt-0.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-10 pt-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-white/20" />
            <p className="text-xs text-white/20">
              University of Makati &middot; Center for Student Organization &amp; Activities
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Login Form ── */}
      <div className="flex flex-1 flex-col justify-center bg-[#fafbf9] p-8 lg:p-12 xl:p-16">
        <div className="mx-auto w-full max-w-[380px]">
          {/* Mobile-only logo + branding */}
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white shadow-sm border border-emerald-100 p-1.5">
              <Image
                src="/umak-csoa-logo.png"
                alt="UMak CSOA"
                width={44}
                height={44}
                sizes="44px"
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">UMak CSOA</p>
              <p className="text-[11px] text-emerald-700/50 font-medium">
                Photobooth Manager
              </p>
            </div>
          </div>

          {/* Sign-in header */}
          <div className="mb-8">
            <h2 className="text-[1.65rem] font-bold text-emerald-950 tracking-tight">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-emerald-800/40 leading-relaxed">
              Enter your credentials to access the photobooth management system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700 flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <span className="text-red-500 text-xs font-bold">!</span>
                </div>
                <div>
                  <span className="font-semibold">Sign in failed.</span>{' '}
                  <span className="text-red-600">{error}</span>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-emerald-950/70"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@umak.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl border-emerald-200/60 bg-white text-emerald-950 placeholder:text-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/15 shadow-sm"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-emerald-950/70"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 pr-11 rounded-xl border-emerald-200/60 bg-white text-emerald-950 placeholder:text-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/15 shadow-sm"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
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

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-white font-semibold text-sm rounded-xl bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-700/30 border-0 mt-3 shadow-md shadow-emerald-700/20 transition-all duration-200 active:scale-[0.98]"
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
          <div className="mt-12 pt-6 border-t border-emerald-100/60">
            <div className="flex items-center justify-center gap-1.5">
              <Building2 className="h-3 w-3 text-emerald-300" />
              <p className="text-xs text-emerald-800/25">
                University of Makati &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
