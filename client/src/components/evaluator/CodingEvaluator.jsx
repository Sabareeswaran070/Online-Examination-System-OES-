import React from 'react';
import { FiChevronDown, FiChevronUp, FiCpu, FiAward } from 'react-icons/fi';

const CodingEvaluator = ({ question, onUpdateScore, onAcceptAI, loadingAI }) => {
    const [showProblem, setShowProblem] = React.useState(true);
    const [localScore, setLocalScore] = React.useState(question?.marksAwarded || 0);
    const [localFeedback, setLocalFeedback] = React.useState(question?.evaluatorFeedback || '');

    if (!question) return (
        <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm bg-gray-50">
            No Coding questions in this submission.
        </div>
    );

    const testCases = question.testCaseResults || [];
    const passed = testCases.filter(tc => tc.status === 'Pass' || tc.pass === true).length;

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto space-y-5 pb-10">

                {/* Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                            <FiAward size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coding Challenge</p>
                            <h2 className="text-lg font-black text-gray-900 leading-tight">{question.title || question.questionText}</h2>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        {question.language && <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-lg">{question.language}</span>}
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg">{question.marksAwarded ?? 0}/{question.maxMarks} pts</span>
                        {testCases.length > 0 && (
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${passed === testCases.length ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {passed}/{testCases.length} Tests Passed
                            </span>
                        )}
                    </div>
                </div>

                {/* Problem Statement */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button onClick={() => setShowProblem(!showProblem)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Problem Statement</span>
                        {showProblem ? <FiChevronUp size={16} className="text-gray-400" /> : <FiChevronDown size={16} className="text-gray-400" />}
                    </button>
                    {showProblem && (
                        <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-gray-700 text-sm leading-relaxed pt-4">{question.questionText}</p>
                            {question.inputFormat && (
                                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Input Format</p>
                                    <p className="text-sm font-mono text-primary-700">{question.inputFormat}</p>
                                </div>
                            )}
                            {question.sampleIO && (
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Sample Input</p>
                                        <pre className="text-xs font-mono text-blue-700">{question.sampleIO.input}</pre>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Sample Output</p>
                                        <pre className="text-xs font-mono text-emerald-700">{question.sampleIO.output}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Student's Code */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Student's Code</span>
                        <span className="bg-primary-100 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded">{question.language || 'Code'}</span>
                    </div>
                    {question.studentAnswer ? (
                        <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-gray-800 bg-gray-50/30">
                            {question.studentAnswer.split('\n').map((line, i) => (
                                <div key={i} className="flex gap-4">
                                    <span className="select-none text-gray-300 text-xs min-w-[28px] text-right flex-shrink-0">{i + 1}</span>
                                    <span className="text-gray-800">{line}</span>
                                </div>
                            ))}
                        </pre>
                    ) : (
                        <div className="p-5 text-gray-400 italic text-sm">No code submitted.</div>
                    )}
                </div>

                {/* Test Cases */}
                {testCases.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Test Case Results</span>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${passed === testCases.length ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {passed}/{testCases.length} Passed
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {['#', 'Input', 'Expected', 'Actual', 'Status', 'Time'].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {testCases.map((tc, i) => {
                                        const isPass = tc.status === 'Pass' || tc.pass === true;
                                        return (
                                            <tr key={i} className={isPass ? 'bg-emerald-50/30' : 'bg-red-50/30'}>
                                                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-blue-700 font-mono text-xs">{tc.input || tc.stdin || '–'}</td>
                                                <td className="px-4 py-2.5 text-emerald-700 font-mono text-xs">{tc.expectedOutput || tc.expected || '–'}</td>
                                                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: isPass ? '#059669' : '#dc2626' }}>{tc.actualOutput || tc.actual || '–'}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {isPass ? 'PASS' : 'FAIL'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-400 text-xs">{tc.time ? `${tc.time}ms` : '–'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* AI Code Review */}
                {question.aiReasoning && (
                    <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                                <FiCpu size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-primary-800 font-bold text-sm">AI Code Review</p>
                            </div>
                            <div className="ml-auto bg-white border border-primary-200 rounded-lg px-4 py-1.5">
                                <span className="text-primary-700 text-xl font-black">{question.aiScore ?? '–'}</span>
                                <span className="text-primary-400 text-sm">/{question.maxMarks}</span>
                            </div>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-lg border border-primary-100 p-3">
                            {question.aiReasoning}
                        </p>
                    </div>
                )}

                {/* Evaluator Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Evaluator Actions</p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-700 min-w-[55px]">Score:</label>
                            <input
                                type="number" min={0} max={question.maxMarks}
                                value={localScore}
                                onChange={e => setLocalScore(Number(e.target.value))}
                                className="w-20 text-center border border-primary-400 rounded-lg px-3 py-1.5 text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                            />
                            <span className="text-gray-400 text-sm">/ {question.maxMarks}</span>
                        </div>
                        <textarea
                            placeholder="Add code review feedback (optional)…"
                            value={localFeedback}
                            onChange={e => setLocalFeedback(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 text-sm resize-y min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary-300"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => onAcceptAI(question._id)}
                                disabled={loadingAI}
                                className="px-4 py-2 border border-primary-200 text-primary-600 text-sm font-semibold rounded-lg hover:bg-primary-50 flex items-center gap-2 disabled:opacity-50"
                            >
                                <FiCpu size={16} className={loadingAI ? "animate-spin" : ""} />
                                {loadingAI ? 'Evaluating...' : 'Evaluate with AI'}
                            </button>
                            <button className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">
                                Add Comment
                            </button>
                            <button
                                onClick={() => onUpdateScore(question._id, localScore, localFeedback)}
                                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                            >
                                Submit Evaluation ✓
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodingEvaluator;
