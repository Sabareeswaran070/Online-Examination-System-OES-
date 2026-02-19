import { useState, useEffect } from 'react';
import { FiAward, FiUser, FiTrendingUp } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { studentService } from '@/services';
import { formatPercentage } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const StudentLeaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('department');
  const [studentRank, setStudentRank] = useState('Not ranked');

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'department') params.departmentWide = true;
      const response = await studentService.getLeaderboard(params);
      setLeaderboard(response.data || []);
      setStudentRank(response.studentRank || 'Not ranked');
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full">
            <FiAward className="w-6 h-6 text-yellow-500" />
          </div>
        );
      case 1:
        return (
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
            <FiAward className="w-6 h-6 text-gray-400" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full">
            <FiAward className="w-6 h-6 text-orange-500" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-full">
            <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
          </div>
        );
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-600 mt-1">See how you rank among your peers</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('department')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'department'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            Department
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Your Rank Card */}
      <Card>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <FiTrendingUp className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Your Current Rank</p>
              <p className="text-2xl font-bold text-gray-900">
                {typeof studentRank === 'number' ? `#${studentRank}` : studentRank}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Out of {leaderboard.length} students</p>
          </div>
        </div>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        {leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exams
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry._id === user?._id;
                  return (
                    <tr
                      key={entry._id}
                      className={`transition-colors ${
                        isCurrentUser
                          ? 'bg-primary-50 border-l-4 border-l-primary-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRankBadge(index)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <FiUser className="text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {entry.studentName}
                              {isCurrentUser && (
                                <Badge variant="info" className="ml-2 text-xs">You</Badge>
                              )}
                            </div>
                            {entry.regNo && (
                              <div className="text-xs text-gray-500">{entry.regNo}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.totalExams}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.totalScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                entry.avgPercentage >= 80
                                  ? 'bg-green-500'
                                  : entry.avgPercentage >= 60
                                  ? 'bg-blue-500'
                                  : entry.avgPercentage >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, entry.avgPercentage)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-gray-700">
                            {formatPercentage(entry.avgPercentage)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FiAward className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">No leaderboard data available</p>
            <p className="text-sm">Take some exams to appear on the leaderboard</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentLeaderboard;
