import React from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiCpu } from 'react-icons/fi';

const TestCaseTable = ({ testCases = [] }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="text-sm font-black text-gray-900 uppercase">Test Case Execution Results</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                        <FiCheckCircle size={14} /> Passed: {testCases.filter(tc => tc.status === 'Pass').length}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                        <FiXCircle size={14} /> Failed: {testCases.filter(tc => tc.status !== 'Pass').length}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b border-gray-100">
                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Case #</th>
                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Input</th>
                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expected Output</th>
                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Output</th>
                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Time (ms)</th>
                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {testCases.map((tc, index) => (
                            <tr key={index} className={`hover:bg-gray-50 transition-colors ${tc.status !== 'Pass' ? 'bg-red-50/30' : ''}`}>
                                <td className="px-5 py-4 font-mono text-xs font-bold text-gray-400">
                                    {String(index + 1).padStart(2, '0')}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="bg-gray-100 px-2 py-1 rounded text-[11px] font-mono text-gray-600 max-w-[150px] truncate" title={tc.input}>
                                        {tc.input}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="bg-gray-100 px-2 py-1 rounded text-[11px] font-mono text-gray-600 max-w-[150px] truncate" title={tc.expectedOutput}>
                                        {tc.expectedOutput}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className={`px-2 py-1 rounded text-[11px] font-mono max-w-[150px] truncate ${tc.status === 'Pass' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700 border border-red-100'}`} title={tc.actualOutput}>
                                        {tc.actualOutput}
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-gray-500">
                                        <FiClock size={10} className="text-gray-400" />
                                        {tc.time || '0'}
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${tc.status === 'Pass'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {tc.status === 'Pass' ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
                                        {tc.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {testCases.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-5 py-12 text-center text-gray-400 italic text-sm">
                                    No test case results available for this submission.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TestCaseTable;
