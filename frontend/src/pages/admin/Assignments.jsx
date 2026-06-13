import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { User, Building2, Plus, Minus, ArrowRight } from 'lucide-react';

const Assignments = () => {
  const [employees, setEmployees] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignedBusinesses, setAssignedBusinesses] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const empRes = await axios.get('/admin/users?status=APPROVED');
      setEmployees(empRes.data.data);
      if (empRes.data.data.length > 0) {
        setSelectedEmployeeId(empRes.data.data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }

    try {
      const bizRes = await axios.get('/businesses');
      setBusinesses(bizRes.data.data);
    } catch (err) {
      toast.error('Failed to load businesses');
    } finally {
      setLoadingBusinesses(false);
    }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeeAssignments(selectedEmployeeId);
    } else {
      setAssignedBusinesses([]);
    }
  }, [selectedEmployeeId]);

  const fetchEmployeeAssignments = async (employeeId) => {
    try {
      setLoadingAssignments(true);
      const res = await axios.get(`/admin/employees/${employeeId}/businesses`);
      setAssignedBusinesses(res.data.data);
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleAssign = async (businessId) => {
    try {
      await axios.post('/admin/assign', {
        employeeId: selectedEmployeeId,
        businessId
      });
      toast.success('Business assigned successfully');
      fetchEmployeeAssignments(selectedEmployeeId);
    } catch (err) {
      toast.error('Failed to assign business');
    }
  };

  const handleUnassign = async (businessId) => {
    try {
      await axios.delete(`/admin/assign/${selectedEmployeeId}/${businessId}`);
      toast.success('Business unassigned successfully');
      fetchEmployeeAssignments(selectedEmployeeId);
    } catch (err) {
      toast.error('Failed to unassign business');
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Filter businesses that are not yet assigned to the selected employee
  const unassignedBusinesses = businesses.filter(
    b => !assignedBusinesses.some(ab => ab.id === b.id)
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-content-primary">Employee-Business Assignments</h1>
        <p className="text-content-secondary mt-1">Map employees to the businesses they monitor.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: Select Employee */}
        <div className="card motion-card motion-sheen p-5 h-fit space-y-4">
          <h2 className="text-base font-semibold text-content-primary flex items-center gap-2">
            <User className="w-4 h-4 text-brand-primary" />
            Select Employee
          </h2>
          
          {loadingEmployees ? (
            <Skeleton className="h-10 w-full" />
          ) : employees.length === 0 ? (
            <p className="text-content-muted text-sm">No approved employees found.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center justify-between group ${
                    selectedEmployeeId === emp.id
                      ? 'bg-brand-primary/10 border-brand-primary text-content-primary font-medium'
                      : 'bg-dark-surface/50 border-dark-border text-content-secondary hover:bg-dark-surface hover:text-content-primary'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{emp.name}</div>
                    <div className="text-xs text-content-muted">{emp.email}</div>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                    selectedEmployeeId === emp.id ? 'text-brand-primary opacity-100' : 'text-content-muted opacity-0 group-hover:opacity-100'
                  }`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center & Right Column: Assignments Management */}
        <div className="md:col-span-2 space-y-5">
          {selectedEmployeeId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Assigned Businesses */}
              <div className="card motion-card motion-sheen p-5 min-h-[280px] flex flex-col">
                <h2 className="text-base font-semibold text-content-primary mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-secondary" />
                  Assigned Businesses ({assignedBusinesses.length})
                </h2>

                {loadingAssignments ? (
                  <div className="space-y-3 flex-1">
                    {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : assignedBusinesses.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-5 border-2 border-dashed border-dark-border rounded-lg">
                    <p className="text-content-muted text-sm">
                      {selectedEmployee?.name} has no businesses assigned yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px]">
                    {assignedBusinesses.map((biz) => (
                      <div
                        key={biz.id}
                        className="bg-dark-surface/50 border border-dark-border p-3.5 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-content-primary text-sm">{biz.business_name}</div>
                          {biz.description && <div className="text-xs text-content-muted mt-0.5 truncate max-w-[180px]">{biz.description}</div>}
                        </div>
                        <button
                          onClick={() => handleUnassign(biz.id)}
                          className="p-2 text-content-muted hover:text-brand-danger bg-dark-bg hover:bg-brand-danger/10 border border-dark-border hover:border-brand-danger/20 rounded-md transition-colors"
                          title="Unassign Business"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Businesses to Assign */}
              <div className="card motion-card motion-sheen p-5 min-h-[280px] flex flex-col">
                <h2 className="text-base font-semibold text-content-primary mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-primary" />
                  Available Businesses
                </h2>

                {loadingBusinesses ? (
                  <div className="space-y-3 flex-1">
                    {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : unassignedBusinesses.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-5 border-2 border-dashed border-dark-border rounded-lg">
                    <p className="text-content-muted text-sm">
                      All active businesses are already assigned to {selectedEmployee?.name}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px]">
                    {unassignedBusinesses.map((biz) => (
                      <div
                        key={biz.id}
                        className="bg-dark-surface/50 border border-dark-border p-3.5 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-content-primary text-sm">{biz.business_name}</div>
                          {biz.description && <div className="text-xs text-content-muted mt-0.5 truncate max-w-[180px]">{biz.description}</div>}
                        </div>
                        <button
                          onClick={() => handleAssign(biz.id)}
                          className="p-2 text-brand-primary hover:text-content-primary bg-brand-primary/10 hover:bg-brand-primary border border-brand-primary/20 rounded-md transition-all"
                          title="Assign Business"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card motion-card motion-sheen p-5 text-center text-content-muted flex flex-col items-center justify-center h-52">
              <User className="w-8 h-8 text-content-muted mb-2 animate-pulse" />
              Select an employee from the left panel to manage their business assignments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Assignments;



