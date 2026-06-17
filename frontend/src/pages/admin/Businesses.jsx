import { useEffect, useMemo, useState, useRef } from 'react';
import axios from '../../api/axiosInstance';
import PerformanceAnalytics from '../../components/analytics/PerformanceAnalytics';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import toast from 'react-hot-toast';
import { Building2, Clock, FileText, Plus, Target, Trash2, UserPlus, Users, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const emptyBusiness = { businessName: '', description: '' };
const emptyField = { fieldName: '', fieldType: 'number', required: false };
const emptyBusinessTarget = { targetName: '', targetValue: '', startDate: '', endDate: '' };

const Businesses = () => {
  const [businesses, setBusinesses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [timings, setTimings] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [fieldsByActivity, setFieldsByActivity] = useState({});
  const [businessForm, setBusinessForm] = useState(emptyBusiness);
  const [searchTerm, setSearchTerm] = useState('');
  const [timingName, setTimingName] = useState('');
  const [editingTimingId, setEditingTimingId] = useState('');
  const [editingTimingName, setEditingTimingName] = useState('');
  const [activityName, setActivityName] = useState('');
  const [fieldForms, setFieldForms] = useState({});
  const [businessTarget, setBusinessTarget] = useState(emptyBusinessTarget);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedTargetEmployeeIds, setSelectedTargetEmployeeIds] = useState([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.id === selectedBusinessId),
    [businesses, selectedBusinessId]
  );

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b =>
      b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [businesses, searchTerm]);

  const unassignedEmployees = employees.filter(
    (employee) => !assignedEmployees.some((assigned) => assigned.id === employee.id)
  );

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      const [businessesRes, employeesRes] = await Promise.all([
        axios.get('/businesses'),
        axios.get('/admin/users?status=APPROVED')
      ]);
      setBusinesses(businessesRes.data.data);
      setEmployees(employeesRes.data.data);
      setSelectedBusinessId((current) => current || businessesRes.data.data[0]?.id || '');
    } catch (err) {
      toast.error('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessDetail = async (businessId) => {
    if (!businessId) return;
    try {
      setDetailLoading(true);
      const [employeesRes, timingsRes, activitiesRes] = await Promise.all([
        axios.get(`/admin/businesses/${businessId}/employees`),
        axios.get(`/businesses/${businessId}/timings`),
        axios.get(`/businesses/${businessId}/activity-types`)
      ]);
      setAssignedEmployees(employeesRes.data.data);
      setTimings(timingsRes.data.data);
      setActivityTypes(activitiesRes.data.data);
      setSelectedEmployeeId('');
      setAssignEmployeeId('');
      setAssignToAll(true);
      setSelectedTargetEmployeeIds([]);
      setShowEmployeeDropdown(false);

      const fields = {};
      await Promise.all(activitiesRes.data.data.map(async (activity) => {
        const res = await axios.get(`/businesses/${businessId}/activity-types/${activity.id}/fields`);
        fields[activity.id] = res.data.data;
      }));
      setFieldsByActivity(fields);
    } catch (err) {
      toast.error('Failed to load business details');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { fetchBaseData(); }, []);
  useEffect(() => { fetchBusinessDetail(selectedBusinessId); }, [selectedBusinessId]);

  const handleCreateBusiness = async (event) => {
    event.preventDefault();
    if (!businessForm.businessName.trim()) return;
    try {
      const res = await axios.post('/businesses', businessForm);
      toast.success('Business created');
      setBusinessForm(emptyBusiness);
      await fetchBaseData();
      setSelectedBusinessId(res.data.data.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create business');
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    if (!confirm('Delete this business and all related configuration?')) return;
    try {
      await axios.delete(`/businesses/${businessId}`);
      toast.success('Business deleted');
      setSelectedBusinessId('');
      await fetchBaseData();
    } catch (err) {
      toast.error('Failed to delete business');
    }
  };

  const handleAssignEmployee = async () => {
    if (!assignEmployeeId || !selectedBusinessId) return;
    try {
      await axios.post('/admin/assign', { employeeId: assignEmployeeId, businessId: selectedBusinessId });
      toast.success('Employee assigned');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to assign employee');
    }
  };

  const handleUnassignEmployee = async (employeeId) => {
    try {
      await axios.delete(`/admin/assign/${employeeId}/${selectedBusinessId}`);
      toast.success('Employee removed from business');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to remove employee');
    }
  };

  const handleApplyDefaults = async () => {
    if (!selectedBusinessId || !confirm('This will add default reporting categories (Callings, Fields) and their fields to this business. Continue?')) return;
    try {
      setTemplateLoading(true);
      await axios.post(`/businesses/${selectedBusinessId}/apply-defaults`);
      toast.success('Default categories applied');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to apply default categories');
    } finally {
      setTemplateLoading(false);
    }
  };

  const formatTo12Hour = (time24) => {
    if (!time24 || !time24.includes(':')) return time24;
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const formatTo24Hour = (time12) => {
    if (!time12 || !time12.includes(' ')) return time12;
    try {
      const [time, ampm] = time12.split(' ');
      let [hours, minutes] = time.split(':');
      let h = parseInt(hours);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${minutes}`;
    } catch (e) {
      return time12;
    }
  };

  const handleAddTiming = async (event) => {
    event.preventDefault();
    if (!timingName.trim()) return;
    try {
      const formattedTime = formatTo12Hour(timingName);
      await axios.post(`/businesses/${selectedBusinessId}/timings`, { timingName: formattedTime });
      setTimingName('');
      toast.success('Timing added');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to add timing');
    }
  };

  const handleDeleteTiming = async (timingId) => {
    try {
      await axios.delete(`/businesses/${selectedBusinessId}/timings/${timingId}`);
      toast.success('Timing removed');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to remove timing');
    }
  };

  const startEditTiming = (timing) => {
    setEditingTimingId(timing.id);
    setEditingTimingName(formatTo24Hour(timing.timing_name));
  };

  const handleUpdateTiming = async () => {
    if (!editingTimingId || !editingTimingName.trim()) return;
    try {
      const formattedTime = formatTo12Hour(editingTimingName);
      await axios.put(`/businesses/${selectedBusinessId}/timings/${editingTimingId}`, { timingName: formattedTime });
      toast.success('Timing updated');
      setEditingTimingId('');
      setEditingTimingName('');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to update timing');
    }
  };

  const handleAddActivity = async (event) => {
    event.preventDefault();
    if (!activityName.trim()) return;
    try {
      await axios.post(`/businesses/${selectedBusinessId}/activity-types`, { name: activityName });
      setActivityName('');
      toast.success('Reporting form added');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to add reporting form');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      await axios.delete(`/businesses/${selectedBusinessId}/activity-types/${activityId}`);
      toast.success('Reporting form removed');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to remove reporting form');
    }
  };

  const updateFieldForm = (activityId, name, value) => {
    setFieldForms((previous) => ({
      ...previous,
      [activityId]: { ...(previous[activityId] || emptyField), [name]: value }
    }));
  };

  const handleAddField = async (activityId) => {
    const field = fieldForms[activityId] || emptyField;
    if (!field.fieldName?.trim()) return;
    try {
      await axios.post(`/businesses/${selectedBusinessId}/activity-types/${activityId}/fields`, field);
      setFieldForms((previous) => ({ ...previous, [activityId]: emptyField }));
      toast.success('Custom field added');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to add custom field');
    }
  };

  const handleDeleteField = async (activityId, fieldId) => {
    try {
      await axios.delete(`/businesses/${selectedBusinessId}/activity-types/${activityId}/fields/${fieldId}`);
      toast.success('Custom field removed');
      fetchBusinessDetail(selectedBusinessId);
    } catch (err) {
      toast.error('Failed to remove custom field');
    }
  };

  const handleSetBusinessTarget = async (event) => {
    event.preventDefault();
    const { targetName, targetValue, startDate, endDate } = businessTarget;
    if (!selectedBusinessId || !targetName || !targetValue || !startDate || !endDate) {
      toast.error('All target fields are required');
      return;
    }

    if (!assignToAll && selectedTargetEmployeeIds.length === 0) {
      toast.error('Please select at least one employee or choose to assign to all');
      return;
    }

    try {
      await axios.post('/targets/business', {
        businessId: selectedBusinessId,
        targetName,
        targetValue: Number(targetValue),
        startDate,
        endDate,
        employeeIds: assignToAll ? [] : selectedTargetEmployeeIds
      });
      toast.success(assignToAll ? 'Target assigned to all employees' : 'Target assigned to selected employees');
      setBusinessTarget(emptyBusinessTarget);
      setSelectedTargetEmployeeIds([]);
      setAssignToAll(true);
      setShowEmployeeDropdown(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set target');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-content-secondary animate-pulse">Loading businesses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-content-primary">Businesses</h1>
        <p className="mt-1 text-content-secondary">Create businesses, assign employees, manage timings, custom fields, and business performance.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="card motion-card motion-sheen p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-content-primary"><Plus className="h-4 w-4 text-brand-primary" /> Add Business</h2>
            <form onSubmit={handleCreateBusiness} className="space-y-3">
              <Input label="Business Name" value={businessForm.businessName} onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })} />
              <Input label="Description" value={businessForm.description} onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })} />
              <Button type="submit" className="w-full">Create Business</Button>
            </form>
          </div>

          <div className="card motion-card motion-sheen overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4 flex flex-col gap-3">
              <h2 className="font-semibold text-content-primary">All Businesses</h2>
              <input
                type="text"
                placeholder="Search by name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-xs text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors placeholder:text-content-muted/50"
              />
            </div>
            <div className="max-h-[520px] overflow-y-auto p-3">
              {filteredBusinesses.map((business) => (
                <button
                  key={business.id}
                  type="button"
                  onClick={() => setSelectedBusinessId(business.id)}
                  className={cn(
                    'mb-2 w-full rounded-xl border border-dark-border p-4 text-left transition hover:border-brand-primary/50 hover:bg-brand-primary/5',
                    selectedBusinessId === business.id && 'border-brand-primary bg-brand-primary/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-content-primary">{business.business_name}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-content-secondary">{business.description || 'No description added'}</p>
                    </div>
                    <Building2 className="h-4 w-4 text-brand-primary" />
                  </div>
                </button>
              ))}
              {filteredBusinesses.length === 0 && <p className="p-4 text-sm text-content-muted">No businesses match search.</p>}
            </div>
          </div>
        </div>

        {selectedBusiness ? (
          <div className="space-y-5">
            <div className="card motion-card motion-sheen p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Selected Business</p>
                  <h2 className="mt-1 text-lg font-bold text-content-primary">{selectedBusiness.business_name}</h2>
                  <p className="mt-1 text-content-secondary">{selectedBusiness.description || 'Manage employees, timings, fields, and analytics for this business.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={handleApplyDefaults} isLoading={templateLoading}>
                    <Plus className="mr-1 h-4 w-4" /> Defaults
                  </Button>
                  <Button variant="danger" onClick={() => handleDeleteBusiness(selectedBusiness.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div className="card motion-card motion-sheen p-5 min-w-0 overflow-hidden">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-content-primary"><Users className="h-4 w-4 text-brand-primary" /> Assigned Employees</h3>
                    <div className="mb-4 flex gap-2">
                      <select className="input-field" value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)}>
                        <option value="">Select employee</option>
                        {unassignedEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                      </select>
                      <Button type="button" onClick={handleAssignEmployee}><UserPlus className="h-4 w-4" /></Button>
                    </div>
                    <Table>
                      <Thead><Tr><Th>Name</Th><Th>Email</Th><Th className="text-right">Action</Th></Tr></Thead>
                      <Tbody>
                        {assignedEmployees.map((employee) => (
                          <Tr key={employee.id} className={selectedEmployeeId === employee.id ? 'bg-brand-primary/5' : ''}>
                            <Td><button className="font-semibold text-brand-primary" onClick={() => setSelectedEmployeeId(employee.id)}>{employee.name}</button></Td>
                            <Td className="max-w-[180px] truncate" title={employee.email}>{employee.email}</Td>
                            <Td className="text-right"><button className="text-content-muted hover:text-brand-danger" onClick={() => handleUnassignEmployee(employee.id)}><Trash2 className="h-4 w-4" /></button></Td>
                          </Tr>
                        ))}
                        {assignedEmployees.length === 0 && <Tr><Td colSpan={3} className="py-8 text-center text-content-muted">No employees assigned.</Td></Tr>}
                      </Tbody>
                    </Table>
                  </div>

                  <div className="card motion-card motion-sheen p-5 min-w-0 overflow-hidden">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-content-primary"><Clock className="h-4 w-4 text-brand-primary" /> Upload Timings</h3>
                    <form onSubmit={handleAddTiming} className="mb-4 flex gap-2">
                      <Input type="time" value={timingName} onChange={(e) => setTimingName(e.target.value)} />
                      <Button type="submit">Add</Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      {timings.map((timing) => (
                        editingTimingId === timing.id ? (
                          <span key={timing.id} className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-2 py-1 text-sm">
                            <input
                              type="time"
                              className="w-32 bg-transparent px-1 text-content-primary outline-none"
                              value={editingTimingName}
                              onChange={(event) => setEditingTimingName(event.target.value)}
                            />
                            <button onClick={handleUpdateTiming} className="font-semibold text-brand-primary">Save</button>
                            <button onClick={() => setEditingTimingId('')} className="text-content-muted">Cancel</button>
                          </span>
                        ) : (
                          <span key={timing.id} className="inline-flex items-center gap-2 rounded-full border border-dark-border bg-dark-bg px-3 py-1.5 text-sm text-content-primary">
                            <button onClick={() => startEditTiming(timing)} className="font-medium hover:text-brand-primary">{timing.timing_name}</button>
                            <button onClick={() => handleDeleteTiming(timing.id)} className="text-content-muted hover:text-brand-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                          </span>
                        )
                      ))}
                      {timings.length === 0 && <p className="text-sm text-content-muted">No timings configured.</p>}
                    </div>
                  </div>
                </div>

                <div className="card motion-card p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-content-primary">
                    <Target className="h-4 w-4 text-brand-success" />
                    Set Target For This Business
                  </h3>
                  
                  <form onSubmit={handleSetBusinessTarget} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[1.4fr_0.8fr_1.1fr_1.1fr_1.4fr_1fr] items-end">
                      <Input
                        label="Metric"
                        value={businessTarget.targetName}
                        onChange={(event) => setBusinessTarget({ ...businessTarget, targetName: event.target.value })}
                        placeholder="Calls Made"
                      />
                      <Input
                        label="Value"
                        type="number"
                        value={businessTarget.targetValue}
                        onChange={(event) => setBusinessTarget({ ...businessTarget, targetValue: event.target.value })}
                        placeholder="100"
                      />
                      <Input
                        label="Start"
                        type="date"
                        value={businessTarget.startDate}
                        onChange={(event) => setBusinessTarget({ ...businessTarget, startDate: event.target.value })}
                      />
                      <Input
                        label="End"
                        type="date"
                        value={businessTarget.endDate}
                        onChange={(event) => setBusinessTarget({ ...businessTarget, endDate: event.target.value })}
                      />

                      <div className="relative w-full" ref={dropdownRef}>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-content-secondary mb-1.5">
                          Employees
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                          className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-content-primary text-sm flex items-center justify-between hover:border-brand-primary/50 transition-colors h-10"
                        >
                          <span className="truncate">
                            {assignToAll
                              ? 'All Employees'
                              : selectedTargetEmployeeIds.length === 0
                              ? 'Select employees'
                              : `${selectedTargetEmployeeIds.length} selected`}
                          </span>
                          <ChevronDown className={cn("h-4 w-4 text-content-muted transition-transform ml-1 flex-shrink-0", showEmployeeDropdown && "rotate-180")} />
                        </button>

                        {showEmployeeDropdown && (
                          <div className="absolute z-20 min-w-full w-60 md:w-64 bottom-full mb-1 bg-dark-surface border border-dark-border rounded-lg shadow-xl max-h-48 overflow-y-auto p-2 space-y-1 animate-fade-in left-0">
                            {assignedEmployees.length === 0 ? (
                              <p className="text-xs text-content-muted italic p-2">No employees assigned</p>
                            ) : (
                              <>
                                <label
                                  className={cn(
                                    "flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-content-secondary cursor-pointer hover:bg-dark-bg/60 transition",
                                    assignToAll && "text-content-primary font-medium"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={assignToAll}
                                    onChange={(e) => {
                                      setAssignToAll(e.target.checked);
                                      if (e.target.checked) {
                                        setSelectedTargetEmployeeIds([]);
                                      }
                                    }}
                                    className="h-3.5 w-3.5 rounded border-dark-border bg-dark-bg text-brand-primary focus:ring-brand-primary"
                                  />
                                  <span className="truncate font-semibold">All Employees</span>
                                </label>
                                <div className="border-t border-dark-border/40 my-1"></div>
                                {assignedEmployees.map((emp) => {
                                  const isChecked = assignToAll || selectedTargetEmployeeIds.includes(emp.id);
                                  return (
                                    <label
                                      key={emp.id}
                                      className={cn(
                                        "flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-content-secondary transition",
                                        assignToAll ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-dark-bg/60",
                                        isChecked && "text-content-primary font-medium"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={assignToAll}
                                        onChange={(e) => {
                                          if (assignToAll) return;
                                          if (e.target.checked) {
                                            setSelectedTargetEmployeeIds([...selectedTargetEmployeeIds, emp.id]);
                                          } else {
                                            setSelectedTargetEmployeeIds(selectedTargetEmployeeIds.filter(id => id !== emp.id));
                                          }
                                        }}
                                        className="h-3.5 w-3.5 rounded border-dark-border bg-dark-bg text-brand-primary focus:ring-brand-primary"
                                      />
                                      <span className="truncate">{emp.name}</span>
                                    </label>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="w-full">
                        <Button
                          type="submit"
                          className="w-full h-10"
                          disabled={assignedEmployees.length === 0}
                        >
                          Set Target
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="card motion-card motion-sheen p-5">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-content-primary"><FileText className="h-4 w-4 text-brand-primary" /> Reporting Forms & Custom Fields</h3>
                  <form onSubmit={handleAddActivity} className="mb-4 flex gap-2">
                    <Input value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder="Example: Calls, Visits, Follow-ups" />
                    <Button type="submit">Add Form</Button>
                  </form>
                  <div className="space-y-4">
                    {activityTypes.map((activity) => {
                      const fieldForm = fieldForms[activity.id] || emptyField;
                      return (
                        <div key={activity.id} className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="font-semibold text-content-primary">{activity.name}</h4>
                            <button onClick={() => handleDeleteActivity(activity.id)} className="text-content-muted hover:text-brand-danger"><Trash2 className="h-4 w-4" /></button>
                          </div>
                          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_150px_120px_auto]">
                            <Input value={fieldForm.fieldName || ''} onChange={(e) => updateFieldForm(activity.id, 'fieldName', e.target.value)} placeholder="Field name" />
                            <select className="input-field" value={fieldForm.fieldType || 'number'} onChange={(e) => updateFieldForm(activity.id, 'fieldType', e.target.value)}>
                              <option value="number">Number</option>
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="checkbox">Checkbox</option>
                            </select>
                            <label className="flex items-center gap-2 rounded-lg border border-dark-border px-3 text-sm text-content-secondary">
                              <input type="checkbox" checked={Boolean(fieldForm.required)} onChange={(e) => updateFieldForm(activity.id, 'required', e.target.checked)} /> Required
                            </label>
                            <Button type="button" onClick={() => handleAddField(activity.id)}>Add Field</Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(fieldsByActivity[activity.id] || []).map((field) => (
                              <span key={field.id} className="inline-flex items-center gap-2 rounded-full border border-dark-border bg-dark-surface px-3 py-1.5 text-sm text-content-primary">
                                {field.field_name} <span className="text-xs text-content-muted">{field.field_type}</span>
                                <button onClick={() => handleDeleteField(activity.id, field.id)} className="text-content-muted hover:text-brand-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                              </span>
                            ))}
                            {(fieldsByActivity[activity.id] || []).length === 0 && <p className="text-sm text-content-muted">No custom fields yet.</p>}
                          </div>
                        </div>
                      );
                    })}
                    {activityTypes.length === 0 && <p className="rounded-xl border border-dashed border-dark-border p-5 text-center text-content-muted">No reporting forms configured.</p>}
                  </div>
                </div>

                <PerformanceAnalytics
                  title={selectedEmployeeId ? 'Selected Employee Performance for this Business' : 'Business Performance'}
                  employees={assignedEmployees}
                  businesses={businesses}
                  initialBusinessId={selectedBusinessId}
                  initialEmployeeId={selectedEmployeeId}
                  lockBusiness
                  summaryLabel="Business Performance Summary"
                />
              </>
            )}
          </div>
        ) : (
          <div className="card motion-card motion-sheen flex min-h-[320px] items-center justify-center p-5 text-center text-content-muted">
            Create or select a business to manage its employees, timings, fields, and analytics.
          </div>
        )}
      </div>
    </div>
  );
};

export default Businesses;




