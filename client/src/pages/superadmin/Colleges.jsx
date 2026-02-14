import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash, FiToggleLeft, FiToggleRight, FiUsers } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Loader from '@/components/common/Loader.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';
import CollegeHierarchyModal from '@/components/superadmin/CollegeHierarchyModal.jsx';

const Colleges = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [editingCollege, setEditingCollege] = useState(null);
  const [formData, setFormData] = useState({
    collegeName: '',
    collegeCode: '',
    city: '',
    state: '',
    country: '',
    addressLine: '',
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const response = await superAdminService.getColleges();
      setColleges(response.data || []);
    } catch (error) {
      toast.error('Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCollege) {
        await superAdminService.updateCollege(editingCollege._id, formData);
        toast.success('College updated successfully');
      } else {
        const payload = {
          ...formData,
          address: {
            street: formData.addressLine,
            city: formData.city,
            state: formData.state,
            country: formData.country,
          }
        };
        await superAdminService.createCollege(payload);
        toast.success('College created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchColleges();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (college) => {
    setEditingCollege(college);
    setFormData({
      collegeName: college.collegeName,
      collegeCode: college.collegeCode,
      city: college.address?.city || '',
      state: college.address?.state || '',
      country: college.address?.country || '',
      addressLine: college.address?.street || '', // Mapped from backend 'street' to frontend 'addressLine'
      contactEmail: college.contactEmail,
      contactPhone: college.contactPhone,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This will delete all associated data.')) return;
    try {
      await superAdminService.deleteCollege(id);
      toast.success('College deleted successfully');
      fetchColleges();
    } catch (error) {
      toast.error('Failed to delete college');
    }
  };

  const toggleStatus = async (college) => {
    try {
      const newStatus = college.status === 'active' ? 'inactive' : 'active';
      await superAdminService.updateCollegeStatus(college._id, newStatus);
      toast.success('College status updated');
      fetchColleges();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      collegeName: '',
      collegeCode: '',
      city: '',
      state: '',
      country: '',
      addressLine: '',
      contactEmail: '',
      contactPhone: '',
    });
    setEditingCollege(null);
  };

  const columns = [
    { header: 'College Name', accessor: 'collegeName' },
    { header: 'Code', accessor: 'collegeCode' },
    { header: 'Email', accessor: 'contactEmail' },
    { header: 'Phone', accessor: 'contactPhone' },
    {
      header: 'Status',
      render: (row) => (
        <span className={`px-3 py-1 rounded-full text-sm ${row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => { setSelectedCollege(row); setShowHierarchyModal(true); }}
            className="text-primary-600 hover:text-primary-800 p-1 hover:bg-primary-50 rounded transition-colors"
            title="Manage Hierarchy"
          >
            <FiUsers />
          </button>
          <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors">
            <FiEdit />
          </button>
          <button onClick={() => toggleStatus(row)} className="text-yellow-600 hover:text-yellow-800 p-1 hover:bg-yellow-50 rounded transition-colors">
            {row.status === 'active' ? <FiToggleRight /> : <FiToggleLeft />}
          </button>
          <button onClick={() => handleDelete(row._id)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors">
            <FiTrash />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Colleges</h1>
        <Button onClick={() => setShowModal(true)}>
          <FiPlus className="mr-2" /> Add College
        </Button>
      </div>

      <Card>
        <Table columns={columns} data={colleges} />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingCollege ? 'Edit College' : 'Add College'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="College Name"
            value={formData.collegeName}
            onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
            required
          />
          <Input
            label="College Code"
            value={formData.collegeCode}
            onChange={(e) => setFormData({ ...formData, collegeCode: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            />
            <Input
              label="Address Line"
              value={formData.addressLine}
              onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
              required
            />
          </div>
          <Input
            label="Contact Email"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            required
          />
          <Input
            label="Contact Phone"
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            required
          />
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit">
              {editingCollege ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <CollegeHierarchyModal
        isOpen={showHierarchyModal}
        onClose={() => setShowHierarchyModal(false)}
        college={selectedCollege}
        onUpdate={fetchColleges}
      />
    </div>
  );
};

export default Colleges;
