import { useState, useEffect } from 'react';
import { FiTrendingUp, FiAward, FiTarget, FiBarChart2 } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import StatCard from '@/components/dashboard/StatCard.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { studentService } from '@/services';
import { formatPercentage, getGrade, getGradeColor } from '@/utils/helpers';
import { formatDateTime } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const StudentAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await studentService.getAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const overall = analytics?.overallStats || {};
  const subjectWise = analytics?.subjectWise || [];
  const trend = analytics?.performanceTrend || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
        <p className="text-gray-600 mt-1">Track your academic progress and performance</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Exams"
          value={overall.totalExams || 0}
          icon={FiBarChart2}
          color="primary"
        />
        <StatCard
          title="Average Score"
          value={formatPercentage(overall.avgPercentage || 0)}
          icon={FiTrendingUp}
          color="success"
        />
        <StatCard
          title="Highest Score"
          value={overall.maxScore || 0}
          icon={FiAward}
          color="warning"
        />
        <StatCard
          title="Total Points"
          value={overall.totalScore || 0}
          icon={FiTarget}
          color="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-wise Performance */}
        <Card title="Subject-wise Performance">
          {subjectWise.length > 0 ? (
            <div className="space-y-4">
              {subjectWise.map((subject) => (
                <div key={subject._id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {subject.subjectName}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-bold ${getGradeColor(subject.avgPercentage)}`}>
                        {formatPercentage(subject.avgPercentage)}
                      </span>
                      <Badge variant="info" className="text-xs">
                        {subject.totalExams} exams
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        subject.avgPercentage >= 80
                          ? 'bg-green-500'
                          : subject.avgPercentage >= 60
                          ? 'bg-blue-500'
                          : subject.avgPercentage >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, subject.avgPercentage)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiBarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No subject data available yet</p>
            </div>
          )}
        </Card>

        {/* Performance Trend */}
        <Card title="Recent Performance Trend">
          {trend.length > 0 ? (
            <div className="space-y-3">
              {trend.map((entry, index) => (
                <div key={entry._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {entry.examId?.title || 'Exam'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(entry.submittedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getGradeColor(entry.percentage)}`}>
                      {formatPercentage(entry.percentage)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Grade: {getGrade(entry.percentage)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiTrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No performance data available yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* Performance Summary Chart */}
      <Card title="Score Distribution">
        {trend.length > 0 ? (
          <div className="space-y-4">
            {/* Simple bar chart representation */}
            <div className="flex items-end justify-between space-x-2 h-48">
              {[...trend].reverse().map((entry, index) => {
                const height = Math.max(8, (entry.percentage / 100) * 100);
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">
                      {formatPercentage(entry.percentage, 0)}
                    </span>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        entry.percentage >= 80
                          ? 'bg-green-400'
                          : entry.percentage >= 60
                          ? 'bg-blue-400'
                          : entry.percentage >= 40
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`}
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-[10px] text-gray-400 mt-1 text-center truncate w-full">
                      {entry.examId?.title?.substring(0, 8) || `Exam ${index + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-center text-gray-400">Last {trend.length} exams</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Take some exams to see your score distribution</p>
          </div>
        )}
      </Card>

      {/* Grade Summary */}
      <Card title="Grade Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { grade: 'A+ / A', range: '80-100%', color: 'bg-green-100 text-green-800' },
            { grade: 'B+ / B', range: '60-79%', color: 'bg-blue-100 text-blue-800' },
            { grade: 'C+ / C', range: '40-59%', color: 'bg-yellow-100 text-yellow-800' },
            { grade: 'D / F', range: '0-39%', color: 'bg-red-100 text-red-800' },
          ].map((item) => {
            const count = trend.filter((t) => {
              if (item.grade === 'A+ / A') return t.percentage >= 80;
              if (item.grade === 'B+ / B') return t.percentage >= 60 && t.percentage < 80;
              if (item.grade === 'C+ / C') return t.percentage >= 40 && t.percentage < 60;
              return t.percentage < 40;
            }).length;

            return (
              <div key={item.grade} className={`p-4 rounded-lg ${item.color}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm font-medium">{item.grade}</p>
                <p className="text-xs opacity-75">{item.range}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default StudentAnalytics;
