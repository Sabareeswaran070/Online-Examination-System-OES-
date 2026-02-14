import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSearch } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';

const Users = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    collegeId: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, filters]);

  const fetchInitialData = async () => {
    try {
      const collegesRes = await superAdminService.getColleges({ limit: 100 });
      setColleges(collegesRes.data || []);
    } catch (error) {
      console.error('Fetch initial data error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = {
        search: searchTerm,
        ...filters,
      };
      const response = await superAdminService.getUsers(params);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        // For updates, we often don't want to send the password unless it's being changed
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;

        await superAdminService.updateUser(selectedUser._id, updateData);
        toast.success('User updated successfully');
      } else {
        await superAdminService.createUser(formData);
        toast.success('User created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Save user error:', error);
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student',
      collegeId: '',
    });
    setIsEditing(false);
    setSelectedUser(null);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Leave blank for edit
      role: user.role,
      collegeId: user.collegeId?._id || user.collegeId || '',
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await superAdminService.deleteUser(id);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        console.error('Delete user error:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await superAdminService.updateUserStatus(user._id, nextStatus);
      toast.success(`User status updated to ${nextStatus}`);
      fetchUsers();
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Failed to update status');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      superadmin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      depthead: 'bg-green-100 text-green-800',
      faculty: 'bg-yellow-100 text-yellow-800',
      student: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div className="font-medium text-gray-900">{row.name}</div>
      )
    },
    { header: 'Email', accessor: 'email' },
    {
      header: 'College',
      render: (row) => (
        <div className="text-sm text-gray-600">
          {row.collegeId?.collegeName || '-'}
        </div>
      )
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(row.role)}`}>
          {row.role}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${row.status === 'active'
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
        >
          {row.status}
        </button>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit User"
          >
            <FiEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete User"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage all system users</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <FiPlus className="mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white min-w-[150px]"
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          >
            <option value="">All Roles</option>
            <option value="admin">College Admin</option>
            <option value="depthead">Dept Head</option>
            <option value="faculty">Faculty</option>
            <option value="student">Student</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <Table columns={columns} data={users} emptyMessage="No users found" />
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Edit User' : 'Create New User'}
      >
        <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="John Doe"
          />
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="john@example.com"
          />
          <Input
            label={isEditing ? "Password (Leave blank to keep current)" : "Password"}
            type="password"
            name="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!isEditing}
            placeholder="••••••••"
            minLength={6}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="depthead">Department Head</option>
                <option value="admin">College Admin</option>
                {isEditing && selectedUser?.role === 'superadmin' && (
                  <option value="superadmin">Super Admin</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                College {formData.role !== 'superadmin' && <span className="text-red-500">*</span>}
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                value={formData.collegeId}
                onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
                required={formData.role !== 'superadmin'}
              >
                <option value="">Select College</option>
                {colleges.map((college) => (
                  <option key={college._id} value={college._id}>
                    {college.collegeName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
