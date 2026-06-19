import React, { useState, useEffect, useCallback } from 'react';
import * as breakApi from '../../api/breakApi';
import { Coffee, CheckCircle2, User, Clock, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Live counting timer component for active employee breaks
const ActiveBreakRow = ({ record }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calc = () => {
      const started = new Date(record.started_at).getTime();
      return Math.max(0, Math.floor((Date.now() - started) / 1000));
    };

    setElapsed(calc());
    const t = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(t);
  }, [record.started_at]);

  const formatElapsed = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}:${s}`;
  };

  return (
    <tr className="border-b border-dark-border/30 last:border-0 hover:bg-dark-surface/30 transition-colors">
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-[11px] font-bold text-brand-primary">
            {record.employee_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-content-primary">{record.employee_name}</div>
            <div className="text-[10px] text-content-muted">{record.employee_email}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 font-medium text-content-secondary">
        {record.break_type}
      </td>
      <td className="py-3 px-3 text-content-secondary font-mono text-[11px]">
        {new Date(record.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </td>
      <td className="py-3 px-3 font-mono font-bold text-brand-warning">
        {formatElapsed(elapsed)}
      </td>
    </tr>
  );
};

const AdminBreakDashboard = () => {
  const [activeBreaks, setActiveBreaks] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const activeRes = await breakApi.getAdminActiveBreaks();
      const historyRes = await breakApi.getAdminTodayHistory();

      setActiveBreaks(activeRes.data || []);
      setCompletedToday(historyRes.data || []);
    } catch (err) {
      console.error('Failed to load admin break dashboard data:', err);
      toast.error('Failed to fetch dashboard updates');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // Fetch initial data & set up automatic background sync every 10 seconds
  useEffect(() => {
    fetchDashboardData(true);
    const syncInterval = setInterval(() => {
      fetchDashboardData(false);
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [fetchDashboardData]);

  const formatDuration = (sec) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
        <h3 className="text-sm font-semibold text-content-primary">Loading Break Dashboard</h3>
        <p className="text-[11px] text-content-secondary mt-1">Fetching live break statuses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-dark-border/40 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-content-primary flex items-center gap-2">
            <Coffee className="w-6 h-6 text-brand-primary" /> Break Management Dashboard
          </h1>
          <p className="text-[12px] text-content-secondary mt-1">
            Monitor real-time employee breaks and view daily metrics.
          </p>
        </div>
        <button 
          onClick={() => fetchDashboardData(true)}
          className="btn-secondary text-[11px] font-semibold py-1.5 px-3 rounded-lg"
        >
          Refresh Now
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Stat 1 */}
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[20px] font-bold text-content-primary font-mono">
              {activeBreaks.length}
            </div>
            <div className="text-[11px] text-content-secondary mt-0.5">
              Employees Currently Away
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-brand-success/10 border border-brand-success/20 text-brand-success">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[20px] font-bold text-content-primary font-mono">
              {completedToday.length}
            </div>
            <div className="text-[11px] text-content-secondary mt-0.5">
              Total Breaks Completed Today
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Active Breaks & History Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Breaks Tracker (2/3 width on large screens) */}
        <div className="card lg:col-span-2">
          <div className="border-b border-dark-border/40 pb-3 mb-4 flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-brand-primary" />
            <h2 className="text-sm font-semibold text-content-primary">Active Breaks Tracker</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-dark-border text-content-muted font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Break Type</th>
                  <th className="py-2.5 px-3">Started At</th>
                  <th className="py-2.5 px-3">Live Elapsed</th>
                </tr>
              </thead>
              <tbody>
                {activeBreaks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-content-muted italic">
                      No employees are currently on a break.
                    </td>
                  </tr>
                ) : (
                  activeBreaks.map((item) => (
                    <ActiveBreakRow key={item.id} record={item} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Small Stats Widget (1/3 width) */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="border-b border-dark-border/40 pb-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-brand-primary" />
              <h2 className="text-sm font-semibold text-content-primary">Break Policy Reminders</h2>
            </div>
            <ul className="space-y-2 text-[11px] text-content-secondary list-disc pl-4 leading-relaxed">
              <li>Morning & Evening breaks are capped at <strong>15 minutes</strong>.</li>
              <li>Afternoon lunch breaks are capped at <strong>45 minutes</strong>.</li>
              <li>System automatically records overages and alerts admins via email.</li>
              <li>All breaks, including emergency breaks, are logged directly for shift audits.</li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-dark-border/40 bg-dark-bg/20 p-2.5 rounded-lg text-center text-[10px] text-content-muted">
            Auto-sync is enabled. Page refreshes every 10 seconds automatically.
          </div>
        </div>
      </div>

      {/* Completed Breaks List */}
      <div className="card w-full">
        <div className="border-b border-dark-border/40 pb-3 mb-4">
          <h2 className="text-sm font-semibold text-content-primary">Company Completed Breaks Logs — Today</h2>
          <p className="text-[10px] text-content-secondary mt-0.5">Logs of all completed break sessions.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-dark-border text-content-muted font-semibold text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Break Type</th>
                <th className="py-2.5 px-3">Started At</th>
                <th className="py-2.5 px-3">Ended At</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {completedToday.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-content-muted italic">
                    No break logs recorded for today yet.
                  </td>
                </tr>
              ) : (
                completedToday.map((record) => {
                  const isOvertime = record.status.includes('Overtime');
                  return (
                    <tr 
                      key={record.id} 
                      className="border-b border-dark-border/30 last:border-0 hover:bg-dark-surface/30 transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-content-primary">
                        {record.employee_name}
                      </td>
                      <td className="py-3 px-3 text-content-secondary">
                        {record.break_type}
                      </td>
                      <td className="py-3 px-3 text-content-secondary font-mono text-[11px]">
                        {new Date(record.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-content-secondary font-mono text-[11px]">
                        {new Date(record.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-content-primary">
                        {formatDuration(record.duration_seconds)}
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
    </div>
  );
};

export default AdminBreakDashboard;
