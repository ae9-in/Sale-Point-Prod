import { cn } from '../../utils/cn';

const Button = ({ children, variant = 'primary', className, isLoading, ...props }) => {
  const baseClass = "inline-flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-brand-primary to-brand-primaryLight hover:shadow-[0_0_12px_rgba(37,99,235,0.28)] text-white px-3.5 py-2",
    secondary: "bg-transparent border border-dark-border hover:bg-dark-border text-content-primary px-3.5 py-2",
    danger: "bg-brand-danger hover:bg-red-600 text-white px-3.5 py-2"
  };

  return (
    <button className={cn(baseClass, variants[variant], className)} disabled={isLoading || props.disabled} {...props}>
      {isLoading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
};

export default Button;
