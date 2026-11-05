// Small shared iOS-style building blocks.
import { useNavigate } from 'react-router-dom';

export function NavBar({ backLabel = 'Back', backTo = '/', onBack }) {
  const navigate = useNavigate();
  return (
    <div className="navbar">
      <button className="navbar-back" onClick={onBack ?? (() => navigate(backTo))}>
        <svg viewBox="0 0 13 22" fill="none" aria-hidden="true">
          <path d="M11 2 2 11l9 9" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </button>
    </div>
  );
}

export function LargeTitle({ title, subtitle }) {
  return (
    <>
      <h1 className="large-title">{title}</h1>
      {subtitle && <p className="large-title-sub">{subtitle}</p>}
    </>
  );
}

export function InsetGroup({ header, footer, padded, children }) {
  return (
    <section className="inset-group">
      {header && <h2 className="inset-group-header">{header}</h2>}
      <div className={`inset-group-body${padded ? ' inset-group-padded' : ''}`}>{children}</div>
      {footer && <p className="inset-group-footer">{footer}</p>}
    </section>
  );
}

export function ListRow({ onClick, chevron, leading, className = '', children }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`list-row ${className}`} onClick={onClick}>
      {leading}
      <div className="list-row-content">{children}</div>
      {chevron && (
        <svg className="list-row-chevron" viewBox="0 0 9 15" fill="none" aria-hidden="true">
          <path d="m1.5 1.5 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Tag>
  );
}

/** options: [{ value, label }] */
export function SegmentedControl({ options, value, onChange, label, disabled }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          className="segmented-option"
          disabled={disabled && o.value !== value}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
