import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiUser, FiBook, FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';
import Badge from '@/components/common/Badge.jsx';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import { collegeAdminService } from '@/services';
import toast from 'react-hot-toast';

const Departments = () => {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    departmentCode: '',
    deptHeadId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [expandedDeptId, setExpandedDeptId] = useState(null);
  const [deptSubjects, setDeptSubjects] = useState({});
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectFormData, setSubjectFormData] = useState({
    name: '',
    subjectCode: '',
    credits: 3,
    semester: 1,
    departmentId: '',
  });
  const [subjectLoading, setSubjectLoading] = useState(false);

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalDepartments, setTotalDepartments] = useState(0);

  useEffect(() => {
    fetchFaculties();
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [currentPage, pageSize, searchTerm]);

  const fetchFaculties = async () => {
    try {
      const facultyRes = await collegeAdminService.getFaculty();
      setFaculties(facultyRes.data?.filter(f => f.role === 'depthead') || []);
    } catch (error) {
      console.error('Fetch faculties error:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const deptsRes = await collegeAdminService.getDepartments({
        page: currentPage,
        limit: pageSize,
        search: searchTerm
      });
      setDepartments(deptsRes.data || []);
      setTotalPages(deptsRes.totalPages || 1);
      setTotalDepartments(deptsRes.count || 0);
    } catch (error) {
      console.error('Fetch departments error:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDept) {
        await collegeAdminService.updateDepartment(editingDept._id, formData);
        if (formData.deptHeadId && formData.deptHeadId !== editingDept.deptHeadId?._id) {
          await collegeAdminService.assignDeptHead(editingDept._id, formData.deptHeadId);
        }
        toast.success('Department updated successfully');
      } else {
        const res = await collegeAdminService.createDepartment(formData);
        if (formData.deptHeadId) {
          await collegeAdminService.assignDeptHead(res.data._id, formData.deptHeadId);
        }
        toast.success('Department created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      departmentCode: dept.departmentCode,
      deptHeadId: dept.deptHeadId?._id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure? This cannot be undone if there are no users assigned.')) {
      try {
        await collegeAdminService.deleteDepartment(id);
        toast.success('Department deleted');
        fetchDepartments();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const fetchSubjects = async (deptId) => {
    try {
      setSubjectLoading(true);
      const res = await collegeAdminService.getDepartmentSubjects(deptId);
      setDeptSubjects(prev => ({
        ...prev,
        [deptId]: res.data || []
      }));
    } catch (error) {
      console.error('Fetch subjects error:', error);
      toast.error('Failed to load subjects');
    } finally {
      setSubjectLoading(false);
    }
  };

  const toggleExpand = (deptId) => {
    if (expandedDeptId === deptId) {
      setExpandedDeptId(null);
    } else {
      setExpandedDeptId(deptId);
      if (!deptSubjects[deptId]) {
        fetchSubjects(deptId);
      }
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await collegeAdminService.createSubject(subjectFormData);
      toast.success('Subject added successfully');
      setShowSubjectModal(false);
      resetSubjectForm();
      fetchSubjects(subjectFormData.departmentId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (deptId, subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await collegeAdminService.deleteSubject(subjectId);
        toast.success('Subject deleted');
        fetchSubjects(deptId);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const resetForm = () => {
    setEditingDept(null);
    setFormData({ name: '', departmentCode: '', deptHeadId: '' });
  };

  const resetSubjectForm = () => {
    setSubjectFormData({
      name: '',
      subjectCode: '',
      credits: 3,
      semester: 1,
      departmentId: '',
    });
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Departments</h1>
            <p className="mt-1 opacity-90">Manage college organizational structure and department heads</p>
          </div>
          <Button
            className="bg-white text-blue-700 hover:bg-blue-50 border-none shadow-md"
            size="lg"
            onClick={() => setShowModal(true)}
          >
            <FiPlus className="mr-2 w-5 h-5" />
            Add Department
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search departments by name or code..."
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
            {[12, 24, 48, 96].map(size => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>
      </div>

      {loading && departments.length === 0 ? (
        <div className="py-20 flex justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {departments.length > 0 ? (
              departments.map((dept) => (
                <Card key={dept._id} className="hover:shadow-lg transition-transform hover:-translate-y-1 duration-300 border-none shadow-sm h-fit">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">{dept.name}</h3>
                        <p className="text-xs font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full inline-block mt-1 border border-primary-100">
                          {dept.departmentCode}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(dept._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-100 space-y-4">
                      <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 p-2 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 text-primary-500 border border-gray-100">
                          <FiUser />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">Dept Head</p>
                          <p className="font-semibold text-gray-800">
                            {dept.deptHeadId?.name || 'Not Assigned'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                        <div className="flex items-center">
                          <FiUsers className="mr-2 text-primary-500" />
                          <span className="font-medium text-gray-700">{dept.totalStudents || 0} Students</span>
                        </div>
                        <Badge variant="neutral" className="bg-gray-100 text-gray-600 border-none">
                          Active
                        </Badge>
                      </div>
                    </div>

                    {/* Subjects Section */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => toggleExpand(dept._id)}
                        className="flex items-center justify-between w-full text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
                      >
                        <span className="flex items-center">
                          <FiBook className="mr-2" />
                          {expandedDeptId === dept._id ? 'Hide Subjects' : 'View Subjects'}
                        </span>
                        {expandedDeptId === dept._id ? <FiChevronUp /> : <FiChevronDown />}
                      </button>

                      {expandedDeptId === dept._id && (
                        <div className="mt-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subjects</h4>
                            <button
                              onClick={() => {
                                setSubjectFormData({ ...subjectFormData, departmentId: dept._id });
                                setShowSubjectModal(true);
                              }}
                              className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors flex items-center"
                            >
                              <FiPlus className="mr-1" /> Add
                            </button>
                          </div>

                          {subjectLoading && !deptSubjects[dept._id] ? (
                            <div className="py-2 flex justify-center">
                              <Loader size="sm" />
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {deptSubjects[dept._id]?.length > 0 ? (
                                deptSubjects[dept._id].map(subject => (
                                  <div key={subject._id} className="bg-gray-50 border border-gray-100 p-2 rounded-lg flex justify-between items-center group">
                                    <div className="overflow-hidden text-left">
                                      <p className="text-[11px] font-bold text-gray-800 truncate">{subject.name}</p>
                                      <p className="text-[9px] text-gray-400 font-mono">{subject.subjectCode} • {subject.credits} Cr</p>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteSubject(dept._id, subject._id)}
                                      className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <FiTrash2 size={12} />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-center text-gray-400 py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                  No subjects added yet
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
                    <p className="text-gray-500 font-medium text-lg">No departments found matching your search</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search keywords</p>
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

          {totalDepartments > 0 && (
            <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-600 font-medium">
                Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, totalDepartments)}</span> of <span className="text-gray-900 font-bold">{totalDepartments}</span> departments
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
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 text-sm font-bold rounded-lg transition-all ${currentPage === i + 1
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
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

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingDept ? 'Update Department' : 'Create New Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Input
            label="Department Name"
            placeholder="e.g. Computer Science & Engineering"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Department Code"
            placeholder="e.g. CSE"
            value={formData.departmentCode}
            onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
            required
          />
          <Select
            label="Department Head"
            value={formData.deptHeadId}
            onChange={(e) => setFormData({ ...formData, deptHeadId: e.target.value })}
            options={[
              { label: 'Select Head...', value: '' },
              ...faculties.map(f => ({
                label: `${f.name} (${f.email})`,
                value: f._id
              }))
            ]}
          />
          <p className="text-[10px] text-gray-400 mt-1 italic">
            * Note: Only users with the 'Department Head' role are listed.
          </p>

          <div className="flex justify-end space-x-3 mt-8">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingDept ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showSubjectModal}
        onClose={() => { setShowSubjectModal(false); resetSubjectForm(); }}
        title="Add New Subject"
      >
        <form onSubmit={handleSubjectSubmit} className="space-y-4 pt-2">
          <Input
            label="Subject Name"
            placeholder="e.g. Data Structures"
            value={subjectFormData.name}
            onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
            required
          />
          <Input
            label="Subject Code"
            placeholder="e.g. CS201"
            value={subjectFormData.subjectCode}
            onChange={(e) => setSubjectFormData({ ...subjectFormData, subjectCode: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Credits"
              value={subjectFormData.credits}
              onChange={(e) => setSubjectFormData({ ...subjectFormData, credits: parseInt(e.target.value) })}
              required
              min="1"
            />
            <Input
              type="number"
              label="Semester"
              value={subjectFormData.semester}
              onChange={(e) => setSubjectFormData({ ...subjectFormData, semester: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <Button variant="secondary" onClick={() => { setShowSubjectModal(false); resetSubjectForm(); }} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Subject
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


export default Departments;
