import { useEffect, useState } from 'react';
import axios from '../../api/axiosInstance';
import PerformanceAnalytics from '../../components/analytics/PerformanceAnalytics';
import TargetAnalyticsModal from '../../components/analytics/TargetAnalyticsModal';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { Building2, Users, Target } from 'lucide-react';
import { cn } from '../../utils/cn';

const Dashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

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

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="px-1 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-content-primary tracking-tight">Executive Dashboard</h1>
          <p className="mt-1 text-xs text-content-secondary uppercase tracking-[0.15em] font-bold">
            Real-time Market & Team Intelligence
          </p>
        </div>
        <Button onClick={() => setIsTargetModalOpen(true)} className="flex items-center gap-2 shadow-lg">
          <Target size={18} />
          View Target Progress
        </Button>
      </div>

      <TargetAnalyticsModal 
        isOpen={isTargetModalOpen} 
        onClose={() => setIsTargetModalOpen(false)} 
        businesses={businesses} 
      />

      <PerformanceAnalytics
        title="Global Performance Intelligence"
        summaryLabel="Consolidated Performance Ledger"
        employees={employees}
        businesses={businesses}
        lockEmployee={false}
        lockBusiness={false}
      />
    </div>
  );
};

export default Dashboard;




