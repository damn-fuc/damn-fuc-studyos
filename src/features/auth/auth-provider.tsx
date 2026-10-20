import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'

import { buildAuthRedirectUrl } from '@/lib/auth-redirect'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { LoginValues } from './auth-schemas'

type AuthContextValue = {
  isConfigured: boolean
  isLoading: boolean
  user: User | null
  recoveryMode: boolean
  signIn: (values: LoginValues) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordRecovery: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  finishPasswordRecovery: () => void
}

type AuthProviderProps = {
  children: ReactNode
  client?: SupabaseClient<Database> | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children, client = supabase }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(() => client !== null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const previousUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!client) return

    let mounted = true
    let authEventReceived = false

    const applySession = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id ?? null
      if (previousUserId.current !== nextUserId && previousUserId.current !== null) {
        queryClient.clear()
      }
      previousUserId.current = nextUserId
      setSession(nextSession)
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      authEventReceived = true
      applySession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      } else if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        setRecoveryMode(false)
      }
      setIsLoading(false)
    })

    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (!authEventReceived) applySession(error ? null : data.session)
      setIsLoading(false)
    }).catch(() => {
      if (!mounted) return
      if (!authEventReceived) applySession(null)
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [client, queryClient])

  const signIn = useCallback(async (values: LoginValues) => {
    if (!client) throw new Error('Supabase is not configured.')
    const { error } = await client.auth.signInWithPassword(values)
    if (error) throw error
  }, [client])

  const signOut = useCallback(async () => {
    if (!client) throw new Error('Supabase is not configured.')
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error) throw error
    queryClient.clear()
  }, [client, queryClient])

  const requestPasswordRecovery = useCallback(async (email: string) => {
    if (!client) throw new Error('Supabase is not configured.')
    const redirectTo = buildAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL)
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }, [client])

  const updatePassword = useCallback(async (password: string) => {
    if (!client) throw new Error('Supabase is not configured.')
    const { error } = await client.auth.updateUser({ password })
    if (error) throw error
  }, [client])

  const finishPasswordRecovery = useCallback(() => setRecoveryMode(false), [])

  const value = useMemo<AuthContextValue>(() => ({
    isConfigured: client !== null,
    isLoading: client !== null && isLoading,
    user: client ? session?.user ?? null : null,
    recoveryMode,
    signIn,
    signOut,
    requestPasswordRecovery,
    updatePassword,
    finishPasswordRecovery,
  }), [
    client,
    finishPasswordRecovery,
    isLoading,
    recoveryMode,
    requestPasswordRecovery,
    session,
    signIn,
    signOut,
    updatePassword,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
