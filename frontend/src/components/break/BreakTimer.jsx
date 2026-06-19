import React from 'react';

const formatTime = (seconds) => {
  const m = Math.floor(Math.abs(seconds) / 60).toString().padStart(2, "0");
  const s = (Math.abs(seconds) % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const BreakTimer = ({ elapsedSeconds, allowedMinutes, color }) => {
  const allowedSeconds = allowedMinutes * 60;
  const isEmergency = !allowedMinutes;
  const isOverLimit = !isEmergency && elapsedSeconds > allowedSeconds;
  
  // Color configuration
  const colorMap = {
    amber: 'text-brand-warning bg-brand-warning',
    blue: 'text-brand-primary bg-brand-primary',
    purple: 'text-brand-primaryLight bg-brand-primaryLight',
    red: 'text-brand-danger bg-brand-danger'
  };

  const activeColor = isOverLimit ? 'text-brand-danger animate-pulse' : (colorMap[color] ? colorMap[color].split(' ')[0] : 'text-brand-warning');
  const barColor = isOverLimit ? 'bg-brand-danger' : (colorMap[color] ? colorMap[color].split(' ')[1] : 'bg-brand-warning');

  // Progress percentage
  const progressPercent = isEmergency 
    ? 0 
    : Math.min(100, (elapsedSeconds / allowedSeconds) * 100);

  const timeRemainingSeconds = isEmergency ? 0 : allowedSeconds - elapsedSeconds;

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-dark-bg/60 border border-dark-border/40 w-full select-none" aria-live="polite">
      {/* Clock Display */}
      <div className={`text-3xl md:text-4xl font-mono font-bold tracking-wider ${activeColor} mb-2`}>
        {isOverLimit ? `+${formatTime(elapsedSeconds - allowedSeconds)}` : formatTime(elapsedSeconds)}
      </div>

      {/* Progress Bar */}
      {!isEmergency && (
        <div className="w-full mt-1 mb-1">
          <div className="progress-track w-full">
            <div 
              className={`progress-fill ${barColor}`} 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5 text-[11px] text-content-secondary font-medium">
            <span>Limit: {formatTime(allowedSeconds)}</span>
            {timeRemainingSeconds >= 0 ? (
              <span>Remaining: {formatTime(timeRemainingSeconds)}</span>
            ) : (
              <span className="text-brand-danger font-semibold">Overtime</span>
            )}
          </div>
        </div>
      )}

      {isEmergency && (
        <div className="text-[11px] text-content-secondary font-medium mt-1">
          Emergency break in progress (No limit)
        </div>
      )}
    </div>
  );
};

export default React.memo(BreakTimer);
