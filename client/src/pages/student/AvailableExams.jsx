import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import Loader from '@/components/common/Loader.jsx';
import { studentService } from '@/services';
import { formatDateTime, isExamActive, isExamUpcoming, isExamCompleted } from '@/utils/dateUtils';
import { formatDuration } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const AvailableExams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await studentService.getAvailableExams();
      setExams(response.data || []);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam) => {
    if (exam.attempted) return { label: 'Attempted', variant: 'info' };
    if (isExamActive(exam.startTime, exam.endTime)) return { label: 'Active', variant: 'success' };
    if (isExamUpcoming(exam.startTime)) return { label: 'Upcoming', variant: 'warning' };
    if (isExamCompleted(exam.endTime)) return { label: 'Completed', variant: 'default' };
    return { label: exam.status, variant: 'default' };
  };

  const canStartExam = (exam) => {
    return isExamActive(exam.startTime, exam.endTime) && !exam.attempted;
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Available Exams</h1>
        <p className="text-gray-600 mt-1">View and take your scheduled exams</p>
      </div>

      {exams.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No exams available at the moment</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const status = getExamStatus(exam);
            return (
              <Card key={exam._id} className="hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Subject:</strong> {exam.subject?.name}</p>
                    <p><strong>Duration:</strong> {formatDuration(exam.duration)}</p>
                    <p><strong>Total Marks:</strong> {exam.totalMarks}</p>
                    <p><strong>Passing Marks:</strong> {exam.passingMarks}</p>
                    <p><strong>Start Time:</strong> {formatDateTime(exam.startTime)}</p>
                    <p><strong>End Time:</strong> {formatDateTime(exam.endTime)}</p>
                    {exam.instructions && (
                      <p className="text-xs italic">{exam.instructions.substring(0, 100)}...</p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {canStartExam(exam) && (
                      <Button
                        fullWidth
                        variant="primary"
                        onClick={() => navigate(`/student/exams/${exam._id}/take`)}
                      >
                        Start Exam
                      </Button>
                    )}
                    <Button
                      fullWidth={!canStartExam(exam)}
                      variant="secondary"
                      onClick={() => navigate(`/student/exams/${exam._id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvailableExams;
