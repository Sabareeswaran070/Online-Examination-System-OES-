import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SIGNAL_WEIGHTS } from './constants';
import LiveFeedPanel from './LiveFeedPanel';
import RiskGauge from './RiskGauge';
import BehaviorTimeline from './BehaviorTimeline';
import AlertsPanel from './AlertsPanel';
import AIInsightCard from './AIInsightCard';
import { FiFilter, FiActivity, FiShield, FiSettings } from 'react-icons/fi';

const AIProctorPane = ({ studentName = 'Arjun Ramesh', useRealFeed = false }) => {
    const [state, setState] = useState({
        riskScore: 0,
        events: [],
        faceStatus: 'detected',
        examElapsed: 0,
        aiReport: null,
    });

    const [activeFilter, setActiveFilter] = useState('all');

    // Logic: Add Event
    const addEvent = useCallback((type, severity, description) => {
        const newEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            severity,
            description,
            timestamp: new Date(),
            dismissed: false,
        };

        setState(prev => {
            const weight = SIGNAL_WEIGHTS[type] || 0;
            const newScore = Math.min(100, prev.riskScore + weight);
            return {
                ...prev,
                events: [...prev.events, newEvent],
                riskScore: newScore,
            };
        });
    }, []);

    // Logic: Dismiss Alert
    const handleDismiss = (id) => {
        setState(prev => ({
            ...prev,
            events: prev.events.map(e => e.id === id ? { ...e, dismissed: true } : e)
        }));
    };

    // Effect: Timer & Score Decay
    useEffect(() => {
        const interval = setInterval(() => {
            setState(prev => {
                // Decay logic: -1 pt every 10s if score > 0
                const shouldDecay = prev.examElapsed > 0 && prev.examElapsed % 10 === 0;
                return {
                    ...prev,
                    examElapsed: prev.examElapsed + 1,
                    riskScore: shouldDecay ? Math.max(0, prev.riskScore - 1) : prev.riskScore,
                };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Effect: Mock Event Generator (8-15s)
    useEffect(() => {
        const generateMockEvent = () => {
            const mockScenarios = [
                { type: 'tab_switch', severity: 'high', desc: 'Candidate switched tabs to external resources' },
                { type: 'window_blur', severity: 'medium', desc: 'Browser window lost focus' },
                { type: 'copy', severity: 'high', desc: 'Copy operation detected in exam area' },
                { type: 'mouse_leave', severity: 'low', desc: 'Cursor exited exam viewport' },
                { type: 'rapid_type', severity: 'low', desc: 'Typing burst > 90 WPM detected' },
                { type: 'right_click', severity: 'medium', desc: 'Context menu invocation attempted' },
            ];

            const scenario = mockScenarios[Math.floor(Math.random() * mockScenarios.length)];
            addEvent(scenario.type, scenario.severity, scenario.desc);

            // Schedule next
            const nextDelay = Math.floor(Math.random() * 7000) + 8000;
            setTimeout(generateMockEvent, nextDelay);
        };

        const timeoutId = setTimeout(generateMockEvent, 5000);
        return () => clearTimeout(timeoutId);
    }, [addEvent]);

    // Effect: Face Status Simulation
    useEffect(() => {
        const interval = setInterval(() => {
            const statuses = ['detected', 'detected', 'detected', 'missing', 'multiple'];
            const nextStatus = statuses[Math.floor(Math.random() * statuses.length)];

            if (nextStatus !== 'detected') {
                const severity = nextStatus === 'multiple' ? 'critical' : 'high';
                const desc = nextStatus === 'multiple' ? 'Multiple faces detected in frame' : 'Candidate face not visible in webcam feed';
                addEvent(nextStatus === 'multiple' ? 'multi_face' : 'face_missing', severity, desc);
            }

            setState(prev => ({ ...prev, faceStatus: nextStatus }));
        }, 12000);
        return () => clearInterval(interval);
    }, [addEvent]);

    return (
        <div className="flex flex-col h-full bg-[#0d0f14] text-gray-300 font-sans shadow-2xl border-l border-gray-800">
            {/* Header */}
            <div className="p-4 bg-[#0a0c10] border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-500/10 rounded-lg">
                        <FiShield className="text-primary-500 w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-xs font-black text-eyDark uppercase tracking-widest font-display">AIProctor™ Enterprise</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Live Session #942</span>
                        </div>
                    </div>
                </div>
                <button className="p-2 text-gray-600 hover:text-eyDark transition-colors">
                    <FiSettings className="w-4 h-4" />
                </button>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {/* Top Section: Feed & Gauge */}
                <div className="p-4 grid grid-cols-1 gap-4">
                    <LiveFeedPanel status={state.faceStatus} studentName={studentName} useRealFeed={useRealFeed} />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#14171f] rounded-xl border border-gray-800/50 p-2 flex items-center justify-center">
                            <RiskGauge score={state.riskScore} />
                        </div>
                        <div className="bg-[#14171f] rounded-xl border border-gray-800/50 p-4 flex flex-col justify-center gap-4">
                            <div className="space-y-1">
                                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Active Time</span>
                                <p className="text-xl font-mono text-eyDark font-bold">
                                    {Math.floor(state.examElapsed / 60).toString().padStart(2, '0')}:
                                    {(state.examElapsed % 60).toString().padStart(2, '0')}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Trust Index</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary-500 transition-all duration-500"
                                            style={{ width: `${100 - state.riskScore}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-eyDark font-bold">{100 - Math.round(state.riskScore)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panels Section */}
                <div className="px-4 pb-4 space-y-4">
                    <AIInsightCard eventLog={state.events} />

                    {/* Tabs for Timeline/Alerts */}
                    <div className="bg-[#14171f] rounded-xl border border-gray-800/50 overflow-hidden flex flex-col min-h-[400px]">
                        <div className="flex border-b border-gray-800">
                            <button
                                onClick={() => setActiveFilter('all')}
                                className={`flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeFilter === 'all' ? 'bg-primary-500/10 text-primary-500 border-b-2 border-primary-500' : 'text-gray-600'}`}
                            >
                                Behavior Feed
                            </button>
                            <button
                                onClick={() => setActiveFilter('high+')}
                                className={`flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeFilter === 'high+' ? 'bg-red-600/10 text-red-500 border-b-2 border-red-500' : 'text-gray-600'}`}
                            >
                                Critical Alerts
                            </button>
                        </div>
                        <div className="flex-1">
                            {activeFilter === 'all' ? (
                                <BehaviorTimeline events={state.events} filter="all" />
                            ) : (
                                <AlertsPanel alerts={state.events} onDismiss={handleDismiss} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Status Bar */}
            <div className="p-3 bg-[#0a0c10] border-t border-gray-800 flex items-center justify-between text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <FiActivity className="text-green-500 w-3 h-3" />
                        <span>AI CORE: ACTIVE</span>
                    </div>
                    <div className="w-px h-3 bg-gray-800" />
                    <span>Events: {state.events.length}</span>
                </div>
                <span className="animate-pulse text-primary-500/80">● Recording Data</span>
            </div>
        </div>
    );
};

export default AIProctorPane;
