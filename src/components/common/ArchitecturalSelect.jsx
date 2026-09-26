import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './ArchitecturalSelect.module.css';

/**
 * ArchitecturalSelect
 * Custom styled architectural dropdown component.
 * Features:
 * - Lokta paper/linen background
 * - Space Grotesk typography with monospaced options
 * - Oxblood maroon / brass focus states & subtle hover lift
 * - Clean custom Chevron indicator (no browser default select arrow)
 * - 100% accessible keyboard navigation (Enter, Space, Up, Down, Esc)
 */
export function ArchitecturalSelect({
  value,
  onChange,
  options = [],
  title,
  ariaLabel,
  className = '',
  size = 'normal', // 'normal' | 'compact'
  menuAlign = 'left', // 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currIdx = options.findIndex((opt) => opt.value === value);
        if (currIdx < options.length - 1) {
          onChange(options[currIdx + 1].value);
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        const currIdx = options.findIndex((opt) => opt.value === value);
        if (currIdx > 0) {
          onChange(options[currIdx - 1].value);
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.selectContainer} ${size === 'compact' ? styles.compact : ''} ${className}`}
      title={title}
    >
      <button
        type="button"
        className={`${styles.triggerBtn} ${isOpen ? styles.triggerActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || title}
      >
        <span className={styles.triggerLabel}>{selectedOption ? selectedOption.label : value}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
          <ChevronDown size={12} />
        </span>
      </button>

      {isOpen && (
        <ul className={`${styles.dropdownMenu} ${menuAlign === 'right' ? styles.menuAlignRight : ''}`} role="listbox" tabIndex={-1}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`${styles.optionItem} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span className={styles.optionLabel}>{opt.label}</span>
                {isSelected && (
                  <span className={styles.checkIcon} aria-hidden="true">
                    <Check size={12} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ArchitecturalSelect;
