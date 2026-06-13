import { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axiosInstance';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Download, Filter } from 'lucide-react';

const currentYear = new Date().getFullYear();

const buildParams = (filters) => {
  const params = {};
  if (filters.employeeId) params.employeeId = filters.employeeId;
  if (filters.businessId) params.businessId = filters.businessId;
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

const toCsv = (rows) => {
  const headers = ['Date', 'Employee', 'Business', 'Timing', 'Activity', 'Score', 'Answers'];
  const body = rows.map((row) => [
    row.report_date ? new Date(row.report_date).toLocaleDateString() : '',
    row.employee_name,
    row.business_name,
    row.timing_name,
    row.activity_name,
    row.numeric_total,
    (row.answers || []).map((answer) => `${answer.fieldName}: ${answer.value}`).join(' | ')
  ]);

  return [headers, ...body]
    .map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
};

const PerformanceAnalytics = ({
  title = 'Performance Analysis',
  employees = [],
  businesses = [],
  initialEmployeeId = '',
  initialBusinessId = '',
  lockEmployee = false,
  lockBusiness = false,
  showFilters = true,
  summaryLabel = 'Overall Summary'
}) => {
  const [filters, setFilters] = useState({
    employeeId: initialEmployeeId,
    businessId: initialBusinessId,
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
  const [loading, setLoading] = useState(false);

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
        const res = await axios.get('/analytics/performance', { params: buildParams(filters) });
        setData(res.data.data);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filters]);

  const totals = useMemo(() => ({
    reports: data.summary.reduce((sum, row) => sum + Number(row.report_count || 0), 0),
    score: data.summary.reduce((sum, row) => sum + Number(row.numeric_total || 0), 0)
  }), [data.summary]);

  const updateFilter = (name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(data.details)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'performance-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
          <p className="text-sm text-content-secondary">
            {totals.reports} reports · {totals.score.toLocaleString()} total score
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={data.details.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {showFilters && (
        <div className="card motion-card motion-sheen p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-content-primary">
            <Filter className="h-4 w-4 text-brand-primary" />
            Filters
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            {!lockEmployee && (
              <div>
                <label className="mb-1 block text-sm font-medium text-content-secondary">Employee</label>
                <select className="input-field" value={filters.employeeId} onChange={(e) => updateFilter('employeeId', e.target.value)}>
                  <option value="">All employees</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                </select>
              </div>
            )}
            {!lockBusiness && (
              <div>
                <label className="mb-1 block text-sm font-medium text-content-secondary">Business</label>
                <select className="input-field" value={filters.businessId} onChange={(e) => updateFilter('businessId', e.target.value)}>
                  <option value="">All businesses</option>
                  {businesses.map((business) => <option key={business.id} value={business.id}>{business.business_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-content-secondary">Period</label>
              <select className="input-field" value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="custom">Custom</option>
                <option value="all">All time</option>
              </select>
            </div>
            {filters.period === 'day' && <Input label="Date" type="date" value={filters.date} onChange={(e) => updateFilter('date', e.target.value)} />}
            {filters.period === 'week' && <Input label="Week" type="week" value={filters.week} onChange={(e) => updateFilter('week', e.target.value)} />}
            {filters.period === 'month' && <Input label="Month" type="month" value={filters.month} onChange={(e) => updateFilter('month', e.target.value)} />}
            {filters.period === 'year' && <Input label="Year" type="number" value={filters.year} onChange={(e) => updateFilter('year', e.target.value)} />}
            {filters.period === 'custom' && (
              <>
                <Input label="From" type="date" value={filters.fromDate} onChange={(e) => updateFilter('fromDate', e.target.value)} />
                <Input label="To" type="date" value={filters.toDate} onChange={(e) => updateFilter('toDate', e.target.value)} />
              </>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-content-secondary">Sort</label>
              <select className="input-field" value={filters.sortBy} onChange={(e) => updateFilter('sortBy', e.target.value)}>
                <option value="report_date">Latest</option>
                <option value="employee">Employee</option>
                <option value="business">Business</option>
                <option value="reports">Reports</option>
                <option value="score">Score</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-72 w-full flex-col items-center justify-center space-y-4 rounded-xl border border-dark-border bg-dark-surface/40">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-content-secondary animate-pulse">Analyzing performance data...</p>
        </div>
      ) : (
        <>
          <div className="card motion-card motion-sheen overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4">
              <h3 className="font-semibold text-content-primary">{summaryLabel}</h3>
            </div>
            <Table>
              <Thead>
                <Tr>
                  <Th>Employee</Th>
                  <Th>Business</Th>
                  <Th>Reports</Th>
                  <Th>Total Score</Th>
                  <Th>Last Report</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.summary.map((row) => (
                  <Tr key={`${row.employee_id}-${row.business_id}`}>
                    <Td className="font-semibold text-content-primary">{row.employee_name}</Td>
                    <Td>{row.business_name}</Td>
                    <Td>{row.report_count}</Td>
                    <Td className="font-mono text-brand-primary">{Number(row.numeric_total || 0).toLocaleString()}</Td>
                    <Td>{row.last_report_date ? new Date(row.last_report_date).toLocaleDateString() : '-'}</Td>
                  </Tr>
                ))}
                {data.summary.length === 0 && (
                  <Tr><Td colSpan={5} className="py-8 text-center text-content-muted">No performance data found.</Td></Tr>
                )}
              </Tbody>
            </Table>
          </div>

          <div className="card motion-card motion-sheen overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4">
              <h3 className="font-semibold text-content-primary">Report Details</h3>
            </div>
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Employee</Th>
                  <Th>Business</Th>
                  <Th>Timing</Th>
                  <Th>Activity</Th>
                  <Th>Score</Th>
                  <Th>Filled Fields</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.details.map((row) => (
                  <Tr key={row.id}>
                    <Td>{new Date(row.report_date).toLocaleDateString()}</Td>
                    <Td className="font-medium text-content-primary">{row.employee_name}</Td>
                    <Td>{row.business_name}</Td>
                    <Td>{row.timing_name}</Td>
                    <Td>{row.activity_name}</Td>
                    <Td className="font-mono text-brand-primary">{Number(row.numeric_total || 0).toLocaleString()}</Td>
                    <Td>
                      <div className="flex max-w-xl flex-wrap gap-1.5">
                        {(row.answers || []).slice(0, 6).map((answer, index) => (
                          <span key={`${row.id}-${index}`} className="rounded-full border border-dark-border bg-dark-bg px-2 py-0.5 text-[11px] text-content-secondary">
                            <span className="font-medium text-content-primary">{answer.fieldName}:</span> {String(answer.value || 'N/A')}
                          </span>
                        ))}
                        {(row.answers || []).length > 6 && (
                          <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary">
                            +{row.answers.length - 6} more
                          </span>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
                {data.details.length === 0 && (
                  <Tr><Td colSpan={7} className="py-8 text-center text-content-muted">No report entries match the selected filters.</Td></Tr>
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
