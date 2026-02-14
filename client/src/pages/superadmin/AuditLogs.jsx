import { useState, useEffect } from 'react';
import { FiActivity, FiFilter } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/utils/dateUtils';

const AuditLogs = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      const response = await superAdminService.getAuditLogs({ page, limit: 20 });
      const data = response.data || response;
      setLogs(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Audit logs error:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      publish: 'bg-purple-100 text-purple-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="mt-2 opacity-90">Track all system activities and changes</p>
      </div>

      <Card>
        <div className="space-y-4">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <FiActivity className="text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-sm text-gray-600">{log.resource}</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">
                      {log.description || `${log.action} ${log.resource}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      by {log.userId?.name || log.userId?.email || 'Unknown'} • {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <FiActivity className="mx-auto w-12 h-12 text-gray-300" />
              <p className="text-gray-500 mt-3">No audit logs found</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
