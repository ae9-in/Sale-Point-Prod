import { useEffect, useState } from 'react';
import axios from '../../api/axiosInstance';
import PerformanceAnalytics from '../../components/analytics/PerformanceAnalytics';
import Spinner from '../../components/ui/Spinner';
import { Building2, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesRes, businessesRes] = await Promise.all([
          axios.get('/admin/users?status=APPROVED'),
          axios.get('/businesses')
        ]);
        setEmployees(employeesRes.data.data);
        setBusinesses(businessesRes.data.data);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <span className="text-sm font-medium text-content-secondary animate-pulse">Loading dashboard...</span>
      </div>
    );
  }

  const cards = [
    {
      key: 'employees',
      title: 'Employees',
      value: employees.length,
      description: 'View all employee performance or drill into one employee.',
      icon: Users,
      accent: 'text-brand-primary',
      bg: 'bg-brand-primary/10',
      active: 'border-brand-primary bg-brand-primary/5 shadow-brand-primary/10'
    },
    {
      key: 'businesses',
      title: 'Businesses',
      value: businesses.length,
      description: 'View all business performance or drill into one business.',
      icon: Building2,
      accent: 'text-brand-secondary',
      bg: 'bg-brand-secondary/10',
      active: 'border-brand-secondary bg-brand-secondary/5 shadow-brand-secondary/10'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-content-primary">Admin Dashboard</h1>
        <p className="mt-1 text-content-secondary">Choose employees or businesses, then filter by day, week, month, year, or custom range.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeView === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveView(card.key)}
              className={cn(
                'card motion-card motion-sheen p-5 text-left transition-all hover:-translate-y-0.5',
                isActive && card.active
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", card.accent)}>{card.title}</p>
                  <p className="mt-2 text-xl font-bold text-content-primary">{card.value}</p>
                  <p className="mt-1.5 text-xs text-content-secondary">{card.description}</p>
                </div>
                <div className={cn("rounded-xl p-2.5", card.bg, card.accent)}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <PerformanceAnalytics
        title={activeView === 'employees' ? 'Employee Analysis' : 'Business Analysis'}
        summaryLabel={activeView === 'employees' ? 'All Employees / Business Summary' : 'All Businesses / Employee Summary'}
        employees={employees}
        businesses={businesses}
        lockEmployee={false}
        lockBusiness={false}
      />
    </div>
  );
};

export default Dashboard;




