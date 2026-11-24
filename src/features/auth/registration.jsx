import { useState } from 'react';
import Brand from '../../shared/components/Brand';
import Icon from '../../shared/components/Icon';
import { registerOnlineBanking } from '../../services/authService';
import { isApiConfigured } from '../../services/apiClient';
export default function RegisterPage({ onNavigate, onRegistered }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');

    if (password !== formData.get('confirmPassword')) {
      setError('The passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const result = await registerOnlineBanking({
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password,
      });

      if (typeof result === 'string') {
        onRegistered({ email: formData.get('email'), message: result });
      } else {
        onRegistered({
          email: result?.email || formData.get('email'),
          message:
            result?.message ||
            'Your online banking profile was created successfully.',
        });
      }
    } catch (registrationError) {
      setError(registrationError.message || 'Unable to register.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-app register-app">
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
          <span className="eyebrow">A BETTER WAY TO BANK</span>
          <h1>Start with your own secure profile.</h1>
          <p>
            Create your online banking profile first. Once registered, sign in
            to apply for an account and complete identity verification.
          </p>
          <div className="login-security">
            <Icon name="shield" size={18} />
            <span>Your profile is protected by secure sign-in</span>
          </div>
        </section>

        <section className="login-card">
          <span className="login-card-icon">
            <Icon name="user" size={21} />
          </span>
          <h2>Create your profile</h2>
          <p className="login-subtitle">
            Register for online banking before applying for an account.
          </p>

          {!isApiConfigured && (
            <div className="demo-notice">
              <b>Demo mode</b>
              <span>
                This creates a preview profile in this browser session, not a
                real banking account.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="form-label">
              Full legal name
              <input
                name="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="As shown on your identity document"
              />
            </label>

            <label className="form-label">
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>

            <label className="form-label">
              Mobile number
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="+91 98765 43210"
              />
            </label>

            <label className="form-label">
              Create password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </label>

            <label className="form-label">
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Enter your password again"
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
              {loading
                ? 'Creating profile…'
                : 'Create online banking profile'}{' '}
              <Icon name="arrowRight" size={16} />
            </button>
          </form>

          <div className="login-help">
            Already registered?{' '}
            <button onClick={() => onNavigate('/login')}>Sign in</button>
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