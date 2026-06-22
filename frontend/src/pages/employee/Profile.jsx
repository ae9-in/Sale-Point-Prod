import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Shield, Lock, CheckCircle2, Target, Clock, MapPin } from 'lucide-react';

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${m} ${ampm}`;
};

const getShiftString = (user) => {
  const start = formatTime(user?.shift_start || '09:30:00');
  const end = formatTime(user?.shift_end || '19:00:00');
  return `${start} - ${end}`;
};

const EmployeeProfile = () => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [stats, setData] = useState({ targets: [], nextTiming: null });

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const [targetsRes, bizRes] = await Promise.all([
        axios.get('/targets/my-targets'),
        axios.get('/employee/businesses')
      ]);
      
      // Calculate next timing logic
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      let soonest = null;
      
      bizRes.data.data.forEach(biz => {
        biz.timings?.forEach(t => {
          const [time, ampm] = t.timing_name.split(' ');
          let [h, m] = time.split(':').map(Number);
          if (ampm === 'PM' && h !== 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          const tMin = h * 60 + m;
          if (tMin > currentMin && (!soonest || tMin < soonest.min)) {
            soonest = { min: tMin, name: t.timing_name, biz: biz.business_name };
          }
        });
      });

      setData({ targets: targetsRes.data.data.slice(0, 3), nextTiming: soonest });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put('/auth/profile', formData);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4 px-1">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-2xl text-white font-bold shadow-xl shadow-brand-primary/20">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-content-primary">{user?.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-content-muted flex items-center gap-1.5 capitalize">
              <Shield size={12} className="text-brand-primary" /> {user?.role?.toLowerCase().replace('_', ' ')}
            </p>
            {user?.location_name && (
              <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin size={10} /> {user.location_name}
              </span>
            )}
            {user && (
              <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock size={10} /> Shift: {getShiftString(user)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Reminders & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-brand-primary/20 bg-brand-primary/5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">
                <Clock size={12} /> Next Submission
              </div>
              {stats.nextTiming ? (
                <div>
                  <p className="text-lg font-bold text-content-primary">{stats.nextTiming.name}</p>
                  <p className="text-[11px] text-content-secondary truncate">{stats.nextTiming.biz}</p>
                </div>
              ) : (
                <p className="text-sm font-medium text-content-muted">No more for today</p>
              )}
            </div>
            <div className="card border-brand-secondary/20 bg-brand-secondary/5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-secondary mb-2">
                <Target size={12} /> Active Targets
              </div>
              <p className="text-lg font-bold text-content-primary">{stats.targets.length}</p>
              <p className="text-[11px] text-content-secondary truncate">Across assigned businesses</p>
            </div>
          </div>

          {/* Profile Form */}
          <div className="card">
            <h3 className="text-sm font-bold text-content-primary mb-4 flex items-center gap-2">
              <User size={16} className="text-brand-primary" /> Personal Information
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <div>
                  <Input label="Email Address" type="email" value={formData.email} disabled className="opacity-70 cursor-not-allowed" />
                  <p className="text-[10px] text-content-muted mt-1 italic">Contact admin to change primary email identity.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                <Input label="Location" value={user?.location_name || 'Not assigned'} disabled className="opacity-70 cursor-not-allowed" />
              </div>
              <Button type="submit" isLoading={loading} className="w-full sm:w-auto">Update Profile</Button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card">
            <h3 className="text-sm font-bold text-content-primary mb-4 flex items-center gap-2">
              <Lock size={16} className="text-brand-warning" /> Security
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input label="Current Password" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="New Password" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} />
                <Input label="Confirm New Password" type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} />
              </div>
              <Button type="submit" variant="secondary" isLoading={passLoading} className="w-full sm:w-auto">Change Password</Button>
            </form>
          </div>
        </div>

        {/* Sidebar Sidebar - Targets */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-bold text-content-primary mb-4">Priority Targets</h3>
            <div className="space-y-4">
              {stats.targets.map(t => (
                <div key={t.id} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-content-primary truncate mr-2">{t.target_name}</span>
                    <span className="text-content-muted font-mono">{t.current_value}/{t.target_value}</span>
                  </div>
                  <div className="progress-track h-1.5">
                    <div 
                      className="progress-fill bg-brand-primary" 
                      style={{ width: `${Math.min(100, (t.current_value/t.target_value)*100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats.targets.length === 0 && <p className="text-xs text-content-muted italic text-center py-4">No active targets found</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
