import { useState, useEffect } from 'react';
import { FiAward, FiTrendingUp } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import { collegeAdminService } from '@/services';
import toast from 'react-hot-toast';

const Leaderboard = () => {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await collegeAdminService.getLeaderboard();
      const data = response.data || response;
      setLeaderboard(data.data || data || []);
    } catch (error) {
      console.error('Leaderboard error:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center">
          <FiAward className="mr-3" />
          Leaderboard
        </h1>
        <p className="mt-2 opacity-90">Top performing students</p>
      </div>

      <Card>
        <div className="space-y-4">
          {leaderboard.length > 0 ? (
            leaderboard.map((student, index) => (
              <div key={student._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-yellow-100 text-yellow-600' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{student.name || student.studentId?.name}</p>
                    <p className="text-sm text-gray-600">{student.email || student.studentId?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">{student.avgScore || student.averageScore || 0}%</p>
                  <p className="text-sm text-gray-600">{student.examsCompleted || 0} exams</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <FiAward className="mx-auto w-12 h-12 text-gray-300" />
              <p className="text-gray-500 mt-3">No leaderboard data available</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Leaderboard;
