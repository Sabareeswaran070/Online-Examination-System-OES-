import { useState, useEffect } from 'react';
import { FiUsers, FiBookOpen, FiFileText, FiHome } from 'react-icons/fi';
import StatCard from '@/components/dashboard/StatCard.jsx';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import { collegeAdminService } from '@/services';
import toast from 'react-hot-toast';

const CollegeAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await collegeAdminService.getDashboard();

      setStats(response.data);
    } catch (error) {
      console.error('Admin Dashboard - Error:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };



  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">College Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your college operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Departments"
          value={stats?.statistics?.totalDepartments || 0}
          icon={FiHome}
          color="primary"
        />
        <StatCard
          title="Total Students"
          value={stats?.statistics?.totalStudents || 0}
          icon={FiUsers}
          color="success"
        />
        <StatCard
          title="Total Faculty"
          value={stats?.statistics?.totalFaculty || 0}
          icon={FiBookOpen}
          color="info"
        />
        <StatCard
          title="Total Exams"
          value={stats?.statistics?.totalExams || 0}
          icon={FiFileText}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Departments Overview">
          <div className="space-y-3">
            {stats?.departments?.length > 0 ? (
              stats.departments.map((dept) => (
                <div key={dept._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{dept.departmentName}</p>
                    <p className="text-sm text-gray-500">{dept.departmentCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{dept.studentCount} students</p>
                    <p className="text-sm text-gray-600">{dept.facultyCount} faculty</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No departments found</p>
            )}
          </div>
        </Card>

        <Card title="Recent Activities">
          <div className="space-y-3">
            <p className="text-gray-500 text-center py-4">Activity feed coming soon</p>
          </div>
        </Card>
      </div>


    </div>
  );
};

export default CollegeAdminDashboard;
