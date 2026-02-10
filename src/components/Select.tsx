import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({ options, value, onChange, placeholder = 'Select…', className = '' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className={`themed-select ${className}`}>
      <button
        type="button"
        className="themed-select__trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={selected ? 'themed-select__value' : 'themed-select__placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`themed-select__chevron ${open ? 'themed-select__chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="themed-select__dropdown">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`themed-select__option ${opt.value === value ? 'themed-select__option--active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
