import { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axiosInstance';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { Target, X, CheckCircle2, TrendingUp, Building2, Calendar, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TargetHistoryModal = ({ employee, businesses = [], onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

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
      toast.error('Failed to load target history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!window.confirm('Are you sure you want to delete this specific target?')) return;
    try {
      setDeletingId(id);
      await axios.delete(`/targets/${id}`);
      toast.success('Target deleted successfully');
      setHistory(prev => prev.filter(t => t.id !== id));
    } catch {
      toast.error('Failed to delete target');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCard = async (targets) => {
    if (!window.confirm('Are you sure you want to delete ALL targets for this date?')) return;
    try {
      const ids = targets.map(t => t.id);
      await Promise.all(ids.map(id => axios.delete(`/targets/${id}`)));
      toast.success('Card targets deleted successfully');
      setHistory(prev => prev.filter(t => !ids.includes(t.id)));
    } catch {
      toast.error('Failed to delete some targets');
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

  // Group history by date range
  const groupedHistory = useMemo(() => {
    const filtered = history.filter(t => 
      selectedBusiness === 'all' || t.business_id === selectedBusiness
    );

    const groups = {};
    filtered.forEach(t => {
      // Create a unique key for the date range + business
      const key = `${t.start_date}_${t.end_date}_${t.business_id}`;
      if (!groups[key]) {
        const bizName = businesses.find(b => b.id === t.business_id)?.business_name || 'Global / Unknown Business';
        groups[key] = {
          startDate: t.start_date,
          endDate: t.end_date,
          businessName: bizName,
          targets: []
        };
      }
      groups[key].targets.push(t);
    });

    // Return array of groups
    return Object.values(groups).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [history, selectedBusiness, businesses]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-surface border border-dark-border rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
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
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Building2 size={12} className="text-content-muted" />
              <select
                className="bg-dark-bg border border-dark-border rounded px-2 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary transition-colors cursor-pointer"
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
              >
                <option value="all">All Businesses</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.business_name}</option>
                ))}
              </select>
            </div>
            <button onClick={onClose} className="p-2 text-content-muted hover:text-content-primary transition-colors bg-dark-bg border border-dark-border rounded hover:bg-dark-surface">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-dark-bg/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Spinner />
              <p className="text-[10px] uppercase tracking-wider text-content-muted animate-pulse">Loading history...</p>
            </div>
          ) : groupedHistory.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <Target size={32} className="text-content-muted/30 mb-3" />
              <p className="text-xs font-bold text-content-muted">No past targets found</p>
              <p className="text-[10px] text-content-muted/70 mt-1">This employee has no targets matching the current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedHistory.map((group, idx) => (
                <div key={idx} className="bg-dark-surface border border-dark-border/60 rounded-xl overflow-hidden shadow-sm">
                  {/* Card Header */}
                  <div className="px-4 py-3 bg-dark-bg/60 border-b border-dark-border/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-primary uppercase tracking-wider">
                        <Calendar size={12} className="text-brand-primary" />
                        {formatDate(group.startDate)} {group.startDate !== group.endDate && `— ${formatDate(group.endDate)}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-content-muted">
                        <Building2 size={10} />
                        {group.businessName}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteCard(group.targets)}
                      className="px-2 py-1 text-content-muted hover:text-brand-danger bg-dark-bg hover:bg-brand-danger/10 border border-dark-border/50 rounded transition-all flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold"
                      title="Delete all targets for this date"
                    >
                      <Trash2 size={10} />
                      Delete Card
                    </button>
                  </div>

                  {/* Card Body (Metrics) */}
                  <div className="p-0 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-dark-bg/30 border-b border-dark-border/30">
                        <tr>
                          <th className="px-4 py-2 text-left font-bold text-content-muted uppercase tracking-wider text-[9px] w-1/3">Target Metric</th>
                          <th className="px-4 py-2 text-center font-bold text-content-muted uppercase tracking-wider text-[9px]">Target Value</th>
                          <th className="px-4 py-2 text-center font-bold text-content-muted uppercase tracking-wider text-[9px]">Achieved</th>
                          <th className="px-4 py-2 text-left font-bold text-content-muted uppercase tracking-wider text-[9px]">Performance</th>
                          <th className="px-4 py-2 text-right font-bold text-content-muted uppercase tracking-wider text-[9px] w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border/20">
                        {group.targets.map(t => {
                          const percent = calculateAchievement(t.target_value, t.progress);
                          const isSuccess = percent >= 100;
                          const isWarning = percent > 0 && percent < 100;
                          const isDeleting = deletingId === t.id;
                          
                          return (
                            <tr key={t.id} className="hover:bg-dark-surface/50 transition-colors">
                              <td className="px-4 py-2.5 font-bold text-content-primary text-[11px]">
                                {t.target_name}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-content-secondary">
                                {t.target_value}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono">
                                <span className={isSuccess ? 'text-brand-success font-bold' : 'text-content-secondary'}>
                                  {t.progress || 0}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-start gap-2 max-w-[120px]">
                                  <span className={`text-[10px] font-bold w-9 text-right ${isSuccess ? 'text-brand-success' : isWarning ? 'text-amber-400' : 'text-content-muted'}`}>
                                    {percent}%
                                  </span>
                                  <div className="flex-1 h-1.5 bg-dark-bg border border-dark-border/50 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${isSuccess ? 'bg-brand-success' : isWarning ? 'bg-amber-400' : 'bg-content-muted'}`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  {isSuccess && <CheckCircle2 size={10} className="text-brand-success shrink-0" />}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button 
                                  onClick={() => handleDeleteTarget(t.id)}
                                  disabled={isDeleting}
                                  className="p-1.5 text-content-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded transition-all disabled:opacity-50"
                                  title="Delete this target"
                                >
                                  {isDeleting ? <Spinner size="sm" /> : <Trash2 size={12} />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border bg-dark-bg/80 flex justify-between items-center shrink-0">
          <div className="sm:hidden flex items-center gap-2">
            <Building2 size={12} className="text-content-muted" />
            <select
              className="bg-dark-surface border border-dark-border rounded px-2 py-1 text-[10px] text-content-primary"
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
            >
              <option value="all">All Businesses</option>
              {businesses.map(b => (
                <option key={b.id} value={b.id}>{b.business_name}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" onClick={onClose} className="h-9 px-6 text-[10px] ml-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TargetHistoryModal;
