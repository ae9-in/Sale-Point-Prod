import React from 'react';
import { Sunrise, Sun, Moon, CheckCircle2, Lock, Coffee } from 'lucide-react';
import BreakTimer from './BreakTimer';

const iconMap = {
  sunrise: Sunrise,
  sun: Sun,
  moon: Moon
};

const BreakSlotCard = ({ 
  slot, 
  isActive, 
  isLocked, 
  isCompleted, 
  completedRecord, 
  timerSeconds, 
  onStart, 
  onEnd 
}) => {
  const IconComponent = iconMap[slot.icon] || Coffee;

  // Color mappings
  const themeColors = {
    amber: {
      border: 'border-brand-warning/20',
      activeBorder: 'border-brand-warning shadow-lg shadow-brand-warning/5 bg-brand-warning/5',
      text: 'text-brand-warning',
      btn: 'bg-brand-warning/20 hover:bg-brand-warning/30 text-brand-warning border border-brand-warning/30'
    },
    blue: {
      border: 'border-brand-primary/20',
      activeBorder: 'border-brand-primary shadow-lg shadow-brand-primary/5 bg-brand-primary/5',
      text: 'text-brand-primary',
      btn: 'bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary border border-brand-primary/30'
    },
    purple: {
      border: 'border-brand-primaryLight/20',
      activeBorder: 'border-brand-primaryLight shadow-lg shadow-brand-primaryLight/5 bg-brand-primaryLight/5',
      text: 'text-brand-primaryLight',
      btn: 'bg-brand-primaryLight/20 hover:bg-brand-primaryLight/30 text-brand-primaryLight border border-brand-primaryLight/30'
    }
  };

  const theme = themeColors[slot.color] || themeColors.blue;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  const startTotalMinutes = slot.startHour * 60 + slot.startMinute;
  const endTotalMinutes = slot.endHour * 60 + slot.endMinute;

  const isWithinWindow = currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;

  // Determine container classes
  let containerClasses = 'card flex flex-col justify-between min-h-[260px] w-full transition-all duration-300 ';
  if (isActive) {
    containerClasses += theme.activeBorder;
  } else if (isCompleted) {
    containerClasses += 'border-brand-success/20 bg-brand-success/5 opacity-90';
  } else if (isLocked) {
    containerClasses += 'border-dark-border opacity-50';
  } else if (!isWithinWindow) {
    containerClasses += 'border-dark-border/40 bg-dark-surface/10 opacity-75';
  } else {
    containerClasses += `${theme.border} hover:border-dark-border hover:shadow-md`;
  }

  // Format completed duration
  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className={containerClasses}>
      {/* Top Section */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-content-muted uppercase">
            Scheduled: {slot.scheduledTime}
          </span>
          <h3 className="text-[14px] font-semibold text-content-primary mt-1">
            {slot.label}
          </h3>
        </div>
        <div className={`p-2 rounded-lg bg-dark-bg/60 border border-dark-border/40 ${isActive ? theme.text : 'text-content-muted'}`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>

      {/* Center Section: Dynamic Content based on State */}
      <div className="flex-1 flex flex-col justify-center my-2">
        {isActive ? (
          <BreakTimer 
            elapsedSeconds={timerSeconds} 
            allowedMinutes={slot.durationMinutes} 
            color={slot.color} 
          />
        ) : isCompleted ? (
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-brand-success mb-2" />
            <span className="text-[12px] font-medium text-content-secondary">
              Break Taken
            </span>
            <span className="text-[11px] text-content-muted mt-0.5">
              Duration: {formatDuration(completedRecord.durationSeconds)}
            </span>
          </div>
        ) : isLocked ? (
          <div className="flex flex-col items-center justify-center py-2 text-center text-content-muted">
            <Lock className="w-6 h-6 mb-2" />
            <span className="text-[11px] font-medium">Unavailable</span>
          </div>
        ) : !isWithinWindow ? (
          <div className="flex flex-col items-center justify-center py-2 text-center text-content-muted">
            <Lock className="w-6 h-6 mb-2 text-brand-warning/60 animate-pulse" />
            <span className="text-[12px] font-medium text-content-secondary">Time Locked</span>
            <span className="text-[10px] text-content-muted mt-0.5">
              Available: {slot.scheduledTime}
            </span>
          </div>
        ) : (
          <div className="py-2">
            <div className="text-[20px] font-bold text-content-primary font-mono">
              {slot.durationMinutes} <span className="text-[12px] font-medium text-content-muted">mins</span>
            </div>
            <p className="text-[11px] text-content-secondary mt-1">
              Standard allocation for this shift segment.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Section: Actions */}
      <div className="mt-4">
        {isActive ? (
          <button
            onClick={() => onEnd(slot)}
            aria-label={`End ${slot.label}`}
            className="w-full bg-brand-danger hover:bg-brand-danger/90 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm shadow-lg shadow-brand-danger/10"
          >
            End Break
          </button>
        ) : isCompleted ? (
          <div className="flex justify-between items-center bg-dark-bg/40 border border-dark-border/40 rounded-lg p-2 text-[11px]">
            <span className="text-content-secondary">Status:</span>
            <span className={`font-semibold ${completedRecord.status.includes('Overtime') ? 'text-brand-danger' : 'text-brand-success'}`}>
              {completedRecord.status}
            </span>
          </div>
        ) : isLocked ? (
          <button
            disabled
            title="A break is already in progress"
            className="w-full bg-dark-surface/50 border border-dark-border text-content-muted cursor-not-allowed font-medium py-2 px-4 rounded-lg text-sm"
          >
            Start Break
          </button>
        ) : !isWithinWindow ? (
          <button
            disabled
            title={`Available only between ${slot.scheduledTime}`}
            className="w-full bg-dark-surface/30 border border-dark-border text-content-muted cursor-not-allowed font-medium py-2 px-4 rounded-lg text-sm"
          >
            Start Break (Locked)
          </button>
        ) : (
          <button
            onClick={() => onStart(slot)}
            className={`w-full font-medium py-2 px-4 rounded-lg text-sm transition-all duration-200 ${theme.btn}`}
          >
            Start Break
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(BreakSlotCard);
