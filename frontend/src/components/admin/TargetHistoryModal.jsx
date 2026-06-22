import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { Target, X, CheckCircle2, TrendingUp } from 'lucide-react';

const TargetHistoryModal = ({ employee, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [employee]);

  const fetchHistory = async () => {
    if (!employee) return;
    try {
      setLoading(true);
      const res = await axios.get(`/targets/employee/${employee.id}/summary`);
      
      // Sort by start_date descending (newest first)
      const sorted = (res.data.data || []).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      setHistory(sorted);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const calculateAchievement = (target, progress) => {
    if (!target || target <= 0) return 0;
    const percent = (progress / target) * 100;
    return percent > 100 ? 100 : percent.toFixed(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateString));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-surface border border-dark-border rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-dark-border bg-dark-bg/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-content-primary">Target History</h3>
              <p className="text-[10px] text-content-muted mt-0.5">
                Past performance for <strong className="text-content-secondary">{employee?.name}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-content-muted hover:text-content-primary transition-colors bg-dark-bg border border-dark-border rounded hover:bg-dark-surface">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Spinner />
              <p className="text-[10px] uppercase tracking-wider text-content-muted animate-pulse">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <Target size={32} className="text-content-muted/30 mb-3" />
              <p className="text-xs font-bold text-content-muted">No past targets found</p>
              <p className="text-[10px] text-content-muted/70 mt-1">This employee has not been assigned any targets yet.</p>
            </div>
          ) : (
            <div className="bg-dark-bg border border-dark-border/40 rounded-xl overflow-hidden">
              <table className="min-w-full text-xs">
                <thead className="bg-dark-surface/60 border-b border-dark-border/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-content-muted uppercase tracking-wider text-[9px]">Date Range</th>
                    <th className="px-4 py-3 text-left font-bold text-content-muted uppercase tracking-wider text-[9px]">Target Metric</th>
                    <th className="px-4 py-3 text-center font-bold text-content-muted uppercase tracking-wider text-[9px]">Target Value</th>
                    <th className="px-4 py-3 text-center font-bold text-content-muted uppercase tracking-wider text-[9px]">Achieved</th>
                    <th className="px-4 py-3 text-right font-bold text-content-muted uppercase tracking-wider text-[9px]">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {history.map(t => {
                    const percent = calculateAchievement(t.target_value, t.progress);
                    const isSuccess = percent >= 100;
                    const isWarning = percent > 0 && percent < 100;
                    
                    return (
                      <tr key={t.id} className="hover:bg-dark-surface/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-[10px] font-medium text-content-secondary">
                          {formatDate(t.start_date)} <span className="opacity-50 mx-1">→</span> {formatDate(t.end_date)}
                        </td>
                        <td className="px-4 py-3 font-bold text-content-primary">
                          {t.target_name}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {t.target_value}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          <span className={isSuccess ? 'text-brand-success' : 'text-content-secondary'}>
                            {t.progress || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-[10px] font-bold ${isSuccess ? 'text-brand-success' : isWarning ? 'text-amber-400' : 'text-content-muted'}`}>
                              {percent}%
                            </span>
                            <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${isSuccess ? 'bg-brand-success' : isWarning ? 'bg-amber-400' : 'bg-content-muted'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            {isSuccess && <CheckCircle2 size={12} className="text-brand-success ml-1" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border bg-dark-bg/80 flex justify-end shrink-0">
          <Button variant="secondary" onClick={onClose} className="h-9 px-6 text-[10px]">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TargetHistoryModal;
