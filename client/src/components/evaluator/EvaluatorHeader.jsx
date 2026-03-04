import React from 'react';
import { FiBookOpen, FiClock } from 'react-icons/fi';
import { formatDateTime } from '@/utils/dateUtils';

const EvaluatorHeader = ({ studentName, examTitle, submittedAt }) => {
    const initials = studentName
        ? studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '??';

    return (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
            <div className="px-6 py-3 flex items-center justify-between gap-4">
                {/* Left: Branding */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
                        📋
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 text-sm leading-tight">EvalDesk</div>
                        <div className="text-gray-400 text-[10px]">Evaluator Panel</div>
                    </div>
                </div>

                {/* Center: Exam Info */}
                <div className="text-center hidden md:block">
                    <div className="flex items-center gap-2 justify-center text-gray-800 font-semibold text-sm">
                        <FiBookOpen className="text-primary-500" size={14} />
                        {examTitle || 'Exam'}
                    </div>
                    <div className="flex items-center gap-1 justify-center text-gray-400 text-[11px] mt-0.5">
                        <FiClock size={11} />
                        {submittedAt ? formatDateTime(submittedAt) : 'Submitted'}
                    </div>
                </div>

                {/* Right: Student */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {initials}
                    </div>
                    <div>
                        <div className="text-gray-900 text-sm font-semibold">{studentName || 'Student'}</div>
                        <div className="text-gray-400 text-[10px]">Candidate</div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default EvaluatorHeader;
