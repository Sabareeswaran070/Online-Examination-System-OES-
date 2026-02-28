import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/common/Button.jsx';
import Input from '@/components/common/Input.jsx';
import { USER_ROLES } from '../../config/constants';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData);
    setLoading(false);

    if (result.success) {
      const role = result.user.role;
      // Navigate based on role
      switch (role) {
        case USER_ROLES.SUPER_ADMIN:
          navigate('/super-admin/dashboard');
          break;
        case USER_ROLES.ADMIN:
          navigate('/admin/dashboard');
          break;
        case USER_ROLES.DEPT_HEAD:
          navigate('/dept-head/dashboard');
          break;
        case USER_ROLES.FACULTY:
          navigate('/faculty/dashboard');
          break;
        case USER_ROLES.STUDENT:
          navigate('/student/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-block h-16 w-16 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">E</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />

          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Register here
            </Link>
          </p>
        </div>

        {/* Quick Login Credentials for Testing 
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-semibold mb-2">Demo Credentials:</p>
          <p className="text-xs text-gray-500">Super Admin: superadmin@system.com / SuperAdmin@123</p>
        </div>
        */}
      </div>
    </div>
  );
};

export default Login;
