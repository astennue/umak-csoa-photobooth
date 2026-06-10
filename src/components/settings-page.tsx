'use client'

import SupabaseSettings from '@/components/supabase-settings'
import EmailSettings from '@/components/email-settings'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application configuration and integrations.
        </p>
      </div>

      <SupabaseSettings />
      <EmailSettings />
    </div>
  )
}
