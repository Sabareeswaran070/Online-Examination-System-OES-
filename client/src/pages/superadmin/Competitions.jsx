import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/common/Modal';
import Loader from '@/components/common/Loader';
import Input from '@/components/common/Input';
import { superAdminService, competitionService } from '@/services';
import {
  FiPlus, FiEdit, FiTrash2, FiCalendar, FiClock, FiCode, FiSearch,
  FiCheck, FiAward, FiChevronRight, FiX, FiTarget, FiFolder,
  FiSend, FiPlay, FiEye, FiCheckCircle, FiXCircle, FiUsers,
  FiBarChart2, FiActivity, FiHash, FiPercent,
} from 'react-icons/fi';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────
const STATUS_TABS = [
  { key: 'pending', label: 'Pending', icon: FiClock, color: 'yellow' },
  { key: 'published', label: 'Published', icon: FiSend, color: 'blue' },
  { key: 'approved', label: 'Approved', icon: FiCheckCircle, color: 'green' },
  { key: 'live', label: 'Live', icon: FiPlay, color: 'red' },
];

const TAB_COLORS = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-500', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  published: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-500', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 border-green-200' },
  live: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-500', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 border-red-200' },
  completed: { bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-400', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { bg: 'bg-gray-50', text: 'text-gray-500', ring: 'ring-gray-300', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const AdminCompetitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // Create / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedComp, setSelectedComp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Questions
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [qSearch, setQSearch] = useState('');
  const [qLoading, setQLoading] = useState(false);
  const [questionSets, setQuestionSets] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');

  // College status modal
  const [showCollegesModal, setShowCollegesModal] = useState(false);
  const [collegeData, setCollegeData] = useState({ stats: {}, data: [] });
  const [collegeLoading, setCollegeLoading] = useState(false);
  const [collegeCompId, setCollegeCompId] = useState(null);

  // Live Scores modal
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [scoresData, setScoresData] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoresTab, setScoresTab] = useState('colleges');
  const [scoresAutoRefresh, setScoresAutoRefresh] = useState(false);

  const [formData, setFormData] = useState({
    title: '', description: '', startTime: '', endTime: '',
    duration: 60, totalMarks: 0, passingMarks: 0, instructions: '', questions: [],
  });

  // ─── Data Fetching ─────────────────────────────────────────
  useEffect(() => { fetchCompetitions(); }, [activeTab]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const response = await competitionService.getAllCompetitions({ status: activeTab, limit: 100 });
      setCompetitions(response.data || []);
    } catch (error) {
      console.error('Error fetching competitions:', error);
      toast.error('Failed to load competitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionSets = async () => {
    try {
      const res = await superAdminService.getQuestionSets();
      setQuestionSets(res.data || []);
    } catch (error) { console.error('Error fetching question sets:', error); }
  };

  const fetchQuestions = async (search = '', folder = '') => {
    setQLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.search = search;
      if (folder) params.questionSet = folder;
      const res = await superAdminService.getQuestions(params);
      setAvailableQuestions(res.data || []);
    } catch (error) { console.error('Error fetching questions:', error); }
    finally { setQLoading(false); }
  };

  const fetchLiveScores = async (compId) => {
    setScoresLoading(true);
    try {
      const res = await competitionService.getCompetitionLiveScores(compId);
      setScoresData(res);
      setShowScoresModal(true);
    } catch (error) {
      toast.error('Failed to load live scores');
    } finally { setScoresLoading(false); }
  };

  const fetchCollegeStatus = async (compId) => {
    setCollegeLoading(true);
    setCollegeCompId(compId);
    try {
      const res = await competitionService.getCompetitionColleges(compId);
      setCollegeData({ stats: res.stats || {}, data: res.data || [] });
      setShowCollegesModal(true);
    } catch (error) {
      toast.error('Failed to load college data');
    } finally { setCollegeLoading(false); }
  };

  // ─── Create / Edit Handlers ────────────────────────────────
  const handleOpenModal = (comp = null) => {
    if (comp) {
      setIsEditing(true);
      setSelectedComp(comp);
      setFormData({
        title: comp.title,
        description: comp.description || '',
        startTime: new Date(comp.startTime).toISOString().slice(0, 16),
        endTime: new Date(comp.endTime).toISOString().slice(0, 16),
        duration: comp.duration,
        totalMarks: comp.totalMarks,
        passingMarks: comp.passingMarks,
        instructions: comp.instructions || '',
        questions: comp.questions?.map(q => ({
          questionId: q.questionId?._id || q.questionId,
          order: q.order,
          _q: q.questionId,
        })) || [],
      });
    } else {
      setIsEditing(false);
      setSelectedComp(null);
      setFormData({
        title: '', description: '', startTime: '', endTime: '',
        duration: 60, totalMarks: 0, passingMarks: 0, instructions: '', questions: [],
      });
    }
    setStep(1);
    setQSearch('');
    setSelectedFolder('');
    fetchQuestions();
    fetchQuestionSets();
    setShowModal(true);
  };

  const toggleQuestion = (q) => {
    const isSelected = formData.questions.some(fq => fq.questionId === q._id);
    let newQuestions;
    if (isSelected) {
      newQuestions = formData.questions.filter(fq => fq.questionId !== q._id);
    } else {
      newQuestions = [...formData.questions, { questionId: q._id, order: formData.questions.length + 1, _q: q }];
    }
    const totalMarks = newQuestions.reduce((sum, fq) => {
      const question = fq._q || availableQuestions.find(aq => aq._id === fq.questionId);
      return sum + (question?.marks || 0);
    }, 0);
    setFormData({ ...formData, questions: newQuestions, totalMarks, passingMarks: Math.ceil(totalMarks * 0.4) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.questions.length === 0) { toast.error('Please select at least one question'); setStep(2); return; }
    if (!formData.title || !formData.startTime || !formData.endTime) { toast.error('Please fill all required fields'); setStep(1); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title, description: formData.description,
        startTime: formData.startTime, endTime: formData.endTime,
        duration: Number(formData.duration), totalMarks: Number(formData.totalMarks),
        passingMarks: Number(formData.passingMarks), instructions: formData.instructions,
        questions: formData.questions.map(({ questionId, order }) => ({ questionId, order })),
      };
      if (isEditing) {
        await competitionService.updateCompetition(selectedComp._id, payload);
        toast.success('Competition updated!');
      } else {
        await competitionService.createCompetition(payload);
        toast.success('Competition created!');
      }
      setShowModal(false);
      fetchCompetitions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save competition');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this competition permanently?')) {
      try {
        await competitionService.deleteCompetition(id);
        toast.success('Competition deleted');
        fetchCompetitions();
      } catch (error) { toast.error(error.response?.data?.message || 'Failed to delete'); }
    }
  };

  // ─── Workflow Actions ──────────────────────────────────────
  const handlePublish = async (id) => {
    if (!window.confirm('Publish this competition to all colleges?')) return;
    try {
      const res = await competitionService.publishCompetition(id);
      toast.success(res.message || 'Published!');
      fetchCompetitions();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to publish'); }
  };

  const handleMakeLive = async (id) => {
    if (!window.confirm('Make this competition live? Students will be able to participate.')) return;
    try {
      const res = await competitionService.makeCompetitionLive(id);
      toast.success(res.message || 'Competition is live!');
      fetchCompetitions();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to make live'); }
  };

  const handleApproveCollege = async (collegeId, approve) => {
    try {
      await competitionService.approveCollege(collegeCompId, collegeId, approve, '');
      toast.success(approve ? 'College approved' : 'College not approved');
      fetchCollegeStatus(collegeCompId);
    } catch (error) { toast.error('Failed to update college approval'); }
  };

  const handleApproveAll = async () => {
    try {
      const res = await competitionService.approveAllAccepted(collegeCompId);
      toast.success(res.message || 'All accepted colleges approved');
      fetchCollegeStatus(collegeCompId);
    } catch (error) { toast.error('Failed to approve all'); }
  };

  // ─── Tab counts helper ────────────────────────────────────
  const getTabCount = (status) => {
    // We display current tab data. For other tabs we don't have live count.
    if (status === activeTab) return competitions.length;
    return null;
  };

  const colors = (status) => TAB_COLORS[status] || TAB_COLORS.pending;

  // ─── Render ────────────────────────────────────────────────
  if (loading && competitions.length === 0) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FiAward className="w-8 h-8" /> Competitions
            </h1>
            <p className="mt-1 opacity-90">Create, publish, and manage competitions across colleges</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            <FiPlus className="w-5 h-5" /> New Competition
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? `bg-${tab.color}-50 text-${tab.color}-700 ring-1 ring-${tab.color}-300 shadow-sm`
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {getTabCount(tab.key) !== null && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? `bg-${tab.color}-100` : 'bg-gray-100'}`}>
                  {getTabCount(tab.key)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Competition Cards */}
      {loading ? (
        <Loader />
      ) : competitions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
            <FiCode className="w-10 h-10 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No {activeTab} competitions</h3>
          <p className="text-gray-500 mb-6">
            {activeTab === 'pending' && 'Create a new competition to get started'}
            {activeTab === 'published' && 'Publish a pending competition to see it here'}
            {activeTab === 'approved' && 'Approve college acceptances to move competitions here'}
            {activeTab === 'live' && 'Make an approved competition live for students'}
          </p>
          {activeTab === 'pending' && (
            <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all">
              <FiPlus className="inline mr-2 w-4 h-4" /> Create Competition
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {competitions.map((comp) => {
            const c = colors(comp.status);
            return (
              <div key={comp._id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${c.badge}`}>
                      <div className={`w-2 h-2 rounded-full ${c.dot}`}></div>
                      {comp.status?.charAt(0).toUpperCase() + comp.status?.slice(1)}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(comp.status === 'pending' || comp.status === 'published') && (
                        <button onClick={() => handleOpenModal(comp)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Edit">
                          <FiEdit className="w-4 h-4" />
                        </button>
                      )}
                      {comp.status !== 'live' && (
                        <button onClick={() => handleDelete(comp._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{comp.title}</h3>
                  {comp.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{comp.description}</p>
                  )}
                </div>

                {/* Stats Row */}
                <div className="px-5 pb-4 grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <FiClock className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-800">{comp.duration}m</p>
                    <p className="text-[10px] text-gray-400 uppercase">Duration</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <FiTarget className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-800">{comp.totalMarks}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Marks</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <FiCode className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-800">{comp.questions?.length || 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Questions</p>
                  </div>
                </div>

                {/* College stats (published/approved/live) */}
                {comp.collegeStats && comp.status !== 'pending' && (
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500"><FiUsers className="inline w-3 h-3 mr-1" />{comp.collegeStats.total} colleges</span>
                      <span className="text-green-600">{comp.collegeStats.accepted} accepted</span>
                      <span className="text-red-500">{comp.collegeStats.rejected} rejected</span>
                      <span className="text-blue-600">{comp.collegeStats.approved} approved</span>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <FiCalendar className="w-3 h-3" />
                    {formatDateTime(comp.startTime)} — {formatDateTime(comp.endTime)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
                  {comp.status === 'pending' && (
                    <button onClick={() => handlePublish(comp._id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                      <FiSend className="w-3.5 h-3.5" /> Publish
                    </button>
                  )}
                  {(comp.status === 'published' || comp.status === 'approved') && (
                    <>
                      <button onClick={() => fetchCollegeStatus(comp._id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                        <FiEye className="w-3.5 h-3.5" /> Colleges
                      </button>
                      <button onClick={() => handleMakeLive(comp._id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
                        <FiPlay className="w-3.5 h-3.5" /> Go Live
                      </button>
                    </>
                  )}
                  {comp.status === 'live' && (
                    <>
                      <button onClick={() => fetchLiveScores(comp._id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white text-sm font-semibold rounded-lg hover:from-red-700 hover:to-pink-700 transition-all shadow-sm">
                        <FiActivity className="w-3.5 h-3.5 animate-pulse" /> Live Scores
                      </button>
                      <button onClick={() => fetchCollegeStatus(comp._id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                        <FiEye className="w-3.5 h-3.5" /> Colleges
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create / Edit Modal ──────────────────────────────── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="" size="xl">
        <div className="space-y-5">
          <div className="text-center pb-4 border-b">
            <h2 className="text-xl font-bold text-gray-800">
              {isEditing ? 'Edit Competition' : 'Create Competition'}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => setStep(1)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${step === 1 ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span> Details
              </button>
              <FiChevronRight className="w-4 h-4 text-gray-300" />
              <button onClick={() => setStep(2)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${step === 2 ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span> Questions ({formData.questions.length})
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g., CodeSprint Challenge 2026" />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-sm" rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What's this competition about..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Start Time" type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required />
                  <Input label="End Time" type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (min)</label>
                    <div className="flex gap-1.5">
                      {[30, 60, 90, 120].map(d => (
                        <button key={d} type="button" onClick={() => setFormData({ ...formData, duration: d })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.duration == d ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <Input label="Total Marks" type="number" value={formData.totalMarks} onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })} required />
                  <Input label="Passing Marks" type="number" value={formData.passingMarks} onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Instructions</label>
                  <textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-sm" rows="2" value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} placeholder="Any special instructions for participants..." />
                </div>
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all">
                    Next: Pick Questions <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search questions..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm" value={qSearch} onChange={(e) => { setQSearch(e.target.value); fetchQuestions(e.target.value, selectedFolder); }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setSelectedFolder(''); fetchQuestions(qSearch, ''); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${selectedFolder === '' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'}`}>
                    <FiCode className="w-3 h-3" /> All Questions
                  </button>
                  {questionSets.map(folder => (
                    <button type="button" key={folder._id} onClick={() => { setSelectedFolder(folder._id); fetchQuestions(qSearch, folder._id); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${selectedFolder === folder._id ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'}`}>
                      <FiFolder className="w-3 h-3" /> {folder.name}
                    </button>
                  ))}
                </div>
                {formData.questions.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-100">
                    <FiCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">{formData.questions.length} questions selected &bull; {formData.totalMarks} total marks</span>
                  </div>
                )}
                <div className="max-h-[45vh] overflow-y-auto border border-gray-100 rounded-xl divide-y">
                  {qLoading ? (
                    <div className="p-8 text-center text-gray-400">Loading questions...</div>
                  ) : availableQuestions.length > 0 ? availableQuestions.map((q) => {
                    const isSelected = formData.questions.some(fq => fq.questionId === q._id);
                    return (
                      <div key={q._id} onClick={() => toggleQuestion(q)} className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{q.questionText}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${q.type === 'Coding' ? 'bg-violet-100 text-violet-700' : q.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{q.type}</span>
                            <span className="text-[10px] text-gray-500">{q.marks} marks</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${q.difficulty === 'easy' ? 'bg-green-50 text-green-600' : q.difficulty === 'hard' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>{q.difficulty}</span>
                            {q.questionSet?.name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 flex items-center gap-0.5"><FiFolder className="w-2.5 h-2.5" /> {q.questionSet.name}</span>
                            )}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 ml-3 transition-all ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'}`}>
                          {isSelected && <FiCheck className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="p-8 text-center text-gray-400">No questions found</div>
                  )}
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">Back</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all">
                    {submitting ? 'Saving...' : isEditing ? 'Update Competition' : 'Create Competition'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </Modal>

      {/* ─── College Status Modal ─────────────────────────────── */}
      <Modal isOpen={showCollegesModal} onClose={() => setShowCollegesModal(false)} title="College Responses" size="lg">
        {collegeLoading ? (
          <Loader />
        ) : (
          <div className="space-y-5">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: 'Total', value: collegeData.stats.total, bg: 'bg-gray-50', text: 'text-gray-700' },
                { label: 'Pending', value: collegeData.stats.pending, bg: 'bg-yellow-50', text: 'text-yellow-700' },
                { label: 'Accepted', value: collegeData.stats.accepted, bg: 'bg-green-50', text: 'text-green-700' },
                { label: 'Rejected', value: collegeData.stats.rejected, bg: 'bg-red-50', text: 'text-red-700' },
                { label: 'Approved', value: collegeData.stats.approved, bg: 'bg-blue-50', text: 'text-blue-700' },
                { label: 'Not Approved', value: collegeData.stats.notApproved, bg: 'bg-orange-50', text: 'text-orange-700' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-bold ${s.text}`}>{s.value || 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Bulk Approve */}
            {collegeData.data.some(a => a.collegeStatus === 'accepted' && a.approvalStatus === 'pending') && (
              <div className="flex justify-end">
                <button onClick={handleApproveAll} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
                  <FiCheckCircle className="w-4 h-4" /> Approve All Accepted
                </button>
              </div>
            )}

            {/* College List */}
            <div className="border rounded-xl divide-y max-h-[50vh] overflow-y-auto">
              {collegeData.data.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No colleges assigned</div>
              ) : collegeData.data.map((a) => (
                <div key={a._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{a.collegeId?.collegeName || 'Unknown College'}</p>
                    <p className="text-xs text-gray-500">{a.collegeId?.collegeCode}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        a.collegeStatus === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                        a.collegeStatus === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        College: {a.collegeStatus}
                      </span>
                      {a.collegeStatus === 'accepted' && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          a.approvalStatus === 'approved' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          a.approvalStatus === 'not-approved' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          Approval: {a.approvalStatus}
                        </span>
                      )}
                    </div>
                    {a.collegeRejectReason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {a.collegeRejectReason}</p>
                    )}
                  </div>
                  {/* Approve/Not-Approve buttons for accepted + pending approval */}
                  {a.collegeStatus === 'accepted' && a.approvalStatus === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveCollege(a.collegeId?._id, true)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">
                        <FiCheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleApproveCollege(a.collegeId?._id, false)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200">
                        <FiXCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
      {/* ─── Live Scores Modal ─────────────────────────────── */}
      <Modal isOpen={showScoresModal} onClose={() => { setShowScoresModal(false); setScoresAutoRefresh(false); }} title="" size="xl">
        {scoresLoading && !scoresData ? (
          <Loader />
        ) : scoresData ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FiActivity className="w-5 h-5 text-red-500 animate-pulse" />
                  Live Scores — {scoresData.competition?.title}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Total Marks: {scoresData.competition?.totalMarks} &bull; Pass: {scoresData.competition?.passingMarks} &bull; Duration: {scoresData.competition?.duration}m
                </p>
              </div>
              <button
                onClick={() => fetchLiveScores(scoresData.competition?._id)}
                disabled={scoresLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <FiActivity className={`w-4 h-4 ${scoresLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: 'Participants', value: scoresData.summary?.totalParticipants, bg: 'bg-purple-50', text: 'text-purple-700', icon: FiUsers },
                { label: 'In Progress', value: scoresData.summary?.inProgress, bg: 'bg-yellow-50', text: 'text-yellow-700', icon: FiClock },
                { label: 'Submitted', value: scoresData.summary?.submitted, bg: 'bg-green-50', text: 'text-green-700', icon: FiCheckCircle },
                { label: 'Colleges', value: scoresData.summary?.totalColleges, bg: 'bg-indigo-50', text: 'text-indigo-700', icon: FiUsers },
                { label: 'Avg Score', value: scoresData.summary?.avgScore, bg: 'bg-blue-50', text: 'text-blue-700', icon: FiBarChart2 },
                { label: 'Highest', value: scoresData.summary?.highestScore, bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FiAward },
                { label: 'Pass Rate', value: `${scoresData.summary?.passRate || 0}%`, bg: 'bg-teal-50', text: 'text-teal-700', icon: FiPercent },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-white/50`}>
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${s.text}`} />
                    <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { key: 'colleges', label: 'College Leaderboard', icon: FiUsers },
                { key: 'students', label: 'Student Leaderboard', icon: FiHash },
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setScoresTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      scoresTab === t.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* College Leaderboard */}
            {scoresTab === 'colleges' && (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">#</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">College</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Students</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">In Progress</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Submitted</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Avg Score</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Highest</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Avg %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {scoresData.collegeLeaderboard?.length > 0 ? scoresData.collegeLeaderboard.map((c, idx) => (
                      <tr key={idx} className={`hover:bg-gray-50 ${idx < 3 ? 'bg-yellow-50/30' : ''}`}>
                        <td className="px-4 py-3 font-bold text-gray-600">
                          {c.rank <= 3 ? (
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              c.rank === 1 ? 'bg-yellow-500' : c.rank === 2 ? 'bg-gray-400' : 'bg-orange-400'
                            }`}>{c.rank}</span>
                          ) : c.rank}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{c.collegeName}</p>
                          <p className="text-xs text-gray-400">{c.collegeCode}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">{c.totalStudents}</td>
                        <td className="px-4 py-3 text-center">
                          {c.inProgress > 0 ? (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">{c.inProgress}</span>
                          ) : <span className="text-gray-300">0</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">{c.submitted}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-blue-700">{c.avgScore}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-700">{c.highestScore}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            c.avgPercentage >= 75 ? 'bg-green-100 text-green-700' :
                            c.avgPercentage >= 50 ? 'bg-blue-100 text-blue-700' :
                            c.avgPercentage >= 30 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{c.avgPercentage}%</span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-400">No scores yet — waiting for participants</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Student Leaderboard */}
            {scoresTab === 'students' && (
              <div className="border rounded-xl overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-purple-50 to-pink-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-700">#</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700">Student</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700">College</th>
                        <th className="px-4 py-3 text-center font-bold text-gray-700">Score</th>
                        <th className="px-4 py-3 text-center font-bold text-gray-700">%</th>
                        <th className="px-4 py-3 text-center font-bold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-center font-bold text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scoresData.studentLeaderboard?.length > 0 ? scoresData.studentLeaderboard.map((s, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50 ${idx < 3 ? 'bg-yellow-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            {s.rank <= 3 ? (
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                s.rank === 1 ? 'bg-yellow-500' : s.rank === 2 ? 'bg-gray-400' : 'bg-orange-400'
                              }`}>{s.rank}</span>
                            ) : <span className="font-bold text-gray-500">{s.rank}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{s.studentName}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-700">{s.collegeName}</p>
                            <p className="text-xs text-gray-400">{s.departmentName}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-lg font-bold text-gray-900">{s.score}</span>
                            <span className="text-xs text-gray-400">/{scoresData.competition?.totalMarks}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              s.percentage >= 75 ? 'bg-green-100 text-green-700' :
                              s.percentage >= 50 ? 'bg-blue-100 text-blue-700' :
                              s.percentage >= 30 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>{Math.round(s.percentage)}%</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {s.status === 'in-progress' ? (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center gap-1 justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div> Taking
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                s.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>{s.isPassed ? 'Passed' : 'Failed'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                            {s.totalTimeTaken ? `${s.totalTimeTaken}m` : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400">No participants yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AdminCompetitions;
