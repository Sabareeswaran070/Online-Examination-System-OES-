import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiBook, FiEdit, FiTrash2, FiMail, FiPhone, FiTag } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import { collegeAdminService } from '@/services';
import toast from 'react-hot-toast';

const Faculty = () => {
  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'faculty',
    departmentId: '',
    phone: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [facultyRes, deptsRes] = await Promise.all([
        collegeAdminService.getFaculty(),
        collegeAdminService.getDepartments()
      ]);
      setFaculty(facultyRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load faculty data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMember) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await collegeAdminService.updateUser(editingMember._id, updateData);
        toast.success('Faculty updated successfully');
      } else {
        await collegeAdminService.createUser(formData);
        toast.success('Faculty added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
      departmentId: member.departmentId?._id || '',
      phone: member.phone || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this faculty member?')) {
      try {
        await collegeAdminService.deleteUser(id);
        toast.success('Faculty member deleted');
        fetchInitialData();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const resetForm = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'faculty',
      departmentId: '',
      phone: '',
    });
  };

  const filteredFaculty = faculty.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Faculty Members</h1>
          <p className="text-gray-600 mt-1">Manage instructors and department heads</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <FiPlus className="mr-2" />
          Add Faculty
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFaculty.length > 0 ? (
          filteredFaculty.map((member) => (
            <Card key={member._id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <div className={`text-[10px] inline-block px-2 rounded-full font-bold uppercase ${member.role === 'depthead' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {member.role === 'depthead' ? 'Dept Head' : 'Faculty'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(member)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                    <FiEdit size={16} />
                  </button>
                  <button onClick={() => handleDelete(member._id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center text-xs truncate">
                  <FiMail className="mr-2 text-gray-400 shrink-0" />
                  {member.email}
                </div>
                {member.phone && (
                  <div className="flex items-center">
                    <FiPhone className="mr-2 text-gray-400" />
                    {member.phone}
                  </div>
                )}
                <div className="flex items-center">
                  <FiTag className="mr-2 text-gray-400" />
                  {member.departmentId?.name || 'Unassigned'}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500">
            No faculty members found.
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingMember ? 'Update Faculty' : 'Add New Faculty Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Dr. Jane Smith"
          />
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="jane@college.edu"
          />
          <Input
            label={editingMember ? "Password (Leave blank to keep current)" : "Password"}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingMember}
            placeholder="••••••••"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
              options={[
                { label: 'Faculty', value: 'faculty' },
                { label: 'Dept Head', value: 'depthead' }
              ]}
            />
            <Select
              label="Department"
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              required
              options={[
                { label: 'Select Dept...', value: '' },
                ...departments.map(d => ({ label: d.name, value: d._id }))
              ]}
            />
          </div>
          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 234 567 890"
          />

          <div className="flex justify-end space-x-3 mt-8">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingMember ? 'Update' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Faculty;
