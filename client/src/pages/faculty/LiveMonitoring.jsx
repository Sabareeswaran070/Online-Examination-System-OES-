import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMonitor, FiUsers, FiAlertTriangle, FiClock, FiMaximize2, FiArrowLeft, FiCamera, FiRefreshCw } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { facultyService } from '@/services';
import { formatDuration } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const LiveMonitoring = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState(null);
    const [students, setStudents] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        fetchInitialData();
        const interval = setInterval(fetchLiveSnapshots, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [id]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const examRes = await facultyService.getExam(id);
            setExamData(examRes.data);
            await fetchLiveSnapshots();
        } catch (error) {
            toast.error('Failed to load exam details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLiveSnapshots = async () => {
        try {
            const response = await facultyService.getLiveSnapshots(id);
            setStudents(response.data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to poll snapshots:', error);
        }
    };

    if (loading) return <Loader fullScreen />;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <FiMonitor className="text-primary-600" />
                            Live Monitoring
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">
                            {examData?.title} • {students.length} Students Active
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Last Sync</p>
                        <p className="text-sm font-mono font-bold text-gray-700">
                            {lastUpdated.toLocaleTimeString()}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLiveSnapshots}
                        className="flex items-center gap-2"
                    >
                        <FiRefreshCw className="w-4 h-4" />
                        Refresh
                    </Button>
                    <Badge variant="danger" className="animate-pulse py-1.5 px-3">
                        ● LIVE SESSION
                    </Badge>
                </div>
            </div>

            {students.length === 0 ? (
                <Card className="py-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiUsers className="text-gray-300 w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No active students</h3>
                    <p className="text-gray-500">Currently no students are taking this exam or they haven't started yet.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {students.map((student) => {
                        const isLive = student.latestSnapshot &&
                            (new Date() - new Date(student.latestSnapshot.capturedAt)) < 20000;
                        const violations = student.tabSwitchCount + student.fullscreenExitCount + student.copyPasteCount;

                        return (
                            <Card key={student.studentId} className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-none ring-1 ring-gray-100">
                                {/* Snapshot Wrapper */}
                                <div className="relative aspect-video bg-gray-900">
                                    {student.latestSnapshot ? (
                                        <img
                                            src={student.latestSnapshot.dataUrl}
                                            alt={student.name}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                            <FiCamera className="w-8 h-8 opacity-20" />
                                            <span className="text-xs font-medium opacity-50">No feed available</span>
                                        </div>
                                    )}

                                    {/* Status Badges */}
                                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                                        {isLive ? (
                                            <Badge variant="success" className="shadow-lg border-white/20">
                                                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />
                                                LIVE
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-black/40 text-white backdrop-blur-md border-transparent">
                                                OFFLINE
                                            </Badge>
                                        )}
                                    </div>

                                    {violations > 0 && (
                                        <div className="absolute top-3 right-3">
                                            <Badge variant="danger" className="shadow-lg border-white/20">
                                                <FiAlertTriangle className="mr-1" /> {violations}
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Student Info Overlay */}
                                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                        <h3 className="text-white font-bold truncate">{student.name}</h3>
                                        <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider">
                                            {student.rollNumber || 'STU-' + student.studentId.slice(-4)}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer Info */}
                                <div className="p-4 bg-white space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-2 rounded-lg bg-gray-50">
                                            <p className="text-[10px] text-gray-400 font-bold leading-tight">TABS</p>
                                            <p className={`text-sm font-black ${student.tabSwitchCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                                {student.tabSwitchCount}
                                            </p>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-gray-50">
                                            <p className="text-[10px] text-gray-400 font-bold leading-tight">FS EXIT</p>
                                            <p className={`text-sm font-black ${student.fullscreenExitCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                                {student.fullscreenExitCount}
                                            </p>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-gray-50">
                                            <p className="text-[10px] text-gray-400 font-bold leading-tight">PASTE</p>
                                            <p className={`text-sm font-black ${student.copyPasteCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                                {student.copyPasteCount}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                            <FiClock className="w-3.5 h-3.5" />
                                            Started {new Date(student.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {!student.cameraEnabled && (
                                            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                                <FiCamera className="w-3 h-3" /> CAM BLOCKED
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LiveMonitoring;
