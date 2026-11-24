export default function Brand({ compact = false }) {
  return (
    <div className={`brand${compact ? ' brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true"><i /><b /></span>
      <span>NOVA <strong>BANK</strong></span>
    </div>
  )
}
