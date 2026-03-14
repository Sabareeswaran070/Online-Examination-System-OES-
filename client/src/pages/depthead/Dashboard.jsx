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

      {!stats?.department && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 flex items-center shadow-sm">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-4 text-amber-600 shrink-0">
            <FiUsers className="text-xl" />
          </div>
          <div>
            <p className="font-bold">No Department Assigned</p>
            <p className="text-sm opacity-90">Please contact the administrator to assign you to a department to manage students and faculty.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Subjects"
          value={stats?.statistics?.totalSubjects || 0}
          icon={FiBookOpen}
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
          icon={FiClipboard}
          color="info"
        />
        <StatCard
          title="Upcoming Exams"
          value={stats?.statistics?.totalExams || 0}
          icon={FiFileText}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Subjects">
          <div className="space-y-3">
            {stats?.subjects?.length > 0 ? (
              stats.subjects.slice(0, 5).map((subject) => (
                <div
                  key={subject._id}
                  className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col gap-3 group/sub relative hover:bg-white hover:shadow-md hover:border-primary-100 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate" title={subject.subjectName}>
                        {subject.subjectName}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {subject.subjectCode}
                      </p>
                    </div>
                    {subject.credits && (
                      <span className="text-[10px] font-bold text-eyDark bg-primary-50 px-2 py-0.5 rounded-full">
                        {subject.credits} credits
                      </span>
                    )}
                  </div>
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
                  <span className="text-eyDark font-semibold">{faculty.subjectCount} subjects</span>
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
