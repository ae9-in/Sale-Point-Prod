import { useEffect, useState } from 'react';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import toast from 'react-hot-toast';
import { 
  Check, KeyRound, MessageSquare, Plus, Trash2, UserCog, X,
  User, Mail, Phone, Shield, Lock, Users, AlertCircle, Clock, CheckCircle2
} from 'lucide-react';
import { cn } from '../../utils/cn';

const emptyEmployee = { name: '', email: '', phone: '', password: '' };

const AdminProfile = () => {
  const { user, setAuth, token } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  
  const [employees, setEmployees] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [adminPasswords, setAdminPasswords] = useState({});
  const [responses, setResponses] = useState({});
  
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
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
      toast.error('Failed to load management data');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.put('/auth/profile', formData);
      setAuth(res.data.data, token);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    try {
      setPassLoading(true);
      await axios.put('/auth/change-password', passwords);
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!employeeForm.name || !employeeForm.email || !employeeForm.password) {
      return toast.error('Required fields missing');
    }
    try {
      await axios.post('/admin/users', employeeForm);
      toast.success('Employee created');
      setEmployeeForm(emptyEmployee);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.patch(`/admin/users/${id}/approve`);
      toast.success('Approved');
      fetchAdminData();
    } catch (err) { toast.error('Error'); }
  };

  const handleReject = async (id) => {
    try {
      await axios.patch(`/admin/users/${id}/reject`);
      toast.success('Rejected');
      fetchAdminData();
    } catch (err) { toast.error('Error'); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete user?')) return;
    try {
      await axios.delete(`/admin/users/${id}`);
      toast.success('Deleted');
      fetchAdminData();
    } catch (err) { toast.error('Error'); }
  };

  const handleUserPasswordReset = async (id) => {
    const pwd = adminPasswords[id];
    if (!pwd || pwd.length < 6) return toast.error('Min 6 characters');
    try {
      await axios.patch(`/admin/users/${id}/password`, { password: pwd });
      toast.success('Password reset');
      setAdminPasswords({...adminPasswords, [id]: ''});
    } catch (err) { toast.error('Error'); }
  };

  const handleResolveDoubt = async (id) => {
    try {
      await axios.patch(`/doubts/${id}/resolve`, { response: responses[id] || '' });
      toast.success('Resolved');
      fetchAdminData();
    } catch (err) { toast.error('Error'); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10 px-1 lg:px-0">
      {/* Branded Header */}
      <div className="flex items-center gap-4 px-1">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-2xl text-white font-bold shadow-xl shadow-brand-primary/20">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-content-primary">Admin Control Center</h1>
          <p className="text-xs text-content-muted flex items-center gap-1.5 mt-0.5 capitalize">
            <Shield size={12} className="text-brand-primary" /> Management Account
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Admin Profile & Security */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card">
            <h3 className="text-sm font-bold text-content-primary mb-4 flex items-center gap-2">
              <User size={16} className="text-brand-primary" /> My Profile
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input label="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <div>
                <Input label="Email Address" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                <p className="text-[10px] text-content-muted mt-1 italic">Updating your email address changes your login credential.</p>
              </div>
              <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              <Button type="submit" isLoading={loading} className="w-full">Update Details</Button>
            </form>
          </div>

          <div className="card">
            <h3 className="text-sm font-bold text-content-primary mb-4 flex items-center gap-2">
              <Lock size={16} className="text-brand-warning" /> Security
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input label="Current Password" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})} />
              <Input label="New Password" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} />
              <Input label="Confirm New" type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} />
              <Button type="submit" variant="secondary" isLoading={passLoading} className="w-full">Change Password</Button>
            </form>
          </div>

          <div className="card border-brand-primary/10 bg-brand-primary/[0.02]">
            <h3 className="text-sm font-bold text-content-primary mb-4 flex items-center gap-2">
              <Plus size={16} className="text-brand-primary" /> Create Employee
            </h3>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <Input label="Full Name" value={employeeForm.name} onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})} />
              <Input label="Email" type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})} />
              <Input label="Password" type="password" value={employeeForm.password} onChange={(e) => setEmployeeForm({...employeeForm, password: e.target.value})} placeholder="••••••••" />
              <Button type="submit" className="w-full">Create User</Button>
            </form>
          </div>
        </div>

        {/* Right Column: Management Tables */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card border-brand-primary/20 bg-brand-primary/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-1">Active Employees</div>
              <p className="text-2xl font-black text-content-primary">{employees.length}</p>
            </div>
            <div className="card border-brand-warning/20 bg-brand-warning/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand-warning mb-1">Pending</div>
              <p className="text-2xl font-black text-content-primary">{pendingUsers.length}</p>
            </div>
            <div className="card border-brand-secondary/20 bg-brand-secondary/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary mb-1">Open Queries</div>
              <p className="text-2xl font-black text-content-primary">{doubts.filter(d => d.status !== 'RESOLVED').length}</p>
            </div>
          </div>

          {/* Dedicated Approvals Section */}
          <div id="approvals" className="card border-brand-warning/20 overflow-hidden px-0 py-0 shadow-lg shadow-brand-warning/5">
            <div className="px-5 py-3 border-b border-dark-border bg-brand-warning/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-brand-warning" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">Account Approvals</h3>
              </div>
              <span className="text-[10px] font-black bg-brand-warning/20 text-brand-warning px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
            </div>
            {pendingUsers.length > 0 ? (
              <Table>
                <Tbody>
                  {pendingUsers.map(u => (
                    <Tr key={u.id}>
                      <Td><p className="font-bold text-content-primary text-xs">{u.name}</p><p className="text-[10px] text-content-muted">{u.email}</p></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleReject(u.id)} className="p-1.5 rounded-lg text-content-muted hover:bg-brand-danger/10 hover:text-brand-danger transition-colors"><X size={16} /></button>
                          <button onClick={() => handleApprove(u.id)} className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-primary/10 transition-colors"><Check size={16} /></button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <div className="p-8 text-center bg-dark-bg/20">
                <CheckCircle2 size={24} className="mx-auto text-brand-success/30 mb-2" />
                <p className="text-[11px] text-content-muted font-medium">All registration requests cleared</p>
              </div>
            )}
          </div>

          {/* User Management */}
          <div className="card overflow-hidden px-0 py-0">
            <div className="px-5 py-3 border-b border-dark-border bg-dark-bg/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
                <UserCog size={14} className="text-brand-primary" /> Active Users
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <Thead><Tr><Th className="text-[10px]">Employee</Th><Th className="text-[10px]">Reset Pwd</Th><Th className="text-right text-[10px]">Action</Th></Tr></Thead>
                <Tbody>
                  {employees.map(e => (
                    <Tr key={e.id}>
                      <Td><p className="font-bold text-content-primary text-xs">{e.name}</p><p className="text-[10px] text-content-muted">{e.email}</p></Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <input 
                            type="password" 
                            className="bg-dark-bg border border-dark-border rounded px-2 py-1 text-[11px] w-24 focus:border-brand-primary outline-none"
                            placeholder="New..."
                            value={adminPasswords[e.id] || ''}
                            onChange={v => setAdminPasswords({...adminPasswords, [e.id]: v.target.value})}
                          />
                          <button onClick={() => handleUserPasswordReset(e.id)} className="text-brand-primary hover:scale-110 transition-transform"><KeyRound size={14}/></button>
                        </div>
                      </Td>
                      <Td className="text-right">
                        <button onClick={() => handleDeleteUser(e.id)} className="text-content-muted hover:text-brand-danger p-1"><Trash2 size={14}/></button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>

          {/* Queries */}
          <div className="card overflow-hidden px-0 py-0">
            <div className="px-5 py-3 border-b border-dark-border bg-dark-bg/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
                <MessageSquare size={14} className="text-brand-primary" /> Support Queries
              </h3>
            </div>
            <div className="divide-y divide-dark-border">
              {doubts.map(d => (
                <div key={d.id} className="p-4 bg-dark-bg/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-content-primary">{d.employee_name}</p>
                      <p className="text-[10px] text-brand-primary font-medium">{d.business_name}</p>
                    </div>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                      d.status === 'RESOLVED' ? "bg-brand-success/10 text-brand-success" : "bg-brand-warning/10 text-brand-warning"
                    )}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-content-secondary bg-dark-bg p-2 rounded-lg mb-3 border border-dark-border/50">{d.question}</p>
                  {d.status !== 'RESOLVED' && (
                    <div className="flex gap-2">
                      <input 
                        className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-primary"
                        placeholder="Type response..."
                        value={responses[d.id] || ''}
                        onChange={v => setResponses({...responses, [d.id]: v.target.value})}
                      />
                      <Button className="h-8 text-xs px-4" onClick={() => handleResolveDoubt(d.id)}>Reply</Button>
                    </div>
                  )}
                  {d.status === 'RESOLVED' && d.response && (
                    <p className="text-[11px] text-content-muted italic pl-2 border-l-2 border-brand-success/30 ml-1">Resp: {d.response}</p>
                  )}
                </div>
              ))}
              {doubts.length === 0 && <p className="p-10 text-center text-xs text-content-muted">No queries to show</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
