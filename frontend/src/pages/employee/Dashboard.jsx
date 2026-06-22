import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axiosInstance';
import PerformanceAnalytics from '../../components/analytics/PerformanceAnalytics';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Briefcase, FileText, Target } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${m} ${ampm}`;
};

const getShiftString = (user) => {
  const start = formatTime(user?.shift_start || '09:30:00');
  const end = formatTime(user?.shift_end || '19:00:00');
  return `${start} - ${end}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [targetsRes, businessesRes, reportsRes] = await Promise.all([
          axios.get(`/targets/employee/${user.id}/summary`),
          axios.get(`/admin/employees/${user.id}/businesses`),
          axios.get('/reports')
        ]);
        setSummary(targetsRes.data.data);
        setBusinesses(businessesRes.data.data);
        setReports(reportsRes.data.data.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-content-secondary animate-pulse">Gathering your dashboard data...</p>
      </div>
    );
  }

  const achievedTargets = summary.filter((target) => Number(target.progress || 0) >= Number(target.target_value || 0)).length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-content-primary flex items-center flex-wrap gap-2">
          Welcome back, {user?.name}
          <span className="text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-md border border-brand-primary/20">
            Shift: {getShiftString(user)}
          </span>
        </h1>
        <p className="mt-1 text-content-secondary">Your assigned businesses, targets, reports, and personal performance.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <button type="button" onClick={() => navigate('/employee/businesses')} className="text-left transition hover:-translate-y-0.5">
          <StatCard title="Assigned Businesses" value={businesses.length} icon={Briefcase} tone="blue" />
        </button>
        <button type="button" onClick={() => navigate('/employee/targets')} className="text-left transition hover:-translate-y-0.5">
          <StatCard title="Active Targets" value={summary.length} icon={Target} tone="amber" />
        </button>
        <button type="button" onClick={() => navigate('/employee/reports')} className="text-left transition hover:-translate-y-0.5">
          <StatCard title="Targets Achieved" value={achievedTargets} icon={FileText} tone="green" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-5 py-4">
            <h2 className="font-semibold text-content-primary">Target Achievement</h2>
          </div>
          <Table>
            <Thead><Tr><Th>Target</Th><Th>Progress</Th><Th>Status</Th></Tr></Thead>
            <Tbody>
              {summary.map((target) => {
                const percentage = Math.min(100, Math.round((Number(target.progress || 0) / Number(target.target_value || 1)) * 100));
                const isAchieved = Number(target.progress || 0) >= Number(target.target_value || 0);
                return (
                  <Tr key={target.id}>
                    <Td className="font-semibold text-content-primary">{target.target_name}</Td>
                    <Td><span className="font-mono text-brand-primary">{target.progress || 0} / {target.target_value}</span><div className="mt-2 h-2 w-36 overflow-hidden rounded-full bg-dark-bg"><div className="h-full bg-brand-primary" style={{ width: `${percentage}%` }} /></div></Td>
                    <Td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isAchieved ? 'bg-brand-success/15 text-brand-success' : 'bg-brand-warning/15 text-brand-warning'}`}>{isAchieved ? 'Achieved' : 'In Progress'}</span></Td>
                  </Tr>
                );
              })}
              {summary.length === 0 && <Tr><Td colSpan={3} className="py-8 text-center text-content-muted">No targets assigned yet.</Td></Tr>}
            </Tbody>
          </Table>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-dark-border px-5 py-4">
            <h2 className="font-semibold text-content-primary">Recent Reports</h2>
          </div>
          <Table>
            <Thead><Tr><Th>Business</Th><Th>Timing</Th><Th>Date</Th></Tr></Thead>
            <Tbody>
              {reports.map((report) => (
                <Tr key={report.id}>
                  <Td className="font-semibold text-content-primary">{report.business_name}</Td>
                  <Td>{report.timing_name}</Td>
                  <Td>{new Date(report.report_date).toLocaleDateString()}</Td>
                </Tr>
              ))}
              {reports.length === 0 && <Tr><Td colSpan={3} className="py-8 text-center text-content-muted">No reports submitted yet.</Td></Tr>}
            </Tbody>
          </Table>
        </div>
      </div>

      <PerformanceAnalytics
        title="My Personal Analytics"
        businesses={businesses}
        initialEmployeeId={user?.id}
        lockEmployee
        summaryLabel="My Business Performance"
      />
    </div>
  );
};

export default Dashboard;
