import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FcGoogle } from 'react-icons/fc'
import { FaFacebook } from 'react-icons/fa'
import { auth as firebaseAuth } from '@/lib/firebaseClient'
import { GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, signInWithRedirect, sendPasswordResetEmail } from 'firebase/auth'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoError, setLogoError] = useState(false)

  React.useEffect(() => {
    setPersistence(firebaseAuth, browserLocalPersistence).catch((e) => {
      // Silently handle persistence errors
    })
    const unsub = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        localStorage.setItem('auth_token', token);
        const redirect = localStorage.getItem('redirect_after_login') || '/Dashboard';
        window.location.href = redirect;
      }
    });
    let tries = 0;
    const interval = setInterval(async () => {
      tries++;
      const u = firebaseAuth.currentUser;
      if (u) {
        try {
          const token = await u.getIdToken();
          localStorage.setItem('auth_token', token);
          const redirect = localStorage.getItem('redirect_after_login') || '/Dashboard';
          window.location.href = redirect;
        } catch (e) {
          // Silently handle token errors
        }
        clearInterval(interval);
      }
      if (tries > 40) clearInterval(interval);
    }, 250);
    return () => unsub();
  }, []);

  const retryFirebase = async (fn, { retries = 2, delay = 600 } = {}) => {
    let lastErr
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn()
      } catch (e) {
        lastErr = e
        const code = e?.code || ''
        if (code !== 'auth/network-request-failed') break
        await new Promise(r => setTimeout(r, delay * (i + 1)))
      }
    }
    throw lastErr
  }

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const cred = await retryFirebase(() => signInWithEmailAndPassword(firebaseAuth, email, password))
        const token = await cred.user.getIdToken()
        localStorage.setItem('auth_token', token)
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        const cred = await retryFirebase(() => createUserWithEmailAndPassword(firebaseAuth, email, password))
        const token = await cred.user.getIdToken()
        localStorage.setItem('auth_token', token)
      }
      const redirect = localStorage.getItem('redirect_after_login') || '/Dashboard'
      window.location.href = redirect
    } catch (e) {
      const msg = e?.message || 'Authentication failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await retryFirebase(() => signInWithPopup(firebaseAuth, provider));
      const token = await result.user.getIdToken();
      localStorage.setItem('auth_token', token);
      const redirect = localStorage.getItem('redirect_after_login') || '/Dashboard';
      window.location.href = redirect;
    } catch (e) {
      const code = e?.code || ''
      if (code === 'auth/network-request-failed' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(firebaseAuth, new GoogleAuthProvider())
        } catch (err2) {
          const msg = err2?.code === 'auth/unauthorized-domain' ? 'Unauthorized domain for Google auth. Add current domain to Firebase Authorized domains.' : (err2.message || 'Google sign-in failed')
          setError(msg)
        }
      } else {
        const msg = code === 'auth/unauthorized-domain' ? 'Unauthorized domain for Google auth. Add current domain to Firebase Authorized domains.' : (e.message || 'Google sign-in failed')
        setError(msg)
      }
    }
  }

  const loginWithFacebook = async () => {
    try {
      const provider = new FacebookAuthProvider();
      const result = await retryFirebase(() => signInWithPopup(firebaseAuth, provider));
      const token = await result.user.getIdToken();
      localStorage.setItem('auth_token', token);
      const redirect = localStorage.getItem('redirect_after_login') || '/Dashboard';
      window.location.href = redirect;
    } catch (e) {
      const code = e?.code || ''
      if (code === 'auth/network-request-failed' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(firebaseAuth, new FacebookAuthProvider())
        } catch (err2) {
          const msg = err2?.code === 'auth/unauthorized-domain' ? 'Unauthorized domain for Facebook auth. Add current domain to Firebase Authorized domains.' : (err2.message || 'Facebook sign-in failed')
          setError(msg)
        }
      } else {
        const msg = code === 'auth/unauthorized-domain' ? 'Unauthorized domain for Facebook auth. Add current domain to Firebase Authorized domains.' : (e.message || 'Facebook sign-in failed')
        setError(msg)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-2xl border shadow-xl">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col items-center">
            {!logoError ? (
              <img
                src="/prism-logo.png"
                alt="PRISM"
                className="w-16 h-16 rounded-full shadow-md"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-16 h-16 rounded-full shadow-md bg-gradient-to-br from-blue-400 to-purple-500" />
            )}
            <h1 className="text-2xl font-bold mt-4 text-gray-900">
              {mode === 'login' ? 'Welcome to PRISM' : 'Create your account'}
            </h1>
            {mode === 'login' && (
              <p className="text-sm mt-1 text-gray-600">Sign in to continue</p>
            )}
          </div>

          {mode === 'login' ? (
            <div className="space-y-3">
              <Button onClick={loginWithGoogle} variant="outline" className="w-full h-11 rounded-xl justify-start">
                <FcGoogle className="w-6 h-6 mr-3" />
                Continue with Google
              </Button>
              <Button onClick={loginWithFacebook} variant="outline" className="w-full h-11 rounded-xl justify-start">
                <FaFacebook className="w-6 h-6 mr-3" color="#1877F2" />
                Continue with Facebook
              </Button>
              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">OR</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <Input placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-xl" />
              <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl" />
              {error && <div className="text-sm text-red-600">{error}</div>}
              <Button onClick={submit} disabled={loading} className="w-full h-11 rounded-xl bg-gray-900 text-white hover:bg-gray-800">
                {loading ? 'Please wait...' : 'Sign in'}
              </Button>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <button className="underline hover:text-gray-800" onClick={async () => {
                  try {
                    if (!email) { setError('Enter your email to reset'); return }
                    await sendPasswordResetEmail(firebaseAuth, email)
                    setError('Password reset email sent')
                  } catch (e) {
                    setError(e?.message || 'Failed to send reset email')
                  }
                }}>Forgot password?</button>
                <div>
                  Need an account? <button className="underline hover:text-gray-800" onClick={() => setMode('register')}>Sign up</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button className="text-sm text-gray-600 hover:text-gray-800" onClick={() => setMode('login')}>← Back to sign in</button>
              <Input placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-xl" />
              <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl" />
              <Input placeholder="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-11 rounded-xl" />
              {error && <div className="text-sm text-red-600">{error}</div>}
              <Button onClick={submit} disabled={loading} className="w-full h-11 rounded-xl bg-gray-900 text-white hover:bg-gray-800">
                {loading ? 'Please wait...' : 'Create account'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}