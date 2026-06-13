import { cn } from '../../utils/cn';

const Spinner = ({ className, size = 'md' }) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-12 w-12 border-4'
  };

  return (
    <div className={cn(
      "rounded-full border-brand-primary/10 border-t-brand-primary animate-spin",
      sizes[size],
      className
    )} />
  );
};

export default Spinner;
