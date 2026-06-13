import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const EmployeeProfile = () => {
  const { user, setAuth, token } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.put('/auth/profile', formData);
      setAuth(res.data.data, token);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">My Profile</h1>
        <p className="text-content-secondary mt-1">Update your personal information.</p>
      </div>

      <div className="card p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Full Name" 
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <Input 
            label="Phone Number" 
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          
          <div className="pt-4 mt-4 border-t border-dark-border">
            <h3 className="text-sm font-medium text-content-secondary mb-4">Account Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-content-muted mb-1">Email Address (Login ID)</label>
                <div className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-content-secondary cursor-not-allowed">
                  {user?.email}
                </div>
                <p className="text-xs text-content-muted mt-1">Please contact your administrator to change your email or password.</p>
              </div>
            </div>
          </div>
          
          <Button type="submit" isLoading={loading}>
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
};

export default EmployeeProfile;
