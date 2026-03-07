import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiFilter, FiCalendar, FiChevronDown,
  FiFileText, FiCheckCircle, FiClock, FiTrendingUp,
  FiGlobe, FiLayers, FiUser, FiArrowRight, FiDownload,
  FiX
} from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { studentService } from '@/services';
import { formatDateTime, formatDate } from '@/utils/dateUtils';
import { formatPercentage, getGrade, getGradeColor } from '@/utils/helpers';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const Results = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Latest First');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resultsRes, analyticsRes] = await Promise.all([
        studentService.getResults(),
        studentService.getAnalytics()
      ]);
      setResults(resultsRes.data || []);
      setAnalytics(analyticsRes.data || null);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results data');
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    let filtered = results.filter(row => {
      const matchesSearch = row.examId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.examId?.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Date Filter logic
      if (dateFilter) {
        const rowDate = new Date(row.examId?.startTime).toISOString().split('T')[0];
        if (rowDate !== dateFilter) return false;
      }

      if (activeFilter === 'All') return true;
      if (activeFilter === 'Global') return !row.examId?.collegeId;
      if (activeFilter === 'College') return row.examId?.collegeId && !row.examId?.departmentId;
      if (activeFilter === 'Department') return !!row.examId?.departmentId;
      if (activeFilter === 'Faculty') return !!row.examId?.facultyId;

      return true;
    });

    if (sortBy === 'Latest First') {
      filtered.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'Highest Score') {
      filtered.sort((a, b) => {
        const scoreA = a.isPublished ? (a.percentage || 0) : -1;
        const scoreB = b.isPublished ? (b.percentage || 0) : -1;
        return scoreB - scoreA;
      });
    }

    return filtered;
  }, [results, searchQuery, activeFilter, sortBy, dateFilter]);

  if (loading) return <Loader fullScreen />;

  const stats = [
    {
      label: 'Exams Appeared',
      value: results.length,
      icon: FiFileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      label: 'Results Published',
      value: results.filter(r => r.isPublished).length,
      icon: FiCheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      label: 'Awaiting Results',
      value: results.filter(r => !r.isPublished).length,
      icon: FiClock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      label: 'Avg Performance',
      value: `${formatPercentage(analytics?.overallStats?.avgPercentage || 0)}`,
      icon: FiTrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 -m-6 p-6">
      {/* Top Header / Profile Info */}
      <div className="bg-white border-b border-slate-200 shadow-sm rounded-xl mb-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-indigo-200 overflow-hidden">
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-indigo-700">
                  {user?.name?.split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <FiUser className="w-3.5 h-3.5" /> Roll: {user?.regNo || user?.enrollmentNumber || 'N/A'}
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full hidden md:block"></span>
                <span className="flex items-center gap-1">
                  <FiLayers className="w-3.5 h-3.5" /> {user?.departmentId?.name || 'Computer Science'}
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full hidden md:block"></span>
                <span className="flex items-center gap-1">
                  <FiCalendar className="w-3.5 h-3.5" /> Semester {user?.semester || '5'}
                </span>
              </div>
            </div>
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors">
            <FiDownload className="w-4 h-4" />
            Download Transcript
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={clsx("p-3 rounded-xl", stat.bgColor)}>
              <stat.icon className={clsx("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-8">
        <div className="p-4 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by exam name or subject..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            <FiFilter className="text-slate-400 mr-2 shrink-0" />
            {['All', 'Global', 'College', 'Department', 'Faculty'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={clsx(
                  "px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                  activeFilter === filter
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0 border-l border-slate-200 pl-4 ml-0 lg:ml-2">
            <div className="relative flex items-center gap-2 px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors group">
              <FiCalendar className="w-3.5 h-3.5 shrink-0" />
              <div className="relative">
                {!dateFilter && <span className="absolute inset-0 flex items-center pointer-events-none opacity-60">Any Date</span>}
                <input
                  type="date"
                  className={clsx(
                    "bg-transparent border-none focus:outline-none focus:ring-0 text-xs font-bold w-24 cursor-pointer appearance-none",
                    !dateFilter && "text-transparent"
                  )}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="p-1 hover:bg-indigo-200 rounded-full transition-colors shrink-0"
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-indigo-50/30 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500 font-medium">
            Showing <span className="font-extrabold text-indigo-600">{filteredResults.length}</span> of <span className="font-bold text-slate-700">{results.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Sorted by:</span>
            <div className="relative group cursor-pointer" onClick={() => setIsSortOpen(!isSortOpen)}>
              <div className="flex items-center gap-1 py-1 px-2 hover:bg-slate-100 rounded-md transition-colors">
                <span className="text-sm font-semibold text-slate-700">{sortBy}</span>
                <FiChevronDown className={clsx("w-3.5 h-3.5 text-slate-500 transition-transform", isSortOpen && "rotate-180")} />
              </div>
              {/* Simple Sort Dropdown */}
              {isSortOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {['Latest First', 'Highest Score'].map(option => (
                    <button
                      key={option}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortBy(option);
                        setIsSortOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results List */}
      {filteredResults.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiFileText className="w-10 h-10 text-slate-200" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No results found</h2>
          <p className="text-slate-500">Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredResults.map((row) => (
            <div
              key={row._id}
              className="bg-white border-l-[6px] border border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 rounded-2xl overflow-hidden group flex flex-col"
              style={{ borderLeftColor: '#4F46E5' }}
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-2">
                    <Badge variant="info" className="rounded-full bg-blue-50 text-blue-600 border-blue-100 px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                      <FiGlobe className="w-3 h-3" /> Global
                    </Badge>
                    <Badge variant="secondary" className="rounded-lg bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                      {row.examId?.questionSets?.[0]?.type || 'Mixed'}
                    </Badge>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                  {row.examId?.title}
                </h3>
                <p className="text-indigo-600 font-semibold text-sm mb-6">
                  {row.examId?.subject?.name}
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-5 flex justify-center"><FiCalendar className="w-4 h-4 text-indigo-500" /></div>
                    <p className="text-sm">Conducted: <span className="font-medium text-slate-700">{formatDate(row.examId?.startTime, 'MMM dd, yyyy')}</span></p>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-600">
                    <div className="w-5 flex justify-center"><FiCheckCircle className="w-4 h-4" /></div>
                    <p className="text-sm">Published: <span className="font-medium">{row.isPublished ? formatDate(row.examId?.resultsPublishedAt, 'MMM dd, yyyy') : 'Pending'}</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-2">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Marks Obtained</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 leading-none">
                          {row.isPublished ? row.score : '--'}
                        </span>
                        <span className="text-lg font-bold text-slate-400">/</span>
                        <span className="text-lg font-bold text-slate-500">
                          {row.examId?.totalMarks || 100}
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                      <span className="text-lg font-black text-emerald-600">
                        {row.isPublished ? getGrade(row.percentage) : '?'}
                      </span>
                    </div>
                  </div>

                  <div className="relative h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "absolute top-0 left-0 h-full rounded-full transition-all duration-1000",
                        row.percentage >= 80 ? "bg-emerald-500" : row.percentage >= 60 ? "bg-blue-500" : "bg-amber-500"
                      )}
                      style={{ width: `${row.isPublished ? row.percentage : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100">
                <button
                  disabled={!row.isPublished}
                  onClick={() => navigate(`/student/results/${row._id}`)}
                  className={clsx(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300",
                    row.isPublished
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 -translate-y-0.5"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  {row.isPublished ? 'View Detailed Result' : 'Processing Result...'}
                  {row.isPublished && <FiArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Results;
