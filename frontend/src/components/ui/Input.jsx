import React from 'react';
import { cn } from '../../utils/cn';

const Input = React.forwardRef(({ label, error, className, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold uppercase tracking-wide text-content-secondary mb-1.5">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none transition-colors",
          "focus:border-brand-primary focus:ring-1 focus:ring-brand-primary",
          error && "border-brand-danger focus:border-brand-danger focus:ring-brand-danger",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-brand-danger">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
