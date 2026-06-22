import { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axiosInstance';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { Target, X, CheckCircle2, TrendingUp, Building2, Calendar, Filter, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();

const buildParams = (filters) => {
  const params = {};
  if (filters.businessId) params.businessId = filters.businessId;

  if (filters.period === 'day' && filters.date) params.date = filters.date;
  if (filters.period === 'week' && filters.week) {
    const [year, week] = filters.week.split('-W');
    params.year = year;
    params.week = week;
  }
  if (filters.period === 'month' && filters.month) {
    const [year, month] = filters.month.split('-');
    params.year = year;
    params.month = month;
  }
  if (filters.period === 'year' && filters.year) params.year = filters.year;
  if (filters.period === 'custom') {
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
  }

  return params;
};

const TargetAnalyticsModal = ({ isOpen, onClose, businesses = [] }) => {
  const [filters, setFilters] = useState({
    businessId: '',
    period: 'month',
    date: new Date().toISOString().slice(0, 10),
    week: '',
    month: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    year: String(currentYear),
    fromDate: '',
    toDate: '',
  });

  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activityType, setActivityType] = useState('All');
  const [sortBy, setSortBy] = useState('name_asc');

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchTargets = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/analytics/targets-progress', { params: buildParams(filters) });
        setTargets(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTargets();
  }, [filters, isOpen]);

  const groupedTargets = useMemo(() => {
    const map = new Map();

    const callingsMetrics = ['Calls Made', 'Positive Leads', 'Conversions', 'Answered Calls'];
    const fieldsMetrics = ['Visits Made', 'Positive Leads', 'Conversions'];

    const filteredTargets = targets.filter(t => {
      if (activityType === 'All') return true;
      if (activityType === 'Callings') return callingsMetrics.includes(t.target_name);
      if (activityType === 'Fields') return fieldsMetrics.includes(t.target_name);
      return true;
    });

    filteredTargets.forEach(t => {
      const key = `${t.employee_id}-${t.business_id}`;
      if (!map.has(key)) {
        map.set(key, {
          employee_id: t.employee_id,
          employee_name: t.employee_name,
          employee_email: t.employee_email,
          business_id: t.business_id,
          business_name: t.business_name,
          start_date: t.start_date,
          end_date: t.end_date,
          metrics: [],
          total_target: 0,
          total_progress: 0
        });
      }
      const group = map.get(key);
      group.metrics.push({
        target_name: t.target_name,
        target_value: Number(t.target_value),
        progress: Number(t.progress)
      });
      group.total_target += Number(t.target_value);
      group.total_progress += Number(t.progress);
      
      if (!group.start_date || new Date(t.start_date) < new Date(group.start_date)) {
        group.start_date = t.start_date;
      }
      if (!group.end_date || new Date(t.end_date) > new Date(group.end_date)) {
        group.end_date = t.end_date;
      }
    });
    
    let result = Array.from(map.values());
    
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.employee_name.localeCompare(b.employee_name);
      if (sortBy === 'name_desc') return b.employee_name.localeCompare(a.employee_name);
      
      const pctA = a.total_target > 0 ? (a.total_progress / a.total_target) : 0;
      const pctB = b.total_target > 0 ? (b.total_progress / b.total_target) : 0;
      
      if (sortBy === 'progress_desc') return pctB - pctA;
      if (sortBy === 'progress_asc') return pctA - pctB;
      
      return 0;
    });

    return result;
  }, [targets, activityType, sortBy]);

  const calculateAchievement = (target, progress) => {
    if (!target || target <= 0) return 0;
    const percent = (progress / target) * 100;
    return percent > 100 ? 100 : percent.toFixed(0);
  };

  const handleExport = () => {
    const headers = ['Employee', 'Email', 'Business', 'Target Metric', 'Start Date', 'End Date', 'Total Assigned Target', 'Total Achieved', 'Completion %'];
    const body = targets.map(t => {
      const percent = calculateAchievement(t.target_value, t.progress);
      return [
        t.employee_name,
        t.employee_email,
        t.business_name,
        t.target_name,
        t.start_date ? new Date(t.start_date).toLocaleDateString() : '',
        t.end_date ? new Date(t.end_date).toLocaleDateString() : '',
        t.target_value,
        t.progress,
        `${percent}%`
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    XLSX.utils.book_append_sheet(wb, ws, 'Target Analytics');
    XLSX.writeFile(wb, `Target_Analytics_${filters.period}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dark-bg/95 backdrop-blur-xl animate-fade-in">
      {/* Header */}
      <div className="flex-none p-6 border-b border-dark-border/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
            <Target className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-content-primary">Target Progress Analytics</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-content-muted mt-1">Aggregated Team Goals & Achievements</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2">
            <Download size={16} /> Export Excel
          </Button>
          <button 
            onClick={onClose}
            className="p-3 bg-dark-surface/50 text-content-secondary hover:text-white rounded-xl hover:bg-dark-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-none p-6 border-b border-dark-border/40 bg-dark-surface/20">
        <div className="flex flex-wrap gap-4 items-end">
        <div className="w-[160px] flex-none">
          <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Business Filter</label>
          <select
            value={filters.businessId}
            onChange={(e) => setFilters(prev => ({ ...prev, businessId: e.target.value }))}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
          >
            <option value="">All Businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.business_name}</option>
            ))}
          </select>
        </div>

        <div className="w-[160px] flex-none flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Activity Type</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
          >
            <option value="All">All Activities</option>
            <option value="Callings">Callings</option>
            <option value="Fields">Field Visits</option>
          </select>
        </div>

        <div className="w-[160px] flex-none flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="progress_desc">Highest Progress %</option>
            <option value="progress_asc">Lowest Progress %</option>
          </select>
        </div>

        <div className="w-[160px] flex-none flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Time Period</label>
          <select
            value={filters.period}
            onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {filters.period === 'day' && (
          <div className="w-[160px] flex-none flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
            />
          </div>
        )}

        {filters.period === 'week' && (
          <div className="w-[160px] flex-none flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Week</label>
            <input
              type="week"
              value={filters.week}
              onChange={(e) => setFilters(prev => ({ ...prev, week: e.target.value }))}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
            />
          </div>
        )}

        {filters.period === 'month' && (
          <div className="w-[160px] flex-none flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Month</label>
            <input
              type="month"
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
            />
          </div>
        )}

        {filters.period === 'year' && (
          <div className="w-[160px] flex-none flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
            >
              {[...Array(5)].map((_, i) => (
                <option key={i} value={currentYear - i}>{currentYear - i}</option>
              ))}
            </select>
          </div>
        )}

        {filters.period === 'custom' && (
          <>
            <div className="w-[160px] flex-none flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">From</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
              />
            </div>
            <div className="w-[160px] flex-none flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted">To</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 h-[38px] text-sm text-content-primary outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
              />
            </div>
          </>
        )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Spinner size="lg" />
            <p className="text-sm font-bold text-content-muted uppercase tracking-widest animate-pulse">Aggregating Target Data...</p>
          </div>
        ) : groupedTargets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Target size={60} className="text-content-muted/20 mb-4" />
            <h3 className="text-xl font-black text-content-primary mb-2">No Target Data Found</h3>
            <p className="text-sm text-content-secondary max-w-md">There are no assigned targets or achievements recorded for the selected time period.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {groupedTargets.map((group, idx) => {
              const overallPercent = calculateAchievement(group.total_target, group.total_progress);
              const isOverallSuccess = overallPercent >= 100;
              const isOverallWarning = overallPercent > 0 && overallPercent < 100;

              return (
                <div key={idx} className="bg-dark-surface/40 border border-dark-border/60 rounded-2xl p-5 shadow-lg flex flex-col hover:border-dark-border/80 transition-colors">
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-brand-primary font-black text-sm">{group.employee_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-black text-content-primary text-sm truncate">{group.employee_name}</h4>
                        <p className="text-[10px] text-content-muted font-bold truncate flex items-center gap-1 mt-0.5">
                          <Building2 size={10} /> {group.business_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5">
                      <Calendar size={12} className="text-brand-primary" />
                      {group.start_date ? new Date(group.start_date).toLocaleDateString() : '—'} 
                      {' - '}
                      {group.end_date ? new Date(group.end_date).toLocaleDateString() : '—'}
                    </div>
                    
                    <div className="bg-dark-bg/60 border border-dark-border/40 rounded-xl p-3 flex flex-col justify-center">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-content-secondary">Overall Progress</span>
                        <div className="text-right">
                          <span className="text-lg font-black text-content-primary">{group.total_progress}</span>
                          <span className="text-xs font-bold text-content-muted"> / {group.total_target}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 h-2.5 bg-dark-surface border border-dark-border/50 rounded-full overflow-hidden shadow-inner relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${isOverallSuccess ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : isOverallWarning ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'bg-content-muted'}`}
                            style={{ width: `${overallPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 min-w-[40px] justify-end">
                          <span className={`text-[11px] font-black ${isOverallSuccess ? 'text-brand-success' : isOverallWarning ? 'text-amber-400' : 'text-content-muted'}`}>
                            {overallPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    {group.metrics.map((m, mIdx) => {
                      const mPercent = calculateAchievement(m.target_value, m.progress);
                      const isMSuccess = mPercent >= 100;
                      const isMWarning = mPercent > 0 && mPercent < 100;
                      return (
                        <div key={mIdx} className="bg-dark-bg/30 border border-dark-border/30 rounded-lg p-2.5 flex flex-col">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-content-secondary truncate pr-2">{m.target_name}</span>
                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-black text-content-primary">{m.progress}</span>
                              <span className="text-[9px] font-bold text-content-muted"> / {m.target_value}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 h-1.5 bg-dark-surface border border-dark-border/40 rounded-full overflow-hidden relative">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${isMSuccess ? 'bg-brand-success' : isMWarning ? 'bg-amber-400' : 'bg-content-muted'}`}
                                style={{ width: `${mPercent}%` }}
                              />
                            </div>
                            <span className={`text-[9px] font-black shrink-0 w-8 text-right ${isMSuccess ? 'text-brand-success' : isMWarning ? 'text-amber-400' : 'text-content-muted'}`}>
                              {mPercent}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TargetAnalyticsModal;
