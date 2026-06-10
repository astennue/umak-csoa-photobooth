'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  RefreshCw,
  AlertTriangle,
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

interface ConfigItem {
  key: string
  value: string
  isSet: boolean
}

interface TestResult {
  connected: boolean
  buckets?: string[]
  message: string
}

export default function SupabaseSettings() {
  const queryClient = useQueryClient()
  const [urlEdited, setUrlEdited] = useState('')
  const [keyEdited, setKeyEdited] = useState('')

  // Fetch current config
  const {
    data: configData,
    isLoading,
    error: configError,
  } = useQuery({
    queryKey: ['supabase-config'],
    queryFn: async () => {
      const res = await fetch('/api/settings/supabase')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as ConfigItem[]
    },
  })

  // Derive the displayed URL: user edit takes priority, then config from DB, then default
  const savedUrl =
    configData?.find((c) => c.key === 'supabase_url' && c.isSet)?.value ?? ''
  const supabaseUrl = urlEdited || savedUrl || 'https://ctopipbiminfxcjrkxij.supabase.co'
  const serviceRoleKey = keyEdited

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {}
      if (supabaseUrl) body.supabaseUrl = supabaseUrl
      if (serviceRoleKey) body.serviceRoleKey = serviceRoleKey
      const res = await fetch('/api/settings/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase-config'] })
      setKeyEdited('')
      toast.success('Configuration saved', {
        description: 'Supabase credentials have been updated.',
      })
    },
    onError: (err: Error) => {
      toast.error('Save failed', { description: err.message })
    },
  })

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/supabase/test')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as TestResult
    },
    onSuccess: (data) => {
      if (data.connected) {
        toast.success('Connection successful', {
          description: data.buckets?.length
            ? `Buckets: ${data.buckets.join(', ')}`
            : 'Connected, but no buckets found.',
        })
      } else {
        toast.error('Connection failed', { description: data.message })
      }
    },
    onError: (err: Error) => {
      toast.error('Test failed', { description: err.message })
    },
  })

  const isConfigured = configData?.some(
    (c) => c.key === 'service_role_key' && c.isSet
  )

  return (
    <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2">
                <Database className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Supabase Storage</CardTitle>
                <CardDescription>
                  Configure file upload storage for templates and gallery
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
                {isConfigured ? 'Connected' : 'Not Configured'}
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
                Supabase Storage is not configured. File uploads will not work
                until you add your Service Role Key. Go to your Supabase
                Dashboard → Settings → API to get the key.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading skeleton */}
          {isLoading ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <>
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="supabase-url">Supabase URL</Label>
                <Input
                  id="supabase-url"
                  value={supabaseUrl}
                  onChange={(e) => setUrlEdited(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                />
                <p className="text-xs text-muted-foreground">
                  Your Supabase project URL
                </p>
              </div>

              {/* Service Role Key Input */}
              <div className="space-y-2">
                <Label htmlFor="service-role-key">Service Role Key</Label>
                <Input
                  id="service-role-key"
                  type="password"
                  value={serviceRoleKey}
                  onChange={(e) => setKeyEdited(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
                <p className="text-xs text-muted-foreground">
                  Found in Supabase Dashboard → Settings → API → service_role
                  key (secret)
                </p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          {!isLoading && (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending || (!supabaseUrl && !serviceRoleKey)
                }
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Configuration
              </Button>
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                className="gap-2"
              >
                {testMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Test Connection
              </Button>
              <a
                href="https://supabase.com/dashboard/project/ctopipbiminfxcjrkxij/settings/api"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" className="gap-2">
                  <ExternalLink className="size-4" />
                  Open Supabase Dashboard
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>
  )
}
