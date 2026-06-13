import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Building2, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

const Businesses = () => {
  const { user } = useAuthStore();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBizId, setExpandedBizId] = useState(null);
  const [bizDetails, setBizDetails] = useState({});

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const res = await axios.get(`/admin/employees/${user.id}/businesses`);
        setBusinesses(res.data.data);
      } catch (err) {
        toast.error('Failed to load assigned businesses');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchAssigned();
  }, [user]);

  const toggleExpand = async (bizId) => {
    if (expandedBizId === bizId) {
      setExpandedBizId(null);
      return;
    }
    
    setExpandedBizId(bizId);
    if (!bizDetails[bizId]) {
      try {
        const [timingsRes, activitiesRes] = await Promise.all([
          axios.get(`/businesses/${bizId}/timings`),
          axios.get(`/businesses/${bizId}/activity-types`)
        ]);
        setBizDetails(prev => ({
          ...prev,
          [bizId]: {
            timings: timingsRes.data.data,
            activityTypes: activitiesRes.data.data
          }
        }));
      } catch (err) {
        toast.error('Failed to load business details');
      }
    }
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">My Assigned Businesses</h1>
        <p className="text-content-secondary mt-1">Review the business units you are assigned to monitor.</p>
      </div>

      {businesses.length === 0 ? (
        <div className="card p-12 text-center text-content-muted">
          No businesses currently assigned. Contact your administrator if you believe this is an error.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {businesses.map((biz) => {
            const isExpanded = expandedBizId === biz.id;
            const details = bizDetails[biz.id];

            return (
              <div 
                key={biz.id}
                className={`card p-6 flex flex-col justify-between transition-all duration-300 border ${
                  isExpanded ? 'border-brand-primary bg-brand-primary/5 shadow-lg shadow-brand-primary/5' : 'border-dark-border hover:border-brand-primary/30'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-content-primary">{biz.business_name}</h2>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-success/15 text-brand-success">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => toggleExpand(biz.id)}
                      className={`p-2 rounded-md hover:bg-dark-bg transition-transform duration-300 text-content-muted hover:text-content-primary ${
                        isExpanded ? 'rotate-90 text-brand-primary' : ''
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {biz.description && (
                    <p className="text-content-secondary text-sm mt-4 leading-relaxed">{biz.description}</p>
                  )}

                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-dark-border animate-fade-in space-y-4 text-sm">
                      {/* Timings */}
                      <div>
                        <h4 className="font-semibold text-content-primary mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-content-muted">
                          <Clock className="w-4 h-4 text-brand-secondary" />
                          Reporting Shift Timings
                        </h4>
                        {details?.timings?.length === 0 ? (
                          <span className="text-content-muted text-xs">No timing intervals defined.</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {details?.timings?.map(t => (
                              <span key={t.id} className="bg-dark-bg border border-dark-border px-3 py-1 rounded-md text-xs font-medium text-content-primary">
                                {t.timing_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Activity Types */}
                      <div>
                        <h4 className="font-semibold text-content-primary mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-content-muted">
                          <Building2 className="w-4 h-4 text-brand-primary" />
                          Activity Categories
                        </h4>
                        {details?.activityTypes?.length === 0 ? (
                          <span className="text-content-muted text-xs">No activity categories available.</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {details?.activityTypes?.map(a => (
                              <span key={a.id} className="bg-dark-bg border border-dark-border px-3 py-1 rounded-md text-xs font-medium text-content-primary">
                                {a.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Businesses;
