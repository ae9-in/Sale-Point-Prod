import { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axiosInstance';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { exportToPdf, exportToJpg } from '../../utils/exportUtils';
import { Download, Clock, FileText, Calendar, Eye, X, User, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import SubmissionStatusTracker from '../../components/analytics/SubmissionStatusTracker';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [locations, setLocations] = useState([]);
  
  const [filters, setFilters] = useState({
    employeeId: '',
    businessId: '',
    date: '',
    locationId: '',
    activityType: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [empRes, bizRes, locRes] = await Promise.all([
        axios.get('/admin/users?status=APPROVED'),
        axios.get('/businesses'),
        axios.get('/locations')
      ]);
      setEmployees(empRes.data.data);
      setBusinesses(bizRes.data.data);
      setLocations(locRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load initial filter options');
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      let queryParams = [];
      if (filters.employeeId) queryParams.push(`employeeId=${filters.employeeId}`);
      if (filters.businessId) queryParams.push(`businessId=${filters.businessId}`);
      if (filters.date) queryParams.push(`date=${filters.date}`);
      if (filters.locationId) queryParams.push(`locationId=${filters.locationId}`);
      if (filters.activityType) queryParams.push(`activityType=${filters.activityType}`);
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await axios.get(`/reports${queryString}`);
      setReports(res.data.data);
    } catch (err) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleClearFilters = () => {
    setFilters({
      employeeId: '',
      businessId: '',
      date: '',
      locationId: '',
      activityType: ''
    });
    setEmployeeSearch('');
  };

  const filteredReports = useMemo(() => {
    if (!employeeSearch) return reports;
    return reports.filter(r =>
      r.employee_name.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [reports, employeeSearch]);

  const handleViewReport = async (reportId) => {
    try {
      setLoadingDetails(true);
      const res = await axios.get(`/reports/${reportId}`);
      setSelectedReport(res.data.data);
    } catch (err) {
      toast.error('Failed to load report details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExportExcel = () => {
    const headers = ['Employee', 'Business', 'Timing', 'Activity', 'Date'];
    const rows = filteredReports.map((report) => [
      report.employee_name,
      report.business_name,
      report.timing_name,
      report.activity_name,
      new Date(report.report_date).toLocaleDateString()
    ]);
    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');
    XLSX.writeFile(wb, 'employee-performance-reports.xlsx');
  };

  const handleExportPdf = () => {
    exportToPdf(
      'Employee Performance Reports',
      'Daily Performance Reports Summary',
      'reports-table-container',
      'employee-performance-reports.pdf'
    );
  };

  const handleExportJpg = () => {
    exportToJpg(
      'Employee Performance Reports',
      'Daily Performance Reports Summary',
      'reports-table-container',
      'employee-performance-reports.jpg'
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-1">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-content-primary tracking-tight">Employee Performance Reports</h1>
          <p className="mt-1 text-xs text-content-secondary uppercase tracking-[0.15em] font-bold">Review and export daily performance reports submitted by employees.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleExportExcel} disabled={reports.length === 0} className="h-9 text-[11px] font-black uppercase tracking-wider px-3">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Excel
          </Button>
          <Button variant="secondary" onClick={handleExportPdf} disabled={reports.length === 0} className="h-9 text-[11px] font-black uppercase tracking-wider px-3">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            PDF
          </Button>
          <Button variant="secondary" onClick={handleExportJpg} disabled={reports.length === 0} className="h-9 text-[11px] font-black uppercase tracking-wider px-3">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            JPG
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card border-dark-border/40 bg-dark-surface/40 p-4 backdrop-blur-md shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 items-end">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 ml-1">Filter Location</label>
          <select
            name="locationId"
            value={filters.locationId}
            onChange={handleFilterChange}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10"
          >
            <option value="">All Locations</option>
            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 ml-1">Filter Employee</label>
          <select
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10"
          >
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 ml-1">Search Employee</label>
          <input
            type="text"
            placeholder="Type name..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10 placeholder:text-content-muted/50"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 ml-1">Filter Business</label>
          <select
            name="businessId"
            value={filters.businessId}
            onChange={handleFilterChange}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10"
          >
            <option value="">All Businesses</option>
            {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 ml-1">Filter Activity Type</label>
          <select
            name="activityType"
            value={filters.activityType}
            onChange={handleFilterChange}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10"
          >
            <option value="">All Activities</option>
            <option value="Callings">Callings</option>
            <option value="Fields">Field Visits</option>
          </select>
        </div>

        <div>
          <Input 
            label="Filter Date" 
            name="date"
            type="date"
            value={filters.date}
            onChange={handleFilterChange}
            className="h-10"
          />
        </div>

        <div>
          <Button 
            variant="secondary" 
            className="w-full h-10 text-xs font-black uppercase tracking-wider mb-0.5"
            onClick={handleClearFilters}
            disabled={!filters.employeeId && !filters.businessId && !filters.date && !filters.locationId && !filters.activityType && !employeeSearch}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {filters.businessId && (
        <SubmissionStatusTracker
          businessId={filters.businessId}
          date={filters.date}
          locationId={filters.locationId}
        />
      )}

      {/* Reports List */}
      <div id="reports-table-container" className="overflow-x-auto card overflow-hidden px-0 py-0 border-brand-primary/10 bg-dark-surface/40 backdrop-blur-md shadow-md">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center text-[11px] font-medium text-content-muted uppercase tracking-widest">
            No performance reports match the selected filters or search.
          </div>
        ) : (
            <Table>
              <Thead>
                <Tr className="bg-dark-bg/20">
                  <Th className="text-[10px] uppercase tracking-wider">Employee</Th>
                  <Th className="text-[10px] uppercase tracking-wider">Business</Th>
                  <Th className="text-[10px] uppercase tracking-wider">Timing & Type</Th>
                  <Th className="text-[10px] uppercase tracking-wider">Report Date</Th>
                  <Th className="text-[10px] uppercase tracking-wider text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredReports.map((rep) => (
                  <Tr key={rep.id} className="hover:bg-brand-primary/[0.03] transition-colors">
                    <Td className="font-bold text-content-primary text-xs">{rep.employee_name}</Td>
                    <Td className="text-xs text-content-secondary">{rep.business_name}</Td>
                    <Td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-content-secondary">
                          <Clock className="w-3.5 h-3.5 text-brand-secondary" />
                          <span>{rep.timing_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-content-muted uppercase font-bold">
                          <FileText className="w-3.5 h-3.5 text-content-muted" />
                          <span>{rep.activity_name}</span>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5 text-xs text-content-secondary font-mono">
                        <Calendar className="w-3.5 h-3.5 text-content-muted" />
                        <span>{new Date(rep.report_date).toLocaleDateString()}</span>
                      </div>
                    </Td>
                    <Td className="text-right">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleViewReport(rep.id)}
                        className="h-7 text-[9px] font-black uppercase tracking-wider px-2.5"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Details
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg p-6 bg-dark-surface/90 border border-dark-border/60 shadow-2xl relative animate-scale-up backdrop-blur-md">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute right-4 top-4 text-content-muted hover:text-content-primary p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-[10px] font-black uppercase tracking-widest text-content-primary mb-4 flex items-center gap-2 border-b border-dark-border pb-3">
              <FileText className="w-4 h-4 text-brand-primary" />
              Report Submission Details
            </h3>

            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-12">
                <Spinner size="lg" />
                <p className="text-sm text-content-secondary animate-pulse">Loading report details...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 bg-dark-bg p-4 rounded-lg border border-dark-border text-xs">
                  <div className="space-y-1.5">
                    <div className="text-content-muted uppercase tracking-wider font-semibold text-[9px]">Employee</div>
                    <div className="text-content-primary font-bold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-brand-primary" />
                      {selectedReport.employee_name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-content-muted uppercase tracking-wider font-semibold text-[9px]">Business</div>
                    <div className="text-content-primary font-bold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-brand-secondary" />
                      {selectedReport.business_name}
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    <div className="text-content-muted uppercase tracking-wider font-semibold text-[9px]">Timing Window</div>
                    <div className="text-content-primary font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-secondary" />
                      {selectedReport.timing_name}
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    <div className="text-content-muted uppercase tracking-wider font-semibold text-[9px]">Activity Sub-Type</div>
                    <div className="text-content-primary font-medium flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-brand-primary" />
                      {selectedReport.activity_name}
                    </div>
                  </div>
                </div>

                {/* Form fields & answers */}
                <div className="space-y-4">
                  <h4 className="text-[9px] font-black text-content-primary uppercase tracking-widest border-b border-dark-border pb-1">Dynamic Answers</h4>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {selectedReport.answers?.map((ans, idx) => (
                      <div key={idx} className="bg-dark-bg/40 p-3 rounded-lg border border-dark-border/50">
                        <div className="text-[10px] text-content-muted font-bold uppercase mb-1">{ans.field_name}</div>
                        <div className="text-xs text-content-primary font-semibold">
                          {ans.field_type === 'textarea' ? (
                            <p className="whitespace-pre-wrap font-normal text-content-secondary leading-relaxed">{ans.value || 'N/A'}</p>
                          ) : (
                            ans.value || 'N/A'
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-dark-border">
                  <Button variant="secondary" onClick={() => setSelectedReport(null)} className="h-9 text-[11px] font-black uppercase tracking-wider">Close</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;



