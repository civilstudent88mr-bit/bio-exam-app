import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, className = '' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className="input flex items-center justify-between text-right"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <span className={selected ? '' : 'text-muted'}>{selected ? selected.label : (placeholder || 'انتخاب کنید')}</span>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl shadow-lg max-h-60 overflow-y-auto animate-fade-in"
          style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              className={`w-full text-right px-3.5 py-2.5 text-sm hover:bg-primary-50 dark:hover:bg-slate-700 transition-colors ${o.value === value ? 'font-bold text-primary-600' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
}

export function Badge({ children, color = 'neutral' }: BadgeProps) {
  const colors = {
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    success: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300',
    error: 'bg-error-100 text-error-700 dark:bg-error-900/40 dark:text-error-300',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return <span className={`badge ${colors[color]}`}>{children}</span>;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="mb-4 opacity-40">{icon}</div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-sm">{message}</p>
    </div>
  );
}
