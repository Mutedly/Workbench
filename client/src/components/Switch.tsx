import type { ReactNode } from 'react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

// iOS-style toggle switch.
export default function Switch({ checked, onChange, label, hint, disabled }: Props) {
  return (
    <label className={`switch-row ${disabled ? 'disabled' : ''}`}>
      {(label || hint) && (
        <span className="switch-text">
          {label && <span className="switch-label">{label}</span>}
          {hint && <span className="hint">{hint}</span>}
        </span>
      )}
      <span className="switch">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="track"><span className="thumb" /></span>
      </span>
    </label>
  );
}
