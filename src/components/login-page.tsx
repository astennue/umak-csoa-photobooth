'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, Camera, Sparkles } from 'lucide-react'
import Image from 'next/image'

/* ------------------------------------------------------------------ */
/*  Inline keyframes & particle styles – scoped to this component     */
/* ------------------------------------------------------------------ */
const injectedStyles = `
@keyframes blob1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25%      { transform: translate(60px, -40px) scale(1.12); }
  50%      { transform: translate(-30px, 50px) scale(0.95); }
  75%      { transform: translate(40px, 20px) scale(1.08); }
}
@keyframes blob2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25%      { transform: translate(-50px, 30px) scale(1.1); }
  50%      { transform: translate(40px, -60px) scale(0.92); }
  75%      { transform: translate(-20px, -30px) scale(1.06); }
}
@keyframes blob3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(70px, 40px) scale(1.14); }
  66%      { transform: translate(-50px, -20px) scale(0.9); }
}
@keyframes blob4 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  30%      { transform: translate(-60px, -50px) scale(1.1); }
  60%      { transform: translate(30px, 60px) scale(0.94); }
}
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.35; }
  50%      { transform: translateY(-30px) rotate(180deg); opacity: 0.7; }
}
@keyframes float2 {
  0%, 100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0.25; }
  50%      { transform: translateY(-40px) rotate(-120deg) scale(1.15); opacity: 0.6; }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 18px 4px rgba(16,185,129,.35), 0 0 60px 10px rgba(20,184,166,.15); }
  50%      { box-shadow: 0 0 28px 8px rgba(16,185,129,.55), 0 0 80px 20px rgba(20,184,166,.25); }
}
@keyframes gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes star-twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.8); }
  50%      { opacity: 0.9; transform: scale(1.2); }
}

.login-blob-1 { animation: blob1 18s ease-in-out infinite; }
.login-blob-2 { animation: blob2 22s ease-in-out infinite; }
.login-blob-3 { animation: blob3 20s ease-in-out infinite; }
.login-blob-4 { animation: blob4 24s ease-in-out infinite; }

.login-particle       { animation: float  8s ease-in-out infinite; }
.login-particle-alt   { animation: float2 10s ease-in-out infinite; }
.login-star           { animation: star-twinkle 3s ease-in-out infinite; }

.login-logo-glow {
  animation: glow-pulse 3s ease-in-out infinite;
}

.login-shimmer-text {
  background: linear-gradient(90deg, #059669, #14b8a6, #06b6d4, #14b8a6, #059669);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 4s linear infinite;
}

.login-bg-animated {
  background: linear-gradient(-45deg, #022c22, #064e3b, #0f766e, #115e59, #134e4a, #042f2e, #0d9488, #065f46);
  background-size: 400% 400%;
  animation: gradient-shift 16s ease infinite;
}

.login-btn-gradient {
  background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%);
  background-size: 200% auto;
  transition: all 0.4s ease;
}
.login-btn-gradient:hover {
  background-position: right center;
  box-shadow: 0 8px 30px -4px rgba(13,148,136,.55), 0 0 0 2px rgba(20,184,166,.3);
  transform: translateY(-1px);
}
.login-btn-gradient:active {
  transform: translateY(0);
}
.login-btn-gradient:disabled {
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.login-card-glass {
  background: rgba(255,255,255,.12);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,.18);
}

.login-input-glass {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  color: #f0fdfa;
  transition: all 0.25s ease;
}
.login-input-glass::placeholder {
  color: rgba(204,251,241,.45);
}
.login-input-glass:focus {
  background: rgba(255,255,255,.14);
  border-color: rgba(20,184,166,.6);
  box-shadow: 0 0 0 3px rgba(20,184,166,.15);
}
`

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
    <>
      {/* Inject scoped animations */}
      <style dangerouslySetInnerHTML={{ __html: injectedStyles }} />

      <div className="min-h-screen flex items-center justify-center login-bg-animated p-4 relative overflow-hidden">
        {/* ── Animated gradient blobs ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Emerald blob – top right */}
          <div className="login-blob-1 absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-500/25 blur-[100px]" />
          {/* Teal blob – bottom left */}
          <div className="login-blob-2 absolute -bottom-40 -left-40 w-[550px] h-[550px] rounded-full bg-teal-400/20 blur-[100px]" />
          {/* Cyan blob – center right */}
          <div className="login-blob-3 absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-400/15 blur-[90px]" />
          {/* Gold/amber accent blob – top left */}
          <div className="login-blob-4 absolute -top-20 left-1/4 w-[350px] h-[350px] rounded-full bg-amber-400/10 blur-[80px]" />
          {/* Deep emerald blob – bottom center */}
          <div className="login-blob-1 absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-emerald-600/15 blur-[120px]" style={{ animationDelay: '-5s' }} />
        </div>

        {/* ── Floating particles / photobooth shapes ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Camera aperture rings */}
          <div className="login-particle absolute top-[12%] left-[8%] w-8 h-8 rounded-full border-2 border-emerald-400/30" style={{ animationDelay: '0s' }} />
          <div className="login-particle absolute top-[22%] right-[12%] w-6 h-6 rounded-full border-2 border-teal-300/25" style={{ animationDelay: '-2s' }} />
          <div className="login-particle-alt absolute bottom-[18%] left-[15%] w-10 h-10 rounded-full border-2 border-cyan-300/20" style={{ animationDelay: '-4s' }} />
          <div className="login-particle absolute bottom-[28%] right-[8%] w-7 h-7 rounded-full border-2 border-emerald-300/25" style={{ animationDelay: '-6s' }} />

          {/* Diamond / rotated squares – like photo frames */}
          <div className="login-particle-alt absolute top-[35%] left-[5%] w-5 h-5 border border-teal-400/20 rotate-45" style={{ animationDelay: '-1s' }} />
          <div className="login-particle absolute top-[65%] right-[6%] w-4 h-4 border border-cyan-400/20 rotate-45" style={{ animationDelay: '-3s' }} />
          <div className="login-particle-alt absolute top-[50%] left-[88%] w-6 h-6 border border-emerald-400/15 rotate-45" style={{ animationDelay: '-7s' }} />

          {/* Sparkle / star dots */}
          <div className="login-star absolute top-[8%] left-[25%] w-2 h-2 rounded-full bg-amber-300/60" style={{ animationDelay: '0s' }} />
          <div className="login-star absolute top-[45%] left-[3%] w-1.5 h-1.5 rounded-full bg-teal-300/70" style={{ animationDelay: '-1.5s' }} />
          <div className="login-star absolute top-[15%] right-[20%] w-2 h-2 rounded-full bg-cyan-300/50" style={{ animationDelay: '-0.8s' }} />
          <div className="login-star absolute bottom-[12%] right-[25%] w-1.5 h-1.5 rounded-full bg-emerald-300/60" style={{ animationDelay: '-2.2s' }} />
          <div className="login-star absolute top-[55%] right-[18%] w-2.5 h-2.5 rounded-full bg-amber-200/40" style={{ animationDelay: '-3.5s' }} />
          <div className="login-star absolute bottom-[40%] left-[10%] w-2 h-2 rounded-full bg-teal-200/50" style={{ animationDelay: '-0.5s' }} />
          <div className="login-star absolute top-[75%] left-[35%] w-1.5 h-1.5 rounded-full bg-cyan-200/50" style={{ animationDelay: '-2.8s' }} />
          <div className="login-star absolute top-[30%] left-[45%] w-2 h-2 rounded-full bg-emerald-200/35" style={{ animationDelay: '-1.2s' }} />

          {/* Camera icon shapes */}
          <div className="login-particle-alt absolute top-[80%] left-[70%] opacity-20" style={{ animationDelay: '-5s' }}>
            <Camera className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="login-particle absolute top-[6%] left-[55%] opacity-15" style={{ animationDelay: '-8s' }}>
            <Camera className="w-5 h-5 text-teal-300" />
          </div>
          <div className="login-particle-alt absolute bottom-[8%] left-[40%] opacity-15" style={{ animationDelay: '-3s' }}>
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
        </div>

        {/* ── Main login card ── */}
        <div className="w-full max-w-md relative z-10">
          <Card className="login-card-glass shadow-[0_8px_60px_-12px_rgba(0,0,0,.5),0_0_120px_-20px_rgba(20,184,166,.12)] rounded-2xl overflow-hidden">
            <CardHeader className="text-center pb-3 pt-8 px-8">
              {/* Logo with glow */}
              <div className="flex justify-center mb-5">
                <div className="login-logo-glow relative w-24 h-24 rounded-2xl overflow-hidden bg-white/90 shadow-xl p-1.5">
                  <Image
                    src="/umak-csoa-logo.png"
                    alt="UMak CSOA Logo"
                    fill
                    sizes="96px"
                    className="object-contain p-1"
                    priority
                  />
                </div>
              </div>

              {/* Prominent branding */}
              <h1 className="text-3xl font-extrabold tracking-tight login-shimmer-text">
                UMak CSOA
              </h1>
              <p className="text-lg font-semibold text-teal-200 mt-1">
                Photobooth Management System
              </p>
              <p className="text-sm text-emerald-300/70 mt-1">
                Center for Student Organization &amp; Activities
              </p>
            </CardHeader>

            <CardContent className="px-8 pb-8 pt-2">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error message */}
                {error && (
                  <div className="rounded-xl bg-red-500/15 border border-red-400/25 p-3 text-sm text-red-200 backdrop-blur-sm">
                    {error}
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-emerald-100/90">
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
                    className="login-input-glass h-11 rounded-xl"
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-emerald-100/90">
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
                      className="login-input-glass h-11 pr-10 rounded-xl"
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-teal-300/60 hover:text-teal-200 hover:bg-transparent"
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
                  className="login-btn-gradient w-full h-12 text-white font-semibold text-base rounded-xl border-0 mt-2"
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

              {/* Footer branding */}
              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <p className="text-sm font-medium text-teal-200/70">
                  University of Makati
                </p>
                <p className="text-xs text-emerald-300/40 mt-1">
                  Center for Student Organization &amp; Activities
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
