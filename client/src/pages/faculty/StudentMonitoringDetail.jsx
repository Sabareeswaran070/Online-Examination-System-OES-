import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUser, FiActivity, FiAlertCircle, FiClock, FiVideo, FiShield, FiSlash, FiPlusCircle, FiTerminal, FiChevronLeft, FiMessageSquare, FiAlertTriangle, FiFlag } from 'react-icons/fi';
import { useSocket } from '@/context/SocketContext';
import { monitoringService, facultyService } from '@/services';
import Card from '@/components/common/Card.jsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import toast from 'react-hot-toast';

const StudentMonitoringDetail = () => {
    const { id, studentId } = useParams();
    const navigate = useNavigate();
    const socket = useSocket();
    const logScrollRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ student: null, violations: [], logs: [] });
    const [stats, setStats] = useState({ status: 'active' });
    const [latestSnapshot, setLatestSnapshot] = useState(null);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await monitoringService.getStudentLog(id, studentId);
            setData(res.data);

            // Infer status
            const logs = res.data.logs;
            if (logs.length > 0) {
                const lastLog = logs[0];
                const now = new Date();
                const lastActive = new Date(lastLog.timestamp);
                const isIdle = (now - lastActive) > 5 * 60 * 1000;
                setStats({
                    status: isIdle ? 'idle' : 'active',
                    lastActive
                });
            }
        } catch (error) {
            toast.error('Failed to load student logs');
        } finally {
            setLoading(false);
        }
    }, [id, studentId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        if (socket) {
            socket.on('student_alert', (alert) => {
                if (alert.userId === studentId) {
                    setData(prev => ({
                        ...prev,
                        logs: [
                            {
                                eventType: alert.eventType,
                                description: alert.description,
                                timestamp: alert.timestamp,
                                metadata: alert.metadata
                            },
                            ...prev.logs
                        ]
                    }));

                    if (!['heartbeat', 'question_navigate', 'answer_change'].includes(alert.eventType)) {
                        toast.error(`Violation: ${alert.eventType.replace('_', ' ')}`);
                    }
                }
            });

            socket.on('student_feed_update', (feed) => {
                if (feed.userId === studentId) {
                    setLatestSnapshot(feed.snapshot);
                    setStats(prev => ({ ...prev, lastActive: new Date() }));
                }
            });

            return () => {
                socket.off('student_alert');
                socket.off('student_feed_update');
            };
        }
    }, [socket, studentId]);

    const handleCommand = (command, payload = {}) => {
        if (socket) {
            socket.emit('admin_command', {
                examId: id,
                studentId,
                command,
                payload
            });
            toast.success(`Command "${command.toUpperCase()}" sent`);
        }
    };

    if (loading) return <Loader fullScreen />;

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 space-y-6">
            {/* Header / Breadcrumb */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold uppercase tracking-widest text-[11px]"
                >
                    <FiChevronLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>
                <div className="flex items-center gap-3">
                    <Badge variant={stats.status === 'active' ? 'success' : 'warning'}>
                        {stats.status.toUpperCase()}
                    </Badge>
                    <span className="text-gray-400 text-xs font-medium">
                        Last Pulse: {stats.lastActive ? new Date(stats.lastActive).toLocaleTimeString() : 'N/A'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Student Info & Feed */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6 overflow-hidden">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full bg-primary-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden mb-4">
                                {data.student?.profileImage ? (
                                    <img src={data.student.profileImage} alt={data.student.name} className="w-full h-full object-cover" />
                                ) : (
                                    <FiUser className="text-indigo-300 w-12 h-12" />
                                )}
                            </div>
                            <h2 className="text-xl font-black text-gray-900">{data.student?.name}</h2>
                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">{data.student?.regNo}</p>
                            <div className="mt-4 flex gap-2">
                                <Badge variant="secondary">{data.student?.email}</Badge>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col gap-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Actions</h4>
                            <Button
                                variant="warning"
                                className="w-full justify-start gap-3"
                                onClick={() => handleCommand('warn', { message: 'Suspicious activity detected. Please return to your exam.' })}
                                icon={<FiMessageSquare />}
                            >
                                Send Warning
                            </Button>
                            <Button
                                variant="secondary"
                                className="w-full justify-start gap-3"
                                onClick={() => handleCommand('pause')}
                                icon={<FiSlash />}
                            >
                                Pause Session
                            </Button>
                            <Button
                                variant="success"
                                className="w-full justify-start gap-3"
                                onClick={() => handleCommand('extend_time', { minutes: 10 })}
                                icon={<FiPlusCircle />}
                            >
                                Add 10 Minutes
                            </Button>
                            <Button
                                variant="danger"
                                className="w-full justify-start gap-3"
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to terminate this student\'s exam?')) {
                                        handleCommand('terminate');
                                    }
                                }}
                                icon={<FiSlash />}
                            >
                                Terminate Exam
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-0 overflow-hidden bg-black aspect-video relative group border-2 border-gray-800 shadow-2xl">
                        {latestSnapshot ? (
                            <img src={latestSnapshot} alt="Live Feed" className="w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center group-hover:scale-110 transition-transform">
                                    <FiVideo className="w-12 h-12 text-gray-700 mx-auto mb-2" />
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Awaiting Live Feed...</p>
                                </div>
                            </div>
                        )}
                        <div className="absolute top-4 left-4 flex gap-2">
                            <div className={`px-2 py-1 ${latestSnapshot ? 'bg-red-600' : 'bg-gray-600'} backdrop-blur-md rounded text-white text-[8px] font-black uppercase flex items-center gap-1 shadow-lg`}>
                                <div className={`w-1.5 h-1.5 bg-white rounded-full ${latestSnapshot ? 'animate-pulse' : ''}`} />
                                {latestSnapshot ? 'Live Feed' : 'Feed Offline'}
                            </div>
                        </div>
                        {latestSnapshot && (
                            <div className="absolute bottom-4 right-4 text-[8px] font-mono text-white/50 bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                                {new Date().toLocaleTimeString()}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Activity Log */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="h-full flex flex-col min-h-[600px] overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <FiTerminal className="text-indigo-600 w-5 h-5" />
                                <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">Real-time Activity Stream</h3>
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="danger">{data.violations?.length || 0} Flags</Badge>
                                <Badge variant="info">{data.logs?.length || 0} Total Events</Badge>
                            </div>
                        </div>

                        <div
                            className="flex-1 overflow-y-auto p-0 font-mono text-xs"
                            ref={logScrollRef}
                        >
                            {data.logs.length > 0 ? (
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-100">
                                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="px-6 py-4">Timestamp</th>
                                            <th className="px-6 py-4">Event</th>
                                            <th className="px-6 py-4">Details</th>
                                            <th className="px-6 py-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.logs.map((log, i) => (
                                            <tr key={i} className={`hover:bg-gray-50/50 transition-colors ${log.eventType.includes('switch') || log.eventType.includes('exit') ? 'bg-red-50/30' : ''}`}>
                                                <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${['heartbeat', 'question_navigate', 'answer_change'].includes(log.eventType)
                                                        ? 'bg-primary-50 text-blue-600'
                                                        : 'bg-red-50 text-red-600'
                                                        }`}>
                                                        {log.eventType.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 break-words">
                                                    {log.description || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {['heartbeat', 'question_navigate', 'answer_change'].includes(log.eventType) ? (
                                                        <FiActivity className="text-primary-600 w-3 h-3 inline" />
                                                    ) : (
                                                        <FiAlertCircle className="text-red-500 w-3 h-3 inline" />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                                    <FiActivity className="w-10 h-10 mb-4 opacity-20" />
                                    <p className="uppercase tracking-widest font-black text-[10px]">Awaiting First Signal...</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StudentMonitoringDetail;
