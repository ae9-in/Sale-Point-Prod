import { useEffect, useState } from 'react';
import axios from '../../api/axiosInstance';
import Spinner from '../ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Clock, CheckCircle2, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';

const SubmissionStatusTracker = ({ businessId, date, locationId }) => {
  const [selectedDate, setSelectedDate] = useState(date || new Date().toLocaleDateString('en-CA'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (date) {
      setSelectedDate(date);
    }
  }, [date]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get('/analytics/submission-status', {
          params: {
            businessId,
            date: selectedDate,
            locationId
          }
        });
        setData(res.data.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load submission tracking data');
      } finally {
        setLoading(false);
      }
    };

    if (businessId) {
      fetchStatus();
    }
  }, [businessId, selectedDate, locationId]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

  // Compute summary stats
  const stats = (() => {
    if (!data || !data.matrix || data.matrix.length === 0) {
      return { totalSlots: 0, submitted: 0, onTime: 0, late: 0, missing: 0, pending: 0 };
    }

    let totalSlots = 0;
    let submitted = 0;
    let onTime = 0;
    let late = 0;
    let missing = 0;
    let pending = 0;

    data.matrix.forEach(emp => {
      emp.timings.forEach(t => {
        totalSlots++;
        if (t.status === 'ON_TIME') {
          submitted++;
          onTime++;
        } else if (t.status === 'LATE') {
          submitted++;
          late++;
        } else if (t.status === 'MISSING') {
          missing++;
        } else {
          pending++;
        }
      });
    });

    return { totalSlots, submitted, onTime, late, missing, pending };
  })();

  const getPercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className="card border-dark-border/40 bg-dark-surface/40 p-5 backdrop-blur-md shadow-lg space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-dark-border/40">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-content-primary flex items-center gap-2">
            <Clock size={14} className="text-brand-primary" />
            Hourly Submission Status Tracker
          </h3>
          <p className="text-[11px] text-content-secondary mt-0.5">
            Real-time track of configured slots submission status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-content-muted" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1 text-xs text-content-primary outline-none focus:border-brand-primary transition-colors cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 w-full flex-col items-center justify-center space-y-3">
          <Spinner size="md" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted animate-pulse">Loading Tracker Matrix...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-brand-danger font-medium">{error}</div>
      ) : !data || data.timings.length === 0 ? (
        <div className="py-8 text-center text-xs text-content-muted font-medium uppercase tracking-widest">
          No Configured Time Slots Found for this Market Unit
        </div>
      ) : data.matrix.length === 0 ? (
        <div className="py-8 text-center text-xs text-content-muted font-medium uppercase tracking-widest">
          No Assigned Active Employees in this Location/Market Unit
        </div>
      ) : (
        <>
          {/* Summary metrics header */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-4">
            <div className="bg-dark-bg/50 border border-dark-border/40 rounded-lg p-3 text-center">
              <p className="text-[9px] uppercase font-bold text-content-muted tracking-wider">Assigned Team</p>
              <p className="text-base font-black text-content-primary mt-0.5">{data.matrix.length}</p>
            </div>
            <div className="bg-dark-bg/50 border border-dark-border/40 rounded-lg p-3 text-center">
              <p className="text-[9px] uppercase font-bold text-content-muted tracking-wider">Submissions</p>
              <p className="text-base font-black text-brand-primary mt-0.5">
                {stats.submitted} <span className="text-xs font-bold text-content-secondary">({getPercentage(stats.submitted, stats.totalSlots)}%)</span>
              </p>
            </div>
            <div className="bg-dark-bg/50 border border-dark-border/40 rounded-lg p-3 text-center border-l-2 border-l-brand-success">
              <p className="text-[9px] uppercase font-bold text-brand-success/80 tracking-wider">On Time</p>
              <p className="text-base font-black text-brand-success mt-0.5">
                {stats.onTime} <span className="text-xs font-bold text-content-secondary">({getPercentage(stats.onTime, stats.totalSlots)}%)</span>
              </p>
            </div>
            <div className="bg-dark-bg/50 border border-dark-border/40 rounded-lg p-3 text-center border-l-2 border-l-brand-warning">
              <p className="text-[9px] uppercase font-bold text-brand-warning/80 tracking-wider">Late</p>
              <p className="text-base font-black text-brand-warning mt-0.5">
                {stats.late} <span className="text-xs font-bold text-content-secondary">({getPercentage(stats.late, stats.totalSlots)}%)</span>
              </p>
            </div>
            <div className="bg-dark-bg/50 border border-dark-border/40 rounded-lg p-3 text-center border-l-2 border-l-brand-danger col-span-2 sm:col-span-1">
              <p className="text-[9px] uppercase font-bold text-brand-danger/80 tracking-wider">Overdue</p>
              <p className="text-base font-black text-brand-danger mt-0.5">
                {stats.missing} <span className="text-xs font-bold text-content-secondary">({getPercentage(stats.missing, stats.totalSlots)}%)</span>
              </p>
            </div>
          </div>

          {/* Matrix table */}
          <div className="overflow-x-auto rounded-lg border border-dark-border/60">
            <Table>
              <Thead>
                <Tr className="bg-dark-bg/30">
                  <Th className="text-[10px] uppercase tracking-wider font-extrabold w-[160px] min-w-[160px] sticky left-0 bg-dark-surface z-10">Employee</Th>
                  {data.timings.map(t => (
                    <Th key={t.id} className="text-[10px] uppercase tracking-wider font-extrabold text-center min-w-[140px]">
                      {t.timing_name}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {data.matrix.map(emp => (
                  <Tr key={emp.employeeId} className="hover:bg-brand-primary/[0.02] transition-colors border-b border-dark-border/40 last:border-b-0">
                    <Td className="font-bold text-content-primary text-xs sticky left-0 bg-dark-surface z-10 border-r border-dark-border/40">
                      {emp.employeeName}
                    </Td>
                    {emp.timings.map(t => {
                      let badgeClasses = "";
                      let statusText = "";
                      let icon = null;

                      if (t.status === 'ON_TIME') {
                        badgeClasses = "bg-brand-success/10 text-brand-success border-brand-success/20";
                        statusText = `On Time (${formatTime(t.submittedAt)})`;
                        icon = <CheckCircle2 size={11} className="shrink-0" />;
                      } else if (t.status === 'LATE') {
                        badgeClasses = "bg-brand-warning/10 text-brand-warning border-brand-warning/20";
                        statusText = `Late (${formatTime(t.submittedAt)})`;
                        icon = <AlertTriangle size={11} className="shrink-0" />;
                      } else if (t.status === 'MISSING') {
                        badgeClasses = "bg-brand-danger/10 text-brand-danger border-brand-danger/20";
                        statusText = "Overdue";
                        icon = <AlertCircle size={11} className="shrink-0" />;
                      } else {
                        badgeClasses = "bg-dark-bg border-dark-border text-content-muted opacity-60";
                        statusText = "Pending";
                        icon = <Clock size={11} className="shrink-0" />;
                      }

                      return (
                        <Td key={t.timingId} className="text-center py-2.5">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold tracking-wide ${badgeClasses}`}>
                            {icon}
                            <span>{statusText}</span>
                          </div>
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default SubmissionStatusTracker;
