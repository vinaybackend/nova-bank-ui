import { useState } from 'react';
import Brand from '../../shared/components/Brand';
import Icon from '../../shared/components/Icon';
import { signIn } from '../../services/authService';
import { isApiConfigured } from '../../services/apiClient';
import './Login.css'; 

export default function LoginPage({
  onSignIn,
  onNavigate,
  initialEmail = '',
  registrationMessage = '',
  sessionMessage = '',
}) {
  const [email, setEmail] = useState(
    initialEmail || (isApiConfigured ? '' : 'vinay.kumar@demo.nova')
  );
  const [password, setPassword] = useState(
    isApiConfigured || initialEmail ? '' : 'NovaDemo2026!'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const signedInUser = await signIn({ email, password });
      onSignIn(signedInUser);
      onNavigate('/dashboard');
    } catch (signInError) {
      setError(signInError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-app">
      <div className="login-topbar">
        <a
          href="/"
          className="login-brand"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('/');
          }}
        >
          <Brand />
        </a>
        <button className="back-home" onClick={() => onNavigate('/')}>
          <Icon name="arrowRight" size={15} /> Back to Nova Bank
        </button>
      </div>

      <div className="login-layout">
        <section className="login-story">
          <span className="eyebrow">YOUR MONEY, IN SAFE HANDS</span>
          <h1>
            Welcome back
            <br />
            to better banking.
          </h1>
          <p>
            Sign in to see your accounts, manage your money, and take care of
            everyday banking.
          </p>
          <div className="login-security">
            <Icon name="shield" size={18} />
            <span>Protected by secure sign-in</span>
          </div>
        </section>

        <section className="login-card">
          <span className="login-card-icon">
            <Icon name="user" size={21} />
          </span>
          <h2>Sign in to Nova</h2>
          <p className="login-subtitle">
            Use your registered email and password.
          </p>

          {registrationMessage && (
            <p className="registration-success" role="status">
              {registrationMessage}
            </p>
          )}
          {sessionMessage && (
            <p className="registration-success" role="status">
              {sessionMessage}
            </p>
          )}

          {!isApiConfigured && (
            <div className="demo-notice">
              <b>Demo mode</b>
              <span>
                Sample customer data only — this is not a real banking account.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="form-label">
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="form-label">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="button button-primary login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in securely'}{' '}
              <Icon name="arrowRight" size={16} />
            </button>
          </form>

          {!isApiConfigured && !initialEmail && (
            <p className="demo-credentials">
              Demo credentials are prefilled. Do not enter a real password.
            </p>
          )}

          <div className="login-help">
            New to Nova?{' '}
            <button onClick={() => onNavigate('/register')}>
              Create an online banking profile
            </button>
          </div>
          <div className="login-help login-help-secondary">
            Need help signing in?{' '}
            <button onClick={() => onNavigate('/')}>Contact Nova support</button>
          </div>
        </section>
      </div>

      <footer className="login-footer">
        <span>© 2026 Nova Bank</span>
        <span>
          {isApiConfigured
            ? 'Online banking · Secure sign-in'
            : 'Demo experience · No real transactions'}
        </span>
      </footer>
    </main>
  );
}