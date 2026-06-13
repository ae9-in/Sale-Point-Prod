import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import Skeleton from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { BarChart3, TrendingUp, Users, Building2, CheckSquare } from 'lucide-react';

const COLORS = ['#6C63FF', '#10B981', '#FFB800', '#FF4D4D', '#AC73FF', '#00CFE8'];

const Analytics = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/reports');
      setReports(res.data.data);
    } catch (err) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // 1. Compute: Reports count by Business (for Pie Chart)
  const businessData = reports.reduce((acc, report) => {
    const name = report.business_name || 'Other';
    const existing = acc.find(item => item.name === name);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name, value: 1 });
    }
    return acc;
  }, []);

  // 2. Compute: Submissions Timeline (group by Date for Line Chart)
  const timelineDataMap = reports.reduce((acc, report) => {
    const rawDate = new Date(report.report_date);
    const dateStr = rawDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {});

  const timelineData = Object.keys(timelineDataMap)
    .map(date => ({ date, submissions: timelineDataMap[date] }))
    .reverse(); // Ensure chronological order

  // 3. Compute: Submissions by Employee (Bar Chart)
  const employeeDataMap = reports.reduce((acc, report) => {
    const name = report.employee_name || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const employeeData = Object.keys(employeeDataMap).map(name => ({
    name,
    submissions: employeeDataMap[name]
  })).sort((a, b) => b.submissions - a.submissions);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <Skeleton className="h-12 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-content-primary flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-primary" />
          SaaS Analytics Dashboard
        </h1>
        <p className="text-content-secondary mt-1">
          Detailed metrics, submission timelines, and monitoring data computed in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Submissions by Business (Pie Chart) */}
        <div className="card motion-card motion-sheen p-5 flex flex-col justify-between h-[360px]">
          <h2 className="text-base font-medium text-content-primary mb-4">Activity by Business</h2>
          <div className="h-[220px] w-full relative flex items-center justify-center">
            {businessData.length === 0 ? (
              <p className="text-content-muted text-sm">No submissions found</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={businessData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {businessData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3A', borderRadius: '8px' }}
                    itemStyle={{ color: '#F1F5F9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-content-secondary mt-2">
            {businessData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span>{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Submissions Timeline (Line Chart) */}
        <div className="card motion-card motion-sheen p-5 lg:col-span-2 h-[360px]">
          <h2 className="text-base font-medium text-content-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-secondary" />
            Report Submission Timeline
          </h2>
          <div className="h-[240px] w-full">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-content-muted text-sm">No submissions recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3A', borderRadius: '8px' }}
                    itemStyle={{ color: '#F1F5F9' }}
                  />
                  <Line type="monotone" dataKey="submissions" stroke="#10B981" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Submissions per Employee */}
      <div className="card motion-card motion-sheen p-5">
        <h2 className="text-base font-medium text-content-primary mb-4">Reports Submitted per Employee</h2>
        <div className="h-[320px] w-full">
          {employeeData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-content-muted text-sm">No employee data found</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3A', borderRadius: '8px' }}
                  itemStyle={{ color: '#F1F5F9' }}
                  cursor={{ fill: '#2A2D3A', opacity: 0.3 }}
                />
                <Bar dataKey="submissions" fill="#6C63FF" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;



