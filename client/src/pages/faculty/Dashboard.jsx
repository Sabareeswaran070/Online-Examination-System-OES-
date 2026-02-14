import { useState, useEffect } from 'react';
import { FiFileText, FiHelpCircle, FiCheckCircle, FiClock, FiBook } from 'react-icons/fi';
import StatCard from '@/components/dashboard/StatCard.jsx';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import { facultyService } from '@/services';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await facultyService.getDashboard();


      // response is { success: true, data: { ... } }
      const dashboardData = response.data;

      // Transform the data to match the expected structure
      const transformedStats = {
        totalExams: dashboardData?.statistics?.totalExams || 0,
        totalQuestions: dashboardData?.statistics?.totalQuestions || 0,
        upcomingExams: dashboardData?.upcomingExams?.length || 0,
        completedExams: dashboardData?.statistics?.completedExams || 0,
        upcomingExamsList: dashboardData?.upcomingExams || [],
        recentExamsList: dashboardData?.recentExams || [],
        assignedSubjects: dashboardData?.subjects || [],
      };

      setStats(transformedStats);
    } catch (error) {
      console.error('Faculty Dashboard - Error:', error);
      console.error('Faculty Dashboard - Error Response:', error.response);
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };



  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || colors.draft;
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Faculty Dashboard</h1>
        <p className="mt-2 opacity-90">Manage your exams, questions, and evaluate student performance</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Exams"
          value={stats?.totalExams || 0}
          icon={FiFileText}
          color="primary"
        />
        <StatCard
          title="Question Bank"
          value={stats?.totalQuestions || 0}
          icon={FiHelpCircle}
          color="success"
        />
        <StatCard
          title="Upcoming"
          value={stats?.upcomingExams || 0}
          icon={FiClock}
          color="warning"
        />
        <StatCard
          title="Subjects"
          value={stats?.assignedSubjects?.length || 0}
          icon={FiBook}
          color="info"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <Card
          title="Upcoming Exams"
          action={
            <Button size="sm" onClick={() => navigate('/faculty/exams')}>
              View All
            </Button>
          }
        >
          <div className="space-y-3">
            {stats?.upcomingExamsList && stats.upcomingExamsList.length > 0 ? (
              stats.upcomingExamsList.slice(0, 5).map((exam) => (
                <div
                  key={exam._id}
                  className="group p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/faculty/exams/${exam._id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {exam.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <FiBook className="inline w-4 h-4 mr-1" />
                        {exam.subject?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        <FiClock className="inline w-3 h-3 mr-1" />
                        {formatDateTime(exam.startTime)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                      {exam.status}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 flex gap-4 text-xs text-gray-600">
                    <span>⏱️ {exam.duration} min</span>
                    <span>📝 {exam.questions?.length || 0} questions</span>
                    <span>💯 {exam.totalMarks} marks</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FiClock className="mx-auto w-12 h-12 text-gray-300" />
                <p className="text-gray-500 mt-3">No upcoming exams</p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/faculty/exams')}
                >
                  Create Exam
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Exams */}
        <Card
          title="Recent Exams"
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/faculty/exams')}>
              Manage
            </Button>
          }
        >
          <div className="space-y-3">
            {stats?.recentExamsList && stats.recentExamsList.length > 0 ? (
              stats.recentExamsList.slice(0, 5).map((exam) => (
                <div
                  key={exam._id}
                  className="group p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/faculty/exams/${exam._id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {exam.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {exam.subject?.name || 'N/A'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                      {exam.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FiFileText className="mx-auto w-12 h-12 text-gray-300" />
                <p className="text-gray-500 mt-3">No exams created yet</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Assigned Subjects */}
      <Card
        title="Assigned Subjects"
        action={
          <Button size="sm" variant="secondary" onClick={() => navigate('/faculty/questions')}>
            Question Bank
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.assignedSubjects && stats.assignedSubjects.length > 0 ? (
            stats.assignedSubjects.map((subject) => (
              <div
                key={subject._id}
                className="p-5 bg-gradient-to-br from-primary-50 to-white rounded-lg border border-primary-100 hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => navigate('/faculty/questions', { state: { subject: subject._id } })}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {subject.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{subject.subjectCode}</p>
                    {subject.credits && (
                      <span className="inline-block mt-2 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded">
                        {subject.credits} credits
                      </span>
                    )}
                  </div>
                  <FiBook className="w-8 h-8 text-primary-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-12">
              <FiBook className="mx-auto w-12 h-12 text-gray-300" />
              <p className="text-gray-500 mt-3">No subjects assigned</p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/faculty/exams')}
            className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-lg transition-all group text-left"
          >
            <FiFileText className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
            <h3 className="mt-3 font-semibold text-gray-900">Create Exam</h3>
            <p className="text-sm text-gray-600 mt-1">Design and schedule new exams</p>
          </button>

          <button
            onClick={() => navigate('/faculty/questions')}
            className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-lg transition-all group text-left"
          >
            <FiHelpCircle className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
            <h3 className="mt-3 font-semibold text-gray-900">Add Questions</h3>
            <p className="text-sm text-gray-600 mt-1">Build your question bank</p>
          </button>

          <button
            onClick={() => navigate('/faculty/exams')}
            className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-lg transition-all group text-left"
          >
            <FiCheckCircle className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
            <h3 className="mt-3 font-semibold text-gray-900">Evaluate Results</h3>
            <p className="text-sm text-gray-600 mt-1">Review and grade submissions</p>
          </button>
        </div>
      </Card>


    </div>
  );
};

export default FacultyDashboard;
