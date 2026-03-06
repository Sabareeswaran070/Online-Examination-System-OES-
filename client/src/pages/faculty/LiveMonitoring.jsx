import React, { useState } from 'react';
import AIProctorPane from '../../components/proctor/AIProctorPane';
import { FiChevronLeft, FiSettings, FiUser, FiInfo, FiGrid, FiList } from 'react-icons/fi';

const ExamSimulationArea = () => (
    <div className="h-full bg-white p-8 overflow-y-auto">
        {/* Generic Exam Content simulation */}
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 font-display tracking-tight">Full Stack Developer Assessment</h1>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Computer Science & Web Technologies</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-500 block uppercase tracking-tighter mb-1">Time Remaining</span>
                    <span className="text-xl font-mono font-black text-primary-600 tracking-tighter">01:24:42</span>
                </div>
            </div>

            <div className="space-y-6">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white text-xs font-black">Q3</span>
                        <span className="text-xs font-bold text-primary-600 uppercase tracking-widest bg-primary-50 px-2 py-0.5 rounded">Conceptual Area: React Hooks</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-6 font-display leading-snug">
                        In React, which hook is used to perform side effects such as data fetching, subscriptions, or manually changing the DOM?
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {['useState', 'useEffect', 'useMemo', 'useContext'].map((option, idx) => (
                            <label key={idx} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl cursor-not-allowed group transition-all hover:border-primary-500/50">
                                <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center transition-colors group-hover:border-primary-500" />
                                <span className="text-sm font-semibold text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100/50 shadow-sm opacity-60">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-600 text-xs font-black">Q4</span>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">System Architecture</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-0 font-display">Explain the difference between SQL and NoSQL databases...</h3>
                </div>
            </div>
        </div>
    </div>
);

const LiveMonitoring = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="fixed inset-0 flex flex-col bg-[#0a0c10] overflow-hidden">
            {/* Top Controls Bar */}
            <div className="h-14 bg-[#0d0f14] border-b border-gray-800 flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-4">
                    <button className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors">
                        <FiChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest font-display flex items-center gap-2">
                        <span className="text-primary-500">Live</span> Monitoring Console
                    </h2>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Active Student</p>
                        <p className="text-xs font-bold text-white font-display">Arjun Ramesh (STU-2024-047)</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary-600/10 border border-primary-500/30 flex items-center justify-center">
                        <FiUser className="text-primary-500 w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Main Container - 60/40 Split */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Area - Exam content simulation (60%) */}
                <section className={`flex-1 min-w-[300px] transition-all duration-500 ease-in-out`}>
                    <ExamSimulationArea />
                </section>

                {/* Right Area - Proctoring Panel (40%) */}
                <aside className={`w-[400px] xl:w-[450px] h-full flex flex-col bg-[#0d0f14] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-40`}>
                    <AIProctorPane studentName="Arjun Ramesh" useRealFeed={true} />
                </aside>
            </div>

            {/* Bottom Floating Controls (Optional) */}
            <div className="absolute bottom-6 left-6 flex items-center gap-2 z-50">
                <div className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full border border-gray-200 shadow-xl flex items-center gap-3">
                    <button className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-primary-600 rounded-full transition-all">
                        <FiGrid className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200" />
                    <button className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-primary-600 rounded-full transition-all">
                        <FiList className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live: Page 1 of 4</span>
                </div>
            </div>
        </div>
    );
};

export default LiveMonitoring;
