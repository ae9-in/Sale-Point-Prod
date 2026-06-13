import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, FileText, Target, Clock, CheckCircle2, X } from 'lucide-react';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      if (isAdmin) {
        // For admin: recent report submissions
        const res = await axios.get('/admin/reports?limit=5');
        const logs = res.data.data.map(log => ({
          id: log.id,
          type: 'report',
          title: 'New Report Submitted',
          message: `${log.employee_name} submitted a report for ${log.business_name}`,
          time: new Date(log.report_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          icon: FileText,
          color: 'text-brand-primary',
          path: '/admin/reports'
        }));
        setNotifications(logs);
      } else {
        // For employee: upcoming timings and targets
        const [timingsRes, targetsRes] = await Promise.all([
          axios.get(`/employee/businesses`), // We'll need to filter timings manually or add an endpoint
          axios.get(`/targets/my-targets`)
        ]);

        const upcoming = [];
        // Process targets
        targetsRes.data.data.slice(0, 2).forEach(t => {
          upcoming.push({
            id: t.id,
            type: 'target',
            title: 'Target Reminder',
            message: `Don't forget: ${t.target_name} (${t.current_value}/${t.target_value})`,
            time: 'Active',
            icon: Target,
            color: 'text-brand-warning',
            path: '/employee/targets'
          });
        });

        setNotifications(upcoming);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (user) fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000 * 5); // Refresh every 5 mins
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-content-secondary hover:bg-dark-surface hover:text-brand-warning transition-colors relative"
      >
        <Bell className="w-4.5 h-4.5" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-warning rounded-full border-2 border-dark-bg"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-hidden rounded-xl border border-dark-border bg-dark-surface shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-dark-border px-4 py-3 bg-dark-bg/50">
              <h3 className="text-sm font-semibold text-content-primary">Notifications</h3>
              <button onClick={() => setIsOpen(false)} className="text-content-muted hover:text-content-primary"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto max-h-[340px]">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <button
                    key={`${n.type}-${n.id}`}
                    onClick={() => {
                      navigate(n.path);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-start gap-3 border-b border-dark-border/50 p-4 text-left hover:bg-dark-bg/50 transition-colors last:border-0"
                  >
                    <div className={cn("mt-0.5 rounded-lg p-1.5 bg-dark-bg", n.color)}>
                      <n.icon size={16} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-content-primary truncate">{n.title}</p>
                      <p className="text-xs text-content-secondary line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-content-muted mt-1.5 flex items-center gap-1 font-mono uppercase tracking-tighter">
                        <Clock size={10} /> {n.time}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Bell className="mx-auto h-8 w-8 text-dark-border mb-3" />
                  <p className="text-sm text-content-secondary">No new notifications</p>
                </div>
              )}
            </div>
            <div className="border-t border-dark-border px-4 py-2 bg-dark-bg/30 text-center">
              <button 
                onClick={() => {
                  navigate(isAdmin ? '/admin/reports' : '/employee/reports');
                  setIsOpen(false);
                }}
                className="text-[11px] font-bold uppercase tracking-wider text-brand-primary hover:underline"
              >
                View All Activity
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notifications;
