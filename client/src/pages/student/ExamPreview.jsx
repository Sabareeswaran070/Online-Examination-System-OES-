import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiClock, FiFileText, FiCheckCircle, FiAlertTriangle, FiPlay, FiArrowLeft } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import Loader from '@/components/common/Loader.jsx';
import { studentService } from '@/services';
import { formatDateTime, formatDuration, isExamActive, isExamUpcoming, isExamCompleted } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const ExamPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamDetails();
  }, [id]);

  const fetchExamDetails = async () => {
    try {
      const response = await studentService.getExamDetails(id);
      setExamData(response.data);
    } catch (error) {
      toast.error('Failed to load exam details');
      navigate('/student/exams');
    } finally {
      setLoading(false);
    }
  };

  const getExamStatusBadge = () => {
    if (!examData?.exam) return null;
    const { startTime, endTime } = examData.exam;

    if (examData.attempted) {
      return <Badge variant="info">Already Attempted</Badge>;
    }
    if (isExamActive(startTime, endTime)) {
      return <Badge variant="success">Active Now</Badge>;
    }
    if (isExamUpcoming(startTime)) {
      return <Badge variant="warning">Upcoming</Badge>;
    }
    if (isExamCompleted(endTime)) {
      return <Badge variant="default">Completed</Badge>;
    }
    return null;
  };

  const canStartExam = () => {
    if (!examData?.exam) return false;
    const { startTime, endTime } = examData.exam;
    return isExamActive(startTime, endTime) && !examData.attempted;
  };

  const handleStartExam = () => {
    if (!canStartExam()) return;

    const confirmed = window.confirm(
      'Are you sure you want to start this exam? Once started, the timer will begin and cannot be paused.'
    );
    if (confirmed) {
      navigate(`/student/exams/${id}/take`);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!examData) return null;

  const { exam } = examData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/student/exams')}>
            <FiArrowLeft className="mr-2" /> Back to Exams
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">{exam.subject?.name || exam.subject?.subjectName}</p>
          </div>
        </div>
        {getExamStatusBadge()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exam Details Card */}
          <Card title="Exam Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiClock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-semibold text-gray-900">{formatDuration(exam.duration)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiFileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Questions</p>
                  <p className="font-semibold text-gray-900">{exam.totalQuestions}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FiCheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Marks</p>
                  <p className="font-semibold text-gray-900">{exam.totalMarks}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Passing Marks</p>
                <p className="font-semibold text-gray-900">{exam.passingMarks}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Start Time</p>
                <p className="font-semibold text-gray-900">{formatDateTime(exam.startTime)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">End Time</p>
                <p className="font-semibold text-gray-900">{formatDateTime(exam.endTime)}</p>
              </div>
            </div>

            {exam.facultyId && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  <strong>Faculty:</strong> {exam.facultyId.name}
                </p>
              </div>
            )}
          </Card>

          {/* Description */}
          {exam.description && (
            <Card title="Description">
              <p className="text-gray-700 whitespace-pre-wrap">{exam.description}</p>
            </Card>
          )}

          {/* Instructions */}
          {exam.instructions && (
            <Card title="Instructions">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FiAlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {exam.instructions}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card>
            <div className="text-center space-y-4">
              {examData.attempted ? (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <FiCheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-lg font-semibold text-blue-800">Already Attempted</p>
                    <p className="text-sm text-blue-600 mt-1">
                      Status: {examData.resultStatus || 'Submitted'}
                    </p>
                  </div>
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => navigate('/student/results')}
                  >
                    View Results
                  </Button>
                </>
              ) : canStartExam() ? (
                <>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <FiPlay className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-lg font-semibold text-green-800">Ready to Start</p>
                    <p className="text-sm text-green-600 mt-1">
                      You have {formatDuration(exam.duration)} to complete
                    </p>
                  </div>
                  <Button fullWidth onClick={handleStartExam}>
                    <FiPlay className="mr-2" /> Start Exam
                  </Button>
                </>
              ) : isExamUpcoming(exam.startTime) ? (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <FiClock className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                  <p className="text-lg font-semibold text-yellow-800">Not Yet Started</p>
                  <p className="text-sm text-yellow-600 mt-1">
                    Starts at {formatDateTime(exam.startTime)}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <FiAlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-lg font-semibold text-gray-600">Exam Ended</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This exam is no longer available
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Info */}
          <Card title="Quick Info">
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-500">Subject</span>
                <span className="font-medium text-gray-900">{exam.subject?.name || exam.subject?.subjectName || 'N/A'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium text-gray-900">{exam.duration} min</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Questions</span>
                <span className="font-medium text-gray-900">{exam.totalQuestions}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Total Marks</span>
                <span className="font-medium text-gray-900">{exam.totalMarks}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Pass Marks</span>
                <span className="font-medium text-gray-900">{exam.passingMarks}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExamPreview;
