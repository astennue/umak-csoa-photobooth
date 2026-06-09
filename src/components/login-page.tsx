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
  AlertCircle,
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
      } else {
        // Force a full page reload to refresh the session state
        window.location.reload()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ───────────────────────────────────────────────
          LEFT PANEL — Institutional Branding
          Solid deep-emerald background with subtle dot-grid texture.
          No gradients. No glow effects. Pure institutional presence.
      ─────────────────────────────────────────────── */}
      <div className="relative flex flex-col justify-between bg-[#011a14] p-8 lg:w-[46%] lg:p-12 xl:p-16 overflow-hidden">
        {/* Subtle dot-grid texture overlay — institutional, architectural */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Solid accent bar at top — institutional header weight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-700" />

        {/* Thin vertical accent on right edge — clean panel separation */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-white/[0.04] hidden lg:block" />

        {/* ── Main content ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md">
          {/* Logo — solid, prominent, institutional */}
          <div className="mb-14">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-white p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.08]">
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

          {/* System identity — strong institutional typography */}
          <div className="space-y-6">
            <div>
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-[-0.03em] text-white leading-[1.05]">
                UMak CSOA
              </h1>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-[2px] w-10 bg-emerald-600" />
                <p className="text-[11px] lg:text-xs font-bold text-emerald-400 tracking-[0.18em] uppercase">
                  Photobooth Management System
                </p>
              </div>
            </div>

            <p className="text-[13px] lg:text-sm text-emerald-100/25 max-w-sm leading-relaxed">
              Center for Student Organization &amp; Activities — Streamlining event
              photobooth operations for the University of Makati community.
            </p>
          </div>

          {/* Separator */}
          <div className="my-10 h-px w-full max-w-[200px] bg-white/[0.06]" />

          {/* Feature highlights — clean, refined list */}
          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
                  <feature.icon className="h-4 w-4 text-emerald-500/50" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white/60">
                    {feature.label}
                  </p>
                  <p className="text-[11px] text-white/20 mt-0.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Institutional footer */}
        <div className="relative z-10 mt-10 pt-6 border-t border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-white/[0.12]" />
            <p className="text-[11px] text-white/[0.12] tracking-wide">
              University of Makati &middot; Center for Student Organization &amp;
              Activities
            </p>
          </div>
          <p className="text-[10px] text-white/[0.06] mt-2 tracking-wide ml-6">
            &copy; {new Date().getFullYear()} UMak CSOA. All rights reserved.
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────
          RIGHT PANEL — Login Form
          Clean white background with subtle depth.
          Professional, spacious, trustworthy.
      ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-white">
        {/* Top accent bar on right panel — mirrors left panel */}
        <div className="h-1 bg-emerald-700/10 lg:hidden" />

        <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-12 xl:px-20">
          <div className="mx-auto w-full max-w-[380px]">
            {/* Mobile-only logo + branding */}
            <div className="mb-10 lg:hidden flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#011a14] p-2 shadow-sm ring-1 ring-emerald-900/10">
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
                <p className="text-[15px] font-bold text-[#011a14] tracking-tight">
                  UMak CSOA
                </p>
                <p className="text-[9px] text-emerald-700/40 font-bold uppercase tracking-[0.15em]">
                  Photobooth Manager
                </p>
              </div>
            </div>

            {/* Sign-in header */}
            <div className="mb-10">
              <h2 className="text-[26px] font-bold text-[#011a14] tracking-[-0.02em]">
                Welcome back
              </h2>
              <p className="mt-2.5 text-[13px] text-slate-400 leading-relaxed">
                Sign in to your account to access the management system
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error message — clean, professional alert */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-4 text-[13px] flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-red-900">
                      Sign in failed
                    </span>
                    <p className="text-red-700/80 mt-0.5 leading-snug">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[13px] font-semibold text-slate-600"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@umak.edu.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 pl-10 rounded-xl border-slate-200 bg-white text-[#011a14] text-[15px] placeholder:text-slate-300 focus:border-emerald-600 focus:ring-emerald-600/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-[13px] font-semibold text-slate-600"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 pl-10 pr-12 rounded-xl border-slate-200 bg-white text-[#011a14] text-[15px] placeholder:text-slate-300 focus:border-emerald-600 focus:ring-emerald-600/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
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
                className="w-full h-12 text-white font-semibold text-[15px] rounded-xl bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-700/20 border-0 mt-3 shadow-[0_2px_8px_rgba(4,30,26,0.18)] transition-all duration-200 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Institutional footer */}
        <div className="px-8 lg:px-12 xl:px-20 pb-8">
          <div className="mx-auto max-w-[380px] pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-1.5">
              <Building2 className="h-3 w-3 text-slate-300" />
              <p className="text-[11px] text-slate-300 tracking-wide">
                University of Makati &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
