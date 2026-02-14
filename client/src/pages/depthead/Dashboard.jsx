import { useState, useEffect } from 'react';
import { FiUsers, FiBookOpen, FiFileText, FiClipboard } from 'react-icons/fi';
import StatCard from '@/components/dashboard/StatCard.jsx';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import { deptHeadService } from '@/services';
import toast from 'react-hot-toast';

const DeptHeadDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await deptHeadService.getDashboard();
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
        <h1 className="text-3xl font-bold text-gray-900">Department Head Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your department operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Subjects"
          value={stats?.totalSubjects || 0}
          icon={FiBookOpen}
          color="primary"
        />
        <StatCard
          title="Total Students"
          value={stats?.totalStudents || 0}
          icon={FiUsers}
          color="success"
        />
        <StatCard
          title="Total Faculty"
          value={stats?.totalFaculty || 0}
          icon={FiClipboard}
          color="info"
        />
        <StatCard
          title="Upcoming Exams"
          value={stats?.upcomingExams || 0}
          icon={FiFileText}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Subjects">
          <div className="space-y-3">
            {stats?.subjects?.length > 0 ? (
              stats.subjects.slice(0, 5).map((subject) => (
                <div key={subject._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{subject.subjectName}</p>
                    <p className="text-sm text-gray-500">{subject.subjectCode}</p>
                  </div>
                  <span className="text-sm text-gray-600">{subject.credits} credits</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No subjects found</p>
            )}
          </div>
        </Card>

        <Card title="Faculty Workload">
          <div className="space-y-3">
            {stats?.facultyWorkload?.length > 0 ? (
              stats.facultyWorkload.slice(0, 5).map((faculty) => (
                <div key={faculty._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{faculty.name}</span>
                  <span className="text-primary-600 font-semibold">{faculty.subjectCount} subjects</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No faculty data available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DeptHeadDashboard;
