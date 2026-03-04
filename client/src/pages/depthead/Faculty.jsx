import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiMail, FiPhone, FiUser, FiInfo } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import { deptHeadService } from '@/services';
import toast from 'react-hot-toast';

const Faculty = () => {
    const [loading, setLoading] = useState(true);
    const [faculty, setFaculty] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'faculty',
        phone: '',
    });

    useEffect(() => {
        fetchFaculty();
    }, []);

    const fetchFaculty = async () => {
        try {
            setLoading(true);
            const res = await deptHeadService.getFaculty();
            setFaculty(res.data || []);
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
                await deptHeadService.updateUser(editingMember._id, updateData);
                toast.success('Faculty updated successfully');
            } else {
                await deptHeadService.createUser(formData);
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
            phone: member.phone || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this faculty member?')) {
            try {
                await deptHeadService.deleteUser(id);
                toast.success('Faculty member deleted');
                fetchFaculty();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Delete failed');
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
            <div className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Faculty Directory</h1>
                        <p className="mt-1 opacity-90">Manage academic staff within your department</p>
                    </div>
                    <Button
                        className="bg-white text-teal-700 hover:bg-teal-50 border-none shadow-md"
                        size="lg"
                        onClick={() => { resetForm(); setShowModal(true); }}
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
                        placeholder="Search faculty by name or email..."
                        className="w-full pl-10 pr-4 py-2 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFaculty.length > 0 ? (
                    filteredFaculty.map((member) => (
                        <Card key={member._id} className="hover:shadow-lg transition-all hover:-translate-y-1 duration-300 border-none shadow-sm group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl flex items-center justify-center text-teal-700 font-bold border border-teal-100 group-hover:scale-110 transition-transform">
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 leading-tight">{member.name}</h3>
                                        <div className={`text-[10px] inline-block px-2 py-0.5 rounded-full font-bold uppercase mt-1 tracking-wider ${member.role === 'depthead' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {member.role === 'depthead' ? 'Dept Head' : 'Faculty'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(member)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit Faculty"
                                    >
                                        <FiEdit size={16} />
                                    </button>
                                    {member.role !== 'depthead' && (
                                        <button
                                            onClick={() => handleDelete(member._id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Faculty"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="flex items-center text-sm text-gray-600 bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                                    <FiMail className="mr-3 text-emerald-500 shrink-0" size={14} />
                                    <span className="truncate">{member.email}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-700 font-medium px-2">
                                    <FiUser className="mr-3 text-teal-500" size={14} />
                                    {member.departmentId?.name || 'Unassigned'}
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <Card className="bg-white border-dashed border-2 border-gray-200 shadow-none">
                            <FiSearch className="text-gray-300 w-12 h-12 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No faculty members found</p>
                        </Card>
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
                        placeholder="Dr. Smith"
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="email@college.edu"
                    />
                    <Input
                        label={editingMember ? "Password (Leave blank to keep current)" : "Password"}
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingMember}
                        placeholder="••••••••"
                    />
                    <Select
                        label="Role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                        options={[
                            { label: 'Faculty', value: 'faculty' },
                            { label: 'Dept Head', value: 'depthead' }
                        ]}
                        disabled={editingMember?.role === 'depthead'}
                    />
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
