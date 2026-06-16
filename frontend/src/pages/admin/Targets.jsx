import { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axiosInstance';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Target, Plus, Trash2, Calendar, Award, CheckCircle2 } from 'lucide-react';

const Targets = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignedBusinesses, setAssignedBusinesses] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    businessId: '',
    targetName: '',
    targetValue: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get('/admin/users?status=APPROVED');
      setEmployees(res.data.data);
      
      const filtered = res.data.data;
      if (filtered.length > 0) {
        setSelectedEmployeeId(filtered[0].id);
      }
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchTargetsWithProgress(selectedEmployeeId);
      fetchEmployeeBusinesses(selectedEmployeeId);
    } else {
      setTargets([]);
      setAssignedBusinesses([]);
    }
  }, [selectedEmployeeId]);

  const fetchEmployeeBusinesses = async (employeeId) => {
    try {
      const res = await axios.get(`/admin/employees/${employeeId}/businesses`);
      setAssignedBusinesses(res.data.data);
      if (res.data.data.length > 0) {
        setFormData(prev => ({ ...prev, businessId: res.data.data[0].id }));
      } else {
        setFormData(prev => ({ ...prev, businessId: '' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTargetsWithProgress = async (employeeId) => {
    try {
      setLoadingTargets(true);
      const res = await axios.get(`/targets/employee/${employeeId}/summary`);
      setTargets(res.data.data);
    } catch (err) {
      toast.error('Failed to load target summary');
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddTarget = async (e) => {
    e.preventDefault();
    const { businessId, targetName, targetValue, startDate, endDate } = formData;
    if (!businessId || !targetName || !targetValue || !startDate || !endDate) {
      toast.error('All fields are required');
      return;
    }

    try {
      await axios.post('/targets', {
        employeeId: selectedEmployeeId,
        businessId,
        targetName,
        targetValue: parseInt(targetValue, 10),
        startDate,
        endDate
      });
      toast.success('Target set successfully');
      setFormData(prev => ({
        ...prev,
        targetName: '',
        targetValue: '',
        startDate: '',
        endDate: ''
      }));
      setShowAdd(false);
      fetchTargetsWithProgress(selectedEmployeeId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set target');
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!confirm('Are you sure you want to delete this performance target?')) return;
    try {
      await axios.delete(`/targets/${id}`);
      toast.success('Target deleted');
      fetchTargetsWithProgress(selectedEmployeeId);
    } catch (err) {
      toast.error('Failed to delete target');
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-content-primary">Performance Targets</h1>
          <p className="text-content-secondary mt-1">Set daily/weekly activity targets for employees and monitor progress.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Left Column: Select Employee */}
        <div className="card motion-card motion-sheen p-5 h-fit space-y-4 md:col-span-1">
          <h2 className="text-base font-semibold text-content-primary flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-primary" />
            Employees
          </h2>
          <input
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors placeholder:text-content-muted/50"
          />
          
          {loadingEmployees ? (
            <div className="flex h-10 w-full items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-content-muted text-sm text-center py-2">No matching employees.</p>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    selectedEmployeeId === emp.id
                      ? 'bg-brand-primary/10 border-brand-primary text-content-primary font-medium'
                      : 'bg-dark-surface/50 border-dark-border text-content-secondary hover:bg-dark-surface hover:text-content-primary'
                  }`}
                >
                  <div className="font-semibold text-sm">{emp.name}</div>
                  <div className="text-xs text-content-muted mt-0.5">{emp.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Targets Table & Form */}
        <div className="md:col-span-3 space-y-5">
          {selectedEmployeeId ? (
            <>
              {/* Add Target Header Card */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-content-primary">
                  Targets for <span className="text-brand-primary font-bold">{selectedEmployee?.name}</span>
                </h2>
                {assignedBusinesses.length > 0 && (
                  <Button onClick={() => setShowAdd(!showAdd)} size="sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Set Target
                  </Button>
                )}
              </div>

              {assignedBusinesses.length === 0 && (
                <div className="card motion-card motion-sheen p-5 border border-brand-warning/30 bg-brand-warning/5 text-brand-warning text-sm rounded-lg">
                  Before you can set targets, you must assign at least one business to this employee in the Assignments panel.
                </div>
              )}

              {showAdd && assignedBusinesses.length > 0 && (
                <div className="card motion-card motion-sheen p-5 animate-fade-in border border-brand-primary/30 bg-brand-primary/5">
                  <h3 className="text-sm font-semibold text-content-primary mb-4">Set Performance Target</h3>
                  <form onSubmit={handleAddTarget} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-content-secondary mb-2">Business</label>
                      <select
                        name="businessId"
                        value={formData.businessId}
                        onChange={handleInputChange}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-content-primary focus:outline-none focus:border-brand-primary transition-colors text-sm"
                        required
                      >
                        {assignedBusinesses.map(b => (
                          <option key={b.id} value={b.id}>{b.business_name}</option>
                        ))}
                      </select>
                    </div>

                    <Input 
                      label="Target Metric Name (e.g. Calls Made)" 
                      name="targetName"
                      value={formData.targetName}
                      onChange={handleInputChange}
                      placeholder="Number of Calls Made"
                      required
                    />

                    <Input 
                      label="Target Value" 
                      name="targetValue"
                      type="number"
                      value={formData.targetValue}
                      onChange={handleInputChange}
                      placeholder="100"
                      required
                    />

                    <Input 
                      label="Start Date" 
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                    />

                    <Input 
                      label="End Date" 
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required
                    />

                    <div className="flex justify-end gap-2 lg:col-span-3 mt-2">
                      <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                      <Button type="submit">Set Target</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Targets List */}
              <div className="card motion-card motion-sheen overflow-hidden">
                {loadingTargets ? (
                  <div className="flex h-32 items-center justify-center">
                    <Spinner />
                  </div>
                ) : targets.length === 0 ? (
                  <div className="p-5 text-center text-content-muted">
                    No performance targets set for {selectedEmployee?.name}.
                  </div>
                ) : (
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Target Metric</Th>
                        <Th>Business</Th>
                        <Th>Target Duration</Th>
                        <Th>Progress Status</Th>
                        <Th className="text-right">Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {targets.map((t) => {
                        const targetBiz = assignedBusinesses.find(b => b.id === t.business_id);
                        const progressPercentage = Math.min(
                          Math.round((t.progress / t.target_value) * 100),
                          100
                        );
                        const isCompleted = t.progress >= t.target_value;

                        return (
                          <Tr key={t.id}>
                            <Td>
                              <div className="font-semibold text-content-primary">{t.target_name}</div>
                            </Td>
                            <Td>
                              <span className="text-content-secondary">
                                {targetBiz?.business_name || 'Assigned Business'}
                              </span>
                            </Td>
                            <Td>
                              <div className="flex items-center gap-1 text-xs text-content-muted">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{new Date(t.start_date).toLocaleDateString()} - {new Date(t.end_date).toLocaleDateString()}</span>
                              </div>
                            </Td>
                            <Td className="w-[240px]">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                  <span className="text-content-secondary flex items-center gap-1">
                                    {t.progress} / {t.target_value}
                                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />}
                                  </span>
                                  <span className={isCompleted ? 'text-brand-success' : 'text-brand-primary'}>
                                    {progressPercentage}%
                                  </span>
                                </div>
                                <div className="progress-track w-full">
                                  <div
                                    className={`progress-fill ${isCompleted ? 'bg-brand-success' : progressPercentage >= 60 ? 'bg-brand-secondary' : 'bg-brand-primary'}`}
                                    style={{ width: `${progressPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </Td>
                            <Td className="text-right">
                              <button
                                onClick={() => handleDeleteTarget(t.id)}
                                className="p-2 text-content-muted hover:text-brand-danger transition-colors"
                                title="Delete Target"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </div>
            </>
          ) : (
            <div className="card motion-card motion-sheen p-5 text-center text-content-muted flex flex-col items-center justify-center h-52">
              <Target className="w-8 h-8 text-content-muted mb-2 animate-pulse" />
              Select an employee from the left panel to manage their performance targets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Targets;



