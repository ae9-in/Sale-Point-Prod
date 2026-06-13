import { cn } from '../../utils/cn';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-dark-border/50", className)}
      {...props}
    />
  );
};

export default Skeleton;
