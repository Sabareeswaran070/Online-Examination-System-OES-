import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiLock, FiEdit2, FiCamera, FiBook } from 'react-icons/fi';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import { formatRoleName } from '@/utils/helpers';
import { API_URL } from '@/config/constants';

const Profile = () => {
  const { user, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const getProfileImageUrl = () => {
    if (user?.profileImage) {
      if (user.profileImage.startsWith('http')) return user.profileImage;
      // Depending on API_URL structure, construct the full image URL.
      const baseUrl = API_URL.replace('/api', '');
      return `${baseUrl}${user.profileImage}`;
    }
    return null;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await authService.updateProfile(formData);
      // Update local context user with new data
      updateUser(res.data);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully');
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Please upload an image file');
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Image size must be less than 5MB');
    }

    const uploadData = new FormData();
    uploadData.append('profileImage', file);

    try {
      setIsUploading(true);
      const res = await authService.uploadProfileImage(uploadData);
      
      // Update local user in AuthContext to instantly reflect image
      const updatedUser = { ...user, profileImage: res.data.profileImage };
      updateUser(updatedUser);
      
      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Role-specific renderer
  const renderRoleSpecificDetails = () => {
    switch (user?.role) {
      case 'student':
        return (
          <>
            <DetailItem icon={<FiBook />} label="Enrolled Department" value={user.departmentId?.name || 'Unassigned'} />
            <DetailItem icon={<FiBook />} label="Registration Number" value={user.regNo || 'Not Provided'} />
          </>
        );
      case 'faculty':
      case 'depthead':
        return (
          <>
            <DetailItem icon={<FiBriefcase />} label="Department" value={user.departmentId?.name || 'Unassigned'} />
            <DetailItem icon={<FiUser />} label="Employee ID" value={user.employeeId || 'Not Provided'} />
          </>
        );
      case 'admin':
        return (
          <>
            <DetailItem icon={<FiBriefcase />} label="Institution" value={user.collegeId?.collegeName || 'Unassigned'} />
          </>
        );
      default:
        return null;
    }
  };

  const profileImageUrl = getProfileImageUrl();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl shadow-lg p-8 text-eyDark">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="mt-2 opacity-90 font-medium">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Card & Quick Actions */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="relative inline-block group mb-4">
              <div 
                className={`w-32 h-32 rounded-full mx-auto overflow-hidden border-4 border-primary-100 bg-gray-50 flex items-center justify-center relative ${isUploading ? 'opacity-50' : ''}`}
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-12 h-12 text-gray-400" />
                )}
                
                {/* Hover overlay */}
                <div 
                  className="absolute inset-0 bg-eyDark/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-primary-500"
                  onClick={handleImageClick}
                >
                  <FiCamera className="w-8 h-8 mb-1" />
                  <span className="text-xs font-bold">Update</span>
                </div>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp,image/gif" 
              />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-sm font-medium text-eyDark bg-primary-50 border border-primary-100 rounded-full px-3 py-1 inline-block mt-2 uppercase tracking-wide">
              {formatRoleName(user?.role)}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-center border-primary-200 text-eyDark hover:bg-primary-50"
              onClick={() => setIsEditing(true)}
            >
              <FiEdit2 className="mr-2" /> Edit Details
            </Button>
            <Button 
              variant="secondary" 
              className="w-full justify-center bg-gray-50 text-gray-700 hover:bg-gray-100"
              onClick={() => setIsChangingPassword(true)}
            >
              <FiLock className="mr-2" /> Change Password
            </Button>
          </div>
        </div>

        {/* Right Column - Detailed Information */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailItem icon={<FiUser />} label="Full Name" value={user?.name} />
              <DetailItem icon={<FiMail />} label="Email Address" value={user?.email} />
              <DetailItem icon={<FiPhone />} label="Phone Number" value={user?.phone || 'Not provided'} />
              <DetailItem icon={<FiUser />} label="User ID" value={user?._id ? `#${user._id.slice(-8).toUpperCase()}` : (user?.id ? `#${user.id.slice(-8).toUpperCase()}` : 'N/A')} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Role & Institution Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {renderRoleSpecificDetails()}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Profile Details">
        <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="e.g. +1 234 567 8900"
          />
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500 mt-4">
            <p className="flex items-center"><FiLock className="mr-2" /> Email and Role cannot be changed.</p>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={isChangingPassword} onClose={() => setIsChangingPassword(false)} title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            required
            minLength={6}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            required
            minLength={6}
          />
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setIsChangingPassword(false)}>Cancel</Button>
            <Button type="submit">Update Password</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Helper component for displaying details
const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-start">
    <div className="mt-1 mr-3 text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100">
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

export default Profile;
