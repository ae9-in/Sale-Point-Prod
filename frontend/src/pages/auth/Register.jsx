import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ThemeToggle from '../../components/layout/ThemeToggle';

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  locationId: z.string().min(1, 'Location is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [locations, setLocations] = useState([]);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/locations`);
        setLocations(res.data.data);
      } catch (err) {
        toast.error('Failed to load locations');
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, data);
      setIsSuccess(true);
      toast.success('Registration successful!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="card w-full max-w-md p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-brand-secondary/20 text-brand-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-content-primary">Registration Complete</h2>
          <p className="text-content-secondary">
            Your account is currently pending admin approval. You will be able to log in once an admin approves your account.
          </p>
          <div className="pt-4">
            <Button onClick={() => navigate('/login')} className="w-full">
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
          Sale Point
        </h1>
        <p className="text-content-secondary mt-2">Create a new employee account</p>
      </div>

      <div className="card w-full max-w-md p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="Full Name" 
            placeholder="John Doe"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input 
            label="Email" 
            type="email" 
            placeholder="name@company.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input 
            label="Phone" 
            placeholder="1234567890"
            {...register('phone')}
            error={errors.phone?.message}
          />
          
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider mb-1">Location</label>
            <select 
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-sm"
              {...register('locationId')}
              required
            >
              <option value="">Select your location...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            {errors.locationId && (
              <p className="text-xs text-brand-danger mt-1">{errors.locationId.message}</p>
            )}
          </div>
          
          <div className="relative">
            <Input 
              label="Password" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-content-muted hover:text-content-primary"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Input 
            label="Confirm Password" 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />

          <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-content-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-primary hover:text-brand-primaryLight font-medium transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

