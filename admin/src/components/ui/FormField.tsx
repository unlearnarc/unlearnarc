import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  children,
  required,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-300">
      {label}
      {required && <span className="text-rose-400 ml-1">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-rose-400">{error}</p>}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2.5 rounded-lg bg-white/5 border ${
      error ? 'border-rose-500' : 'border-white/10'
    } text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 ${
      error ? 'focus:ring-rose-500/50' : 'focus:ring-violet-500/50'
    } transition ${className}`}
  />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { label: string; value: string }[];
  placeholder?: string;
}
export const Select: React.FC<SelectProps> = ({
  error,
  options,
  placeholder,
  className = '',
  ...props
}) => (
  <select
    {...props}
    className={`w-full px-3 py-2.5 rounded-lg bg-surface-soft border ${
      error ? 'border-rose-500' : 'border-white/10'
    } text-white text-sm focus:outline-none focus:ring-2 ${
      error ? 'focus:ring-rose-500/50' : 'focus:ring-violet-500/50'
    } transition ${className}`}
  >
    {placeholder && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);
