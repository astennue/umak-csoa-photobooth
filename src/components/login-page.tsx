'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, Camera, Users, CalendarCheck, BarChart3, Shield } from 'lucide-react'
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
      {/* ── LEFT PANEL: Branding ── */}
      <div className="relative flex flex-col justify-between bg-slate-900 p-8 lg:w-[52%] lg:p-14 xl:p-20 overflow-hidden">
        {/* Subtle dot grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #e2e8f0 0.8px, transparent 0.8px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Thin accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

        {/* Soft ambient glow behind logo */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/[0.03] blur-3xl" />

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          {/* Logo with gentle pulse */}
          <div className="mb-10">
            <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-white shadow-2xl ring-1 ring-white/10 p-2.5 animate-[subtle-pulse_4s_ease-in-out_infinite]">
              <Image
                src="/umak-csoa-logo.png"
                alt="UMak CSOA Logo"
                fill
                sizes="(max-width: 1024px) 80px, 96px"
                className="object-contain p-1"
                priority
              />
            </div>
          </div>

          {/* System name */}
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              UMak CSOA
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-[2px] w-8 bg-emerald-500 rounded-full" />
              <p className="text-base lg:text-lg font-semibold text-emerald-400/90">
                Photobooth Management System
              </p>
            </div>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Center for Student Organization &amp; Activities — Streamlining event photobooth operations for the entire university.
            </p>
          </div>

          {/* Divider */}
          <div className="my-10 h-px w-full max-w-xs bg-slate-800" />

          {/* Feature highlights */}
          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800/80 ring-1 ring-slate-700/50">
                  <feature.icon className="h-3.5 w-3.5 text-emerald-400/80" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">{feature.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-10 pt-6 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-slate-700" />
            <p className="text-xs text-slate-700">
              University of Makati &middot; Center for Student Organization &amp; Activities
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Login Form ── */}
      <div className="flex flex-1 flex-col justify-center bg-white p-8 lg:p-14 xl:p-20 border-l border-slate-100">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo (visible on small screens only) */}
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-50 shadow-sm ring-1 ring-slate-200/80 p-0.5">
              <Image
                src="/umak-csoa-logo.png"
                alt="UMak CSOA"
                fill
                sizes="40px"
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">UMak CSOA</p>
              <p className="text-[10px] text-slate-400">Photobooth Manager</p>
            </div>
          </div>

          {/* Sign In header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
              Sign in to access the photobooth management system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3.5 text-sm text-red-600">
                <span className="font-medium">Sign in failed.</span> {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-slate-600"
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
                className="h-11 rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 bg-white"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-600"
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
                  className="h-11 pr-10 rounded-lg border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 bg-white"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-slate-300 hover:text-slate-500 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
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
              className="w-full h-11 text-white font-semibold text-sm rounded-lg bg-slate-900 hover:bg-slate-800 focus:ring-slate-900/30 border-0 mt-2 shadow-sm transition-colors"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Bottom text */}
          <div className="mt-10 pt-6 border-t border-slate-100">
            <p className="text-center text-xs text-slate-300">
              University of Makati &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

      {/* Global keyframes for subtle animations */}
      <style jsx global>{`
        @keyframes subtle-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  )
}
