'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Send,
  AlertTriangle,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ConfigItem {
  key: string
  value: string
  isSet: boolean
}

export default function EmailSettings() {
  const queryClient = useQueryClient()
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false)

  // Fetch current config
  const {
    data: configData,
    isLoading,
    error: configError,
  } = useQuery({
    queryKey: ['email-config'],
    queryFn: async () => {
      const res = await fetch('/api/settings/email')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as ConfigItem[]
    },
  })

  // Populate form fields when config loads
  if (configData && !hasLoadedDefaults) {
    const configMap: Record<string, string> = {}
    for (const c of configData) {
      configMap[c.key] = c.value
    }
    // Only set defaults for fields the user hasn't edited
    if (!smtpHost) setSmtpHost(configMap['smtp_host'] || 'smtp.gmail.com')
    if (!smtpPort) setSmtpPort(configMap['smtp_port'] || '587')
    if (!smtpUser) setSmtpUser(configMap['smtp_user'] || '')
    // Password is masked; don't populate it
    if (!fromName) setFromName(configMap['from_name'] || '')
    if (!fromEmail) setFromEmail(configMap['from_email'] || '')
    setHasLoadedDefaults(true)
  }

  const isConfigured = configData?.some(
    (c) => c.key === 'smtp_user' && c.isSet
  )

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {
        smtpHost,
        smtpPort,
        smtpUser,
        fromName,
        fromEmail,
      }
      // Only send password if user entered a new one (not the masked value)
      if (smtpPass && !smtpPass.includes('****')) {
        body.smtpPass = smtpPass
      }
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] })
      setSmtpPass('')
      toast.success('Email configuration saved', {
        description: 'SMTP settings have been updated.',
      })
    },
    onError: (err: Error) => {
      toast.error('Save failed', { description: err.message })
    },
  })

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {}
      if (testEmail) body.testEmail = testEmail
      const res = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as { success: boolean; messageId: string; message: string }
    },
    onSuccess: (data) => {
      toast.success('Test email sent', {
        description: data.message || 'Check your inbox for the test email.',
      })
    },
    onError: (err: Error) => {
      toast.error('Test failed', { description: err.message })
    },
  })

  // Clear mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/email', {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] })
      setSmtpHost('smtp.gmail.com')
      setSmtpPort('587')
      setSmtpUser('')
      setSmtpPass('')
      setFromName('')
      setFromEmail('')
      setHasLoadedDefaults(false)
      toast.success('Email configuration cleared', {
        description: 'All SMTP settings have been removed.',
      })
    },
    onError: (err: Error) => {
      toast.error('Clear failed', { description: err.message })
    },
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2">
              <Mail className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Email (Gmail SMTP)</CardTitle>
              <CardDescription>
                Configure Gmail SMTP for sending photobooth photos via email
              </CardDescription>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-28 rounded-full" />
          ) : (
            <Badge
              variant={isConfigured ? 'default' : 'destructive'}
              className="gap-1"
            >
              {isConfigured ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <XCircle className="size-3" />
              )}
              {isConfigured ? 'Configured' : 'Not Configured'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error state */}
        {configError && (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertDescription>
              Failed to load configuration: {configError.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Warning when not configured */}
        {!isConfigured && !isLoading && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              Email SMTP is not configured. Photos will not be sent via email
              until you add your Gmail credentials. You need a Gmail App
              Password — go to your Google Account → Security → 2-Step
              Verification → App Passwords.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* SMTP Host */}
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
              />
              <p className="text-xs text-muted-foreground">
                Gmail SMTP server address
              </p>
            </div>

            {/* SMTP Port */}
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input
                id="smtp-port"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
              />
              <p className="text-xs text-muted-foreground">
                Use 587 for TLS or 465 for SSL
              </p>
            </div>

            {/* SMTP User */}
            <div className="space-y-2">
              <Label htmlFor="smtp-user">SMTP User (Gmail Address)</Label>
              <Input
                id="smtp-user"
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="your-email@gmail.com"
              />
              <p className="text-xs text-muted-foreground">
                Your full Gmail address
              </p>
            </div>

            {/* SMTP Password */}
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">SMTP Password (App Password)</Label>
              <Input
                id="smtp-pass"
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
              />
              <p className="text-xs text-muted-foreground">
                {isConfigured
                  ? 'Leave blank to keep current password. Enter a new one to update.'
                  : 'Generate one at Google Account → Security → App Passwords'}
              </p>
            </div>

            {/* From Name */}
            <div className="space-y-2">
              <Label htmlFor="from-name">From Name</Label>
              <Input
                id="from-name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="UMak CSOA Photobooth"
              />
              <p className="text-xs text-muted-foreground">
                Display name shown in the &quot;From&quot; field of emails
              </p>
            </div>

            {/* From Email */}
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email</Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="your-email@gmail.com"
              />
              <p className="text-xs text-muted-foreground">
                Email address shown in the &quot;From&quot; field (usually same
                as SMTP User)
              </p>
            </div>

            {/* Test Email (optional recipient) */}
            {isConfigured && (
              <div className="space-y-2">
                <Label htmlFor="test-email">
                  Test Email Recipient{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Defaults to SMTP User email"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to send the test email to your SMTP User address
                </p>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        {!isLoading && (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Configuration
            </Button>
            {isConfigured && (
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                className="gap-2"
              >
                {testMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send Test Email
              </Button>
            )}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" className="gap-2">
                <ExternalLink className="size-4" />
                Google App Passwords
              </Button>
            </a>
            {isConfigured && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="size-4" />
                    Clear Config
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Email Configuration?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all SMTP settings. Emails will no longer be
                      sent via SMTP until you reconfigure.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear Configuration
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
