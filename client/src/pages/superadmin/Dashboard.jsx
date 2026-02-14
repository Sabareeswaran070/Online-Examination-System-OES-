import { useState, useEffect } from 'react';
import { FiUsers, FiHome, FiTrendingUp, FiFileText } from 'react-icons/fi';
import StatCard from '@/components/dashboard/StatCard.jsx';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await superAdminService.getDashboard();
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of the entire examination system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Colleges"
          value={stats?.totalColleges || 0}
          icon={FiHome}
          color="primary"
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={FiUsers}
          color="success"
        />
        <StatCard
          title="Active Colleges"
          value={stats?.activeColleges || 0}
          icon={FiTrendingUp}
          color="info"
        />
        <StatCard
          title="Total Exams"
          value={stats?.totalExams || 0}
          icon={FiFileText}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Colleges">
          <div className="space-y-3">
            {stats?.recentColleges?.length > 0 ? (
              stats.recentColleges.map((college) => (
                <div key={college._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{college.collegeName}</p>
                    <p className="text-sm text-gray-500">{college.collegeCode}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    college.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {college.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No colleges found</p>
            )}
          </div>
        </Card>

        <Card title="User Distribution">
          <div className="space-y-3">
            {stats?.usersByRole?.map((role) => (
              <div key={role._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900 capitalize">{role._id}</span>
                <span className="text-primary-600 font-semibold">{role.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
