import { useState, useEffect, useRef } from 'react';
import { FACE_STATUS_LABELS } from './constants';
import { FiVideo, FiVideoOff, FiActivity, FiRefreshCw } from 'react-icons/fi';

const LiveFeedPanel = ({
    status = 'detected',
    studentName = 'Arjun Ramesh',
    useRealFeed = false,
    mediaActive = true,
    showOverlays = true,
    onSnapshot = null,
    snapshotInterval = 5000
}) => {
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const activeRequestRef = useRef(0);
    const isOnline = status !== 'unavailable' && !error;

    useEffect(() => {
        if (useRealFeed && mediaActive) {
            console.log('LiveFeedPanel: Requesting media active...');
            startCamera();
        } else {
            console.log('LiveFeedPanel: Requesting media inactive...');
            stopCamera();
        }
        return () => {
            console.log('LiveFeedPanel: Component unmounting, stopping media...');
            stopCamera();
        };
    }, [useRealFeed, mediaActive]);

    // Handle periodic snapshots
    useEffect(() => {
        if (!onSnapshot || !stream || !mediaActive) return;

        const capture = () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement('canvas');
                }
                const canvas = canvasRef.current;
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext('2d');

                // Flip horizontally for mirror mode if needed
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);

                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/jpeg', 0.5); // 0.5 quality for better performance
                onSnapshot(imageData);
            }
        };

        const intervalId = setInterval(capture, snapshotInterval);
        // Also capture immediately
        setTimeout(capture, 1000);

        return () => clearInterval(intervalId);
    }, [onSnapshot, stream, mediaActive, snapshotInterval]);

    // Sync stream to video element once it renders
    useEffect(() => {
        if (stream && videoRef.current) {
            console.log('LiveFeedPanel: Attaching stream to video element');
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const startCamera = async () => {
        const requestId = ++activeRequestRef.current;
        try {
            setError(null);
            console.log(`LiveFeedPanel: Requesting media device permissions (Req #${requestId})...`);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false
            });

            // Check if this request is still the active one and media should be active
            if (requestId !== activeRequestRef.current || !mediaActive) {
                console.log(`LiveFeedPanel: Request #${requestId} obsolete or media inactive, releasing stream`);
                mediaStream.getTracks().forEach(track => track.stop());
                return;
            }

            console.log(`LiveFeedPanel: Stream acquired successfully (Req #${requestId})`);
            streamRef.current = mediaStream;
            setStream(mediaStream);
        } catch (err) {
            if (requestId === activeRequestRef.current) {
                console.error(`LiveFeedPanel: Camera error (Req #${requestId}):`, err);
                setError(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Camera Error');
            }
        }
    };

    const stopCamera = () => {
        activeRequestRef.current++; // Invalidate any pending startCamera calls
        if (streamRef.current) {
            console.log('LiveFeedPanel: Stopping all stream tracks from ref');
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`LiveFeedPanel: Track ${track.label} stopped`);
            });
            streamRef.current = null;
        }
        if (stream) {
            console.log('LiveFeedPanel: Clearing stream state');
            setStream(null);
        }
    };

    return (
        <div className="relative w-full aspect-video bg-[#0a0c10] rounded-xl overflow-hidden border border-gray-800 shadow-2xl group">
            {/* Simulation Background (Gradients/Noise) - Only shown if no stream */}
            {!stream && (
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            )}

            {/* Viewport Content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {error ? (
                    <div className="flex flex-col items-center text-center px-4">
                        <FiVideoOff className="w-12 h-12 mb-4 text-red-500/50" />
                        <h4 className="text-sm font-black text-eyDark uppercase tracking-widest mb-1">{error}</h4>
                        <p className="text-[10px] text-gray-500 font-bold max-w-[200px]">
                            {error === 'Permission Denied'
                                ? 'Please allow camera access in your browser settings to continue.'
                                : 'Unable to initialize camera hardware. Check connections.'}
                        </p>
                        <button
                            onClick={startCamera}
                            className="mt-4 flex items-center gap-2 px-3 py-1 bg-primary-500 hover:bg-primary-500 text-eyDark rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <FiRefreshCw className="w-3 h-3" /> Retry Connection
                        </button>
                    </div>
                ) : stream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror-mode"
                    />
                ) : !isOnline ? (
                    <div className="flex flex-col items-center text-gray-600 animate-pulse">
                        <FiVideoOff className="w-16 h-16 mb-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Feed Offline</span>
                    </div>
                ) : (
                    <div className="relative w-full h-full bg-[#0d1117]">
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <FiVideo className="w-24 h-24 text-primary-500" />
                        </div>
                    </div>
                )}

                {/* Proctoring Overlays (Bounding Boxes) */}
                {isOnline && showOverlays && (
                    <div className="absolute inset-0 pointer-events-none">
                        {status === 'detected' && (
                            <div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-green-500/50 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                                style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                            >
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500" />
                            </div>
                        )}
                        {status === 'multiple' && (
                            <>
                                <div className="absolute top-[20%] left-[25%] w-32 h-44 border-2 border-yellow-500/50 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse" />
                                <div className="absolute top-[30%] right-[15%] w-36 h-48 border-2 border-yellow-500/50 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse" />
                            </>
                        )}
                        {status === 'missing' && (
                            <div className="absolute inset-0 bg-red-900/10 flex items-center justify-center">
                                <FiActivity className="w-12 h-12 text-red-500/50 animate-ping" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Persistent Overlays */}
            {showOverlays && (
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    <div className={`px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2 ${!mediaActive ? 'opacity-50' : ''}`}>
                        <div className={!mediaActive ? 'w-2 h-2 rounded-full bg-gray-500' : (status === 'detected' ? 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]' : 'w-2 h-2 rounded-full bg-red-500')} />
                        <span className="text-[10px] font-black text-eyDark uppercase tracking-wider">
                            {!mediaActive ? 'Devices Inactive' : FACE_STATUS_LABELS[status]}
                        </span>
                    </div>
                    <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{studentName}</span>
                    </div>
                </div>
            )}

            {/* Footer Meta Overlay */}
            {showOverlays && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end z-10">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-gray-500 font-bold uppercase">Signal Quality</span>
                        <span className="text-[11px] text-eyDark font-mono leading-none">
                            {!mediaActive ? 'MEDIA RELEASED' : (stream ? 'HD LIVE' : 'SIMULATED')} | {error ? 'ERROR' : 'STABLE'}
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[9px] text-gray-500 font-bold uppercase">Timestamp</span>
                        <span className="text-[11px] text-eyDark font-mono leading-none">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            )}

            <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .mirror-mode {
          transform: scaleX(-1);
        }
      `}</style>
        </div>
    );
};

export default LiveFeedPanel;

