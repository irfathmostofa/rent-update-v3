import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone_number: phone }, // read by handle_new_user() trigger
      },
    })

    setSubmitting(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Check your email</h2>
          <p>We sent a verification link to <strong>{email}</strong>. Confirm it, then come back and log in.</p>
          <Link to="/login">Go to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Create owner account</h2>
        {error && <p className="error-text">{error}</p>}
        <label>Full name
          <input value={fullName} onChange={e => setFullName(e.target.value)} required />
        </label>
        <label>Phone number
          <input value={phone} onChange={e => setPhone(e.target.value)} required />
        </label>
        <label>Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
        </label>
        <button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Register'}</button>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  )
}
