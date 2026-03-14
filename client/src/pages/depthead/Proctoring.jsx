import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMonitor, FiSettings, FiCheckCircle, FiAlertCircle, FiClock, FiUsers, FiEye, FiSave, FiLock, FiUnlock } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { deptHeadService } from '@/services';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const Proctoring = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ongoing');
    const [exams, setExams] = useState([]);
    const [settings, setSettings] = useState({
        enforceFullscreen: true,
        blockNotifications: false,
        tabSwitchingAllowed: true,
        maxTabSwitches: 3,
        maxFullscreenExits: 2,
        maxCopyPaste: 0,
        actionOnLimit: 'warn',
        isLocked: {
            enforceFullscreen: false,
            blockNotifications: false,
            tabSwitchingAllowed: false,
        }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [examsRes, settingsRes] = await Promise.all([
                deptHeadService.getOngoingExams(),
                deptHeadService.getProctoringSettings()
            ]);
            setExams(examsRes.data || []);
            if (settingsRes.data) {
                setSettings(settingsRes.data);
            }
        } catch (error) {
            toast.error('Failed to load proctoring data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('isLocked.')) {
            const field = name.split('.')[1];
            setSettings(prev => ({
                ...prev,
                isLocked: { ...prev.isLocked, [field]: checked }
            }));
        } else {
            setSettings(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const saveSettings = async () => {
        try {
            setLoading(true);
            await deptHeadService.updateProctoringSettings(settings);
            toast.success('Department proctoring defaults updated');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: 'Exam Title', accessor: 'title' },
        { header: 'Subject', accessor: (row) => row.subject?.name || 'N/A' },
        { header: 'Faculty', accessor: (row) => row.facultyId?.name || 'N/A' },
        {
            header: 'Start Time',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <FiClock className="text-gray-400" />
                    <span>{formatDateTime(row.startTime)}</span>
                </div>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(`/dept-head/exams/${row._id}/results`)}
                    className="flex items-center gap-2"
                >
                    <FiMonitor className="w-4 h-4" />
                    Live Monitoring
                </Button>
            )
        }
    ];

    if (loading && exams.length === 0) return <Loader fullScreen />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl shadow-lg p-8 text-eyDark">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <FiMonitor className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Proctoring Oversight</h1>
                        <p className="text-indigo-100 italic">Monitor live exams and manage department-wide proctoring security</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('ongoing')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'ongoing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                    Ongoing Exams
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                    Proctoring Defaults
                </button>
            </div>

            {activeTab === 'ongoing' ? (
                <Card className="border-none shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FiClock className="text-indigo-600" />
                            Currently Active Exams
                        </h2>
                        <Badge variant="info" size="lg">{exams.length} Active</Badge>
                    </div>
                    {exams.length > 0 ? (
                        <Table columns={columns} data={exams} />
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                <FiMonitor className="text-gray-300 w-10 h-10" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No ongoing exams</h3>
                            <p className="text-gray-500 mt-1">There are currently no active examination sessions in your department.</p>
                        </div>
                    )}
                </Card>
            ) : (
                <Card className="border-none shadow-sm p-8">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="border-b pb-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <FiSettings className="text-indigo-600" />
                                    Department Accountability Rules
                                </h2>
                                <p className="text-gray-500 mt-1">Set default security rules for all new exams created in your department.</p>
                            </div>
                            <Button onClick={saveSettings} className="flex items-center gap-2 shadow-lg" loading={loading}>
                                <FiSave className="w-4 h-4" />
                                Save Defaults
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Security Toggles */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FiLock className="text-indigo-600" />
                                    Strict Enforcement
                                </h3>

                                <div className="space-y-4">
                                    {[
                                        { id: 'enforceFullscreen', label: 'Enforce Fullscreen Mode', desc: 'Students must stay in fullscreen' },
                                        { id: 'blockNotifications', label: 'Block Browser Notifications', desc: 'Prevents distractions/alerts' },
                                        { id: 'tabSwitchingAllowed', label: 'Allow Tab Switching', desc: 'Allow students to visit other tabs' },
                                        { id: 'cameraRequired', label: 'Require Real-time Camera Monitoring', desc: 'Activate student webcams for proctoring' },
                                    ].map(field => (
                                        <div key={field.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group transition-all hover:bg-white hover:shadow-md">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    name={field.id}
                                                    checked={settings[field.id]}
                                                    onChange={handleSettingsChange}
                                                    className="w-5 h-5 text-indigo-600 rounded-lg border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <div>
                                                    <p className="font-bold text-gray-800">{field.label}</p>
                                                    <p className="text-xs text-gray-500">{field.desc}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name={`isLocked.${field.id}`}
                                                        checked={settings.isLocked?.[field.id]}
                                                        onChange={handleSettingsChange}
                                                        className="SR-ONLY"
                                                    />
                                                    <Badge
                                                        variant={settings.isLocked?.[field.id] ? 'danger' : 'secondary'}
                                                        className="cursor-pointer"
                                                    >
                                                        {settings.isLocked?.[field.id] ? <FiLock className="w-3 h-3 mr-1 inline" /> : <FiUnlock className="w-3 h-3 mr-1 inline" />}
                                                        {settings.isLocked?.[field.id] ? 'LOCKED' : 'OPTIONAL'}
                                                    </Badge>
                                                </label>
                                                <p className="text-[10px] text-gray-400">Locked rules cannot be changed by faculty</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Limits */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FiAlertCircle className="text-indigo-600" />
                                    Violation Thresholds
                                </h3>

                                <div className="space-y-4">
                                    <Input
                                        label="Max Tab Switches Allowed"
                                        name="maxTabSwitches"
                                        type="number"
                                        value={settings.maxTabSwitches}
                                        onChange={handleSettingsChange}
                                    />
                                    <Input
                                        label="Max Fullscreen Exits"
                                        name="maxFullscreenExits"
                                        type="number"
                                        value={settings.maxFullscreenExits}
                                        onChange={handleSettingsChange}
                                    />
                                    <Input
                                        label="Max Copy-Paste Attempts"
                                        name="maxCopyPaste"
                                        type="number"
                                        value={settings.maxCopyPaste}
                                        onChange={handleSettingsChange}
                                    />
                                    <Select
                                        label="Default Action on Limit Reach"
                                        name="actionOnLimit"
                                        value={settings.actionOnLimit}
                                        onChange={handleSettingsChange}
                                        options={[
                                            { value: 'warn', label: 'Warning Only' },
                                            { value: 'auto-submit', label: 'Auto Submit Exam' },
                                            { value: 'lock', label: 'Lock Exam Access' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3">
                            <FiAlertCircle className="text-yellow-600 w-6 h-6 flex-shrink-0" />
                            <div>
                                <p className="text-yellow-800 font-bold">Important Note</p>
                                <p className="text-sm text-yellow-700">Changing these defaults will only affect exams created after the change. Existing exams will retain their original settings. Rules marked as "LOCKED" will be forced on all faculty members in your department.</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Proctoring;
