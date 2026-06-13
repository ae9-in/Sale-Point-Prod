import { useEffect, useState } from 'react';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import toast from 'react-hot-toast';
import { Check, KeyRound, MessageSquare, Plus, Trash2, UserCog, X } from 'lucide-react';

const emptyEmployee = { name: '', email: '', phone: '', password: '' };

const AdminProfile = () => {
  const { user, setAuth, token } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '' });
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [employees, setEmployees] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [passwords, setPasswords] = useState({});
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        password: '',
      });
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setDataLoading(true);
      const [employeesRes, pendingRes, doubtsRes] = await Promise.all([
        axios.get('/admin/users?status=APPROVED'),
        axios.get('/admin/users?status=PENDING'),
        axios.get('/doubts')
      ]);
      setEmployees(employeesRes.data.data);
      setPendingUsers(pendingRes.data.data);
      setDoubts(doubtsRes.data.data);
    } catch (err) {
      toast.error('Failed to load admin management data');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const handleProfileChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleEmployeeChange = (event) => {
    setEmployeeForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const res = await axios.put('/auth/profile', formData);
      setAuth(res.data.data, token);
      toast.success('Profile updated');
      setFormData((previous) => ({ ...previous, password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    if (!employeeForm.name || !employeeForm.email || !employeeForm.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    try {
      await axios.post('/admin/users', employeeForm);
      toast.success('Employee account created');
      setEmployeeForm(emptyEmployee);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create employee');
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.patch(`/admin/users/${id}/approve`);
      toast.success('Registration approved');
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.patch(`/admin/users/${id}/reject`);
      toast.success('Registration rejected');
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to reject user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user account?')) return;
    try {
      await axios.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const handlePasswordReset = async (id) => {
    const password = passwords[id];
    if (!password || password.length < 6) {
      toast.error('Enter a password with at least 6 characters');
      return;
    }
    try {
      await axios.patch(`/admin/users/${id}/password`, { password });
      toast.success('Password updated');
      setPasswords((previous) => ({ ...previous, [id]: '' }));
    } catch (err) {
      toast.error('Failed to update password');
    }
  };

  const handleResolveDoubt = async (id) => {
    try {
      await axios.patch(`/doubts/${id}/resolve`, { response: responses[id] || '' });
      toast.success('Query marked resolved');
      setResponses((previous) => ({ ...previous, [id]: '' }));
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to resolve query');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-content-primary">Profile Settings</h1>
        <p className="mt-1 text-content-secondary">Manage admin account, employee accounts, approvals, and employee queries.</p>
      </div>

      <div className="card motion-card motion-sheen p-5 md:p-5">
        <h2 className="mb-4 text-base font-semibold text-content-primary">Admin Account Settings</h2>
        <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input label="Full Name" name="name" value={formData.name} onChange={handleProfileChange} required />
          <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleProfileChange} required />
          <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleProfileChange} required />
          <Input label="New Password" name="password" type="password" placeholder="Leave blank to keep current password" value={formData.password} onChange={handleProfileChange} />
          <div className="md:col-span-2"><Button type="submit" isLoading={loading}>Save Changes</Button></div>
        </form>
      </div>

      <div className="card motion-card motion-sheen p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-content-primary"><Plus className="h-4 w-4 text-brand-primary" /> Create Employee Account</h2>
        <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Full Name" name="name" value={employeeForm.name} onChange={handleEmployeeChange} required />
          <Input label="Email" name="email" type="email" value={employeeForm.email} onChange={handleEmployeeChange} required />
          <Input label="Phone" name="phone" value={employeeForm.phone} onChange={handleEmployeeChange} />
          <Input label="Password" name="password" type="password" value={employeeForm.password} onChange={handleEmployeeChange} placeholder="••••••••" required />
          <div className="md:col-span-2 xl:col-span-4"><Button type="submit">Create User</Button></div>
        </form>
      </div>

      {dataLoading ? (
        <div className="flex h-64 w-full flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-content-secondary animate-pulse">Loading management data...</p>
        </div>
      ) : (
        <>
          <div className="card motion-card motion-sheen overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4">
              <h2 className="font-semibold text-content-primary">Account Approvals</h2>
            </div>
            <Table>
              <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Requested</Th><Th className="text-right">Action</Th></Tr></Thead>
              <Tbody>
                {pendingUsers.map((pending) => (
                  <Tr key={pending.id}>
                    <Td className="font-semibold text-content-primary">{pending.name}</Td>
                    <Td>{pending.email}</Td>
                    <Td>{pending.phone || '-'}</Td>
                    <Td>{new Date(pending.created_at).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => handleReject(pending.id)}><X className="mr-1 h-4 w-4" /> Reject</Button>
                        <Button onClick={() => handleApprove(pending.id)}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {pendingUsers.length === 0 && <Tr><Td colSpan={5} className="py-8 text-center text-content-muted">No pending approvals.</Td></Tr>}
              </Tbody>
            </Table>
          </div>

          <div className="card motion-card motion-sheen overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-content-primary"><UserCog className="h-4 w-4 text-brand-primary" /> User Management</h2>
            </div>
            <Table>
              <Thead><Tr><Th>User</Th><Th>Assigned</Th><Th>Reset Password</Th><Th className="text-right">Delete</Th></Tr></Thead>
              <Tbody>
                {employees.map((employee) => (
                  <Tr key={employee.id}>
                    <Td><p className="font-semibold text-content-primary">{employee.name}</p><p className="text-xs text-content-muted">{employee.email}</p></Td>
                    <Td>{employee.assignedBusinesses || 0} businesses</Td>
                    <Td>
                      <div className="flex max-w-md gap-2">
                        <Input type="password" value={passwords[employee.id] || ''} onChange={(event) => setPasswords((previous) => ({ ...previous, [employee.id]: event.target.value }))} placeholder="New password" />
                        <Button type="button" variant="secondary" onClick={() => handlePasswordReset(employee.id)}><KeyRound className="h-4 w-4" /></Button>
                      </div>
                    </Td>
                    <Td className="text-right"><button className="text-content-muted hover:text-brand-danger" onClick={() => handleDeleteUser(employee.id)}><Trash2 className="h-4 w-4" /></button></Td>
                  </Tr>
                ))}
                {employees.length === 0 && <Tr><Td colSpan={4} className="py-8 text-center text-content-muted">No users found.</Td></Tr>}
              </Tbody>
            </Table>
          </div>

          <div className="card motion-card motion-sheen overflow-hidden">
            <div className="border-b border-dark-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-content-primary"><MessageSquare className="h-4 w-4 text-brand-primary" /> Employee Queries</h2>
            </div>
            <Table>
              <Thead><Tr><Th>Employee</Th><Th>Business</Th><Th>Query</Th><Th>Status</Th><Th>Response</Th></Tr></Thead>
              <Tbody>
                {doubts.map((doubt) => (
                  <Tr key={doubt.id}>
                    <Td className="font-semibold text-content-primary">{doubt.employee_name}</Td>
                    <Td>{doubt.business_name}</Td>
                    <Td>{doubt.question}</Td>
                    <Td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${doubt.status === 'RESOLVED' ? 'bg-brand-success/15 text-brand-success' : 'bg-brand-warning/15 text-brand-warning'}`}>{doubt.status}</span></Td>
                    <Td>
                      {doubt.status === 'RESOLVED' ? (
                        <span className="text-content-secondary">{doubt.response || 'Resolved'}</span>
                      ) : (
                        <div className="flex min-w-[280px] gap-2">
                          <Input value={responses[doubt.id] || ''} onChange={(event) => setResponses((previous) => ({ ...previous, [doubt.id]: event.target.value }))} placeholder="Optional response" />
                          <Button type="button" onClick={() => handleResolveDoubt(doubt.id)}>Resolve</Button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
                {doubts.length === 0 && <Tr><Td colSpan={5} className="py-8 text-center text-content-muted">No employee queries yet.</Td></Tr>}
              </Tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminProfile;




