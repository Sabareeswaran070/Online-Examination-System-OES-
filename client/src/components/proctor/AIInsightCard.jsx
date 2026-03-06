import { useState } from 'react';
import { FiCpu, FiLoader, FiZap, FiCheckCircle } from 'react-icons/fi';

const AIInsightCard = ({ eventLog }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);

    const generateReport = async () => {
        setLoading(true);
        // Simulate API call to Claude
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Mock response
        const mockReport = {
            level: 'Moderate',
            summary: 'The candidate exhibited multiple high-severity behaviors including repeated tab switching and persistent window blur events. This pattern suggests potential external consultation or multitasking during the assessment period.',
            concerns: [
                'Frequent loss of browser focus (window blur)',
                'Three distinct tab switch events within a 2-minute window'
            ]
        };

        setReport(mockReport);
        setLoading(false);
    };

    return (
        <div className="bg-[#0f1117] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-primary-900/10 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FiCpu className="text-primary-500" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest font-display">AI Behavior Inspector</h3>
                </div>
                {!report && !loading && (
                    <button
                        onClick={generateReport}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    >
                        <FiZap className="w-3 h-3" />
                        Analyze Behavior
                    </button>
                )}
            </div>

            <div className="p-5 min-h-[120px] flex flex-col justify-center">
                {loading ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <FiLoader className="w-8 h-8 text-primary-500 animate-spin" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest animate-pulse">Scanning behavior logs</span>
                            <span className="text-[9px] text-gray-600 italic">Consulting AI Knowledge Base...</span>
                        </div>
                    </div>
                ) : report ? (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${report.level === 'High' ? 'bg-red-500/20 text-red-500 border border-red-500/50' :
                                        report.level === 'Moderate' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' :
                                            'bg-green-500/20 text-green-500 border border-green-500/50'
                                    }`}
                            >
                                Suspicion: {report.level}
                            </div>
                            <div className="h-px flex-1 bg-gray-800" />
                        </div>

                        <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                            {report.summary}
                        </p>

                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                <FiAlertCircle className="w-3 h-3" />
                                Key Concerns
                            </h4>
                            <ul className="space-y-1.5">
                                {report.concerns.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-[10px] text-gray-400">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-500/50" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={() => setReport(null)}
                            className="text-[9px] font-bold text-primary-500 hover:text-primary-400 transition-colors uppercase tracking-widest underline decoration-dashed underline-offset-4"
                        >
                            Re-evaluate Log
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center space-y-3 opacity-60 group cursor-pointer" onClick={generateReport}>
                        <div className="p-4 rounded-full bg-gray-900 border border-gray-800 group-hover:border-primary-500/50 transition-colors">
                            <FiCheckCircle className="w-10 h-10 text-gray-700 group-hover:text-primary-500/50" />
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-400 font-bold">Ready for deep behavior analysis</p>
                            <p className="text-[9px] text-gray-600">Analysis covers {eventLog.length} recorded events</p>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

const FiAlertCircle = ({ className }) => (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className={className} height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default AIInsightCard;
