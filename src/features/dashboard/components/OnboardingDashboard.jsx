import Icon from '../../../shared/components/Icon'

function getApplicationProgress(application) {
  const status = String(application.status || '').toUpperCase()
  const stage = String(application.currentStage || '').toUpperCase()
  const rejected = ['REJECTED', 'KYC_REJECTED', 'DECLINED'].includes(status)
  const needsInformation = ['NEEDS_INFORMATION', 'ACTION_REQUIRED', 'DOCUMENT_REQUIRED'].includes(status)
  const opened = ['COMPLETED', 'ACCOUNT_OPENED', 'OPENED'].includes(status)
    || ['COMPLETED', 'ACCOUNT_OPENED', 'OPENED'].includes(stage)
  const openingAccount = opened || stage.includes('ACCOUNT') || stage.includes('OPEN')
    || ['KYC_APPROVED', 'APPROVED', 'ACCOUNT_OPENING'].includes(status)
  const currentStep = opened ? 3 : openingAccount ? 2 : 1
  const statusLabel = rejected ? 'KYC NOT APPROVED'
    : needsInformation ? 'ACTION REQUIRED'
      : opened ? 'ACCOUNT OPENED'
        : openingAccount ? 'ACCOUNT OPENING'
          : 'KYC IN REVIEW'

  return { statusLabel, currentStep, rejected, needsInformation, opened, openingAccount }
}

export default function OnboardingDashboard({
  customer,
  application,
  onOpenAccount,
  onRefreshApplication,
  refreshingApplication = false,
}) {
  const progress = application ? getApplicationProgress(application) : null
  const applicationMessage = progress?.opened
    ? 'Your account is open and ready. You can now access your Nova Bank services.'
    : progress?.rejected
      ? 'We couldn’t verify your identity document. Contact support for help with the next steps.'
      : progress?.needsInformation
        ? 'We need some additional information to continue reviewing your application. Please contact support.'
        : progress?.openingAccount
        ? 'Your KYC review is approved. We’re opening your account now.'
          : 'Your identity document is being checked as part of KYC verification. We’ll notify you when your account is ready.'
  const progressNote = progress?.opened
    ? 'Your application is complete. Your account details will appear here when available.'
    : progress?.rejected
      ? 'Your application did not pass KYC verification. Contact support to understand what to do next.'
      : progress?.needsInformation
        ? 'Your application needs your attention. Contact support using your registered details.'
        : progress?.openingAccount
          ? 'Your customer status will change to active as soon as account opening is complete.'
          : 'We’re verifying your identity document. If we need anything else, we’ll contact you using your registered details.'

  return (
    <div className="onboarding-main customer-onboarding">
      {application ? (
        <>
          <section className="onboarding-banner pending-banner" id="application-status">
            <span className="onboarding-illustration"><Icon name="bell" size={29} /></span>
            <div className="onboarding-message">
              <span className="application-status-label"><span /> {progress.statusLabel}</span>
              <h2>{progress.opened ? 'Your account is open' : progress.rejected ? 'Your application needs attention' : progress.needsInformation ? 'More information is needed' : progress.openingAccount ? 'Your account is being opened' : 'Your application is in progress'}</h2>
              <p>{applicationMessage}</p>
              <div className="application-reference">Application ID <b>{application.id}</b><span>Submitted {new Date(application.submittedAt).toLocaleDateString()}</span></div>
            </div>
          </section>
          <section className="panel application-progress" id="application-status-detail">
            <div className="panel-heading">
              <div><h2>Application status</h2><p>Application ID · {application.id}</p></div>
              <div className="application-status-actions">
                <span className={`review-pill ${progress.opened ? 'status-complete' : progress.rejected ? 'status-rejected' : ''}`}>{progress.statusLabel}</span>
                <button className="text-button" type="button" onClick={onRefreshApplication} disabled={refreshingApplication}>
                  {refreshingApplication ? 'Refreshing…' : 'Refresh status'}
                </button>
              </div>
            </div>
            <div className="progress-track" aria-label="Application progress">
              <div className="progress-step complete"><span><Icon name="check" size={13} /></span><b>Submitted</b></div>
              <div className={`progress-connector ${progress.currentStep > 1 || progress.opened ? 'complete' : ''}`} />
              <div className={`progress-step ${progress.currentStep > 1 || progress.opened ? 'complete' : progress.rejected || progress.needsInformation ? 'attention' : 'current'}`}>
                <span>{progress.currentStep > 1 || progress.opened ? <Icon name="check" size={13} /> : <Icon name="shield" size={13} />}</span>
                <b>KYC verification</b>
              </div>
              <div className={`progress-connector ${progress.opened ? 'complete' : ''}`} />
              <div className={`progress-step ${progress.opened ? 'complete' : progress.currentStep === 2 ? 'current' : ''}`}>
                <span>{progress.opened ? <Icon name="check" size={13} /> : <Icon name="bank" size={13} />}</span>
                <b>Account opened</b>
              </div>
            </div>
            <p className="progress-note">{progressNote}</p>
          </section>
        </>
      ) : (
        <section className="onboarding-banner welcome-banner">
            <span className="onboarding-illustration"><Icon name="sparkle" size={32} /></span>
            <div className="onboarding-message">
              <span className="application-status-label"><span /> WELCOME TO NOVA BANK</span>
              <h2>Your financial journey starts here</h2>
              <p>You’re signed in, {customer.fullName.split(' ')[0]}. Complete a single application to submit your customer details and identity documents for KYC review.</p>
              <button className="button button-primary" onClick={onOpenAccount}>Start application <Icon name="arrowRight" size={15} /></button>
            </div>
          </section>
      )}
    </div>
  )
}
