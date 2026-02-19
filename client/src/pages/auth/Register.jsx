import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/common/Button.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import { USER_ROLES } from '../../config/constants';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    regNo: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);
    setLoading(false);

    if (result.success) {
      navigate('/login');
    }
  };

  const roleOptions = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-block h-16 w-16 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">E</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join the examination system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />

          <Select
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={roleOptions}
            required
          />

          {formData.role === 'student' && (
            <Input
              label="Reg No (Registration Number)"
              type="text"
              name="regNo"
              value={formData.regNo}
              onChange={handleChange}
              placeholder="Enter your registration number"
            />
          )}

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            error={errors.password}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
            required
          />

          <Button type="submit" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
