import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiMail, FiTag, FiUpload } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import { collegeAdminService } from '@/services';
import toast from 'react-hot-toast';

const Students = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    departmentId: '',
    regNo: '',
  });

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    fetchDepartments();

    // Add test functions to window for debugging
    window.testEdit = () => {
      console.log('Window test edit function called!');
      alert('Test edit works!');
    };
    window.testDelete = () => {
      console.log('Window test delete function called!');
      alert('Test delete works!');
    };
    console.log('Test functions added to window object');
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, pageSize, searchTerm]);

  const fetchDepartments = async () => {
    try {
      const deptsRes = await collegeAdminService.getDepartments();
      setDepartments(deptsRes.data || []);
    } catch (error) {
      console.error('Fetch departments error:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const studentsRes = await collegeAdminService.getStudents({
        page: currentPage,
        limit: pageSize,
        search: searchTerm
      });
      const data = studentsRes.data || studentsRes;
      setStudents(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalStudents(data.count || 0);
    } catch (error) {
      console.error('Fetch students error:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingStudent) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await collegeAdminService.updateUser(editingStudent._id, updateData);
        toast.success('Student updated successfully');
      } else {
        await collegeAdminService.createUser(formData);
        toast.success('Student added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student) => {
    console.log('=== EDIT BUTTON CLICKED ===');
    console.log('Student:', student);
    console.log('Student name:', student.name);
    console.log('Student ID:', student._id);
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      password: '',
      role: 'student',
      departmentId: student.departmentId?._id || student.departmentId || '',
      regNo: student.regNo || '',
    });
    setShowModal(true);
    console.log('Modal should now be visible');
  };

  const handleDelete = async (id) => {
    console.log('Delete button clicked for student ID:', id);
    if (window.confirm('Delete this student?')) {
      try {
        await collegeAdminService.deleteUser(id);
        toast.success('Student deleted');
        fetchStudents();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Delete failed');
      }
    }
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student',
      departmentId: '',
      regNo: '',
    });
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Student Management</h1>
            <p className="mt-1 opacity-90">Maintain and monitor student records across all departments</p>
          </div>
          <div className="flex gap-3">
            <Button
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm"
              onClick={() => toast.info('Bulk upload via CSV is available in the Compete module')}
            >
              <FiUpload className="mr-2" /> Bulk Import
            </Button>
            <Button
              className="bg-white text-indigo-700 hover:bg-indigo-50 border-none shadow-md"
              onClick={() => setShowModal(true)}
            >
              <FiPlus className="mr-2 w-5 h-5" />
              Add Student
            </Button>
          </div>
        </div>
      </div>

      {/* TEST BUTTON - Remove after debugging */}
      <div className="bg-yellow-100 border-2 border-yellow-500 p-4 rounded-lg">
        <p className="text-sm font-bold mb-2">DEBUG TEST:</p>
        <button
          type="button"
          onClick={() => {
            console.log('TEST BUTTON CLICKED!');
            alert('Test button works!');
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Click Me to Test Events
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students by name, email, reg no or enrollment..."
            className="w-full pl-10 pr-4 py-2 border border-blue-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-blue-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white shadow-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[25, 50, 100, 500].map(size => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-sm">
        {loading && students.length === 0 ? (
          <div className="py-20 flex justify-center">
            <Loader />
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student Details</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Info</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {students.length > 0 ? (
                    students.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="group-hover:scale-110 transition-transform w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center mr-4 text-indigo-700 font-bold border border-indigo-100">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{student.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{student._id.slice(-8).toUpperCase()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-700">{student.regNo || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                            {student.departmentId?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center text-sm text-gray-700">
                              <FiMail className="mr-2 text-gray-400" size={12} />
                              {student.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-3">
                            {/* React onClick version */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('=== EDIT CLICKED ===', student._id);
                                handleEdit(student);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                            >
                              <FiEdit size={14} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('=== DELETE CLICKED ===', student._id);
                                handleDelete(student._id);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                            >
                              <FiTrash2 size={14} />
                              <span>Delete</span>
                            </button>

                            {/* HTML onclick version for testing */}
                            <button
                              type="button"
                              onClick={() => window.testEdit()}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded"
                            >
                              Test
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FiSearch className="text-gray-300 w-8 h-8" />
                          </div>
                          <p className="text-gray-500 font-medium">No students found matching your search</p>
                          <Button variant="secondary" className="mt-4" onClick={() => { setSearchTerm(''); setCurrentPage(1); }}>
                            Clear Search
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalStudents > 0 && (
              <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 p-4 rounded-b-xl border-t border-gray-100">
                <div className="text-sm text-gray-600 font-medium">
                  Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, totalStudents)}</span> of <span className="text-gray-900 font-bold">{totalStudents}</span> students
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
                            ? 'bg-primary-600 text-white shadow-md'
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
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingStudent ? 'Update Student' : 'Add New Student'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="John Doe"
          />
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="john.doe@college.edu"
          />
          <Input
            label="Reg No (Registration Number)"
            value={formData.regNo}
            onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
            placeholder="REG2024001"
          />
          <Input
            label={editingStudent ? "Password (Leave blank to keep current)" : "Password"}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingStudent}
            placeholder="••••••••"
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

          <div className="flex justify-end space-x-3 mt-8">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingStudent ? 'Update' : 'Add Student'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
