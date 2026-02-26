import { useState, useEffect } from 'react';
import { FiActivity, FiSearch, FiFilter } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Loader from '@/components/common/Loader.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/utils/dateUtils';

const AuditLogs = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalLogs, setTotalLogs] = useState(0);
  const [resourceFilter, setResourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [currentPage, pageSize, searchTerm, resourceFilter, actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await superAdminService.getAuditLogs({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        resource: resourceFilter,
        action: actionFilter
      });
      setLogs(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalLogs(response.count || 0);
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
      login: 'bg-indigo-100 text-indigo-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="mt-2 opacity-90">Track all system activities and changes</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs by action, resource, or description..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white min-w-[140px]"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="publish">Publish</option>
            <option value="login">Login</option>
          </select>
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white min-w-[140px]"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[20, 50, 100, 500].map(size => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        {loading && logs.length === 0 ? (
          <div className="py-20 flex justify-center">
            <Loader />
          </div>
        ) : (
          <>
            <div className={`space-y-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center shrink-0">
                        <FiActivity className="text-primary-600" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-sm font-semibold text-gray-700">{log.resource}</span>
                        </div>
                        <p className="text-sm text-gray-900 mt-1">
                          {log.description || `${log.action} ${log.resource}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">
                            {log.userId?.name || log.userId?.email || 'System'}
                          </span>
                          <span>•</span>
                          <span>{formatDateTime(log.createdAt)}</span>
                          {log.userId?.role && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{log.userId.role}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FiActivity className="mx-auto w-12 h-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search term</p>
                </div>
              )}
            </div>

            {totalLogs > 0 && (
              <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold">{Math.min(currentPage * pageSize, totalLogs)}</span> of <span className="font-semibold">{totalLogs}</span> logs
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 text-sm font-medium rounded-lg transition-all ${currentPage === pageNum
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
