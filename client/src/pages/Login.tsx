import { useState } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';

type Mode = 'login' | 'register' | 'forgot';

export default function Login() {
  const { login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => {
    setMode(m);
    setError('');
    setNotice('');
    setForgotStep('request');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(email, password, name);
      } else if (forgotStep === 'request') {
        const r = await api.forgot(email);
        setForgotStep('reset');
        setNotice(
          r.devCode
            ? `Your reset code is ${r.devCode}.`
            : 'A reset code was generated. Check the server console/terminal for your 6-digit code (valid 15 minutes).',
        );
        setBusy(false);
        return;
      } else {
        await resetPassword(email, code, password);
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card card-pad auth-card">
        <div className="brand">
          <span className="brand-mark">W</span> Workbench
        </div>
        <p className="subtle" style={{ textAlign: 'center', marginTop: -4, marginBottom: 18 }}>
          Track your hours. Know your pay.
        </p>

        {mode !== 'forgot' && (
          <div className="seg">
            <button className={mode === 'login' ? 'on' : ''} onClick={() => go('login')}>Log in</button>
            <button className={mode === 'register' ? 'on' : ''} onClick={() => go('register')}>Sign up</button>
          </div>
        )}

        {mode === 'forgot' && (
          <h3 style={{ textAlign: 'center', marginBottom: 4 }}>Reset password</h3>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
          {error && <div className="error-box">{error}</div>}
          {notice && <div className="notice-box">{notice}</div>}

          {mode === 'register' && (
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email"
              readOnly={mode === 'forgot' && forgotStep === 'reset'} />
          </div>

          {mode === 'forgot' && forgotStep === 'reset' && (
            <div className="field">
              <label>Reset code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code"
                inputMode="numeric" autoComplete="one-time-code" required />
            </div>
          )}

          {mode !== 'forgot' || forgotStep === 'reset' ? (
            <div className="field">
              <label>{mode === 'forgot' ? 'New password' : 'Password'}</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              {(mode === 'register' || mode === 'forgot') && <span className="hint">At least 6 characters</span>}
            </div>
          ) : null}

          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? 'Please wait…'
              : mode === 'login' ? 'Log in'
              : mode === 'register' ? 'Create account'
              : forgotStep === 'request' ? 'Send reset code'
              : 'Reset password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          {mode === 'login' && (
            <button className="link-btn" onClick={() => go('forgot')}>Forgot password?</button>
          )}
          {mode === 'forgot' && (
            <button className="link-btn" onClick={() => go('login')}>← Back to log in</button>
          )}
        </div>
      </div>
    </div>
  );
}
