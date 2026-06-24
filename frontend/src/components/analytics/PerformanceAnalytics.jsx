import { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axiosInstance';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Download, Filter, TrendingUp, BarChart3, Clock, UserCheck } from 'lucide-react';
import { cn } from '../../utils/cn';
import SubmissionStatusTracker from './SubmissionStatusTracker';
import * as XLSX from 'xlsx';
import { exportToPdf, exportToJpg } from '../../utils/exportUtils';

const currentYear = new Date().getFullYear();

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${m} ${ampm}`;
};

const getShiftString = (employee) => {
  const start = formatTime(employee?.shift_start || '09:30:00');
  const end = formatTime(employee?.shift_end || '19:00:00');
  return `${start} - ${end}`;
};

const buildParams = (filters) => {
  const params = {};
  if (filters.employeeId) params.employeeId = filters.employeeId;
  if (filters.businessId) params.businessId = filters.businessId;
  if (filters.locationId) params.locationId = filters.locationId;
  if (filters.activityType) params.activityType = filters.activityType;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortDir) params.sortDir = filters.sortDir;

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

const toExcelData = (rows, activityType) => {
  const isCallings = activityType === 'Callings';
  const headers = isCallings ? [
    'Date', 
    'Employee', 
    'Business', 
    'Timing', 
    'Activity', 
    'Dialled Calls', 
    'Answered Calls', 
    'Answered Rate %', 
    'Conversions', 
    'Conversion Rate %', 
    'Positive Leads', 
    'Positive Lead Rate %', 
    'Answers'
  ] : [
    'Date', 
    'Employee', 
    'Business', 
    'Timing', 
    'Activity', 
    'Visits Made', 
    'Conversions', 
    'Conversion Rate %', 
    'Positive Leads', 
    'Positive Lead Rate %', 
    'Answers'
  ];
  const body = rows.map((row) => {
    const leads = Number(row.numeric_total || 0);
    if (isCallings) {
      const dialled = Number(row.dialled_total || 0);
      const answered = Number(row.answered_total || 0);
      const conversions = Number(row.conversions_total || 0);
      const answerRate = dialled > 0 ? `${Math.round((answered / dialled) * 100)}%` : '—';
      const convRate = dialled > 0 ? `${Math.round((conversions / dialled) * 100)}%` : '—';
      const leadRate = dialled > 0 ? `${Math.round((leads / dialled) * 100)}%` : '—';

      return [
        row.report_date ? new Date(row.report_date).toLocaleDateString() : '',
        row.employee_name,
        row.business_name,
        row.timing_name,
        row.activity_name,
        dialled,
        answered,
        answerRate,
        conversions,
        convRate,
        leads,
        leadRate,
        (row.answers || []).map((answer) => `${answer.fieldName}: ${answer.value}`).join(' | ')
      ];
    } else {
      const visits = Number(row.visits_total || 0);
      const conversions = Number(row.conversions_total || 0);
      const convRate = visits > 0 ? `${Math.round((conversions / visits) * 100)}%` : '—';
      const leadRate = visits > 0 ? `${Math.round((leads / visits) * 100)}%` : '—';

      return [
        row.report_date ? new Date(row.report_date).toLocaleDateString() : '',
        row.employee_name,
        row.business_name,
        row.timing_name,
        row.activity_name,
        visits,
        conversions,
        convRate,
        leads,
        leadRate,
        (row.answers || []).map((answer) => `${answer.fieldName}: ${answer.value}`).join(' | ')
      ];
    }
  });

  return [headers, ...body];
};

const MiniProgressBar = ({ target }) => {
  if (!target || target.target_value <= 0) return null;
  const percent = (target.progress / target.target_value) * 100;
  const clamped = percent > 100 ? 100 : percent.toFixed(0);
  const isSuccess = clamped >= 100;
  const isWarning = clamped > 0 && clamped < 100;

  return (
    <div className="mt-1 flex flex-col gap-0.5 w-16 mx-auto">
      <div className="h-1 bg-dark-surface border border-dark-border/50 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isSuccess ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : isWarning ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'bg-content-muted'}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-[8px] font-bold text-content-muted/80 text-right">{target.progress}/{target.target_value}</span>
    </div>
  );
};

const MiniPercentProgressBar = ({ progress, targetValue }) => {
  if (progress === null || targetValue === null || targetValue <= 0) return null;
  const percent = (progress / targetValue) * 100;
  const clamped = percent > 100 ? 100 : percent.toFixed(0);
  const isSuccess = clamped >= 100;
  const isWarning = clamped > 0 && clamped < 100;

  return (
    <div className="mt-1 flex flex-col gap-0.5 w-16 mx-auto animate-fade-in">
      <div className="h-1 bg-dark-surface border border-dark-border/50 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isSuccess ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : isWarning ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'bg-content-muted'}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-[8px] font-bold text-content-muted/80 text-right">{Math.round(percent)}%</span>
    </div>
  );
};

const PerformanceAnalytics = ({
  title = 'Performance Intelligence',
  employees = [],
  businesses = [],
  initialEmployeeId = '',
  initialBusinessId = '',
  lockEmployee = false,
  lockBusiness = false,
  showFilters = true,
  summaryLabel = 'Performance Ledger'
}) => {
  const [filters, setFilters] = useState({
    employeeId: initialEmployeeId,
    businessId: initialBusinessId,
    locationId: '',
    activityType: 'Callings',
    period: 'day',
    date: new Date().toISOString().slice(0, 10),
    week: '',
    month: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    year: String(currentYear),
    fromDate: '',
    toDate: '',
    sortBy: 'report_date',
    sortDir: 'desc'
  });
  const [data, setData] = useState({ summary: [], details: [] });
  const [targets, setTargets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [groupBy, setGroupBy] = useState('employee');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lockEmployee && showFilters) {
      const fetchLocations = async () => {
        try {
          const res = await axios.get('/locations');
          setLocations(res.data.data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchLocations();
    }
  }, [lockEmployee, showFilters]);

  useEffect(() => {
    setFilters((previous) => ({
      ...previous,
      employeeId: initialEmployeeId,
      businessId: initialBusinessId
    }));
  }, [initialEmployeeId, initialBusinessId]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const params = buildParams(filters);
        const [perfRes, targetsRes] = await Promise.all([
          axios.get('/analytics/performance', { params }),
          axios.get('/analytics/targets-progress', { params })
        ]);
        setData(perfRes.data.data);
        setTargets(targetsRes.data.data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filters]);

  const targetMap = useMemo(() => {
    const map = {};
    targets.forEach(t => {
      const key = `${t.employee_id}-${t.business_id}`;
      if (!map[key]) map[key] = {};
      map[key][t.target_name.toLowerCase()] = t;
    });
    return map;
  }, [targets]);

  const businessTargetMap = useMemo(() => {
    const map = {};
    targets.forEach(t => {
      const key = t.business_id;
      if (!map[key]) map[key] = {};
      const tName = t.target_name.toLowerCase();
      if (!map[key][tName]) {
        map[key][tName] = { progress: 0, target_value: 0 };
      }
      map[key][tName].progress += t.progress;
      map[key][tName].target_value += t.target_value;
    });
    return map;
  }, [targets]);

  const filteredSummary = useMemo(() => {
    if (!employeeSearch) return data.summary;
    return data.summary.filter((row) =>
      row.employee_name.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [data.summary, employeeSearch]);

  const filteredDetails = useMemo(() => {
    if (!employeeSearch) return data.details;
    return data.details.filter((row) =>
      row.employee_name.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [data.details, employeeSearch]);

  const businessSummary = useMemo(() => {
    const acc = {};
    filteredSummary.forEach(row => {
      const key = row.business_id;
      if (!acc[key]) {
        acc[key] = {
          business_id: row.business_id,
          business_name: row.business_name,
          report_count: 0,
          dialled_total: 0,
          answered_total: 0,
          visits_total: 0,
          conversions_total: 0,
          numeric_total: 0,
          last_report_date: null
        };
      }
      acc[key].report_count += Number(row.report_count || 0);
      acc[key].dialled_total += Number(row.dialled_total || 0);
      acc[key].answered_total += Number(row.answered_total || 0);
      acc[key].visits_total += Number(row.visits_total || 0);
      acc[key].conversions_total += Number(row.conversions_total || 0);
      acc[key].numeric_total += Number(row.numeric_total || 0);
      
      if (row.last_report_date) {
        const rowDate = new Date(row.last_report_date);
        if (!acc[key].last_report_date || rowDate > new Date(acc[key].last_report_date)) {
          acc[key].last_report_date = row.last_report_date;
        }
      }
    });
    return Object.values(acc).sort((a, b) => b.numeric_total - a.numeric_total);
  }, [filteredSummary]);

  const totals = useMemo(() => {
    let reports = 0;
    let dialled = 0;
    let answered = 0;
    let visits = 0;
    let conversions = 0;
    let leads = 0;

    filteredSummary.forEach(row => {
      reports += Number(row.report_count || 0);
      dialled += Number(row.dialled_total || 0);
      answered += Number(row.answered_total || 0);
      visits += Number(row.visits_total || 0);
      conversions += Number(row.conversions_total || 0);
      leads += Number(row.numeric_total || 0);
    });

    const answerRate = dialled > 0 ? Math.round((answered / dialled) * 100) : 0;
    const leadRate = dialled > 0 ? Math.round((leads / dialled) * 100) : 0;
    const conversionRate = visits > 0 ? Math.round((conversions / visits) * 100) : 0;
    const leadRateVisits = visits > 0 ? Math.round((leads / visits) * 100) : 0;

    return { reports, dialled, answered, visits, conversions, leads, answerRate, leadRate, conversionRate, leadRateVisits };
  }, [filteredSummary]);

  const updateFilter = (name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const exportExcel = () => {
    const dataToExport = groupBy === 'employee' ? filteredDetails : businessSummary.map(row => ({
      report_date: row.last_report_date,
      employee_name: 'All Employees',
      business_name: row.business_name,
      timing_name: 'Consolidated',
      activity_name: 'All Activities',
      dialled_total: row.dialled_total,
      answered_total: row.answered_total,
      visits_total: row.visits_total,
      conversions_total: row.conversions_total,
      numeric_total: row.numeric_total,
      answers: []
    }));

    const aoa = toExcelData(dataToExport, filters.activityType);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Performance');
    XLSX.writeFile(wb, `performance-intelligence-${groupBy}.xlsx`);
  };

  const exportPdf = () => {
    exportToPdf(
      'Consolidated Performance Analytics',
      `Market Performance Report - ${filters.activityType} (${groupBy === 'employee' ? 'By Member' : 'By Market Unit'})`,
      'performance-table-container',
      `performance-intelligence-${groupBy}.pdf`
    );
  };

  const exportJpg = () => {
    exportToJpg(
      'Consolidated Performance Analytics',
      `Market Performance Report - ${filters.activityType} (${groupBy === 'employee' ? 'By Member' : 'By Market Unit'})`,
      'performance-table-container',
      `performance-intelligence-${groupBy}.jpg`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 px-1">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-content-primary tracking-tight">{title}</h2>
            <p className="text-xs text-content-secondary mt-0.5 uppercase tracking-wider font-bold">Consolidated Performance Overview</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="h-9 text-[11px] font-black uppercase tracking-wider px-3" onClick={exportExcel} disabled={data.details.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>
            <Button variant="secondary" className="h-9 text-[11px] font-black uppercase tracking-wider px-3" onClick={exportPdf} disabled={data.details.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
            <Button variant="secondary" className="h-9 text-[11px] font-black uppercase tracking-wider px-3" onClick={exportJpg} disabled={data.details.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              JPG
            </Button>
          </div>
        </div>

        {/* Global KPI Summary Cards */}
        {filters.activityType === 'Callings' ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="bg-dark-surface/40 border border-dark-border/40 p-4 rounded-xl backdrop-blur-md shadow-md animate-fade-in">
              <p className="text-[9px] uppercase font-black text-content-muted tracking-wider">Total Volume</p>
              <p className="text-xl font-black text-content-primary mt-1">{totals.reports} <span className="text-[10px] text-content-secondary font-bold font-sans">Submissions</span></p>
            </div>
            <div className="bg-dark-surface/40 border border-dark-border/40 p-4 rounded-xl backdrop-blur-md shadow-md animate-fade-in">
              <p className="text-[9px] uppercase font-black text-content-muted tracking-wider">Total Calls Dialled</p>
              <p className="text-xl font-black text-content-primary mt-1">{totals.dialled.toLocaleString()} <span className="text-[10px] text-content-secondary font-bold font-sans">Calls</span></p>
            </div>
            <div className="bg-dark-surface/40 border border-dark-border/40 p-4 rounded-xl backdrop-blur-md shadow-md border-l-2 border-l-brand-secondary animate-fade-in">
              <p className="text-[9px] uppercase font-black text-brand-secondary/80 tracking-wider">Calls Answered</p>
              <p className="text-xl font-black text-content-primary mt-1">
                {totals.answered.toLocaleString()}{' '}
                <span className="text-xs font-black text-brand-secondary bg-brand-secondary/10 px-1.5 py-0.5 rounded ml-1 font-sans">
                  {totals.answerRate}%
                </span>
              </p>
            </div>
            <div className="bg-dark-surface/40 border border-dark-border/40 p-4 rounded-xl backdrop-blur-md shadow-md border-l-2 border-l-brand-primary animate-fade-in">
              <p className="text-[9px] uppercase font-black text-brand-primary/80 tracking-wider">Positive Leads</p>
              <p className="text-xl font-black text-content-primary mt-1">
                {totals.leads.toLocaleString()}{' '}
                <span className="text-xs font-black text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded ml-1 font-sans">
                  {totals.leadRate}%
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="bg-dark-surface/40 border border-dark-border/40 p-4 rounded-xl backdrop-blur-md shadow-md animate-fade-in">
              <p className="text-[9px] uppercase font-black text-content-muted tracking-wider">Total Volume</p>
              <p className="text-xl font-black text-content-primary mt-1">{totals.reports} <span className="text-[10px] text-content-secondary font-bold font-sans">Submissions</span></p>
            </div>
            <div className="bg-dark-surface/40 border border-dark-border/40 p-4 rounded-xl backdrop-blur-md shadow-md animate-fade-in">
              <p className="text-[9px] uppercase font-black text-content-muted tracking-wider">Total Visits Made</p>
              <p className="text-xl font-black text-content-primary mt-1">{totals.visits.toLocaleString()} <span className="text-[10px] text-content-secondary font-bold font-sans">Visits</span></p>
            </div>
            <div className="bg-dark-surface/40 border border-dark-border/40 p-4 rounded-xl backdrop-blur-md shadow-md border-l-2 border-l-brand-secondary animate-fade-in">
              <p className="text-[9px] uppercase font-black text-brand-secondary/80 tracking-wider">Visits Converted</p>
              <p className="text-xl font-black text-content-primary mt-1">
                {totals.conversions.toLocaleString()}{' '}
                <span className="text-xs font-black text-brand-secondary bg-brand-secondary/10 px-1.5 py-0.5 rounded ml-1 font-sans">
                  {totals.conversionRate}%
                </span>
              </p>
            </div>
            <div className="bg-dark-surface/40 border border-dark-border/40 p-4 rounded-xl backdrop-blur-md shadow-md border-l-2 border-l-brand-primary animate-fade-in">
              <p className="text-[9px] uppercase font-black text-brand-primary/80 tracking-wider">Positive Leads</p>
              <p className="text-xl font-black text-content-primary mt-1">
                {totals.leads.toLocaleString()}{' '}
                <span className="text-xs font-black text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded ml-1 font-sans">
                  {totals.leadRateVisits}%
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="card border-dark-border/40 bg-dark-surface/40 p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4">
            {!lockEmployee && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1">Location</label>
                <select className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10" value={filters.locationId} onChange={(e) => updateFilter('locationId', e.target.value)}>
                  <option value="">All Locations</option>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
            )}
            {!lockEmployee && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1">Team Member</label>
                <select className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10" value={filters.employeeId} onChange={(e) => updateFilter('employeeId', e.target.value)}>
                  <option value="">Full Team</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                </select>
              </div>
            )}
            {!lockEmployee && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1">Search Employee</label>
                <input
                  type="text"
                  placeholder="Type name..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full h-10 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors placeholder:text-content-muted/50"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1">Activity Type</label>
              <select className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10" value={filters.activityType} onChange={(e) => updateFilter('activityType', e.target.value)}>
                <option value="Callings">Callings</option>
                <option value="Fields">Field Visits</option>
              </select>
            </div>
            {!lockBusiness && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1">Market Unit</label>
                <select className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10" value={filters.businessId} onChange={(e) => updateFilter('businessId', e.target.value)}>
                  <option value="">All Markets</option>
                  {businesses.map((business) => <option key={business.id} value={business.id}>{business.business_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1">Analysis Period</label>
              <select className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10" value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
                <option value="day">Daily View</option>
                <option value="week">Weekly View</option>
                <option value="month">Monthly View</option>
                <option value="year">Annual View</option>
                <option value="custom">Custom Range</option>
                <option value="all">Historical</option>
              </select>
            </div>
            {filters.period === 'day' && <Input label="Target Date" type="date" value={filters.date} onChange={(e) => updateFilter('date', e.target.value)} className="h-10" />}
            {filters.period === 'week' && <Input label="Target Week" type="week" value={filters.week} onChange={(e) => updateFilter('week', e.target.value)} className="h-10" />}
            {filters.period === 'month' && <Input label="Target Month" type="month" value={filters.month} onChange={(e) => updateFilter('month', e.target.value)} className="h-10" />}
            {filters.period === 'year' && <Input label="Target Year" type="number" value={filters.year} onChange={(e) => updateFilter('year', e.target.value)} className="h-10" />}
            {filters.period === 'custom' && (
              <>
                <Input label="Commence" type="date" value={filters.fromDate} onChange={(e) => updateFilter('fromDate', e.target.value)} className="h-10" />
                <Input label="Conclude" type="date" value={filters.toDate} onChange={(e) => updateFilter('toDate', e.target.value)} className="h-10" />
              </>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1">Rank By</label>
              <select className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10" value={filters.sortBy} onChange={(e) => updateFilter('sortBy', e.target.value)}>
                <option value="report_date">Chronological</option>
                <option value="employee">Alphabetical (User)</option>
                <option value="business">Alphabetical (Biz)</option>
                <option value="reports">Volume (Reports)</option>
                <option value="score">Performance (Leads)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {filters.businessId && (
        <SubmissionStatusTracker
          businessId={filters.businessId}
          date={filters.period === 'day' ? filters.date : ''}
          locationId={filters.locationId}
        />
      )}

      {loading ? (
        <div className="flex h-72 w-full flex-col items-center justify-center space-y-4 rounded-xl border border-dark-border bg-dark-surface/20">
          <Spinner size="lg" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted animate-pulse">Synthesizing Analytics...</p>
        </div>
      ) : (
        <>
          <div id="performance-table-container" className="card overflow-hidden px-0 py-0 border-brand-primary/10">
            <div className="px-5 py-3 border-b border-dark-border bg-dark-bg/40 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-brand-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-content-primary">{summaryLabel}</h3>
              </div>
              <div className="flex items-center bg-dark-bg border border-dark-border/60 rounded-lg p-0.5 text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setGroupBy('employee')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all uppercase tracking-wider font-extrabold",
                    groupBy === 'employee' ? "bg-brand-primary text-white" : "text-content-secondary hover:text-content-primary"
                  )}
                >
                  By Member
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('business')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all uppercase tracking-wider font-extrabold",
                    groupBy === 'business' ? "bg-brand-primary text-white" : "text-content-secondary hover:text-content-primary"
                  )}
                >
                  By Market Unit
                </button>
              </div>
            </div>
            <Table>
              <Thead>
                {groupBy === 'employee' ? (
                  <Tr className="bg-dark-bg/20">
                    <Th className="text-[10px] uppercase tracking-wider">Member</Th>
                    <Th className="text-[10px] uppercase tracking-wider">Asset/Market</Th>
                    {filters.activityType === 'Callings' ? (
                      <>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Dialled</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Answered</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Ans. %</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Conversions</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Conv. %</Th>
                      </>
                    ) : (
                      <>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Visits</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Conversions</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Conv. %</Th>
                      </>
                    )}
                    <Th className="text-[10px] uppercase tracking-wider text-brand-primary text-center">Pos. Leads</Th>
                    <Th className="text-[10px] uppercase tracking-wider text-brand-primary text-center">Lead %</Th>
                    <Th className="text-[10px] uppercase tracking-wider text-right">Latest Log</Th>
                  </Tr>
                ) : (
                  <Tr className="bg-dark-bg/20">
                    <Th className="text-[10px] uppercase tracking-wider">Market Unit (Business)</Th>
                    {filters.activityType === 'Callings' ? (
                      <>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Dialled</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Answered</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Ans. %</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Conversions</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Conv. %</Th>
                      </>
                    ) : (
                      <>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Visits</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Conversions</Th>
                        <Th className="text-[10px] uppercase tracking-wider text-center">Conv. %</Th>
                      </>
                    )}
                    <Th className="text-[10px] uppercase tracking-wider text-brand-primary text-center">Pos. Leads</Th>
                    <Th className="text-[10px] uppercase tracking-wider text-brand-primary text-center">Lead %</Th>
                    <Th className="text-[10px] uppercase tracking-wider text-right">Latest Log</Th>
                  </Tr>
                )}
              </Thead>
              <Tbody>
                {groupBy === 'employee' ? (
                  filteredSummary.map((row) => {
                    const leads = Number(row.numeric_total || 0);

                    if (filters.activityType === 'Callings') {
                      const dialled = Number(row.dialled_total || 0);
                      const answered = Number(row.answered_total || 0);
                      const conversions = Number(row.conversions_total || 0);
                      const answerRate = dialled > 0 ? Math.round((answered / dialled) * 100) : null;
                      const convRate = dialled > 0 ? Math.round((conversions / dialled) * 100) : null;
                      const leadRate = dialled > 0 ? Math.round((leads / dialled) * 100) : null;

                      const employeeObj = employees?.find(e => e.id === row.employee_id);
                      const tMap = targetMap[`${row.employee_id}-${row.business_id}`] || {};

                      return (
                        <Tr key={`${row.employee_id}-${row.business_id}`} className="hover:bg-brand-primary/[0.03] transition-colors">
                          <Td>
                            <p className="font-bold text-content-primary text-xs">{row.employee_name}</p>
                            {row.employee_email && <p className="text-[9px] text-content-muted">{row.employee_email}</p>}
                            {employeeObj && (
                              <p className="mt-0.5 text-[9px] font-bold text-brand-primary bg-brand-primary/10 inline-block px-1.5 py-0.5 rounded">
                                Shift: {getShiftString(employeeObj)}
                              </p>
                            )}
                          </Td>
                          <Td><p className="text-xs text-content-secondary">{row.business_name}</p></Td>
                          <Td className="text-center font-mono text-xs">
                            {dialled}
                            <MiniProgressBar target={tMap['calls made']} />
                          </Td>
                          <Td className="text-center font-mono text-xs">
                            {answered}
                            <MiniProgressBar target={tMap['answered calls']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-content-secondary">
                            {answerRate !== null ? `${answerRate}%` : '—'}
                            {(() => {
                              const tAnswered = tMap['answered calls'];
                              return (
                                <MiniPercentProgressBar 
                                  progress={answered} 
                                  targetValue={tAnswered?.target_value} 
                                />
                              );
                            })()}
                          </Td>
                          <Td className="text-center font-mono text-xs">
                            {conversions}
                            <MiniProgressBar target={tMap['conversions']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-content-secondary">
                            {convRate !== null ? `${convRate}%` : '—'}
                          </Td>
                          <Td className="text-center">
                            <p className="font-black text-brand-primary text-sm">{leads.toLocaleString()}</p>
                            <MiniProgressBar target={tMap['positive leads']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-brand-primary">
                            {leadRate !== null ? `${leadRate}%` : '—'}
                          </Td>
                          <Td className="text-right font-mono text-[10px] text-content-muted">
                            {row.last_report_date ? new Date(row.last_report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                          </Td>
                        </Tr>
                      );
                    } else {
                      const visits = Number(row.visits_total || 0);
                      const conversions = Number(row.conversions_total || 0);
                      const convRate = visits > 0 ? Math.round((conversions / visits) * 100) : null;
                      const leadRate = visits > 0 ? Math.round((leads / visits) * 100) : null;

                      const employeeObj = employees?.find(e => e.id === row.employee_id);
                      const tMap = targetMap[`${row.employee_id}-${row.business_id}`] || {};

                      return (
                        <Tr key={`${row.employee_id}-${row.business_id}`} className="hover:bg-brand-primary/[0.03] transition-colors">
                          <Td>
                            <p className="font-bold text-content-primary text-xs">{row.employee_name}</p>
                            {row.employee_email && <p className="text-[9px] text-content-muted">{row.employee_email}</p>}
                            {employeeObj && (
                              <p className="mt-0.5 text-[9px] font-bold text-brand-primary bg-brand-primary/10 inline-block px-1.5 py-0.5 rounded">
                                Shift: {getShiftString(employeeObj)}
                              </p>
                            )}
                          </Td>
                          <Td><p className="text-xs text-content-secondary">{row.business_name}</p></Td>
                          <Td className="text-center font-mono text-xs">
                            {visits}
                            <MiniProgressBar target={tMap['visits made']} />
                          </Td>
                          <Td className="text-center font-mono text-xs">
                            {conversions}
                            <MiniProgressBar target={tMap['conversions']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-content-secondary">
                            {convRate !== null ? `${convRate}%` : '—'}
                          </Td>
                          <Td className="text-center">
                            <p className="font-black text-brand-primary text-sm">{leads.toLocaleString()}</p>
                            <MiniProgressBar target={tMap['positive leads']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-brand-primary">
                            {leadRate !== null ? `${leadRate}%` : '—'}
                          </Td>
                          <Td className="text-right font-mono text-[10px] text-content-muted">
                            {row.last_report_date ? new Date(row.last_report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                          </Td>
                        </Tr>
                      );
                    }
                  })
                ) : (
                  businessSummary.map((row) => {
                    const leads = Number(row.numeric_total || 0);

                    if (filters.activityType === 'Callings') {
                      const dialled = Number(row.dialled_total || 0);
                      const answered = Number(row.answered_total || 0);
                      const conversions = Number(row.conversions_total || 0);
                      const answerRate = dialled > 0 ? Math.round((answered / dialled) * 100) : null;
                      const convRate = dialled > 0 ? Math.round((conversions / dialled) * 100) : null;
                      const leadRate = dialled > 0 ? Math.round((leads / dialled) * 100) : null;

                      const tMap = businessTargetMap[row.business_id] || {};

                      return (
                        <Tr key={row.business_id} className="hover:bg-brand-primary/[0.03] transition-colors">
                          <Td><p className="font-bold text-content-primary text-xs">{row.business_name}</p></Td>
                          <Td className="text-center font-mono text-xs">
                            {dialled}
                            <MiniProgressBar target={tMap['calls made']} />
                          </Td>
                          <Td className="text-center font-mono text-xs">
                            {answered}
                            <MiniProgressBar target={tMap['answered calls']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-content-secondary">
                            {answerRate !== null ? `${answerRate}%` : '—'}
                            {(() => {
                              const tAnswered = tMap['answered calls'];
                              return (
                                <MiniPercentProgressBar 
                                  progress={answered} 
                                  targetValue={tAnswered?.target_value} 
                                />
                              );
                            })()}
                          </Td>
                          <Td className="text-center font-mono text-xs">
                            {conversions}
                            <MiniProgressBar target={tMap['conversions']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-content-secondary">
                            {convRate !== null ? `${convRate}%` : '—'}
                          </Td>
                          <Td className="text-center">
                            <p className="font-black text-brand-primary text-sm">{leads.toLocaleString()}</p>
                            <MiniProgressBar target={tMap['positive leads']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-brand-primary">
                            {leadRate !== null ? `${leadRate}%` : '—'}
                          </Td>
                          <Td className="text-right font-mono text-[10px] text-content-muted">
                            {row.last_report_date ? new Date(row.last_report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                          </Td>
                        </Tr>
                      );
                    } else {
                      const visits = Number(row.visits_total || 0);
                      const conversions = Number(row.conversions_total || 0);
                      const convRate = visits > 0 ? Math.round((conversions / visits) * 100) : null;
                      const leadRate = visits > 0 ? Math.round((leads / visits) * 100) : null;

                      const tMap = businessTargetMap[row.business_id] || {};

                      return (
                        <Tr key={row.business_id} className="hover:bg-brand-primary/[0.03] transition-colors">
                          <Td><p className="font-bold text-content-primary text-xs">{row.business_name}</p></Td>
                          <Td className="text-center font-mono text-xs">
                            {visits}
                            <MiniProgressBar target={tMap['visits made']} />
                          </Td>
                          <Td className="text-center font-mono text-xs">
                            {conversions}
                            <MiniProgressBar target={tMap['conversions']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-content-secondary">
                            {convRate !== null ? `${convRate}%` : '—'}
                          </Td>
                          <Td className="text-center">
                            <p className="font-black text-brand-primary text-sm">{leads.toLocaleString()}</p>
                            <MiniProgressBar target={tMap['positive leads']} />
                          </Td>
                          <Td className="text-center font-mono text-xs font-semibold text-brand-primary">
                            {leadRate !== null ? `${leadRate}%` : '—'}
                          </Td>
                          <Td className="text-right font-mono text-[10px] text-content-muted">
                            {row.last_report_date ? new Date(row.last_report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                          </Td>
                        </Tr>
                      );
                    }
                  })
                )}
                {((groupBy === 'employee' && filteredSummary.length === 0) || (groupBy === 'business' && businessSummary.length === 0)) && (
                  <Tr><Td colSpan={10} className="py-12 text-center text-[11px] font-medium text-content-muted uppercase tracking-widest">No Intelligence Data Available</Td></Tr>
                )}
              </Tbody>
            </Table>
          </div>

          <div className="card overflow-hidden px-0 py-0">
            <div className="px-5 py-3 border-b border-dark-border bg-dark-bg/40 flex items-center gap-2">
              <BarChart3 size={14} className="text-brand-secondary" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-content-primary">Detailed Activity Log</h3>
            </div>
            <Table>
              <Thead>
                <Tr className="bg-dark-bg/20">
                  <Th className="text-[10px] uppercase tracking-wider">Timeline</Th>
                  <Th className="text-[10px] uppercase tracking-wider">Member</Th>
                  <Th className="text-[10px] uppercase tracking-wider text-center">Leads</Th>
                  <Th className="text-[10px] uppercase tracking-wider">Insights</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredDetails.map((row) => (
                  <Tr key={row.id} className="hover:bg-dark-bg/40">
                    <Td className="whitespace-nowrap font-mono text-[10px] text-content-muted">
                      {new Date(row.report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} <br/>
                      <span className="text-[9px] opacity-60 uppercase">{row.timing_name}</span>
                    </Td>
                    <Td>
                      <p className="font-bold text-content-primary text-xs">{row.employee_name}</p>
                      {row.employee_email && <p className="text-[9px] text-content-muted lowercase">{row.employee_email}</p>}
                      <p className="text-[9px] text-content-muted uppercase tracking-tight truncate max-w-[120px]">{row.business_name}</p>
                    </Td>
                    <Td className="text-center"><span className="font-black text-brand-primary text-xs">{row.numeric_total}</span></Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(row.answers || []).slice(0, 4).map((answer, index) => (
                          <div key={`${row.id}-${index}`} className="bg-dark-bg border border-dark-border/60 rounded px-1.5 py-0.5 text-[9px]">
                            <span className="text-content-muted uppercase font-bold mr-1">{answer.fieldName}:</span>
                            <span className="text-content-primary font-medium">{answer.value}</span>
                          </div>
                        ))}
                      </div>
                    </Td>
                  </Tr>
                ))}
                {filteredDetails.length === 0 && (
                  <Tr><Td colSpan={4} className="py-12 text-center text-[11px] font-medium text-content-muted uppercase tracking-widest">No Activity Records Found</Td></Tr>
                )}
              </Tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceAnalytics;
