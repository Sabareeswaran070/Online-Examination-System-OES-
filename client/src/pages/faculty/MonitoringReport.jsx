import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiFileText, FiDownload, FiChevronLeft, FiAlertTriangle, FiCheckCircle, FiClock, FiActivity } from 'react-icons/fi';
import { monitoringService, facultyService } from '@/services';
import Card from '@/components/common/Card.jsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Loader from '@/components/common/Loader.jsx';
import toast from 'react-hot-toast';

const MonitoringReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [reportData, setReportData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examRes, reportRes] = await Promise.all([
                    facultyService.getExam(id),
                    monitoringService.getReport(id)
                ]);
                setExam(examRes.data);
                setReportData(reportRes.data);
            } catch (error) {
                toast.error('Failed to load report data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const columns = [
        { header: 'Student', accessor: 'student' },
        { header: 'Reg No', accessor: 'regNo' },
        {
            header: 'Status',
            render: (row) => (
                <Badge variant={row.status === 'submitted' ? 'success' : 'warning'}>
                    {row.status.toUpperCase()}
                </Badge>
            )
        },
        {
            header: 'Alerts',
            render: (row) => (
                <span className={`font-black ${row.violationsCount > 3 ? 'text-red-600' : 'text-gray-700'}`}>
                    {row.violationsCount}
                </span>
            )
        },
        { header: 'Tab Switches', accessor: 'tabSwitches' },
        { header: 'FS Exits', accessor: 'violationsCount' }, // Assuming FS exits are part of violations
        {
            header: 'Time Taken',
            accessor: (row) => row.timeTaken ? `${row.timeTaken} min` : 'N/A'
        },
        {
            header: 'Actions',
            render: (row) => (
                <Button
                    size="sm"
                    variant="secondary"
                    // We'd need studentId in reportData for this
                    onClick={() => navigate(`/faculty/monitoring/${id}/student/${row._id}`)}
                >
                    View Details
                </Button>
            )
        }
    ];

    if (loading) return <Loader fullScreen />;

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold uppercase tracking-widest text-[11px]"
                >
                    <FiChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <Button variant="primary" icon={<FiDownload />}>Export PDF Report</Button>
            </div>

            <Card className="p-8 border-none shadow-sm bg-white overflow-hidden">
                <div className="flex items-center gap-5 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <FiFileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">Post-Exam Monitoring Report</h1>
                        <p className="text-gray-500 text-sm font-medium">{exam?.title} • {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Candidates</p>
                        <h3 className="text-xl font-black text-gray-900">{reportData.length}</h3>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">High Risk (3+ Flags)</p>
                        <h3 className="text-xl font-black text-red-600">
                            {reportData.filter(r => r.violationsCount > 3).length}
                        </h3>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Clean Sessions</p>
                        <h3 className="text-xl font-black text-emerald-600">
                            {reportData.filter(r => r.violationsCount === 0).length}
                        </h3>
                    </div>
                    <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Completion Rate</p>
                        <h3 className="text-xl font-black text-blue-600">
                            {Math.round((reportData.filter(r => r.status === 'submitted').length / reportData.length) * 100) || 0}%
                        </h3>
                    </div>
                </div>

                <Table
                    columns={columns}
                    data={reportData}
                />
            </Card>
        </div>
    );
};

export default MonitoringReport;
