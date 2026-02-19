import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import Table from '@/components/common/Table.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import { studentService } from '@/services';
import { formatDateTime } from '@/utils/dateUtils';
import { formatPercentage, getGrade, getGradeColor } from '@/utils/helpers';
import toast from 'react-hot-toast';

const Results = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await studentService.getResults();
      setResults(response.data || []);
    } catch (error) {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Exam Title',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.examId?.title}</p>
          <p className="text-sm text-gray-500">{row.examId?.subject?.name}</p>
        </div>
      ),
    },
    {
      header: 'Score',
      render: (row) => (
        <span className="font-medium">
          {row.score} / {row.examId?.totalMarks}
        </span>
      ),
    },
    {
      header: 'Percentage',
      render: (row) => (
        <span className={`font-bold ${getGradeColor(row.percentage)}`}>
          {formatPercentage(row.percentage)}
        </span>
      ),
    },
    {
      header: 'Grade',
      render: (row) => <span className="font-medium">{getGrade(row.percentage)}</span>,
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isPassed ? 'success' : 'danger'}>
          {row.isPassed ? 'Passed' : 'Failed'}
        </Badge>
      ),
    },
    {
      header: 'Rank',
      render: (row) => <span className="font-medium">#{row.rank || 'N/A'}</span>,
    },
    {
      header: 'Date',
      render: (row) => <span className="text-sm text-gray-600">{formatDateTime(row.submittedAt)}</span>,
    },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
        <p className="text-gray-600 mt-1">View your exam performance</p>
      </div>

      {results.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No results available yet</p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table 
            columns={columns} 
            data={results} 
            onRowClick={(row) => navigate(`/student/results/${row._id}`)}
          />
        </Card>
      )}
    </div>
  );
};

export default Results;
