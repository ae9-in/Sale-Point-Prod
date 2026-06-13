import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Target, Calendar, CheckCircle2, Award } from 'lucide-react';

const Targets = () => {
  const { user } = useAuthStore();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyTargets = async () => {
      try {
        const res = await axios.get(`/targets/employee/${user.id}/summary`);
        setTargets(res.data.data);
      } catch (err) {
        toast.error('Failed to load targets');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchMyTargets();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-content-secondary animate-pulse">Loading your targets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-content-primary flex items-center gap-2">
          <Target className="w-6 h-6 text-brand-primary animate-pulse" />
          My Targets
        </h1>
        <p className="text-content-secondary mt-1">Review your performance goals and current achievements.</p>
      </div>

      <div className="card overflow-hidden">
        {targets.length === 0 ? (
          <div className="p-12 text-center text-content-muted flex flex-col items-center justify-center">
            <Award className="w-12 h-12 text-content-muted mb-2" />
            No targets have been assigned to you yet. You are doing great!
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Target Metric</Th>
                <Th>Duration</Th>
                <Th>Goal Progress</Th>
              </Tr>
            </Thead>
            <Tbody>
              {targets.map((t) => {
                const progressPercentage = Math.min(
                  Math.round((t.progress / t.target_value) * 100),
                  100
                );
                const isCompleted = t.progress >= t.target_value;

                return (
                  <Tr key={t.id}>
                    <Td>
                      <div className="font-semibold text-content-primary text-base">{t.target_name}</div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5 text-xs text-content-secondary">
                        <Calendar className="w-4 h-4 text-content-muted" />
                        <span>
                          {new Date(t.start_date).toLocaleDateString()} - {new Date(t.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </Td>
                    <Td className="w-[320px]">
                      <div className="space-y-2 py-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-content-secondary flex items-center gap-1">
                            {t.progress} / {t.target_value} completed
                            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />}
                          </span>
                          <span className={isCompleted ? 'text-brand-success' : 'text-brand-primary'}>
                            {progressPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-dark-bg rounded-full h-2.5 overflow-hidden border border-dark-border">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-brand-success shadow-lg shadow-brand-success/20' : 'bg-brand-primary shadow-lg shadow-brand-primary/20'}`}
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Targets;
