import { cn } from '../../utils/cn';

const StatCard = ({ title, value, icon: Icon, trend, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-brand-primary/10 text-brand-primary',
    green: 'bg-brand-success/10 text-brand-success',
    amber: 'bg-brand-warning/10 text-brand-warning',
    red: 'bg-brand-danger/10 text-brand-danger',
  };

  return (
    <div className="card p-4 flex flex-col relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-content-secondary">{title}</h3>
        {Icon && (
          <span className={cn('rounded-lg p-2', tones[tone] || tones.blue)}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="stat-card-value text-2xl font-bold text-content-primary">{value}</span>
        {trend && (
          <span className={cn(
            "text-sm font-medium",
            trend > 0 ? "text-brand-secondary" : "text-brand-danger"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-brand-primary rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
    </div>
  );
};

export default StatCard;
