import React, { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

import { loginUser, logoutUser, signupUser, verifyToken } from "../lib/api"
import type { User } from "../lib/api"

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

const STORAGE_KEY = "netly.token"
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem(STORAGE_KEY))
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hydrateAuth = async () => {
      const storedToken = localStorage.getItem(STORAGE_KEY)
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      setToken(storedToken)
      try {
        const payload = await verifyToken(storedToken)
        if (payload.valid) {
          setUser(payload.user)
        } else {
          localStorage.removeItem(STORAGE_KEY)
          setToken(null)
        }
      } catch {
        setError("We couldn't verify your session, but you can keep working locally.")
      } finally {
        setIsLoading(false)
      }
    }

    hydrateAuth()
  }, [])

  const commitSession = (nextToken: string, nextUser: User) => {
    setToken(nextToken)
    setUser(nextUser)
    setError(null)
    localStorage.setItem(STORAGE_KEY, nextToken)
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const payload = await loginUser(email, password)
      commitSession(payload.token, payload.user)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (firstName: string, lastName: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const payload = await signupUser(firstName, lastName, email, password)
      commitSession(payload.token, payload.user)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (token) {
      try {
        await logoutUser(token)
      } catch {
        // Keep local logout resilient even if the server is unavailable.
      }
    }

    setUser(null)
    setToken(null)
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    signup,
    logout,
    isLoading,
    error,
    clearError: () => setError(null),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
