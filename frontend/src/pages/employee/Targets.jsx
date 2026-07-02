import { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Target, Calendar, CheckCircle2, Award, Building2 } from 'lucide-react';

const Targets = () => {
  const { user } = useAuthStore();
  const [targets, setTargets] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    const fetchData = async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        const [targetRes, bizRes] = await Promise.all([
          axios.get(`/targets/employee/${user.id}/summary`),
          axios.get('/businesses')
        ]);
        if (isMounted) {
          // Sort by start_date descending (newest first)
          const sorted = (targetRes.data.data || []).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
          setTargets(sorted);
          setBusinesses(bizRes.data.data || []);
        }
      } catch (err) {
        if (!isSilent) toast.error('Failed to load targets');
      } finally {
        if (isMounted && !isSilent) setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

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
  const groupedTargets = useMemo(() => {
    const groups = {};
    targets.forEach(t => {
      // Create a unique key for the date range + business
      const key = `${t.start_date}_${t.end_date}_${t.business_id}`;
      if (!groups[key]) {
        const bizName = businesses.find(b => b.id === t.business_id)?.business_name || 'Assigned Business';
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
  }, [targets, businesses]);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-content-secondary animate-pulse">Loading your targets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-black text-content-primary tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-brand-primary animate-pulse" />
          My Targets
        </h1>
        <p className="text-[10px] text-content-secondary uppercase tracking-[0.15em] font-bold mt-1">Review your daily performance goals and current achievements.</p>
      </div>

      {groupedTargets.length === 0 ? (
        <div className="card p-12 text-center text-content-muted flex flex-col items-center justify-center bg-dark-surface/40 backdrop-blur-md border-dark-border/40">
          <Award className="w-12 h-12 text-content-muted/40 mb-3" />
          <p className="text-xs font-bold uppercase tracking-wider">No targets have been assigned to you yet.</p>
          <p className="text-[10px] text-content-muted/70 mt-1">Check back later or contact your manager.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {groupedTargets.map((group, idx) => (
            <div key={idx} className="card p-0 overflow-hidden bg-dark-surface/60 border-dark-border/50 shadow-sm backdrop-blur-sm">
              {/* Card Header */}
              <div className="px-5 py-3.5 bg-dark-bg/80 border-b border-dark-border/40 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs font-black text-content-primary uppercase tracking-wider">
                  <Calendar size={14} className="text-brand-primary" />
                  {formatDate(group.startDate)} {group.startDate !== group.endDate && `— ${formatDate(group.endDate)}`}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-content-muted bg-dark-bg border border-dark-border/60 px-2 py-1 rounded">
                  <Building2 size={12} className="text-content-muted" />
                  {group.businessName}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-0 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-dark-bg/20 border-b border-dark-border/20">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-content-muted uppercase tracking-wider text-[10px] w-1/3">Target Metric</th>
                      <th className="px-5 py-3 text-center font-bold text-content-muted uppercase tracking-wider text-[10px]">Target Value</th>
                      <th className="px-5 py-3 text-center font-bold text-content-muted uppercase tracking-wider text-[10px]">Achieved</th>
                      <th className="px-5 py-3 text-left font-bold text-content-muted uppercase tracking-wider text-[10px]">Performance Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/20">
                    {group.targets.map(t => {
                      const percent = calculateAchievement(t.target_value, t.progress);
                      const isSuccess = percent >= 100;
                      const isWarning = percent > 0 && percent < 100;
                      
                      return (
                        <tr key={t.id} className="hover:bg-dark-surface/50 transition-colors">
                          <td className="px-5 py-4 font-black text-content-primary text-xs tracking-wide">
                            {t.target_name}
                          </td>
                          <td className="px-5 py-4 text-center font-mono font-medium text-content-secondary">
                            {t.target_value}
                          </td>
                          <td className="px-5 py-4 text-center font-mono">
                            <span className={isSuccess ? 'text-brand-success font-black text-sm' : 'text-content-secondary font-medium'}>
                              {t.progress || 0}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-start gap-3 max-w-[200px]">
                              <span className={`text-[11px] font-black w-10 text-right ${isSuccess ? 'text-brand-success' : isWarning ? 'text-amber-400' : 'text-content-muted'}`}>
                                {percent}%
                              </span>
                              <div className="flex-1 h-2 bg-dark-bg border border-dark-border/50 rounded-full overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full rounded-full transition-all duration-700 ${isSuccess ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : isWarning ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'bg-content-muted'}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              {isSuccess && <CheckCircle2 size={14} className="text-brand-success shrink-0" />}
                            </div>
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
  );
};

export default Targets;
