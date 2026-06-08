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
      <div className="relative flex flex-col justify-between bg-stone-900 p-8 lg:w-[52%] lg:p-14 xl:p-20 overflow-hidden">
        {/* Very subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #d6d3d1 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        
        {/* Subtle accent line on left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-600 via-teal-700 to-stone-900" />

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          {/* Logo with subtle glow */}
          <div className="mb-10">
            <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-white shadow-xl ring-1 ring-black/5 p-2">
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

          {/* System name - bold and confident */}
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white">
              UMak CSOA
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-10 bg-teal-600 rounded-full" />
              <p className="text-lg lg:text-xl font-semibold text-teal-400">
                Photobooth Management System
              </p>
            </div>
            <p className="text-sm lg:text-base text-stone-400 max-w-md">
              Center for Student Organization &amp; Activities
            </p>
          </div>

          {/* Divider */}
          <div className="my-10 h-px w-full max-w-xs bg-stone-800" />

          {/* Feature highlights - clean list style */}
          <ul className="space-y-5">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-800 ring-1 ring-stone-700/50">
                  <feature.icon className="h-4 w-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-200">{feature.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-10 pt-6 border-t border-stone-800/80">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-stone-600" />
            <p className="text-xs text-stone-600">
              University of Makati &middot; Center for Student Organization &amp; Activities
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Login Form ── */}
      <div className="flex flex-1 flex-col justify-center bg-stone-50 p-8 lg:p-14 xl:p-20 border-l border-stone-200">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo (visible on small screens only) */}
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white shadow ring-1 ring-black/5 p-0.5">
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
              <p className="text-sm font-bold text-stone-800">UMak CSOA</p>
              <p className="text-[10px] text-stone-500">Photobooth Manager</p>
            </div>
          </div>

          {/* Sign In header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-stone-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-stone-500">
              Sign in to access the photobooth management system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-stone-700">
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
                className="h-11 rounded-lg bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:ring-teal-600/20"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-stone-700">
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
                  className="h-11 pr-10 rounded-lg bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:ring-teal-600/20"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-stone-400 hover:text-stone-600 hover:bg-transparent"
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
              className="w-full h-11 text-white font-semibold text-base rounded-lg bg-teal-700 hover:bg-teal-600 focus:ring-teal-500/50 border-0 mt-2 shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Bottom text */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <p className="text-center text-xs text-stone-400">
              University of Makati &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
