'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, Camera, Users, CalendarCheck, BarChart3 } from 'lucide-react'
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
      <div className="relative flex flex-col justify-between bg-stone-900 p-8 lg:w-1/2 lg:p-12 xl:p-16 overflow-hidden">
        {/* Subtle dot pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #a8a29e 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-xl overflow-hidden bg-white shadow-lg ring-1 ring-white/10 p-1.5">
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
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-white">
            UMak CSOA
          </h1>
          <p className="mt-2 text-lg lg:text-xl font-semibold text-teal-400">
            Photobooth Management System
          </p>
          <p className="mt-1 text-sm lg:text-base text-stone-400">
            Center for Student Organization &amp; Activities
          </p>

          {/* Divider */}
          <div className="my-8 h-px w-16 bg-teal-700" />

          {/* Feature highlights */}
          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-900/50 ring-1 ring-teal-800/50">
                  <feature.icon className="h-4 w-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-200">{feature.label}</p>
                  <p className="text-xs text-stone-500">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-8 pt-6 border-t border-stone-800">
          <p className="text-xs text-stone-500">
            University of Makati &middot; Center for Student Organization &amp; Activities
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL: Login Form ── */}
      <div className="flex flex-1 flex-col justify-center bg-stone-800 p-8 lg:p-12 xl:p-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Sign In header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Sign In</h2>
            <p className="mt-1 text-sm text-stone-400">
              Enter your credentials to access the system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-900/50 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-stone-300">
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
                className="h-11 rounded-lg bg-stone-900/50 border-stone-700 text-stone-100 placeholder:text-stone-600 focus:border-teal-600 focus:ring-teal-600/20"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-stone-300">
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
                  className="h-11 pr-10 rounded-lg bg-stone-900/50 border-stone-700 text-stone-100 placeholder:text-stone-600 focus:border-teal-600 focus:ring-teal-600/20"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-stone-500 hover:text-stone-300 hover:bg-transparent"
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
              className="w-full h-11 text-white font-semibold text-base rounded-lg bg-teal-700 hover:bg-teal-600 focus:ring-teal-500/50 border-0 mt-2"
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
          <p className="mt-8 text-center text-xs text-stone-600">
            University of Makati &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
