import { useState, type FormEvent } from 'react'
import { ArrowLeft, LoaderCircle, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthModalProps = {
  onClose: () => void
  onComplete: () => void
}

export default function AuthModal({ onClose, onComplete }: AuthModalProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured. Add your project URL and anon key to .env.local.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        setMessage(data.session
          ? 'Your account is ready.'
          : 'Check your email to confirm your account, then sign in here.')
        if (data.session) onComplete()
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        if (!data.user) throw new Error('The sign-in completed without a user record.')
        const { data: profile, error: profileError } = await supabase
          .from('trythrifty_profiles')
          .select('id, role')
          .eq('id', data.user.id)
          .maybeSingle()
        if (profileError) {
          await supabase.auth.signOut()
          throw new Error(`Could not verify your account profile: ${profileError.message}`)
        }
        if (!profile) {
          await supabase.auth.signOut()
          throw new Error('Your account profile is missing. Ask the store administrator to check the auth setup.')
        }
        onComplete()
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="auth-modal panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close sign in">
          <X size={19} />
        </button>
        <button className="back-link" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
          <ArrowLeft size={15} /> {mode === 'sign-in' ? 'Create an account' : 'Back to sign in'}
        </button>
        <span className="eyebrow">YOUR THRIFTY ACCOUNT</span>
        <h2 id="auth-title">{mode === 'sign-in' ? 'Welcome back.' : 'Join the good-find club.'}</h2>
        <p className="muted">Sign in to your trythrifty account to continue.</p>
        {!isSupabaseConfigured && (
          <div className="notice">Connect a Supabase project in <code>.env.local</code> to enable accounts.</div>
        )}
        <form className="stack-form" onSubmit={submit}>
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" minLength={6} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="button button-primary button-wide" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : null}
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="fine-print">Accounts are securely managed by Supabase Auth.</p>
      </section>
    </div>
  )
}
