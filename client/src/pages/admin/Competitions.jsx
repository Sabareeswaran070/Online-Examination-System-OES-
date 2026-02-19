import { useState, useEffect } from 'react';
import Loader from '@/components/common/Loader';
import Modal from '@/components/common/Modal';
import { competitionService } from '@/services';
import {
  FiAward, FiClock, FiTarget, FiCode, FiCalendar,
  FiCheckCircle, FiXCircle, FiPlay, FiEye, FiInfo,
  FiFilter, FiInbox, FiList,
} from 'react-icons/fi';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────
const TABS = [
  { key: 'pending', label: 'Pending', icon: FiInbox },
  { key: 'accepted', label: 'Accepted', icon: FiCheckCircle },
  { key: 'rejected', label: 'Rejected', icon: FiXCircle },
  { key: 'all', label: 'All', icon: FiList },
];

const STATUS_CONFIG = {
  pending: { bg: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', label: 'Pending Response' },
  accepted: { bg: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', label: 'Accepted' },
  rejected: { bg: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Rejected' },
};

const APPROVAL_CONFIG = {
  pending: { bg: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Awaiting Approval' },
  approved: { bg: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Approved' },
  'not-approved': { bg: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Not Approved' },
};

const CollegeCompetitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [showDetailModal, setShowDetailModal] = useState(null);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const res = await competitionService.getCollegeCompetitions();
      setCompetitions(res.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load competitions');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (compId) => {
    if (!window.confirm('Accept this competition for your college?')) return;
    setResponding(compId);
    try {
      await competitionService.respondToCompetition(compId, 'accept');
      toast.success('Competition accepted successfully!');
      fetchCompetitions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept');
    } finally {
      setResponding(null);
    }
  };

  const handleReject = async (compId) => {
    setResponding(compId);
    try {
      await competitionService.respondToCompetition(compId, 'reject', rejectReason);
      toast.success('Competition rejected');
      setShowRejectModal(null);
      setRejectReason('');
      fetchCompetitions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setResponding(null);
    }
  };

  // ─── Derived Data ──────────────────────────────────────────
  const stats = {
    total: competitions.length,
    pending: competitions.filter(c => c.collegeStatus === 'pending').length,
    accepted: competitions.filter(c => c.collegeStatus === 'accepted').length,
    rejected: competitions.filter(c => c.collegeStatus === 'rejected').length,
    approved: competitions.filter(c => c.approvalStatus === 'approved').length,
    live: competitions.filter(c => c.competitionStatus === 'live' && c.approvalStatus === 'approved').length,
  };

  const filteredComps = activeTab === 'all'
    ? competitions
    : competitions.filter(c => c.collegeStatus === activeTab);

  const getStatusStyle = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const getApprovalStyle = (status) => APPROVAL_CONFIG[status] || APPROVAL_CONFIG.pending;

  const detailComp = showDetailModal ? competitions.find(c => c._id === showDetailModal) : null;

  // ─── Render ────────────────────────────────────────────────
  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FiAward className="w-8 h-8" /> Competitions
        </h1>
        <p className="mt-1 opacity-90">Review and respond to competitions published by Super Admin</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
          { label: 'Pending', value: stats.pending, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
          { label: 'Accepted', value: stats.accepted, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
          { label: 'Rejected', value: stats.rejected, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
          { label: 'SA Approved', value: stats.approved, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          { label: 'Live Now', value: stats.live, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border ${s.border}`}>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-[11px] mt-0.5 text-gray-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === 'all' ? stats.total : stats[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Competition Cards */}
      {filteredComps.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
            <FiInbox className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">
            {activeTab === 'pending' && 'No pending competitions'}
            {activeTab === 'accepted' && 'No accepted competitions yet'}
            {activeTab === 'rejected' && 'No rejected competitions'}
            {activeTab === 'all' && 'No competitions yet'}
          </h3>
          <p className="text-sm text-gray-500">
            {activeTab === 'pending' ? 'You\'re all caught up!' : 'Competitions published by Super Admin will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredComps.map((comp) => {
            const statusStyle = getStatusStyle(comp.collegeStatus);
            const approvalStyle = getApprovalStyle(comp.approvalStatus);
            const isLive = comp.competitionStatus === 'live' && comp.approvalStatus === 'approved';
            const isPending = comp.collegeStatus === 'pending';

            return (
              <div
                key={comp._id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  isPending ? 'border-2 border-yellow-200' : 'border border-gray-100'
                }`}
              >
                {/* Live indicator bar */}
                {isLive && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-1.5 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    <span className="text-white text-xs font-bold uppercase tracking-wider">Live Now</span>
                  </div>
                )}

                <div className="p-5">
                  {/* Status badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${statusStyle.bg}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></div>
                      {statusStyle.label}
                    </span>
                    {comp.collegeStatus === 'accepted' && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${approvalStyle.bg}`}>
                        {approvalStyle.label}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{comp.title}</h3>
                  {comp.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{comp.description}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <FiClock className="w-4 h-4 text-purple-500 mx-auto mb-0.5" />
                      <p className="text-sm font-bold text-gray-800">{comp.duration}m</p>
                      <p className="text-[10px] text-gray-400">Duration</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <FiTarget className="w-4 h-4 text-blue-500 mx-auto mb-0.5" />
                      <p className="text-sm font-bold text-gray-800">{comp.totalMarks}</p>
                      <p className="text-[10px] text-gray-400">Marks</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <FiCode className="w-4 h-4 text-green-500 mx-auto mb-0.5" />
                      <p className="text-sm font-bold text-gray-800">{comp.totalQuestions}</p>
                      <p className="text-[10px] text-gray-400">Questions</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
                    <FiCalendar className="w-3 h-3" />
                    {formatDateTime(comp.startTime)} — {formatDateTime(comp.endTime)}
                  </div>

                  {/* Created by */}
                  <p className="mt-2 text-[11px] text-gray-400">Created by {comp.createdBy?.name || 'Super Admin'}</p>

                  {/* Approval note */}
                  {comp.approvalNote && (
                    <div className="mt-2 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                      <span className="font-semibold">Note:</span> {comp.approvalNote}
                    </div>
                  )}

                  {/* Response time */}
                  {comp.collegeRespondedAt && (
                    <p className="mt-2 text-[11px] text-gray-400">
                      Responded: {formatDateTime(comp.collegeRespondedAt)}
                    </p>
                  )}
                </div>

                {/* Action bar */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleAccept(comp._id)}
                        disabled={responding === comp._id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <FiCheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={() => setShowRejectModal(comp._id)}
                        disabled={responding === comp._id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        <FiXCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowDetailModal(comp._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-indigo-700 bg-indigo-50 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <FiEye className="w-4 h-4" /> View Details
                    </button>
                  )}
                </div>

                {/* Inline reject reason */}
                {showRejectModal === comp._id && (
                  <div className="px-5 py-3 bg-red-50 border-t border-red-100">
                    <label className="text-xs font-semibold text-red-700 mb-1 block">Reason for rejection</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Optional: explain why you're rejecting..."
                      className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none bg-white"
                      rows="2"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReject(comp._id)}
                        disabled={responding === comp._id}
                        className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {responding === comp._id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                        className="px-4 py-1.5 text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Detail Modal ──────────────────────────────────── */}
      <Modal isOpen={!!detailComp} onClose={() => setShowDetailModal(null)} title="Competition Details" size="md">
        {detailComp && (
          <div className="space-y-5">
            {/* Status ribbon */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(detailComp.collegeStatus).bg}`}>
                Your Response: {getStatusStyle(detailComp.collegeStatus).label}
              </span>
              {detailComp.collegeStatus === 'accepted' && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getApprovalStyle(detailComp.approvalStatus).bg}`}>
                  Super Admin: {getApprovalStyle(detailComp.approvalStatus).label}
                </span>
              )}
              {detailComp.competitionStatus === 'live' && detailComp.approvalStatus === 'approved' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <FiPlay className="w-3 h-3" /> LIVE
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h3 className="text-xl font-bold text-gray-900">{detailComp.title}</h3>
              {detailComp.description && (
                <p className="text-sm text-gray-600 mt-2">{detailComp.description}</p>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">Start Time</p>
                <p className="text-sm font-semibold text-gray-900">{formatDateTime(detailComp.startTime)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">End Time</p>
                <p className="text-sm font-semibold text-gray-900">{formatDateTime(detailComp.endTime)}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">Duration</p>
                <p className="text-sm font-semibold text-purple-700">{detailComp.duration} minutes</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">Total Marks</p>
                <p className="text-sm font-semibold text-blue-700">{detailComp.totalMarks}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">Questions</p>
                <p className="text-sm font-semibold text-green-700">{detailComp.totalQuestions} questions</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 font-medium">Created By</p>
                <p className="text-sm font-semibold text-indigo-700">{detailComp.createdBy?.name || 'Super Admin'}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="border rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-gray-700">Status Timeline</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700">Competition published to your college</span>
                </div>
                {detailComp.collegeRespondedAt && (
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${detailComp.collegeStatus === 'accepted' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-700">
                      You {detailComp.collegeStatus} on {formatDateTime(detailComp.collegeRespondedAt)}
                    </span>
                  </div>
                )}
                {detailComp.approvalStatus !== 'pending' && detailComp.collegeStatus === 'accepted' && (
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${detailComp.approvalStatus === 'approved' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                    <span className="text-sm text-gray-700">
                      Super Admin {detailComp.approvalStatus === 'approved' ? 'approved' : 'did not approve'} your college
                    </span>
                  </div>
                )}
                {detailComp.competitionStatus === 'live' && detailComp.approvalStatus === 'approved' && (
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-sm font-semibold text-emerald-700">Competition is LIVE for your students!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Approval note */}
            {detailComp.approvalNote && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-semibold mb-1">Super Admin Note</p>
                <p className="text-sm text-blue-800">{detailComp.approvalNote}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CollegeCompetitions;
