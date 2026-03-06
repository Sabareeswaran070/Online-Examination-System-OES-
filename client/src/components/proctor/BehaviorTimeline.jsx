import { useEffect, useRef } from 'react';
import { SEVERITY_COLORS } from './constants';
import {
    FiExternalLink, FiCopy, FiClipboard, FiAlertCircle,
    FiUsers, FiMousePointer, FiMonitor, FiClock, FiZap, FiTarget
} from 'react-icons/fi';

const EVENT_ICONS = {
    tab_switch: FiExternalLink,
    copy: FiCopy,
    paste: FiClipboard,
    face_missing: FiAlertCircle,
    multi_face: FiUsers,
    window_blur: FiMonitor,
    fullscreen_exit: FiMonitor,
    idle: FiClock,
    rapid_type: FiZap,
    mouse_leave: FiMousePointer,
    right_click: FiTarget,
};

const BehaviorTimeline = ({ events, filter = 'all' }) => {
    const scrollRef = useRef(null);

    const filteredEvents = events.filter(e => {
        if (filter === 'all') return true;
        if (filter === 'high+') return e.severity === 'high' || e.severity === 'critical';
        if (filter === 'critical') return e.severity === 'critical';
        return true;
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events]);

    return (
        <div className="flex flex-col h-full bg-[#0a0c10] border-l border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest font-display">Timeline</h3>
                <span className="px-2 py-0.5 rounded bg-gray-900 text-[10px] text-gray-500 font-bold border border-gray-800">
                    {filteredEvents.length} Events
                </span>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar"
            >
                {filteredEvents.map((event) => {
                    const Icon = EVENT_ICONS[event.type] || FiAlertCircle;
                    return (
                        <div
                            key={event.id}
                            className="relative pl-6 py-1 group/item transition-all duration-300"
                            style={{ borderLeft: `3px solid ${SEVERITY_COLORS[event.severity]}` }}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Icon
                                        className="w-3 h-3 transition-transform group-hover/item:scale-110"
                                        style={{ color: SEVERITY_COLORS[event.severity] }}
                                    />
                                    <span className="text-[11px] font-bold text-gray-200 capitalize">
                                        {event.type.replace('_', ' ')}
                                    </span>
                                </div>
                                <span className="text-[9px] font-mono text-gray-500 font-bold">
                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                                {event.description}
                            </p>

                            {/* Particle Decoration */}
                            <div
                                className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] transition-all duration-300"
                                style={{ backgroundColor: SEVERITY_COLORS[event.severity], color: SEVERITY_COLORS[event.severity] }}
                            />
                        </div>
                    );
                })}
                {filteredEvents.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                        <FiActivity className="w-8 h-8" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">No Events Tracked</span>
                    </div>
                )}
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0c10;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f2937;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #374151;
        }
      `}</style>
        </div>
    );
};

export default BehaviorTimeline;
