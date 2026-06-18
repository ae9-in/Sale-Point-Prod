import { useEffect, useState, useMemo } from 'react';
import axios from '../../api/axiosInstance';
import Spinner from '../ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Clock, CheckCircle2, AlertTriangle, AlertCircle, Calendar, User, Filter } from 'lucide-react';
import Input from '../ui/Input';
import { exportToPdf, exportToJpg } from '../../utils/exportUtils';
import Button from '../ui/Button';
import { Download } from 'lucide-react';

const currentYear = new Date().getFullYear();

const SubmissionStatusTracker = ({ businessId, locationId }) => {
  const [filters, setFilters] = useState({
    period: 'day',
    date: new Date().toISOString().slice(0, 10),
    month: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    fromDate: '',
    toDate: '',
    employeeId: ''
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateParams = () => {
    const today = new Date();
    if (filters.period === 'day') {
      return { fromDate: filters.date, toDate: filters.date };
    }
    if (filters.period === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      const sunday = new Date(today.setDate(diff + 6));
      return { fromDate: getLocalDateStr(monday), toDate: getLocalDateStr(sunday) };
    }
    if (filters.period === 'month') {
      if (filters.month) {
        const [y, m] = filters.month.split('-');
        const first = new Date(y, m - 1, 1);
        const last = new Date(y, m, 0);
        return { fromDate: getLocalDateStr(first), toDate: getLocalDateStr(last) };
      }
    }
    if (filters.period === 'custom') {
      return { fromDate: filters.fromDate, toDate: filters.toDate };
    }
    return {};
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const dateParams = getDateParams();
        const res = await axios.get('/analytics/submission-status', {
          params: {
            businessId,
            locationId,
            ...dateParams
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
  }, [businessId, locationId, filters.period, filters.date, filters.month, filters.fromDate, filters.toDate]);

  const uniqueEmployees = useMemo(() => {
    if (!data || !data.matrix) return [];
    const empMap = new Map();
    data.matrix.forEach(row => {
      if (!empMap.has(row.employeeId)) {
        empMap.set(row.employeeId, row.employeeName);
      }
    });
    return Array.from(empMap.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const filteredMatrix = useMemo(() => {
    if (!data || !data.matrix) return [];
    let mat = data.matrix;
    if (filters.employeeId) {
      mat = mat.filter(r => String(r.employeeId) === String(filters.employeeId));
    }
    return mat;
  }, [data, filters.employeeId]);

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
  const stats = useMemo(() => {
    if (!filteredMatrix || filteredMatrix.length === 0) {
      return { totalSlots: 0, submitted: 0, onTime: 0, late: 0, missing: 0, pending: 0 };
    }

    let totalSlots = 0;
    let submitted = 0;
    let onTime = 0;
    let late = 0;
    let missing = 0;
    let pending = 0;

    filteredMatrix.forEach(row => {
      row.timings.forEach(t => {
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
  }, [filteredMatrix]);

  const getPercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const exportPdf = () => {
    exportToPdf(
      'Hourly Submission Status Tracker',
      `Real-time tracking of configured slots for Period: ${filters.period}`,
      'tracker-matrix-container',
      'hourly-submission-tracker.pdf'
    );
  };

  const exportJpg = () => {
    exportToJpg(
      'Hourly Submission Status Tracker',
      `Real-time tracking of configured slots for Period: ${filters.period}`,
      'tracker-matrix-container',
      'hourly-submission-tracker.jpg'
    );
  };

  return (
    <div className="card border-dark-border/40 bg-dark-surface/40 p-5 backdrop-blur-md shadow-lg space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-4 border-b border-dark-border/40">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-content-primary flex items-center gap-2">
            <Clock size={14} className="text-brand-primary" />
            Hourly Submission Status Tracker
          </h3>
          <p className="text-[11px] text-content-secondary mt-0.5">
            Real-time track of configured slots submission status
          </p>
        </div>
        
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1 flex items-center gap-1">
              <User size={10} /> Employee
            </label>
            <select 
              className="bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary transition-colors min-w-[140px]"
              value={filters.employeeId}
              onChange={(e) => updateFilter('employeeId', e.target.value)}
            >
              <option value="">All Employees</option>
              {uniqueEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1 flex items-center gap-1">
              <Filter size={10} /> Period
            </label>
            <select 
              className="bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary transition-colors min-w-[120px]"
              value={filters.period}
              onChange={(e) => updateFilter('period', e.target.value)}
            >
              <option value="day">Today / Specific Day</option>
              <option value="week">This Week</option>
              <option value="month">Monthly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {filters.period === 'day' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.date}
                onChange={(e) => updateFilter('date', e.target.value)}
                className="bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary transition-colors cursor-pointer"
              />
            </div>
          )}
          {filters.period === 'month' && (
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={filters.month}
                onChange={(e) => updateFilter('month', e.target.value)}
                className="bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary transition-colors cursor-pointer"
              />
            </div>
          )}
          {filters.period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => updateFilter('fromDate', e.target.value)}
                className="bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary transition-colors cursor-pointer"
              />
              <span className="text-content-muted text-xs">to</span>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => updateFilter('toDate', e.target.value)}
                className="bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary transition-colors cursor-pointer"
              />
            </div>
          )}
          
          <div className="flex items-center gap-2 ml-2">
            <Button variant="secondary" className="h-[28px] text-[10px] font-black uppercase tracking-wider px-2.5" onClick={exportPdf} disabled={!data || data.matrix.length === 0}>
              <Download className="mr-1 h-3 w-3" />
              PDF
            </Button>
            <Button variant="secondary" className="h-[28px] text-[10px] font-black uppercase tracking-wider px-2.5" onClick={exportJpg} disabled={!data || data.matrix.length === 0}>
              <Download className="mr-1 h-3 w-3" />
              JPG
            </Button>
          </div>
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
          <div id="tracker-matrix-container" className="space-y-4">
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
                  {filters.period !== 'day' && (
                    <Th className="text-[10px] uppercase tracking-wider font-extrabold text-center min-w-[100px]">Date</Th>
                  )}
                  {data.timings.map(t => (
                    <Th key={t.id} className="text-[10px] uppercase tracking-wider font-extrabold text-center min-w-[140px]">
                      {t.timing_name}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {filteredMatrix.map(row => (
                  <Tr key={`${row.employeeId}-${row.date}`} className="hover:bg-brand-primary/[0.02] transition-colors border-b border-dark-border/40 last:border-b-0">
                    <Td className="font-bold text-content-primary text-xs sticky left-0 bg-dark-surface z-10 border-r border-dark-border/40">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate max-w-[140px]" title={row.employeeName}>{row.employeeName}</span>
                        {row.employeeEmail && (
                          <span className="text-[9px] text-content-muted font-normal truncate max-w-[140px]" title={row.employeeEmail}>
                            {row.employeeEmail}
                          </span>
                        )}
                        <span className="text-[10px] text-content-muted font-medium mt-0.5">
                          ({row.submittedSlots}/{row.totalSlots} Submitted)
                        </span>
                      </div>
                    </Td>
                    {filters.period !== 'day' && (
                      <Td className="text-center font-semibold text-[11px] text-content-secondary">
                        {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Td>
                    )}
                    {row.timings.map(t => {
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
                      } else if (t.status === 'NOT_APPLICABLE') {
                        badgeClasses = "bg-dark-bg/20 border-dark-border/20 text-content-muted/40 opacity-40";
                        statusText = "N/A";
                        icon = null;
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
          </div>
        </>
      )}
    </div>
  );
};

export default SubmissionStatusTracker;
