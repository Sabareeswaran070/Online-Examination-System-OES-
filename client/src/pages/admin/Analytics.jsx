import { useState, useEffect } from 'react';
import { FiBarChart2, FiTrendingUp, FiUsers, FiFileText } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import StatCard from '@/components/dashboard/StatCard.jsx';
import Loader from '@/components/common/Loader.jsx';
import { collegeAdminService } from '@/services';
import toast from 'react-hot-toast';

const AnalyticsAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await collegeAdminService.getAnalytics();
      const data = response.data || response;
      setAnalytics(data);
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
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">College Analytics</h1>
        <p className="mt-2 opacity-90">Performance insights and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={analytics?.totalStudents || 0}
          icon={FiUsers}
          color="primary"
        />
        <StatCard
          title="Total Faculty"
          value={analytics?.totalFaculty || 0}
          icon={FiUsers}
          color="success"
        />
        <StatCard
          title="Departments"
          value={analytics?.totalDepartments || 0}
          icon={FiBarChart2}
          color="warning"
        />
        <StatCard
          title="Exams"
          value={analytics?.totalExams || 0}
          icon={FiFileText}
          color="info"
        />
      </div>

      <Card title="Performance Metrics">
        <div className="text-center py-12">
          <FiTrendingUp className="mx-auto w-16 h-16 text-primary-500" />
          <p className="text-gray-600 mt-4">Analytics data will be displayed here</p>
          <p className="text-sm text-gray-500 mt-2">Connect to backend analytics endpoint</p>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsAdmin;
