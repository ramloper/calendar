'use client'

import { useEffect, useState } from 'react'
import { type User as FirebaseUser } from 'firebase/auth'
import { onAuthChanged, signInWithGoogle, signOut } from '@/lib/firebase/auth'

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChanged((user) => {
      setUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return {
    user,
    loading,
    isLoggedIn: !!user,
    signInWithGoogle,
    signOut,
  }
}
