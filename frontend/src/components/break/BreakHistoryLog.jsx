import React from 'react';

const formatDuration = (sec) => {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const BreakHistoryLog = ({ history }) => {
  return (
    <div className="card w-full mt-6">
      <div className="border-b border-dark-border/40 pb-3 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-content-primary">
            Break History — Today
          </h2>
          <p className="text-[11px] text-content-secondary mt-0.5">
            Log of breaks taken in the current session.
          </p>
        </div>
        <span className="text-[10px] font-semibold text-content-muted bg-dark-bg/60 border border-dark-border/40 rounded-full px-2.5 py-0.5 uppercase tracking-wide">
          Read-Only
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-dark-border text-content-muted font-semibold text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Break Type</th>
              <th className="py-2.5 px-3">Started At</th>
              <th className="py-2.5 px-3">Ended At</th>
              <th className="py-2.5 px-3">Duration</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-content-muted italic">
                  No breaks taken today. Your break history will appear here.
                </td>
              </tr>
            ) : (
              history.map((record, idx) => {
                const isOvertime = record.status.includes('Overtime');
                return (
                  <tr 
                    key={record.id || idx} 
                    className="border-b border-dark-border/30 last:border-0 hover:bg-dark-surface/30 transition-colors"
                  >
                    <td className="py-3 px-3 font-semibold text-content-primary">
                      {record.type}
                    </td>
                    <td className="py-3 px-3 text-content-secondary">
                      {record.startedAt}
                    </td>
                    <td className="py-3 px-3 text-content-secondary">
                      {record.endedAt}
                    </td>
                    <td className="py-3 px-3 text-content-primary font-mono font-medium">
                      {formatDuration(record.durationSeconds)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                        isOvertime 
                          ? 'bg-brand-danger/10 text-brand-danger border border-brand-danger/20' 
                          : 'bg-brand-success/10 text-brand-success border border-brand-success/20'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-brand-warning italic font-medium">
                      {record.notes}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(BreakHistoryLog);
