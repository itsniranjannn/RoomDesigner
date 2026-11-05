import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import styles from './Field.module.css';

/**
 * Shared form primitives. Every text box, number box, dropdown, segmented control
 * and toggle in the app uses these so they look and behave the same.
 */

function Field({ label, hint, error, htmlFor, children, className = '' }) {
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </div>
  );
}

export function TextField({ label, hint, error, className, inputClassName = '', ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <input id={id} type="text" className={`${styles.control} ${inputClassName}`} {...props} />
    </Field>
  );
}

/** Number box that applies its value on blur or Enter and clamps to min/max. */
export function NumberField({
  label,
  hint,
  error,
  value,
  min,
  max,
  step = 1,
  suffix,
  onCommit,
  className,
  ...props
}) {
  const id = useId();
  const [draft, setDraft] = useState(value === undefined || value === null ? '' : String(value));
  useEffect(() => setDraft(value === undefined || value === null ? '' : String(value)), [value]);

  // Tell the user when what they typed is outside the allowed range, before it is clamped
  const typed = draft === '' ? NaN : Number(draft);
  let rangeError = null;
  if (Number.isFinite(typed)) {
    if (min !== undefined && typed < min)
      rangeError = `Minimum is ${min}. It will be set to ${min}.`;
    else if (max !== undefined && typed > max)
      rangeError = `Maximum is ${max}. It will be set to ${max}.`;
  }

  const commit = () => {
    if (draft === '') {
      setDraft(value === undefined || value === null ? '' : String(value));
      return;
    }
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value ?? ''));
      return;
    }
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <Field label={label} hint={hint} error={error || rangeError} htmlFor={id} className={className}>
      <span className={styles.numberWrap}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={`${styles.control} ${suffix ? styles.withSuffix : ''}`}
          value={draft}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit();
              // Inside a form, Enter also submits it; the committed value is applied first
            }
          }}
          {...props}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
    </Field>
  );
}

export function SelectField({ label, hint, error, options, value, onChange, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <span className={styles.selectWrap}>
        <select
          id={id}
          className={`${styles.control} ${styles.select}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </span>
    </Field>
  );
}

/** Search box with a clear button. `onChange` receives the text, not the event. */
export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  ariaLabel,
  className = '',
}) {
  return (
    <span className={`${styles.searchWrap} ${className}`}>
      <Search size={16} className={styles.searchIcon} aria-hidden="true" />
      <input
        type="search"
        className={`${styles.control} ${styles.search}`}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.stopPropagation();
            onChange('');
          }
        }}
      />
      {value && (
        <button
          type="button"
          className={styles.searchClear}
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}

/** Slider with a label and a live read-out. Extra props go to the range input. */
export function RangeField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueLabel,
  className,
  ...props
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <span className={styles.rangeRow}>
        <input
          id={id}
          type="range"
          className={styles.range}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          {...props}
        />
        <output className={styles.rangeValue} htmlFor={id}>
          {valueLabel ?? value}
        </output>
      </span>
    </Field>
  );
}

/** Pick one of a few options, shown as joined buttons. */
export function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'normal',
  fill = false,
  className = '',
}) {
  return (
    <div
      className={`${styles.segmented} ${size === 'small' ? styles.segSmall : ''} ${fill ? styles.segFill : ''} ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${styles.segBtn} ${o.value === value ? styles.segOn : ''}`}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          title={o.title}
          aria-label={o.ariaLabel}
        >
          {o.icon}
          {o.label && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className={styles.switchRow}>
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        className={styles.switchInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.switchTrack} aria-hidden="true" />
    </label>
  );
}
