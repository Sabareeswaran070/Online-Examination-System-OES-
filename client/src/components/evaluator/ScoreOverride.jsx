import React from 'react';
import { FiEdit3, FiSave, FiCheck } from 'react-icons/fi';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';

const ScoreOverride = ({ currentScore, maxMarks, feedback, onUpdate, onAcceptAI }) => {
    const [localScore, setLocalScore] = React.useState(currentScore || 0);
    const [localFeedback, setLocalFeedback] = React.useState(feedback || '');

    React.useEffect(() => {
        setLocalScore(currentScore || 0);
        setLocalFeedback(feedback || '');
    }, [currentScore, feedback]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <FiEdit3 className="text-evaluator-accent" />
                <h3 className="text-sm font-black text-gray-900 uppercase">Evaluator Override</h3>
            </div>

            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Manual Score</label>
                        <div className="relative">
                            <Input
                                type="number"
                                value={localScore}
                                onChange={(e) => setLocalScore(Number(e.target.value))}
                                max={maxMarks}
                                min={0}
                                className="font-bold text-lg pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">/ {maxMarks}</span>
                        </div>
                    </div>
                    <div className="flex items-end">
                        <Button
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 h-[42px] border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            onClick={onAcceptAI}
                        >
                            <FiCheck /> Accept AI Score
                        </Button>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Evaluator Comments</label>
                    <Textarea
                        value={localFeedback}
                        onChange={(e) => setLocalFeedback(e.target.value)}
                        placeholder="Provide constructive feedback for the student..."
                        rows={4}
                        className="text-sm"
                    />
                </div>

                <Button
                    variant="primary"
                    className="w-full h-12 flex items-center justify-center gap-2 bg-evaluator-accent hover:bg-blue-700 shadow-md shadow-blue-100 font-bold"
                    onClick={() => onUpdate(localScore, localFeedback)}
                >
                    <FiSave /> Submit Manual Evaluation
                </Button>
            </div>
        </div>
    );
};

export default ScoreOverride;
