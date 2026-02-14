import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiSearch } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Loader from '@/components/common/Loader.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';

const Faculty = () => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        collegeId: '',
        departmentId: '',
        status: '',
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filters]);

    useEffect(() => {
        fetchUsers();
    }, [searchTerm, filters, currentPage, limit]);

    const fetchInitialData = async () => {
        try {
            const collegesRes = await superAdminService.getColleges({ limit: 100 });
            setColleges(collegesRes.data || []);
        } catch (error) {
            console.error('Fetch colleges error:', error);
        }
    };

    const handleCollegeChange = (e) => {
        const collegeId = e.target.value;
        setFilters({ ...filters, collegeId, departmentId: '' });
        const selectedCollege = colleges.find(c => c._id === collegeId);
        setDepartments(selectedCollege?.departments || []);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = {
                role: 'faculty',
                search: searchTerm,
                page: currentPage,
                limit,
                ...filters,
            };
            const response = await superAdminService.getUsers(params);
            setUsers(response.data || []);
            setTotalPages(response.totalPages || 1);
            setTotalUsers(response.count || 0);
        } catch (error) {
            toast.error('Failed to load faculty');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Name',
            render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.employeeId || 'No Employee ID'}</div>
                </div>
            )
        },
        { header: 'Email', accessor: 'email' },
        {
            header: 'College/Dept',
            render: (row) => (
                <div className="text-sm text-gray-600">
                    <div>{row.collegeId?.collegeName || '-'}</div>
                    <div className="text-xs text-gray-400">{row.departmentId?.name || '-'}</div>
                </div>
            )
        },
        {
            header: 'Status',
            render: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {row.status}
                </span>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex space-x-2">
                    <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <FiEdit size={16} />
                    </button>
                    <button className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                        <FiTrash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Faculty Management</h1>
                    <p className="text-gray-600 mt-1">View and manage all faculty across colleges</p>
                </div>
            </div>

            <Card>
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative col-span-1 md:col-span-1">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or employee ID..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white outline-none"
                        value={filters.collegeId}
                        onChange={handleCollegeChange}
                    >
                        <option value="">All Colleges</option>
                        {colleges.map(c => <option key={c._id} value={c._id}>{c.collegeName}</option>)}
                    </select>
                    <select
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white outline-none"
                        value={filters.departmentId}
                        onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                        disabled={!filters.collegeId}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                    <select
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white outline-none"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <Table columns={columns} data={users} loading={loading} emptyMessage="No faculty found" />
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                        Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * limit, totalUsers)}</span> of{' '}
                        <span className="font-medium">{totalUsers}</span> faculty
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                        >
                            {[10, 25, 50, 100, 500, 1000].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="flex items-center space-x-2">
                            <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</Button>
                            <span className="text-sm font-bold">{currentPage} / {totalPages}</span>
                            <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Faculty;
