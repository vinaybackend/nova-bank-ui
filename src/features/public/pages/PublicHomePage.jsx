import { useState } from 'react'
import Brand from '../../../shared/components/Brand'
import Icon from '../../../shared/components/Icon'
import ActionDialog from '../../shared/ActionDialog'
import './PublicHomePage.css' 

export default function PublicHomePage({ onLogin, onOpenAccount }) {
  const [dialog, setDialog] = useState('')

  return (
    <>
      <main className="public-app">
        <section className="public-shell">
          <header className="site-header">
            <a className="brand-link" href="#home" aria-label="Nova Bank home"><Brand /></a>
            <nav className="public-nav" aria-label="Main navigation">
              <a className="current" href="#home">Personal</a>
              <a href="#features">Features</a>
              <a href="#about">About</a>
              <button type="button" onClick={() => setDialog('support')}>Help</button>
            </nav>
            <div className="header-actions">
              <button className="button button-outline-light" onClick={onLogin}>Log in</button>
              <button className="button button-light" onClick={onOpenAccount}>Open account</button>
            </div>
          </header>

          <section className="hero" id="home">
            <div className="hero-skyline" aria-hidden="true">
              <div className="sun-glow" />
              <div className="city city-back"><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="city city-front"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="water-reflection" />
            </div>
            <div className="hero-copy">
              <span className="eyebrow">WELCOME TO NOVA BANK</span>
              <h1>Banking made simple.<br />Banking made secure.</h1>
              <p>Your money. Your future.<br />One secure banking experience.</p>
              <div className="hero-buttons">
                <button className="button button-primary" onClick={onOpenAccount}>Open account <Icon name="arrowRight" size={16} /></button>
                <button className="button button-outline-light" onClick={onLogin}>Log in</button>
              </div>
            </div>
            <div className="hero-card-wrap" aria-label="Nova Bank debit card illustration">
              <div className="hero-note">More than<br />just a bank.</div>
              <div className="bank-card">
                <div className="card-top"><Brand compact /><span className="contactless">)))</span></div>
                <div className="chip"><span /></div>
                <div className="card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;4821</div>
                <div className="card-bottom"><span>YOUR NAME</span><span className="mastercard"><i /><i /></span></div>
              </div>
            </div>
          </section>

          <section className="benefits" id="features">
            <article><span className="benefit-icon"><Icon name="shield" size={26} /></span><div><b>Secure Banking</b><p>Your data and money are<br />always protected.</p></div></article>
            <article><span className="benefit-icon"><Icon name="bolt" size={25} /></span><div><b>Fast Transactions</b><p>Quick, seamless and<br />hassle-free.</p></div></article>
            <article><span className="benefit-icon"><Icon name="phone" size={25} /></span><div><b>24/7 Access</b><p>Bank anytime, anywhere,<br />from any device.</p></div></article>
          </section>

          <section className="services" id="about">
            <h2>Everything you need in one place</h2>
            <p>Simple. Secure. Smart.</p>
            <div className="service-grid">
              <article><span><Icon name="bank" /></span><div><b>Accounts</b><p>Manage your savings,<br />current and more.</p></div></article>
              <article><span><Icon name="swap" /></span><div><b>Transfers</b><p>Send money instantly<br />to anyone.</p></div></article>
              <article><span><Icon name="card" /></span><div><b>Payments</b><p>Pay bills, recharge and<br />more.</p></div></article>
              <article><span><Icon name="shield" /></span><div><b>Security</b><p>Advanced protection<br />for your peace of mind.</p></div></article>
            </div>
          </section>
        </section>
        <footer className="public-footer"><span>© 2026 Nova Bank</span><span>Secure banking, made for you.</span></footer>
      </main>
      {dialog && <ActionDialog action={dialog} onClose={() => setDialog('')} />}
    </>
  )
}