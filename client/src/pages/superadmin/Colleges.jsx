import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash, FiToggleLeft, FiToggleRight, FiUsers, FiMapPin } from 'react-icons/fi';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collegeToDelete, setCollegeToDelete] = useState(null);
  const [deleteStats, setDeleteStats] = useState(null);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    collegeName: '',
    collegeCode: '',
    city: '',
    district: '',
    state: '',
    country: '',
    place: '',
    addressLine: '',
    zipCode: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    establishedYear: '',
  });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [places, setPlaces] = useState([]);

  // Pagination and Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalColleges, setTotalColleges] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchColleges();
  }, [currentPage, pageSize, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) setCurrentPage(1);
      else fetchColleges();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync selected college with updated list to reflect changes in modal
  useEffect(() => {
    if (selectedCollege) {
      const updated = colleges.find(c => c._id === selectedCollege._id);
      if (updated) {
        setSelectedCollege(updated);
      }
    }
  }, [colleges]);

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const response = await superAdminService.getColleges({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: statusFilter,
      });
      setColleges(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalColleges(response.count || 0);
    } catch (error) {
      toast.error('Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  // Pincode auto-fill handler
  const handlePincodeChange = useCallback(async (pincode) => {
    setFormData((prev) => ({ ...prev, zipCode: pincode }));
    setPlaces([]);

    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setPincodeLoading(true);
      try {
        const response = await superAdminService.lookupPincode(pincode);
        if (response.success && response.data) {
          const { city, district, state, country, places: fetchedPlaces } = response.data;
          setPlaces(fetchedPlaces || []);
          setFormData((prev) => ({
            ...prev,
            city: city || prev.city,
            district: district || prev.district,
            state: state || prev.state,
            country: country || prev.country,
            place: fetchedPlaces?.[0] || '',
          }));
          toast.success('Address details auto-filled from pincode');
        }
      } catch (error) {
        // Silently fail — user can fill manually
        if (error.response?.status === 404) {
          toast.error('No details found for this pincode');
        }
      } finally {
        setPincodeLoading(false);
      }
    }
  }, []);

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
            district: formData.district,
            state: formData.state,
            country: formData.country,
            zipCode: formData.zipCode,
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
      district: college.address?.district || '',
      state: college.address?.state || '',
      country: college.address?.country || '',
      place: '',
      addressLine: college.address?.street || '',
      zipCode: college.address?.zipCode || '',
      contactEmail: college.contactEmail || '',
      contactPhone: college.contactPhone || '',
      website: college.website || '',
      establishedYear: college.establishedYear || '',
    });
    setPlaces([]);
    setShowModal(true);
  };

  const handleDeleteClick = async (college) => {
    setCollegeToDelete(college);
    setFetchingStats(true);
    setShowDeleteModal(true);
    try {
      const response = await superAdminService.getCollegeStats(college._id);
      setDeleteStats(response.data);
    } catch (error) {
      toast.error('Failed to load deletion impact stats');
      setShowDeleteModal(false);
    } finally {
      setFetchingStats(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await superAdminService.deleteCollege(collegeToDelete._id);
      toast.success('College and all associated data deleted successfully');
      setShowDeleteModal(false);
      fetchColleges();
    } catch (error) {
      toast.error('Failed to delete college');
    } finally {
      setIsDeleting(false);
      setCollegeToDelete(null);
      setDeleteStats(null);
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
      district: '',
      state: '',
      country: '',
      place: '',
      addressLine: '',
      zipCode: '',
      contactEmail: '',
      contactPhone: '',
      website: '',
      establishedYear: '',
    });
    setEditingCollege(null);
    setPlaces([]);
  };

  const columns = [
    { header: 'College Name', accessor: 'collegeName' },
    { header: 'Code', accessor: 'collegeCode' },
    { header: 'City', accessor: 'address.city' },
    { header: 'District', accessor: 'address.district' },
    { header: 'Year', accessor: 'establishedYear' },
    { header: 'Depts', render: (row) => row.departments?.length || 0 },
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
          <button onClick={() => handleDeleteClick(row)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors">
            <FiTrash />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-1 w-full md:max-w-md relative">
          <FiPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-45" /> {/* Using FiPlus as search icon shortcut */}
          <input
            type="text"
            placeholder="Search by name or code..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button onClick={() => setShowModal(true)}>
            <FiPlus className="mr-2" /> Add College
          </Button>
        </div>
      </div>

      <Card>
        <Table columns={columns} data={colleges} />

        {/* Pagination Controls */}
        <div className="mt-6 flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100 gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              className="px-3 py-1.5 border rounded-md text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalColleges)} of {totalColleges}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center space-x-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentPage === i + 1
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'hover:bg-gray-100 text-gray-700'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
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

          {/* Pincode field with auto-fill indicator */}
          <div className="relative">
            <Input
              label="Pincode / Zip Code"
              value={formData.zipCode}
              onChange={(e) => handlePincodeChange(e.target.value)}
              placeholder="Enter 6-digit pincode"
              maxLength={6}
              required
            />
            {pincodeLoading && (
              <div className="absolute right-3 top-9 flex items-center space-x-1">
                <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                <span className="text-xs text-primary-600">Fetching...</span>
              </div>
            )}
            {!pincodeLoading && formData.zipCode.length === 6 && formData.state && (
              <div className="absolute right-3 top-9 flex items-center">
                <FiMapPin className="text-green-500 h-4 w-4" />
              </div>
            )}
          </div>

          {/* Place dropdown - shown when places are fetched */}
          {places.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Place / Area</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
              >
                {places.map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="District"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            />
          </div>
          <Input
            label="Address Line"
            value={formData.addressLine}
            onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Website"
              value={formData.website}
              placeholder="https://example.com"
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
            <Input
              label="Established Year"
              type="number"
              value={formData.establishedYear}
              onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
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

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Entire College?"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiTrash className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <span className="font-bold">Warning:</span> This action is permanent and will delete all data linked to <span className="font-bold">{collegeToDelete?.collegeName}</span>.
                </p>
              </div>
            </div>
          </div>

          {fetchingStats ? (
            <div className="py-4 flex flex-col items-center justify-center space-y-2">
              <Loader size="sm" />
              <p className="text-xs text-gray-500 italic">Calculating impact...</p>
            </div>
          ) : deleteStats ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Total data to be deleted:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase">Users</span>
                  <span className="font-bold text-gray-800">{deleteStats.users}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase">Departments</span>
                  <span className="font-bold text-gray-800">{deleteStats.departments}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase">Subjects</span>
                  <span className="font-bold text-gray-800">{deleteStats.subjects}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase">Exams</span>
                  <span className="font-bold text-gray-800">{deleteStats.exams}</span>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center border border-blue-100">
                <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Total Impact</span>
                <span className="text-lg font-black text-blue-800">{deleteStats.totalImpact} Records</span>
              </div>
            </div>
          ) : null}

          <p className="text-sm text-gray-600">
            Are you absolutely sure you want to proceed with deleting the entire college?
          </p>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
              disabled={isDeleting || fetchingStats}
            >
              {isDeleting ? 'Deleting Everything...' : 'Yes, Delete Everything'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Colleges;
