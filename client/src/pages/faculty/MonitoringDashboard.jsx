import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMonitor, FiUser, FiAlertCircle, FiClock, FiGrid, FiList, FiSearch, FiFilter, FiActivity, FiLock, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { useSocket } from '@/context/SocketContext';
import { monitoringService, facultyService } from '@/services';
import Card from '@/components/common/Card.jsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import toast from 'react-hot-toast';

const StudentTile = ({ student, onClick }) => {
    const statusColors = {
        active: 'border-emerald-500 bg-emerald-50',
        idle: 'border-amber-400 bg-amber-50',
        suspicious: 'border-red-500 bg-red-50 animate-pulse',
        disconnected: 'border-gray-300 bg-gray-50 opacity-60',
        locked: 'border-purple-600 bg-primary-50',
        submitted: 'border-blue-500 bg-primary-50'
    };

    const statusBadges = {
        active: <Badge variant="success">Active</Badge>,
        idle: <Badge variant="warning">Idle</Badge>,
        suspicious: <Badge variant="danger">Suspicious</Badge>,
        disconnected: <Badge variant="secondary">Offline</Badge>,
        locked: <Badge variant="danger">Locked</Badge>,
        submitted: <Badge variant="info">Finished</Badge>
    };

    return (
        <div
            onClick={() => onClick(student)}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg ${statusColors[student.status] || 'border-gray-200'}`}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden relative">
                        {student.latestSnapshot ? (
                            <img src={student.latestSnapshot} alt={student.name} className="w-full h-full object-cover" />
                        ) : student.profileImage ? (
                            <img src={student.profileImage} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                            <FiUser className="text-gray-400 w-5 h-5" />
                        )}
                        {student.latestSnapshot && (
                            <div className="absolute inset-0 bg-indigo-600/10 border border-indigo-500/30 animate-pulse pointer-events-none" />
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{student.name}</h4>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{student.regNo}</p>
                    </div>
                </div>
                {statusBadges[student.status]}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="p-2 bg-white/50 rounded-lg border border-white/50">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Violations</p>
                    <p className={`text-sm font-black ${student.violationCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {student.violationCount}
                    </p>
                </div>
                <div className="p-2 bg-white/50 rounded-lg border border-white/50">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Last Active</p>
                    <p className="text-sm font-black text-gray-700">
                        {new Date(student.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>

            {student.status === 'suspicious' && (
                <div className="mt-3 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest">
                    <FiAlertTriangle className="w-3 h-3" />
                    <span>Extreme Risk Detected</span>
                </div>
            )}
        </div>
    );
};

const MonitoringDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const socket = useSocket();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState(null);
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState({});
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [examRes, statsRes] = await Promise.all([
                facultyService.getExam(id),
                monitoringService.getStats(id)
            ]);
            setExam(examRes.data);
            setStudents(statsRes.data.students);
            setStats(statsRes.data.stats);
        } catch (error) {
            toast.error('Failed to load monitoring data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();

        // Polling as fallback for state consistency
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        if (socket) {
            socket.emit('join_exam', { examId: id, role: 'monitor' });

            socket.on('student_status_change', ({ userId, status }) => {
                setStudents(prev => prev.map(s =>
                    s._id === userId ? { ...s, status } : s
                ));
            });

            socket.on('student_alert', (data) => {
                const { userId, eventType, description } = data;
                setStudents(prev => prev.map(s => {
                    if (s._id === userId) {
                        return {
                            ...s,
                            status: eventType === 'heartbeat' ? s.status : 'suspicious',
                            violationCount: (s.violationCount || 0) + (['heartbeat', 'question_navigate', 'answer_change'].includes(eventType) ? 0 : 1),
                            lastActive: new Date()
                        };
                    }
                    return s;
                }));

                if (eventType !== 'heartbeat' && !['question_navigate', 'answer_change'].includes(eventType)) {
                    toast(`${eventType.replace('_', ' ').toUpperCase()} alert for student`, {
                        icon: '⚠️',
                        duration: 3000,
                        position: 'bottom-right'
                    });
                }
            });

            socket.on('student_feed_update', ({ userId, snapshot }) => {
                setStudents(prev => prev.map(s =>
                    s._id === userId ? { ...s, latestSnapshot: snapshot, lastActive: new Date() } : s
                ));
            });

            return () => {
                socket.off('student_status_change');
                socket.off('student_alert');
                socket.off('student_feed_update');
            };
        }
    }, [socket, id]);

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.regNo.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || s.status === filter;
        return matchesSearch && matchesFilter;
    });

    if (loading) return <Loader fullScreen />;

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <FiMonitor className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">{exam?.title}</h1>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full animate-pulse border border-red-100">
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Live Monitoring</span>
                                </div>
                            </div>
                            <p className="text-gray-500 font-medium mt-1 uppercase tracking-widest text-[11px] flex items-center gap-2">
                                <FiClock className="text-primary-600" />
                                Ongoing Session • {students.length} Total Students
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" outline onClick={() => navigate(-1)} icon={<FiList />}>Back to Exams</Button>
                        <Button variant="primary" icon={<FiActivity />} onClick={() => navigate(`/faculty/monitoring/${id}/report`)}>Monitoring Report</Button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
                    {[
                        { label: 'Active', count: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Idle', count: stats.idle, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Suspicious', count: stats.suspicious, color: 'text-red-600', bg: 'bg-red-50' },
                        { label: 'Locked', count: stats.locked, color: 'text-purple-600', bg: 'bg-primary-50' },
                        { label: 'Submitted', count: stats.submitted, color: 'text-blue-600', bg: 'bg-primary-50' },
                        { label: 'Offline', count: stats.disconnected, color: 'text-gray-600', bg: 'bg-gray-50' },
                    ].map((s) => (
                        <div key={s.label} className={`${s.bg} p-4 rounded-2xl border border-white/50 shadow-sm transition-transform hover:scale-105`}>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <h3 className={`text-2xl font-black ${s.color}`}>{s.count}</h3>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls & Grid */}
            <Card className="border-none shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or Reg No..."
                                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-1 p-1 bg-white rounded-xl border border-gray-200">
                            {[
                                { id: 'all', label: 'All', icon: <FiGrid className="w-4 h-4" /> },
                                { id: 'suspicious', label: 'Alerts', icon: <FiAlertTriangle className="w-4 h-4" /> },
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => setFilter(btn.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${filter === btn.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-400 hover:text-indigo-600'}`}
                                >
                                    {btn.icon}
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                        </span>
                        <div className="w-px h-3 bg-gray-200 mx-1" />
                        <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500" /> Idle
                        </span>
                        <div className="w-px h-3 bg-gray-200 mx-1" />
                        <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500" /> Risk
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    {filteredStudents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {filteredStudents.map(student => (
                                <StudentTile
                                    key={student._id}
                                    student={student}
                                    onClick={(s) => navigate(`/faculty/monitoring/${id}/student/${s._id}`)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                <FiMonitor className="text-gray-300 w-10 h-10" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-widest">No matching students</h3>
                            <p className="text-gray-500 mt-1 max-w-sm">No students currently match your filter or search criteria in this exam session.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default MonitoringDashboard;
