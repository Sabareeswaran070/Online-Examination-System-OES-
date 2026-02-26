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

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalFaculty, setTotalFaculty] = useState(0);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [currentPage, pageSize, searchTerm]);

  const fetchDepartments = async () => {
    try {
      const deptsRes = await collegeAdminService.getDepartments();
      setDepartments(deptsRes.data || []);
    } catch (error) {
      console.error('Fetch departments error:', error);
    }
  };

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const facultyRes = await collegeAdminService.getFaculty({
        page: currentPage,
        limit: pageSize,
        search: searchTerm
      });
      setFaculty(facultyRes.data || []);
      setTotalPages(facultyRes.totalPages || 1);
      setTotalFaculty(facultyRes.count || 0);
    } catch (error) {
      console.error('Fetch faculty error:', error);
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
      fetchFaculty();
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
        fetchFaculty();
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
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl shadow-lg p-6 text-white text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Faculty Directory</h1>
            <p className="mt-1 opacity-90">Manage academic staff, department heads, and their roles</p>
          </div>
          <Button
            className="bg-white text-teal-700 hover:bg-teal-50 border-none shadow-md"
            size="lg"
            onClick={() => setShowModal(true)}
          >
            <FiPlus className="mr-2 w-5 h-5" />
            Add Faculty
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search faculty by name, email or ID..."
            className="w-full pl-10 pr-4 py-2 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white shadow-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[12, 24, 48, 96].map(size => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && faculty.length === 0 ? (
          <div className="py-20 flex justify-center">
            <Loader />
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              {faculty.length > 0 ? (
                faculty.map((member) => (
                  <Card key={member._id} className="hover:shadow-lg transition-all hover:-translate-y-1 duration-300 border-none shadow-sm group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl flex items-center justify-center text-teal-700 font-bold border border-teal-100 group-hover:scale-110 transition-transform">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 leading-tight">{member.name}</h3>
                          <div className={`text-[10px] inline-block px-2 py-0.5 rounded-full font-bold uppercase mt-1 tracking-wider ${member.role === 'depthead' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {member.role === 'depthead' ? 'Dept Head' : 'Faculty'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Edit Faculty"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(member._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Delete Faculty"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                        <FiMail className="mr-3 text-emerald-500 shrink-0" size={14} />
                        <span className="truncate" title={member.email}>{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                          <FiPhone className="mr-3 text-emerald-500 shrink-0" size={14} />
                          {member.phone}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-700 font-medium px-2">
                        <FiBook className="mr-3 text-teal-500" size={14} />
                        {member.departmentId?.name || 'Unassigned'}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full">
                  <Card className="bg-white border-dashed border-2 border-gray-200 shadow-none">
                    <div className="text-center py-20">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <FiSearch className="text-gray-300 w-10 h-10" />
                      </div>
                      <p className="text-gray-500 font-medium text-lg">No faculty found matching your search</p>
                      <p className="text-gray-400 text-sm mt-1">Try different keywords or filters</p>
                      <Button
                        variant="secondary"
                        className="mt-6"
                        onClick={() => {
                          setSearchTerm('');
                          setCurrentPage(1);
                        }}
                      >
                        Clear Search
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {totalFaculty > 0 && (
              <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-sm text-gray-600 font-medium">
                  Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, totalFaculty)}</span> of <span className="text-gray-900 font-bold">{totalFaculty}</span> faculty members
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 text-sm font-bold rounded-lg transition-all ${currentPage === pageNum
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
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
