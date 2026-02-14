import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiUser } from 'react-icons/fi';
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [deptsRes, facultyRes] = await Promise.all([
        collegeAdminService.getDepartments(),
        collegeAdminService.getFaculty()
      ]);
      setDepartments(deptsRes.data || []);
      setFaculties(facultyRes.data?.filter(f => f.role === 'depthead') || []);
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error('Failed to load initial data');
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
      fetchInitialData();
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
        fetchInitialData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Delete failed');
      }
    }
  };

  const resetForm = () => {
    setEditingDept(null);
    setFormData({ name: '', departmentCode: '', deptHeadId: '' });
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-600 mt-1">Manage college organizational structure</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <FiPlus className="mr-2" />
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.length > 0 ? (
          departments.map((dept) => (
            <Card key={dept._id} className="hover:shadow-lg transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">{dept.name}</h3>
                    <p className="text-xs font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full inline-block mt-1">
                      {dept.departmentCode}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(dept)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <FiEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(dept._id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-gray-400">
                      <FiUser />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Dept Head</p>
                      <p className="font-medium text-gray-800">
                        {dept.deptHeadId?.name || 'Not Assigned'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    <FiUsers className="mr-2 text-primary-400" />
                    <span>{dept.totalStudents || 0} Students</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="bg-gray-50 border-dashed border-2">
              <div className="text-center py-12">
                <FiPlus className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium">No departments found</p>
                <Button className="mt-4" onClick={() => setShowModal(true)}>
                  Create Your First Department
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default Departments;
