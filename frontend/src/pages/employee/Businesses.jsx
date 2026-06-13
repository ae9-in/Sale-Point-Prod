import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Building2, Clock, CheckCircle2, ChevronRight, FileText } from 'lucide-react';

const Businesses = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBusinesses = async () => {
      try {
        const res = await axios.get(`/admin/employees/${user.id}/businesses`);
        setBusinesses(res.data.data);
      } catch (err) {
        toast.error('Failed to load businesses');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchMyBusinesses();
  }, [user]);

  const handleTimingClick = (businessId, timingId) => {
    navigate(`/employee/submit-report?businessId=${businessId}&timingId=${timingId}`);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-content-secondary animate-pulse">Loading assigned businesses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="px-1">
        <h1 className="text-xl font-bold text-content-primary">My Businesses</h1>
        <p className="text-xs text-content-secondary">Select a timing or form to submit your report.</p>
      </div>

      {businesses.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-content-muted">No businesses assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <div key={business.id} className="card flex flex-col h-full hover:border-brand-primary/40 transition-all group overflow-hidden active:scale-[0.98]">
              <button 
                onClick={() => navigate(`/employee/submit-report?businessId=${business.id}`)}
                className="p-4 border-b border-dark-border bg-dark-bg/20 text-left w-full transition-colors hover:bg-dark-bg/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-content-primary text-base line-clamp-1">{business.business_name}</h3>
                    <p className="text-[11px] text-content-muted line-clamp-1 mt-0.5">{business.description || 'Assigned Business'}</p>
                  </div>
                  <div className="rounded-full bg-brand-primary/10 p-2 text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                    <Building2 size={16} />
                  </div>
                </div>
              </button>

              <div className="p-4 flex-1 space-y-4">
          ...
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-content-muted mb-2">
                    <Clock size={12} className="text-brand-primary" /> Scheduled Timings
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {business.timings?.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleTimingClick(business.id, t.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-bg px-2.5 py-1.5 text-xs font-medium text-content-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all active:scale-95"
                      >
                        {t.timing_name}
                        <ChevronRight size={12} className="text-content-muted group-hover:text-brand-primary" />
                      </button>
                    ))}
                    {(!business.timings || business.timings.length === 0) && (
                      <p className="text-[11px] text-content-muted italic">No timings scheduled</p>
                    )}
                  </div>
                </div>

                {/* Forms Section */}
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-content-muted mb-2">
                    <FileText size={12} className="text-brand-secondary" /> Reporting Forms
                  </div>
                  <div className="space-y-1.5">
                    {business.activityTypes?.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => navigate(`/employee/submit-report?businessId=${business.id}`)}
                        className="flex w-full items-center justify-between rounded-lg bg-dark-bg/50 p-2 text-xs text-content-secondary hover:text-brand-primary transition-colors border border-transparent hover:border-brand-primary/20"
                      >
                        <span className="truncate">{a.name}</span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Businesses;
