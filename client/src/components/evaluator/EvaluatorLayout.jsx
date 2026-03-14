import React, { useState } from 'react';
import { FiX, FiGrid, FiCode, FiType, FiCheckSquare } from 'react-icons/fi';
import EvaluatorHeader from './EvaluatorHeader';
import MCQEvaluator from './MCQEvaluator';
import DescriptiveEvaluator from './DescriptiveEvaluator';
import TrueFalseEvaluator from './TrueFalseEvaluator';
import CodingEvaluator from './CodingEvaluator';

const TABS = [
    { key: 'MCQ', label: 'MCQ', icon: <FiGrid size={15} /> },
    { key: 'Coding', label: 'Coding', icon: <FiCode size={15} /> },
    { key: 'Descriptive', label: 'Descriptive', icon: <FiType size={15} /> },
    { key: 'TrueFalse', label: 'True / False', icon: <FiCheckSquare size={15} /> },
];

const EvaluatorLayout = ({ studentData, examData, onClose, onUpdateEvaluation, onAcceptAIEvaluation, loadingAI }) => {
    const flattenedAnswers = React.useMemo(() => {
        return studentData.answers?.map(a => {
            const q = a.questionId || {};
            let studentAnswer = a.selectedAnswer;
            if (q.type === 'Descriptive') studentAnswer = a.textAnswer;
            if (q.type === 'Coding') studentAnswer = a.codeAnswer || a.studentCode;
            const qType = q.type === 'True/False' ? 'TrueFalse' : q.type;
            return {
                ...a, type: qType,
                questionText: q.questionText,
                maxMarks: q.marks,
                studentAnswer,
                correctAnswer: (qType === 'MCQ' || qType === 'TrueFalse') ? q.options?.find(opt => opt.isCorrect)?.text : null,
                options: q.options?.map(opt => typeof opt === 'string' ? opt : opt.text),
                aiScore: a.aiScore,
                aiReasoning: a.aiReasoning || a.reasoning,
                keywordsHit: a.keywordsHit,
                testCaseResults: a.testCaseResults || [],
                language: q.programmingLanguage || a.language,
                title: q.title || (q.questionText ? q.questionText.substring(0, 40) + '...' : 'Untitled'),
                sampleIO: (q.sampleInput || q.sampleOutput) ? { input: q.sampleInput, output: q.sampleOutput } : null,
                inputFormat: q.inputFormat,
                constraints: q.constraints,
                isManuallyEvaluated: a.isEvaluated && (q.type === 'Descriptive' || q.type === 'Coding'),
                evaluatorFeedback: a.feedback || a.evaluatorFeedback,
            };
        }) || [];
    }, [studentData.answers]);

    const [activeTab, setActiveTab] = useState('MCQ');
    const [selectedQuestions, setSelectedQuestions] = useState({
        MCQ: flattenedAnswers.find(a => a.type === 'MCQ'),
        Descriptive: flattenedAnswers.find(a => a.type === 'Descriptive'),
        TrueFalse: flattenedAnswers.find(a => a.type === 'TrueFalse'),
        Coding: flattenedAnswers.find(a => a.type === 'Coding'),
    });

    const answersByType = (type) => flattenedAnswers.filter(a => a.type === type);
    const handleSelect = (tab, q) => setSelectedQuestions(prev => ({ ...prev, [tab]: q }));

    const renderPanel = () => {
        switch (activeTab) {
            case 'MCQ': return <MCQEvaluator questions={answersByType('MCQ')} activeQuestion={selectedQuestions.MCQ} onSelectQuestion={q => handleSelect('MCQ', q)} />;
            case 'Descriptive': return <DescriptiveEvaluator questions={answersByType('Descriptive')} activeQuestion={selectedQuestions.Descriptive} onSelectQuestion={q => handleSelect('Descriptive', q)} onUpdateScore={onUpdateEvaluation} onAcceptAI={onAcceptAIEvaluation} loadingAI={loadingAI} />;
            case 'TrueFalse': return <TrueFalseEvaluator questions={answersByType('TrueFalse')} activeQuestion={selectedQuestions.TrueFalse} onSelectQuestion={q => handleSelect('TrueFalse', q)} />;
            case 'Coding': { const coding = answersByType('Coding'); return <CodingEvaluator question={selectedQuestions.Coding || coding[0]} onUpdateScore={onUpdateEvaluation} onAcceptAI={onAcceptAIEvaluation} loadingAI={loadingAI} />; }
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50 font-sans animate-fade-in">
            <EvaluatorHeader studentName={studentData.studentId?.name} examTitle={examData?.title} submittedAt={studentData.submittedAt} />

            {/* Tab Bar */}
            <div className="bg-white border-b border-gray-200 flex items-center px-4 gap-0 flex-shrink-0">
                {TABS.map(t => {
                    const count = answersByType(t.key).length;
                    const isActive = activeTab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-150 ${isActive
                                ? 'border-primary-600 text-eyDark bg-primary-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                        >
                            {t.icon}
                            {t.label}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}

                <button
                    onClick={onClose}
                    className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors mr-1"
                >
                    <FiX size={16} /> Close
                </button>
            </div>

            {/* Panel */}
            <div className="flex-1 overflow-hidden flex">
                {renderPanel()}
            </div>
        </div>
    );
};

export default EvaluatorLayout;
