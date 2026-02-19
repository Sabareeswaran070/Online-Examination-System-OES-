import { useState, useEffect } from 'react';
import { FiFileText, FiCheckCircle, FiTrendingUp, FiAward } from 'react-icons/fi';
import StatCard from '@/components/dashboard/StatCard.jsx';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import Button from '@/components/common/Button.jsx';
import { studentService } from '@/services';
import { useNavigate } from 'react-router-dom';
import { formatDateTime, isExamActive } from '@/utils/dateUtils';
import { formatPercentage, getGrade } from '@/utils/helpers';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await studentService.getDashboard();

      setStats(response.data);
    } catch (error) {
      console.error('Student Dashboard - Error:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };



  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600 mt-1">Track your academic performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Exams Taken"
          value={stats?.statistics?.totalExamsGiven || 0}
          icon={FiFileText}
          color="primary"
        />
        <StatCard
          title="Average Score"
          value={formatPercentage(stats?.statistics?.avgPercentage || 0)}
          icon={FiTrendingUp}
          color="success"
        />
        <StatCard
          title="Exams Passed"
          value={stats?.statistics?.examsPassed || 0}
          icon={FiCheckCircle}
          color="info"
        />
        <StatCard
          title="Current Rank"
          value={stats?.statistics?.currentRank || 'N/A'}
          icon={FiAward}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Upcoming Exams"
          action={
            <Button size="sm" onClick={() => navigate('/student/exams')}>
              View All
            </Button>
          }
        >
          <div className="space-y-3">
            {stats?.upcomingExams?.length > 0 ? (
              stats.upcomingExams.slice(0, 5).map((exam) => (
                <div key={exam._id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{exam.subject?.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(exam.startTime)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/student/exams/${exam._id}`)}
                      disabled={!isExamActive(exam.startTime, exam.endTime)}
                    >
                      {isExamActive(exam.startTime, exam.endTime) ? 'Start' : 'View'}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming exams</p>
            )}
          </div>
        </Card>

        <Card
          title="Recent Results"
          action={
            <Button size="sm" onClick={() => navigate('/student/results')}>
              View All
            </Button>
          }
        >
          <div className="space-y-3">
            {stats?.recentResults?.length > 0 ? (
              stats.recentResults.slice(0, 5).map((result) => (
                <div key={result._id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{result.examId?.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Score: {result.score}/{result.examId?.totalMarks}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">
                        {formatPercentage(result.percentage)}
                      </p>
                      <span className="text-sm text-gray-600">
                        Grade: {getGrade(result.percentage)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No results available</p>
            )}
          </div>
        </Card>
      </div>

      {stats?.performanceChart && (
        <Card title="Performance Overview">
          <div className="text-center py-8">
            <p className="text-gray-500">Performance chart will be displayed here</p>
          </div>
        </Card>
      )}


    </div>
  );
};

export default StudentDashboard;
