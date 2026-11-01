import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, ChevronDown, LoaderCircle, LogOut, Shield, UserRound, X } from 'lucide-react'

type AccountMenuProps = {
  email: string
  displayName: string
  isAdmin: boolean
  onOpenAdmin: () => void
  onSignOut: () => void
  onSaveName: (name: string) => Promise<void>
}

export default function AccountMenu({ email, displayName, isAdmin, onOpenAdmin, onSignOut, onSaveName }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [savingName, setSavingName] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => setNameDraft(displayName), [displayName])

  function openAdmin() {
    setOpen(false)
    setProfileOpen(false)
    onOpenAdmin()
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingName(true)
    setProfileError('')
    setProfileSaved(false)
    try {
      await onSaveName(nameDraft.trim())
      setProfileSaved(true)
    } catch (saveError) {
      setProfileError(saveError instanceof Error ? saveError.message : 'Could not save your name.')
    } finally {
      setSavingName(false)
    }
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        className="account-button"
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <UserRound size={17} /><span>Account</span><ChevronDown className="account-chevron" size={13} />
      </button>
      {open && <div className="account-dropdown" role="menu">
        <div className="account-menu-heading">
          <span className="account-avatar"><UserRound size={17} /></span>
          <span><strong>{displayName || 'User'}</strong><small>{email}</small></span>
        </div>
        <button role="menuitem" onClick={() => { setOpen(false); setProfileOpen(true) }}>
          <UserRound size={15} /> My profile
        </button>
        {isAdmin && <button role="menuitem" className="account-admin-action" onClick={openAdmin}>
          <Shield size={15} /> Open admin panel
        </button>}
        <button role="menuitem" onClick={onSignOut}>
          <LogOut size={15} /> Sign out
        </button>
      </div>}

      {profileOpen && <div className="modal-backdrop account-profile-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setProfileOpen(false)
      }}>
        <section className="auth-modal panel account-profile" role="dialog" aria-modal="true" aria-labelledby="profile-title">
          <button className="icon-button modal-close" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X size={19} /></button>
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h2 id="profile-title">Your profile</h2>
          <form className="stack-form profile-form" onSubmit={(event) => void saveName(event)}>
            <label>Your name<input autoComplete="name" maxLength={100} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} /></label>
            <div className="profile-detail">
              <span className="account-avatar"><UserRound size={19} /></span>
              <div><small>Email address</small><strong>{email}</strong></div>
            </div>
            {profileError && <p className="form-error" role="alert">{profileError}</p>}
            {profileSaved && <p className="form-success" role="status">Name saved.</p>}
            <button className="button button-primary button-wide" disabled={savingName || !nameDraft.trim()}>
              {savingName ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Save name
            </button>
          </form>
          {isAdmin && <button className="button button-primary button-wide" onClick={openAdmin}>
            <Shield size={15} /> Open admin panel
          </button>}
          <button className="button button-quiet button-wide" onClick={() => { setProfileOpen(false); onSignOut() }}>
            <LogOut size={15} /> Sign out
          </button>
        </section>
      </div>}
    </div>
  )
}
