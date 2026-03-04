import React, { useState } from 'react';
import { FiCpu } from 'react-icons/fi';

const getStatusInfo = (q) => {
    if (q.isManuallyEvaluated) return { label: 'Manually Reviewed', badge: 'bg-purple-100 text-purple-700' };
    if (q.aiScore !== undefined && q.aiScore !== null) return { label: 'AI Evaluated', badge: 'bg-blue-100 text-blue-700' };
    return { label: 'Pending Review', badge: 'bg-amber-100 text-amber-700' };
};

function highlightKeywords(text, keywords = []) {
    if (!text || !keywords.length) return text;
    const pattern = new RegExp(`\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    const parts = text.split(pattern);
    return parts.map((part, i) =>
        pattern.test(part)
            ? <mark key={i} className="bg-amber-100 text-amber-800 rounded px-0.5 not-italic font-semibold">{part}</mark>
            : part
    );
}

const DescriptiveEvaluator = ({ questions, activeQuestion, onSelectQuestion, onUpdateScore, onAcceptAI }) => {
    const [selected, setSelected] = useState(activeQuestion || questions[0] || null);
    const [overriding, setOverriding] = useState(false);
    const [localScores, setLocalScores] = useState({});

    const q = selected || questions[0];

    const handleSelect = (item) => { setSelected(item); onSelectQuestion(item); setOverriding(false); };

    if (!questions.length) return (
        <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm bg-gray-50">
            No Descriptive questions in this submission.
        </div>
    );

    const ls = localScores[q?._id];
    const isOverridden = ls?.manual !== undefined;
    const finalScore = isOverridden ? ls.manual : (q.marksAwarded ?? q.aiScore ?? 0);
    const statusInfo = getStatusInfo(q);

    const handleSaveOverride = () => {
        const scoreEl = document.getElementById(`desc-score-${q._id}`);
        const commentEl = document.getElementById(`desc-comment-${q._id}`);
        const val = Math.min(parseFloat(scoreEl?.value) || 0, q.maxMarks);
        const comment = commentEl?.value || '';
        setLocalScores(prev => ({ ...prev, [q._id]: { manual: val, comment } }));
        onUpdateScore(q._id, val, comment);
        setOverriding(false);
    };

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Left */}
            <div className="w-72 flex-none border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descriptive Questions</p>
                </div>
                {questions.map((item, i) => {
                    const lsc = localScores[item._id];
                    const fs = lsc?.manual !== undefined ? lsc.manual : (item.marksAwarded ?? item.aiScore ?? 0);
                    const st = getStatusInfo(item);
                    const isActive = q?._id === item._id;
                    return (
                        <button key={item._id || i} onClick={() => handleSelect(item)}
                            className={`w-full text-left px-4 py-3.5 border-b border-gray-50 border-l-4 transition-colors ${isActive ? 'bg-primary-50 border-l-primary-500' : 'hover:bg-gray-50 border-l-transparent'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold ${isActive ? 'text-primary-700' : 'text-gray-600'}`}>Q{i + 1}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.badge}`}>{fs}/{item.maxMarks}</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.questionText}</p>
                            <span className={`mt-1.5 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${st.badge}`}>{st.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Right */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
                <div className="max-w-2xl mx-auto space-y-5">
                    {/* Question */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Question {(questions.indexOf(q) + 1) || 1} · Max {q.maxMarks} marks</p>
                        <p className="text-gray-900 font-semibold text-base leading-relaxed">{q.questionText}</p>
                    </div>

                    {/* Student Answer */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Student Answer</p>
                        <div className="text-gray-700 text-sm leading-relaxed">
                            {q.studentAnswer
                                ? highlightKeywords(q.studentAnswer, q.keywordsHit || [])
                                : <span className="italic text-gray-400">Student did not provide an answer.</span>
                            }
                        </div>
                        {q.keywordsHit?.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 items-center border-t border-gray-100 pt-3">
                                <span className="text-[10px] font-bold text-amber-600">Keywords matched:</span>
                                {q.keywordsHit.map(kw => (
                                    <span key={kw} className="bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold px-2 py-0.5">{kw}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Evaluation */}
                    <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                                <FiCpu size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-primary-800 font-bold text-sm">AI Evaluation</p>
                                <p className="text-primary-500 text-[11px]">Auto-graded</p>
                            </div>
                            <div className="ml-auto bg-white border border-primary-200 rounded-lg px-4 py-1.5 text-center">
                                <span className="text-primary-700 text-2xl font-black">{q.aiScore ?? '–'}</span>
                                <span className="text-primary-400 text-sm">/{q.maxMarks}</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-primary-100 p-3 text-gray-700 text-sm leading-relaxed">
                            {q.aiReasoning || 'No AI feedback available.'}
                        </div>
                    </div>

                    {/* Evaluator Decision */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Evaluator Decision</p>

                        {!overriding && !isOverridden ? (
                            <div className="flex gap-3">
                                <button onClick={() => { onAcceptAI(q._id); }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                    ✓ Accept AI Score ({q.aiScore ?? 0}/{q.maxMarks})
                                </button>
                                <button onClick={() => setOverriding(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
                                    ✏️ Override Score
                                </button>
                            </div>
                        ) : isOverridden && !overriding ? (
                            <div className="flex items-center gap-3">
                                <span className="text-purple-700 font-semibold text-sm">Manual Score: {ls.manual}/{q.maxMarks}</span>
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Overridden</span>
                                <button onClick={() => setOverriding(true)}
                                    className="ml-auto px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">
                                    Edit
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-semibold text-gray-700 min-w-[50px]">Score:</label>
                                    <input type="number" min={0} max={q.maxMarks}
                                        defaultValue={ls?.manual ?? q.aiScore ?? 0}
                                        id={`desc-score-${q._id}`}
                                        className="w-20 text-center border border-primary-400 rounded-lg px-3 py-1.5 text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                                    />
                                    <span className="text-gray-400 text-sm">/ {q.maxMarks}</span>
                                </div>
                                <textarea placeholder="Add evaluator feedback (optional)…"
                                    defaultValue={ls?.comment || ''}
                                    id={`desc-comment-${q._id}`}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary-300"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSaveOverride}
                                        className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                        Save
                                    </button>
                                    <button onClick={() => setOverriding(false)}
                                        className="px-4 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DescriptiveEvaluator;
