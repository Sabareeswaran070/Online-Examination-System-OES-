import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiUpload, FiDownload, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    collegeId: '',
    regNo: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on search/filter change
  }, [searchTerm, filters]);

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, filters, currentPage, limit]);

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
        page: currentPage,
        limit: limit,
        ...filters,
      };
      const response = await superAdminService.getUsers(params);
      setUsers(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalUsers(response.count || 0);
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
        if (!updateData.collegeId) delete updateData.collegeId;
        if (!updateData.regNo) delete updateData.regNo;

        await superAdminService.updateUser(selectedUser._id, updateData);
        toast.success('User updated successfully');
      } else {
        const createData = { ...formData };
        if (!createData.collegeId) delete createData.collegeId;
        if (!createData.regNo) delete createData.regNo;

        await superAdminService.createUser(createData);
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

  // Open reset password modal
  const openResetPasswordModal = (user) => {
    setSelectedUser(user);
    setResetPasswordData({ newPassword: '', confirmPassword: '' });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowResetPasswordModal(true);
  };

  // Reset password for user (admin)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const { newPassword, confirmPassword } = resetPasswordData;

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setResetSubmitting(true);
    try {
      await superAdminService.resetUserPassword(selectedUser._id, {
        newPassword,
        confirmPassword,
      });
      toast.success('Password reset successfully');
      setShowResetPasswordModal(false);
      setResetPasswordData({ newPassword: '', confirmPassword: '' });
      setSelectedUser(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student',
      collegeId: '',
      regNo: '',
    });
    setIsEditing(false);
    setSelectedUser(null);
  };

  const handleEdit = (user) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't show password
      role: user.role,
      collegeId: user.collegeId?._id || user.collegeId || '',
      regNo: user.regNo || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await superAdminService.deleteUser(id);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        console.error('Delete user error:', error);
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await superAdminService.updateUserStatus(user._id, newStatus);
      toast.success(`User is now ${newStatus}`);
      fetchUsers();
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Failed to update user status');
    }
  };

  const downloadTemplate = () => {
    const csvContent = "name,email,password,role,collegeId,regNo\nJohn Doe,john@example.com,password123,student,65d1a2b3c4d5e6f7a8b9c0d1,REG123";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "user_import_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: basic file type validation
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExt)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setLoading(true);
    try {
      const response = await superAdminService.bulkUploadUsers(file);
      setBulkResults(response);
      setShowResultsModal(true);
      fetchUsers();
      toast.success('Bulk upload processed successfully');
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error(error.response?.data?.message || 'Bulk upload failed');
    } finally {
      setLoading(false);
      e.target.value = ''; // Clear input for next upload
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

  const columns = useMemo(() => [
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
          <button
            onClick={() => openResetPasswordModal(row)}
            className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
            title="Reset Password"
          >
            <FiLock size={16} />
          </button>
        </div>
      ),
    },
  ], [users, handleToggleStatus, handleEdit, handleDelete, openResetPasswordModal]);

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage all system users</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            onClick={() => downloadTemplate()}
            className="flex-1 sm:flex-none"
          >
            <FiDownload className="mr-2" />
            Template
          </Button>
          <div className="relative flex-1 sm:flex-none">
            <input
              type="file"
              id="bulk-user-upload"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleBulkUpload(e)}
            />
            <Button
              variant="secondary"
              onClick={() => document.getElementById('bulk-user-upload').click()}
              className="w-full"
            >
              <FiUpload className="mr-2" />
              Import
            </Button>
          </div>
          <Button onClick={() => setShowModal(true)} className="flex-1 sm:flex-none">
            <FiPlus className="mr-2" />
            Create User
          </Button>
        </div>
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

        {/* Pagination and Row Limit Selection */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 order-2 sm:order-1">
            Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * limit, totalUsers)}
            </span>{' '}
            of <span className="font-medium">{totalUsers}</span> users
          </div>

          <div className="flex flex-wrap items-center gap-4 order-1 sm:order-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[10, 25, 50, 100, 500, 1000].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-700">Page</span>
                <span className="bg-primary-50 text-primary-700 px-2 py-1 rounded text-sm font-bold min-w-[2rem] text-center">
                  {currentPage}
                </span>
                <span className="text-sm font-medium text-gray-700">of {totalPages}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
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

          {formData.role === 'student' && (
            <Input
              label="Reg No (Registration Number)"
              name="regNo"
              value={formData.regNo}
              onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
              placeholder="REG2024001"
            />
          )}

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

      <Modal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        title="Bulk Upload Results"
      >
        {bulkResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-600 font-medium uppercase">Total</p>
                <p className="text-2xl font-bold text-blue-800">{bulkResults.summary?.total || 0}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xs text-green-600 font-medium uppercase">Success</p>
                <p className="text-2xl font-bold text-green-800">{bulkResults.summary?.created || 0}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-600 font-medium uppercase">Failed</p>
                <p className="text-2xl font-bold text-red-800">{bulkResults.summary?.failed || 0}</p>
              </div>
            </div>

            {bulkResults.errors && bulkResults.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Error Details</h4>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User/Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkResults.errors.map((error, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 border-r">{error.user}</td>
                          <td className="px-4 py-2 text-sm text-red-600">{error.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button onClick={() => setShowResultsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        title={`Reset Password — ${selectedUser?.name || ''}`}
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> You are resetting the password for <span className="font-semibold">{selectedUser?.email}</span>. The user will need to use the new password to log in.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter new password"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={resetPasswordData.confirmPassword}
                onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Confirm new password"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {resetPasswordData.confirmPassword && resetPasswordData.newPassword !== resetPasswordData.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowResetPasswordModal(false)}
              disabled={resetSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={resetSubmitting || !resetPasswordData.newPassword || !resetPasswordData.confirmPassword || resetPasswordData.newPassword !== resetPasswordData.confirmPassword}
            >
              {resetSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
