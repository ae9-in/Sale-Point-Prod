import { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axiosInstance';
import PerformanceAnalytics from '../../components/analytics/PerformanceAnalytics';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import toast from 'react-hot-toast';
import { Briefcase, Calendar, Mail, Phone, Plus, Shield, Trash2, User, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';

const emptyForm = { name: '', email: '', phone: '', password: '', locationId: '' };

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [assignedBusinesses, setAssignedBusinesses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignBusinessId, setAssignBusinessId] = useState('');

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const unassignedBusinesses = useMemo(() => {
    return businesses.filter(
      (biz) => !assignedBusinesses.some((assigned) => assigned.id === biz.id)
    );
  }, [businesses, assignedBusinesses]);

  const fetchEmployees = async () => {
    const res = await axios.get('/admin/users?status=APPROVED');
    setEmployees(res.data.data);
    setSelectedEmployeeId((current) => current || res.data.data[0]?.id || '');
  };

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      const [, businessesRes, locationsRes] = await Promise.all([
        fetchEmployees(),
        axios.get('/businesses'),
        axios.get('/locations')
      ]);
      setBusinesses(businessesRes.data.data);
      setLocations(locationsRes.data.data);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId) => {
    if (!employeeId) return;
    try {
      setDetailLoading(true);
      const res = await axios.get(`/admin/employees/${employeeId}/businesses`);
      setAssignedBusinesses(res.data.data);
      setAssignBusinessId('');
    } catch (err) {
      toast.error('Failed to load employee details');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { fetchBaseData(); }, []);
  useEffect(() => { fetchEmployeeDetails(selectedEmployeeId); }, [selectedEmployeeId]);

  const handleInputChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleAddEmployee = async (event) => {
    event.preventDefault();
    const { name, email, password, locationId } = formData;
    if (!name || !email || !password || !locationId) {
      toast.error('Name, email, password, and location are required');
      return;
    }
    try {
      const res = await axios.post('/admin/users', formData);
      toast.success('Employee created');
      setFormData(emptyForm);
      setShowAdd(false);
      await fetchEmployees();
      setSelectedEmployeeId(res.data.data.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create employee');
    }
  };

  const handleAssignBusiness = async () => {
    if (!assignBusinessId || !selectedEmployeeId) return;
    try {
      await axios.post('/admin/assign', { 
        employeeId: selectedEmployeeId, 
        businessId: assignBusinessId 
      });
      toast.success('Business assigned successfully');
      fetchEmployeeDetails(selectedEmployeeId);
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to assign business');
    }
  };

  const handleUnassignBusiness = async (businessId) => {
    if (!confirm('Unassign this business from the employee?')) return;
    try {
      await axios.delete(`/admin/assign/${selectedEmployeeId}/${businessId}`);
      toast.success('Business unassigned successfully');
      fetchEmployeeDetails(selectedEmployeeId);
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to unassign business');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!confirm('Delete this employee account?')) return;
    try {
      await axios.delete(`/admin/users/${id}`);
      toast.success('Employee deleted');
      setSelectedEmployeeId('');
      await fetchEmployees();
    } catch (err) {
      toast.error('Failed to delete employee');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-content-secondary animate-pulse">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-bold text-content-primary">Employees</h1>
          <p className="mt-1 text-content-secondary">Click an employee to view details, assigned businesses, and performance analytics.</p>
        </div>
        <Button onClick={() => setShowAdd((value) => !value)}>
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      {showAdd && (
        <div className="card motion-card motion-sheen border border-brand-primary/30 bg-brand-primary/5 p-5">
          <h2 className="mb-4 text-base font-semibold text-content-primary">Create Employee Account</h2>
          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Full Name" name="name" value={formData.name} onChange={handleInputChange} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
            <Input label="Phone" name="phone" value={formData.phone} onChange={handleInputChange} />
            <Input label="Password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" required />
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2">Location</label>
              <select
                name="locationId"
                value={formData.locationId}
                onChange={handleInputChange}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-sm h-10"
                required
              >
                <option value="">Select Location...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 md:col-span-2 xl:col-span-4 mt-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit">Create Account</Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <div className="card motion-card motion-sheen overflow-hidden">
          <div className="border-b border-dark-border px-5 py-4">
            <h2 className="font-semibold text-content-primary">All Employees</h2>
          </div>
          <div className="max-h-[640px] overflow-y-auto p-3">
            {employees.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => setSelectedEmployeeId(employee.id)}
                className={cn(
                  'mb-2 w-full rounded-xl border border-dark-border p-4 text-left transition hover:border-brand-primary/50 hover:bg-brand-primary/5',
                  selectedEmployeeId === employee.id && 'border-brand-primary bg-brand-primary/10'
                )}
              >
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-content-primary truncate max-w-[150px]" title={employee.name}>{employee.name}</p>
                      <span className="inline-flex items-center text-[9px] font-bold text-brand-secondary uppercase tracking-wider bg-brand-secondary/15 px-1.5 py-0.5 rounded-md flex-shrink-0">
                        {employee.location_name || 'Bangalore'}
                      </span>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-content-secondary min-w-0">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate" title={employee.email}>{employee.email}</span>
                    </p>
                    {employee.phone && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-content-muted min-w-0">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate" title={employee.phone}>{employee.phone}</span>
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary flex-shrink-0 whitespace-nowrap">
                    {employee.assignedBusinesses || 0} {employee.assignedBusinesses === 1 ? 'business' : 'businesses'}
                  </span>
                </div>
              </button>
            ))}
            {employees.length === 0 && <p className="p-5 text-center text-content-muted">No active employees found.</p>}
          </div>
        </div>

        {selectedEmployee ? (
          <div className="space-y-5">
            <div className="card motion-card motion-sheen p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Employee Details</p>
                  <h2 className="mt-1 text-lg font-bold text-content-primary">{selectedEmployee.name}</h2>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-content-secondary">
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> {selectedEmployee.email}</span>
                    {selectedEmployee.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" /> {selectedEmployee.phone}</span>}
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-secondary" /> {selectedEmployee.location_name || 'Bangalore'}</span>
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {new Date(selectedEmployee.created_at).toLocaleDateString()}</span>
                    <span className="inline-flex items-center gap-1.5"><Shield className="h-4 w-4" /> Employee</span>
                  </div>
                </div>
                <Button variant="danger" onClick={() => handleDeleteEmployee(selectedEmployee.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>

            <div className="card motion-card motion-sheen overflow-hidden">
              <div className="border-b border-dark-border px-5 py-4">
                <h3 className="flex items-center gap-2 font-semibold text-content-primary"><Briefcase className="h-4 w-4 text-brand-primary" /> Assigned Businesses</h3>
              </div>
              
              <div className="p-4 border-b border-dark-border/50 bg-dark-bg/20 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-content-muted">Assign Business</label>
                  <select 
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:border-brand-primary text-sm h-10 transition-colors" 
                    value={assignBusinessId} 
                    onChange={(e) => setAssignBusinessId(e.target.value)}
                  >
                    <option value="">Select business to assign...</option>
                    {unassignedBusinesses.map((biz) => (
                      <option key={biz.id} value={biz.id}>{biz.business_name}</option>
                    ))}
                  </select>
                </div>
                <Button 
                  onClick={handleAssignBusiness} 
                  disabled={!assignBusinessId}
                  className="h-10 px-6 font-bold"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Assign
                </Button>
              </div>

              {detailLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Business</Th>
                      <Th>Description</Th>
                      <Th>Created</Th>
                      <Th className="text-right">Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {assignedBusinesses.map((business) => (
                      <Tr key={business.id}>
                        <Td className="font-semibold text-content-primary">{business.business_name}</Td>
                        <Td>{business.description || '-'}</Td>
                        <Td>{new Date(business.created_at).toLocaleDateString()}</Td>
                        <Td className="text-right">
                          <button 
                            onClick={() => handleUnassignBusiness(business.id)} 
                            className="text-content-muted hover:text-brand-danger transition-colors p-1"
                            title="Unassign Business"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </Td>
                      </Tr>
                    ))}
                    {assignedBusinesses.length === 0 && <Tr><Td colSpan={4} className="py-8 text-center text-content-muted">No businesses assigned.</Td></Tr>}
                  </Tbody>
                </Table>
              )}
            </div>

            <PerformanceAnalytics
              title={`${selectedEmployee.name}'s Performance`}
              employees={employees}
              businesses={businesses}
              initialEmployeeId={selectedEmployee.id}
              lockEmployee
              summaryLabel="Employee Business Summary"
            />
          </div>
        ) : (
          <div className="card motion-card motion-sheen flex min-h-[320px] items-center justify-center p-5 text-center text-content-muted">
            Select an employee to view details and performance.
          </div>
        )}
      </div>
    </div>
  );
};

export default Employees;




