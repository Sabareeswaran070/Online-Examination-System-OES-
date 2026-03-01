import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import Loader from '@/components/common/Loader.jsx';
import { studentService } from '@/services';
import { formatDateTime, isExamActive, isExamUpcoming, isExamCompleted } from '@/utils/dateUtils';
import { formatDuration } from '@/utils/dateUtils';
import { FiClock, FiBookOpen, FiCheckCircle, FiAlertCircle, FiChevronRight, FiCalendar } from 'react-icons/fi';
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

  const categorizedExams = useMemo(() => {
    const categories = {
      takeable: [],
      upcoming: [],
      completed: []
    };

    exams.forEach(exam => {
      if (exam.attempted || isExamCompleted(exam.endTime)) {
        categories.completed.push(exam);
      } else if (isExamActive(exam.startTime, exam.endTime)) {
        categories.takeable.push(exam);
      } else if (isExamUpcoming(exam.startTime)) {
        categories.upcoming.push(exam);
      } else {
        categories.completed.push(exam);
      }
    });

    return categories;
  }, [exams]);

  const getStatusDisplay = (exam) => {
    if (exam.attempted) return { label: 'Attempted', variant: 'info', icon: FiCheckCircle };
    if (isExamActive(exam.startTime, exam.endTime)) return { label: 'Active Now', variant: 'success', icon: FiAlertCircle };
    if (isExamUpcoming(exam.startTime)) return { label: 'Upcoming', variant: 'warning', icon: FiClock };
    if (isExamCompleted(exam.endTime)) return { label: 'Completed', variant: 'default', icon: FiCheckCircle };
    return { label: exam.status, variant: 'default', icon: FiAlertCircle };
  };

  if (loading) return <Loader fullScreen />;

  const ExamGrid = ({ sectionExams, title, description, priority = false }) => {
    if (sectionExams.length === 0) return null;

    return (
      <div className={`space-y-4 ${priority ? 'pb-8' : 'pt-4 border-t border-gray-100'}`}>
        <div className="flex items-end justify-between">
          <div>
            <h2 className={`text-xl font-black ${priority ? 'text-indigo-900' : 'text-gray-700'} tracking-tight flex items-center gap-2`}>
              {priority && <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>}
              {title}
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-500 rounded-full">
                {sectionExams.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">{description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sectionExams.map((exam) => {
            const status = getStatusDisplay(exam);
            const canStart = isExamActive(exam.startTime, exam.endTime) && !exam.attempted;

            return (
              <Card
                key={exam._id}
                className={`group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 ${priority ? 'border-transparent hover:border-indigo-200' : 'border-transparent hover:border-gray-200'}`}
              >
                {priority && (
                  <div className="absolute top-0 right-0 p-8 -mr-8 -mt-8 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                )}

                <div className="relative space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                        {exam.title}
                      </h3>
                      <div className="flex items-center gap-1.5 opacity-70">
                        <FiBookOpen className="text-indigo-500 w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{exam.subject?.name}</span>
                      </div>
                    </div>
                    <Badge variant={status.variant} className="flex items-center gap-1 px-2.5 py-1">
                      <status.icon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2 border-y border-gray-50">
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Duration</p>
                      <p className="text-sm font-bold text-gray-700">{formatDuration(exam.duration)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Total Marks</p>
                      <p className="text-sm font-bold text-gray-700">{exam.totalMarks} pts</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                      <FiCalendar className="text-indigo-400" />
                      <span>Starts: <span className="text-gray-900 font-bold">{formatDateTime(exam.startTime)}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                      <FiClock className="text-indigo-400" />
                      <span>Ends: <span className="text-gray-900 font-bold">{formatDateTime(exam.endTime)}</span></span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {canStart ? (
                      <button
                        onClick={() => navigate(`/student/exams/${exam._id}/take`)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 group/btn"
                      >
                        Start Exam
                        <FiChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/student/exams/${exam._id}`)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        {exam.attempted ? 'Review Result' : 'View Details'}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      <div className="relative bg-white/50 p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
        <div className="relative">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Available Exams</h1>
          <p className="text-gray-500 mt-2 font-medium">Elevate your performance. Your future starts with these assessments.</p>
        </div>
      </div>

      {exams.length === 0 ? (
        <Card className="py-20 text-center bg-gray-50/50 border-dashed border-2">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <FiBookOpen className="w-12 h-12 text-gray-200" />
            </div>
            <p className="text-gray-400 font-bold text-lg">No exams assigned to you yet</p>
            <p className="text-xs text-gray-300">Check back later for new schedules</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-12">
          <ExamGrid
            sectionExams={categorizedExams.takeable}
            title="Ready to Take"
            description="Active exams waiting for your response. Start now to ensure full time."
            priority
          />

          <ExamGrid
            sectionExams={categorizedExams.upcoming}
            title="Upcoming Exams"
            description="Prepare yourself. These exams will be available soon."
          />

          <ExamGrid
            sectionExams={categorizedExams.completed}
            title="Past & Completed"
            description="History of your previous attempts and concluded exam sessions."
          />
        </div>
      )}
    </div>
  );
};

export default AvailableExams;
