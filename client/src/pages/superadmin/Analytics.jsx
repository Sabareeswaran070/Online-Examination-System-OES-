import { useState, useEffect } from 'react';
import { FiUsers, FiBook, FiFileText, FiTrendingUp, FiActivity } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import StatCard from '@/components/dashboard/StatCard.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await superAdminService.getAnalytics();


      // Process the response data
      const data = response.data || response;

      // Calculate totals from aggregated data
      const totalUsers = data.userStats?.reduce((sum, item) => sum + item.count, 0) || 0;
      const totalColleges = data.collegeStats?.reduce((sum, item) => sum + item.count, 0) || 0;
      const activeColleges = data.collegeStats?.find(item => item._id === 'active')?.count || 0;
      const totalExams = data.examStats?.reduce((sum, item) => sum + item.count, 0) || 0;
      const activeExams = data.examStats?.find(item => item._id === 'ongoing')?.count || 0;
      const completedExams = data.examStats?.find(item => item._id === 'completed')?.count || 0;

      setAnalytics({
        ...data,
        totalUsers,
        totalColleges,
        activeColleges,
        totalExams,
        activeExams,
        completedExams,
        usersByRole: data.userStats || [],
        avgPerformance: 0 // Calculate from results if available
      });
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">System Analytics</h1>
        <p className="mt-2 opacity-90">Comprehensive overview of system usage and performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={analytics?.totalUsers || 0}
          icon={FiUsers}
          color="primary"
        />
        <StatCard
          title="Active Colleges"
          value={analytics?.activeColleges || 0}
          icon={FiBook}
          color="success"
        />
        <StatCard
          title="Total Exams"
          value={analytics?.totalExams || 0}
          icon={FiFileText}
          color="warning"
        />
        <StatCard
          title="Avg Performance"
          value={analytics?.avgPerformance ? `${analytics.avgPerformance}%` : 'N/A'}
          icon={FiTrendingUp}
          color="info"
        />
      </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="User Distribution by Role">
          <div className="space-y-4">
            {analytics?.usersByRole && analytics.usersByRole.length > 0 ? (
              analytics.usersByRole.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <FiUsers className="text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">{item._id || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{item.count} users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${(item.count / analytics.totalUsers) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {((item.count / analytics.totalUsers) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FiUsers className="mx-auto w-12 h-12 text-gray-300" />
                <p className="text-gray-500 mt-3">No user data available</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="College Status Overview">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <FiActivity className="text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Active Colleges</p>
                  <p className="text-sm text-gray-600">{analytics?.activeColleges || 0} colleges</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {analytics?.activeColleges || 0}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiActivity className="text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Inactive Colleges</p>
                  <p className="text-sm text-gray-600">
                    {(analytics?.totalColleges || 0) - (analytics?.activeColleges || 0)} colleges
                  </p>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {(analytics?.totalColleges || 0) - (analytics?.activeColleges || 0)}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiBook className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Total Colleges</p>
                  <p className="text-sm text-gray-600">{analytics?.totalColleges || 0} colleges</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {analytics?.totalColleges || 0}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* System Activity */}
      <Card title="System Activity">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <FiFileText className="mx-auto w-12 h-12 text-purple-600 mb-3" />
            <p className="text-3xl font-bold text-purple-600">{analytics?.totalExams || 0}</p>
            <p className="text-gray-600 mt-2">Total Exams</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <FiActivity className="mx-auto w-12 h-12 text-green-600 mb-3" />
            <p className="text-3xl font-bold text-green-600">{analytics?.activeExams || 0}</p>
            <p className="text-gray-600 mt-2">Active Exams</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <FiTrendingUp className="mx-auto w-12 h-12 text-blue-600 mb-3" />
            <p className="text-3xl font-bold text-blue-600">{analytics?.completedExams || 0}</p>
            <p className="text-gray-600 mt-2">Completed Exams</p>
          </div>
        </div>
      </Card>

      {/* Recent Activity Summary */}
      <Card title="System Summary">
        <div className="prose max-w-none">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Registered Users</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalUsers || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Institutions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.activeColleges || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Exams Conducted</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalExams || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold text-green-600">Operational</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
