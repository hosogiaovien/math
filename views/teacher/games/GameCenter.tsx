

import React, { useState, useEffect, useRef } from 'react';
import { StudentAccount } from '../../../types';
import { RefreshCcw, User, Play, Trophy, RotateCw, Trash2, CheckCircle2, Volume2, VolumeX, Users, Zap, MessageSquare, Flag, X, Maximize2, Minimize2, Package,  Gamepad2, Grab, Bomb, Flame, Rocket, Target, Hammer, Gem, Egg } from 'lucide-react';

interface GameCenterProps {
  students: StudentAccount[];
  className: string;
}

type GameType = 'snail' | 'duck' | 'wheel' | 'bomb' | 'claw' | 'rocket' | 'egg' | 'miner' | null;

// Vibrant colors for excitement
const VIBRANT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#f43f5e', '#b91c1c', '#c2410c', '#b45309', '#4d7c0f',
  '#be185d', '#0f766e', '#1d4ed8', '#7e22ce', '#a16207'
];

// Assets
const SNAIL_ICON = "🐌"; 
const DUCK_ICON = "🦆";
const BOMB_ICON = "💣";
const EXPLOSION_ICON = "💥";
const ROCKET_ICON = "🚀";
const GOLD_ICON = "💰";
const ROCK_ICON = "🪨";

// Helper: Sound Effects
const playSound = (type: 'tick' | 'win' | 'start' | 'stumble' | 'sleep' | 'mechanical' | 'pop' | 'boom' | 'crack') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'tick') {
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'stumble') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'sleep') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        } else if (type === 'mechanical') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'win') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, now); 
            osc.frequency.setValueAtTime(659.25, now + 0.2); 
            osc.frequency.setValueAtTime(783.99, now + 0.4); 
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0, now + 1.5);
            osc.start(now); osc.stop(now + 1.5);
        } else if (type === 'pop') {
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'boom') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 1.0);
            gain.gain.setValueAtTime(1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
            osc.start(now); osc.stop(now + 1.0);
        } else if (type === 'crack') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else {
            // Start
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        }
    } catch (e) { console.error(e); }
};

// --- GAME 1 & 2: MARATHON CHAOS RACE (HORIZONTAL) ---
interface RunnerState {
    id: string;
    pos: number;
    laneY: number;
    status: 'run' | 'stumble' | 'sleep' | 'finished';
    speedMod: number;
    stumbleTime: number;
    zIndex: number;
    color: string;
}

const RealRaceGame: React.FC<{ 
    students: StudentAccount[]; 
    type: 'snail' | 'duck';
    onBack: () => void;
}> = ({ students, type, onBack }) => {
    const [runners, setRunners] = useState<RunnerState[]>([]);
    const [finishedOrder, setFinishedOrder] = useState<StudentAccount[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [commentary, setCommentary] = useState("Sẵn sàng...");
    const [topN, setTopN] = useState<1 | 3>(1);
    
    const raceIntervalRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { resetRace(); }, [students]);

    const resetRace = () => {
        const initialRunners: RunnerState[] = students.map((s, idx) => {
            const laneY = Math.random() * 80 + 5; 
            return {
                id: s.id, pos: 0, laneY: laneY, status: 'run',
                speedMod: Math.random() * 0.5 + 0.8, stumbleTime: 0,
                zIndex: Math.floor(laneY),
                color: VIBRANT_COLORS[idx % VIBRANT_COLORS.length]
            }
        });
        setRunners(initialRunners);
        setFinishedOrder([]);
        setIsRunning(false);
        setCommentary("Sẵn sàng...");
        if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
        if (containerRef.current) containerRef.current.scrollLeft = 0;
    };

    const startRace = () => {
        if(isRunning) return;
        setIsRunning(true);
        playSound('start');
        setCommentary("XUẤT PHÁT!!!");

        raceIntervalRef.current = setInterval(() => {
            setRunners(prev => {
                const next = [...prev];
                const activeRunners = next.filter(r => r.status !== 'finished');

                if (activeRunners.length === 0) {
                    clearInterval(raceIntervalRef.current);
                    setIsRunning(false);
                    return next;
                }

                if (Math.random() < 0.05) { 
                    const victimIdx = Math.floor(Math.random() * activeRunners.length);
                    const victim = activeRunners[victimIdx];
                    const actualIndex = next.findIndex(r => r.id === victim.id);
                    
                    if (actualIndex !== -1 && next[actualIndex].pos < 4500) { 
                        const r = Math.random();
                        if (r < 0.4) {
                            next[actualIndex].status = 'stumble';
                            next[actualIndex].stumbleTime = 15;
                            setCommentary(`${students.find(s=>s.id===victim.id)?.fullName} vấp ngã!`);
                            playSound('stumble');
                        } else if (r < 0.6) {
                             next[actualIndex].status = 'sleep';
                             next[actualIndex].stumbleTime = 20;
                             setCommentary(`${students.find(s=>s.id===victim.id)?.fullName} ngủ gật!`);
                             playSound('sleep');
                        }
                    }
                }

                let maxPos = 0;
                next.forEach(r => {
                    if (r.status === 'finished') return;
                    if (r.status === 'stumble' || r.status === 'sleep') {
                        r.stumbleTime--;
                        if (r.stumbleTime <= 0) r.status = 'run';
                        return;
                    }
                    const move = (Math.random() * 12 + 10) * r.speedMod;
                    
                    r.pos += move;
                    if (r.pos > maxPos) maxPos = r.pos;
                    if (r.pos >= 4800) {
                        r.pos = 4800;
                        r.status = 'finished';
                        setFinishedOrder(prevOrder => {
                            if (prevOrder.find(s => s.id === r.id)) return prevOrder;
                            const studentInfo = students.find(s => s.id === r.id);
                            if (studentInfo) {
                                setCommentary(`${studentInfo.fullName} VỀ ĐÍCH! 🏁`);
                                return [...prevOrder, studentInfo];
                            }
                            return prevOrder;
                        });
                    }
                });

                if (containerRef.current) {
                    const screenWidth = containerRef.current.clientWidth;
                    const targetScroll = maxPos - (screenWidth * 0.5);
                    const currentScroll = containerRef.current.scrollLeft;
                    const diff = targetScroll - currentScroll;
                    if (diff > 0) containerRef.current.scrollLeft = currentScroll + diff * 0.25; 
                }
                return next;
            });
        }, 50); 
    };

    useEffect(() => {
        if (finishedOrder.length >= topN && isRunning) {
            clearInterval(raceIntervalRef.current);
            setIsRunning(false);
            playSound('win');
        }
    }, [finishedOrder, topN, isRunning]);

    useEffect(() => () => clearInterval(raceIntervalRef.current), []);

    const animationClass = type === 'snail' ? 'animate-[crawl_1s_infinite]' : 'animate-[waddle_0.4s_infinite]';
    
    // BACKGROUND STYLES
    const bgStyle = type === 'duck' 
        ? { 
            backgroundColor: '#3b82f6', 
            backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(255,255,255,0.5) 80px),
                radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 10%)
            `,
            backgroundSize: '100% 80px, 40px 40px' 
          }
        : { 
            backgroundColor: '#4caf50', 
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(0deg, transparent 50%, rgba(0,0,0,0.05) 50%)`, 
            backgroundSize: '20px 20px, 100% 80px' 
          };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-20 bg-black/60 backdrop-blur-md p-4 flex justify-between items-center z-[9999] text-white shadow-lg pointer-events-auto">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="bg-white/10 hover:bg-white/30 text-white p-2 rounded-full transition cursor-pointer border border-white/20 active:scale-95">
                        <X className="w-6 h-6"/>
                    </button>
                    <h2 className="text-xl font-bold text-white hidden md:block uppercase tracking-wider drop-shadow-md">
                        {type === 'snail' ? `🐌 Giải Đua Ốc Sên` : `🦆 Giải Đua Vịt (Hồ Bơi)`}
                    </h2>
                </div>
                <div className="flex-1 mx-6 bg-black/50 border border-yellow-500/50 px-6 py-2 rounded-full text-center text-yellow-300 font-mono text-lg font-bold shadow-[0_0_15px_rgba(250,204,21,0.2)] truncate">
                    <MessageSquare className="w-5 h-5 inline mr-3"/>{commentary}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white/10 rounded-lg p-1">
                        <button onClick={() => setTopN(1)} className={`px-3 py-1 rounded text-sm font-bold transition ${topN === 1 ? 'bg-yellow-500 text-black' : 'text-white/70'}`}>Top 1</button>
                        <button onClick={() => setTopN(3)} className={`px-3 py-1 rounded text-sm font-bold transition ${topN === 3 ? 'bg-yellow-500 text-black' : 'text-white/70'}`}>Top 3</button>
                    </div>
                    {!isRunning ? (
                        <button onClick={startRace} className="bg-green-500 text-white px-6 py-2 rounded-full font-bold hover:bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)] flex items-center transform hover:scale-105 transition border-2 border-white">
                            <Play className="w-5 h-5 mr-2"/> BẮT ĐẦU
                        </button>
                    ) : (
                        <button disabled className="bg-gray-500/50 text-white px-6 py-2 rounded-full font-bold cursor-not-allowed border-2 border-gray-400">Đang chạy...</button>
                    )}
                    {finishedOrder.length > 0 && !isRunning && (
                        <button onClick={resetRace} className="bg-blue-500 hover:bg-blue-400 text-white p-2 rounded-full"><RefreshCcw className="w-5 h-5"/></button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar select-none" ref={containerRef} style={{ scrollBehavior: 'auto', ...bgStyle }}>
                <div style={{ width: '5000px', height: '100%', position: 'relative' }}>
                    {/* Start Line */}
                    <div className="absolute left-[50px] top-0 bottom-0 w-4 bg-white shadow-lg z-0 flex flex-col justify-center items-center"><div className="absolute -top-4 bg-white px-2 rounded font-bold text-black border border-gray-300">START</div></div>
                    {/* Finish Line */}
                    <div className="absolute left-[4800px] top-0 bottom-0 w-24 z-0 shadow-2xl flex flex-col justify-center" style={{ backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)`, backgroundColor: '#fff', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }}>
                         <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black py-2 px-6 rounded shadow-lg border-2 border-white text-xl animate-bounce">ĐÍCH</div>
                    </div>
                    {/* Water Effect Overlay for Duck */}
                    {type === 'duck' && <div className="absolute inset-0 bg-blue-500/10 pointer-events-none animate-pulse"></div>}

                    {students.map((s, idx) => {
                        const runner = runners.find(r => r.id === s.id);
                        if(!runner) return null;
                        const finishRank = finishedOrder.findIndex(f => f.id === s.id) + 1;
                        const avatarIcon = type === 'snail' ? SNAIL_ICON : DUCK_ICON;
                        return (
                            <div key={s.id} className="absolute transition-transform duration-75 ease-linear will-change-transform flex flex-col items-center group" style={{ left: `${runner.pos + 50}px`, top: `${runner.laneY}%`, zIndex: runner.zIndex + 10 }}>
                                <div 
                                    className="font-black whitespace-nowrap -mb-2 relative z-20 group-hover:scale-125 transition origin-bottom text-lg md:text-xl lg:text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]"
                                    style={{ color: runner.color, textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}
                                >
                                    {s.fullName}
                                </div>
                                <div className={`w-16 h-16 md:w-20 md:h-20 relative flex items-center justify-center ${runner.status === 'run' ? animationClass : runner.status === 'stumble' ? 'animate-[spin_0.5s_linear_infinite]' : ''}`}>
                                    <div className="text-5xl md:text-6xl filter drop-shadow-xl select-none" style={{ lineHeight: 1 }}>{avatarIcon}</div>
                                    {runner.status === 'run' && (<div className="absolute bottom-2 -left-4 w-6 h-6 bg-white/30 rounded-full blur-md animate-ping"></div>)}
                                    {runner.status === 'stumble' && <div className="absolute -top-6 left-2 text-3xl animate-ping">💥</div>}
                                    {runner.status === 'sleep' && <div className="absolute -top-6 right-0 text-xl font-bold text-blue-500 bg-white rounded-full px-2 animate-bounce">Zzz</div>}
                                </div>
                                {finishRank > 0 && (<div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-black text-xl w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,1)] border-2 border-white animate-[bounce_1s_infinite] z-30">{finishRank}</div>)}
                            </div>
                        )
                    })}
                </div>
            </div>

            {finishedOrder.length >= topN && !isRunning && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[99999] p-4 backdrop-blur-md animate-[fadeIn_0.5s]">
                    <div className="bg-white rounded-3xl p-10 max-w-lg w-full text-center shadow-[0_0_50px_rgba(255,215,0,0.5)] border-4 border-yellow-400 relative overflow-hidden pointer-events-auto">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,_#fbbf24_2px,_transparent_2.5px)] bg-[length:20px_20px]"></div>
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-8xl filter drop-shadow-xl animate-bounce">🏆</div>
                        <h3 className="text-3xl font-black text-gray-800 mt-8 mb-8 uppercase tracking-wider">Tổng Kết Cuộc Đua</h3>
                        <div className="space-y-4 relative z-10">
                            {finishedOrder.slice(0, topN).map((s, i) => (
                                <div key={s.id} className="flex items-center gap-4 bg-yellow-50 p-4 rounded-2xl border border-yellow-200 shadow-sm transform transition hover:scale-105">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-xl shadow-lg ${i===0?'bg-gradient-to-br from-yellow-400 to-orange-500':i===1?'bg-gray-400':'bg-orange-700'}`}>#{i+1}</div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-xl text-gray-900">{s.fullName}</div>
                                        {i===0 && <div className="text-xs text-orange-600 font-bold uppercase">Nhà vô địch</div>}
                                    </div>
                                    {i===0 && <Trophy className="w-8 h-8 text-yellow-500 drop-shadow"/>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-10 flex gap-4 relative z-50">
                            <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="flex-1 py-4 bg-gray-100 font-bold rounded-xl text-gray-600 hover:bg-gray-200 border-2 border-gray-200 cursor-pointer">Thoát Game</button>
                            <button onClick={(e) => { e.stopPropagation(); resetRace(); }} className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 font-bold rounded-xl text-white hover:from-green-600 hover:to-green-700 shadow-lg transform transition active:scale-95 border-2 border-green-400 cursor-pointer">Đua Lại</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes crawl {
                    0% { transform: scaleX(-1) translateX(0) scaleY(1); }
                    50% { transform: scaleX(-1.1) translateX(5px) scaleY(0.9); }
                    100% { transform: scaleX(-1) translateX(0) scaleY(1); }
                }
                @keyframes waddle {
                    0% { transform: scaleX(-1) rotate(0deg); }
                    25% { transform: scaleX(-1) rotate(-8deg) translateY(-3px); }
                    75% { transform: scaleX(-1) rotate(8deg) translateY(-3px); }
                    100% { transform: scaleX(-1) rotate(0deg); }
                }
            `}</style>
        </div>
    );
};

// --- GAME 6: SPACE ROCKET RACE (VERTICAL) ---
const VerticalRaceGame: React.FC<{
    students: StudentAccount[];
    onBack: () => void;
}> = ({ students, onBack }) => {
    const [runners, setRunners] = useState<RunnerState[]>([]);
    const [finishedOrder, setFinishedOrder] = useState<StudentAccount[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    
    const raceIntervalRef = useRef<any>(null);

    useEffect(() => { resetRace(); }, [students]);

    const resetRace = () => {
        const initialRunners = students.map((s, idx) => ({
            id: s.id, pos: 0, laneY: 0, status: 'run' as const,
            speedMod: Math.random() * 0.5 + 0.8, stumbleTime: 0, zIndex: 0,
            color: VIBRANT_COLORS[idx % VIBRANT_COLORS.length]
        }));
        setRunners(initialRunners);
        setFinishedOrder([]);
        setIsRunning(false);
        if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    };

    const startRace = () => {
        if(isRunning) return;
        setIsRunning(true);
        playSound('start');

        raceIntervalRef.current = setInterval(() => {
            setRunners(prev => {
                const next = [...prev];
                const activeRunners = next.filter(r => r.status !== 'finished');

                if (activeRunners.length === 0) {
                    clearInterval(raceIntervalRef.current);
                    setIsRunning(false);
                    return next;
                }

                next.forEach(r => {
                    if (r.status === 'finished') return;
                    // Move vertically (bottom to top is 0 to 100%)
                    const move = (Math.random() * 0.3 + 0.2) * r.speedMod;
                    r.pos += move;
                    
                    if (r.pos >= 90) {
                        r.pos = 90;
                        r.status = 'finished';
                        setFinishedOrder(prevOrder => {
                            if (prevOrder.find(s => s.id === r.id)) return prevOrder;
                            const studentInfo = students.find(s => s.id === r.id);
                            if (studentInfo) return [...prevOrder, studentInfo];
                            return prevOrder;
                        });
                    }
                });
                return next;
            });
        }, 50); 
    };

    useEffect(() => {
        if (finishedOrder.length >= 1 && isRunning) {
            clearInterval(raceIntervalRef.current);
            setIsRunning(false);
            playSound('win');
        }
    }, [finishedOrder, isRunning]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0f172a] overflow-hidden">
            {/* Stars background */}
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 4px)', backgroundSize: '550px 550px', backgroundPosition: '0 0' }}></div>
            
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 text-white">
                <button onClick={onBack} className="bg-white/10 p-2 rounded-full"><X/></button>
                <h2 className="text-xl font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Đua Tên Lửa Không Gian</h2>
                {!isRunning ? (
                    <button onClick={startRace} className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-full font-bold shadow-lg border-2 border-purple-400">PHÓNG 🚀</button>
                ) : (
                    <button className="bg-gray-600 px-6 py-2 rounded-full font-bold cursor-not-allowed">Đang bay...</button>
                )}
            </div>

            {/* Race Track */}
            <div className="flex-1 relative mx-4 mt-20 mb-4 border-b-4 border-white/20 flex justify-between items-end px-10">
                {/* Finish Line */}
                <div className="absolute top-[10%] left-0 right-0 border-t-2 border-dashed border-yellow-400 z-0 opacity-50 flex justify-center">
                    <span className="bg-yellow-400 text-black px-2 text-xs font-bold -mt-3 rounded">ĐÍCH (Mặt Trăng)</span>
                </div>

                {students.map((s, idx) => {
                    const runner = runners.find(r => r.id === s.id);
                    if(!runner) return null;
                    const finishRank = finishedOrder.findIndex(f => f.id === s.id) + 1;
                    return (
                        <div key={s.id} className="relative flex flex-col items-center" style={{ width: `${100/students.length}%`, height: '100%' }}>
                            <div 
                                className="absolute transition-all duration-75 ease-linear flex flex-col items-center"
                                style={{ bottom: `${runner.pos}%`, width: '100%' }}
                            >
                                <div className="text-xs md:text-sm font-bold text-white mb-1 truncate max-w-full px-1" style={{ color: runner.color }}>
                                    {s.fullName}
                                </div>
                                <div className="text-3xl md:text-5xl transform -rotate-45 drop-shadow-[0_0_10px_rgba(255,165,0,0.8)]">
                                    {ROCKET_ICON}
                                </div>
                                {/* Exhaust Flame */}
                                {runner.status === 'run' && (
                                    <div className="mt-1 w-2 h-6 bg-gradient-to-b from-yellow-400 to-red-600 rounded-full animate-pulse blur-[2px]"></div>
                                )}
                                {finishRank > 0 && (
                                    <div className="absolute -top-8 bg-yellow-400 text-black font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                                        {finishRank}
                                    </div>
                                )}
                            </div>
                            {/* Launch Pad */}
                            <div className="absolute bottom-0 w-8 h-2 bg-gray-600 rounded-t"></div>
                        </div>
                    )
                })}
            </div>

            {finishedOrder.length > 0 && !isRunning && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[200] animate-[fadeIn_0.5s]">
                    <div className="bg-[#1e1b4b] p-10 rounded-3xl border-4 border-purple-500 shadow-[0_0_50px_purple] text-center">
                        <div className="text-6xl mb-4">🪐</div>
                        <h3 className="text-white text-2xl font-bold mb-6">NHÀ DU HÀNH VÔ ĐỊCH</h3>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-8">
                            {finishedOrder[0].fullName}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={onBack} className="flex-1 py-3 bg-gray-700 text-white rounded-xl">Thoát</button>
                            <button onClick={resetRace} className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-500">Bay Lại</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- GAME 7: GOLDEN EGG SMASH (REPLACES PENALTY) ---
const GoldenEggGame: React.FC<{
    students: StudentAccount[];
    onBack: () => void;
}> = ({ students, onBack }) => {
    const [gameState, setGameState] = useState<'idle' | 'smashing' | 'revealed'>('idle');
    const [selectedEgg, setSelectedEgg] = useState<number | null>(null);
    const [hitCount, setHitCount] = useState(0);
    const [winner, setWinner] = useState<StudentAccount | null>(null);

    const pickEgg = (index: number) => {
        if (gameState !== 'idle') return;
        setSelectedEgg(index);
        setGameState('smashing');
        setHitCount(0);
        
        // Select random winner
        const w = students[Math.floor(Math.random() * students.length)];
        setWinner(w);

        // Smash animation sequence
        let hits = 0;
        const smashInterval = setInterval(() => {
            hits++;
            setHitCount(hits);
            playSound('crack'); // Play crack sound
            
            if (hits >= 3) {
                clearInterval(smashInterval);
                playSound('boom'); // Final break sound
                setGameState('revealed');
                playSound('win');
            }
        }, 800); // Time between hits
    }

    const reset = () => {
        setGameState('idle');
        setSelectedEgg(null);
        setHitCount(0);
        setWinner(null);
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#2a0a0a] overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-50">
                <button onClick={onBack} className="bg-white/10 text-white p-2 rounded-full"><X/></button>
                <div className="bg-yellow-600 px-4 py-1 rounded-full font-bold border border-yellow-400 text-white uppercase shadow-[0_0_15px_rgba(234,179,8,0.5)]">Đập Trứng Vàng</div>
            </div>

            {/* Stage Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_#7c2d12_0%,_#000000_100%)] flex flex-col items-center justify-center">
                {/* Spotlights */}
                <div className="absolute top-0 left-1/4 w-20 h-[80vh] bg-yellow-500/10 rotate-12 blur-xl transform origin-top"></div>
                <div className="absolute top-0 right-1/4 w-20 h-[80vh] bg-yellow-500/10 -rotate-12 blur-xl transform origin-top"></div>

                {/* Eggs Container */}
                <div className="flex gap-4 md:gap-12 items-end justify-center z-10 w-full px-4">
                    {[0, 1, 2].map((idx) => {
                        const isSelected = selectedEgg === idx;
                        const isOther = selectedEgg !== null && !isSelected;
                        
                        return (
                            <div 
                                key={idx}
                                onClick={() => pickEgg(idx)}
                                className={`relative transition-all duration-500 flex flex-col items-center cursor-pointer group 
                                    ${isOther ? 'scale-75 opacity-50 blur-[2px]' : 'scale-100 hover:scale-105'}
                                    ${isSelected && gameState === 'smashing' ? 'animate-[wiggle_0.2s_infinite]' : ''}
                                `}
                            >   
                                {/* Hammer Animation */}
                                {isSelected && gameState === 'smashing' && (
                                    <div className={`absolute -top-32 -right-20 z-50 text-8xl origin-bottom-left transition-transform duration-100 ${hitCount % 2 === 0 ? '-rotate-45' : 'rotate-12'}`}>
                                        <Hammer className="w-32 h-32 text-gray-300 fill-gray-500 drop-shadow-2xl"/>
                                    </div>
                                )}

                                {/* The Egg */}
                                <div className="relative">
                                    <Egg 
                                        className={`w-32 h-40 md:w-48 md:h-64 text-yellow-400 fill-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] 
                                            ${isSelected && gameState === 'revealed' ? 'opacity-0 scale-150 transition duration-300' : 'opacity-100'}
                                        `} 
                                        strokeWidth={1.5}
                                    />
                                    {/* Cracks */}
                                    {isSelected && hitCount >= 1 && gameState !== 'revealed' && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-full h-0.5 bg-black/50 rotate-45"></div>
                                        </div>
                                    )}
                                    {isSelected && hitCount >= 2 && gameState !== 'revealed' && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-full h-0.5 bg-black/50 -rotate-45"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Label */}
                                <div className={`mt-4 bg-black/50 text-white px-4 py-1 rounded-full font-bold border border-yellow-500/30 ${isSelected && gameState === 'revealed' ? 'opacity-0' : ''}`}>
                                    Trứng #{idx + 1}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* WINNER REVEAL */}
                {gameState === 'revealed' && winner && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 animate-[popIn_0.5s]">
                        <div className="relative bg-gradient-to-b from-yellow-300 to-yellow-600 p-1 rounded-[3rem] shadow-[0_0_100px_rgba(234,179,8,0.8)]">
                            <div className="bg-white rounded-[2.8rem] p-12 text-center min-w-[320px] max-w-lg relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle,_#fef08a_0%,_transparent_70%)] animate-pulse"></div>
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4">🐣</div>
                                    <h3 className="text-yellow-800 font-bold uppercase tracking-widest text-lg mb-2">Chúc mừng</h3>
                                    <div className="text-4xl md:text-5xl font-black text-gray-900 mb-8 drop-shadow-sm">{winner.fullName}</div>
                                    <button onClick={reset} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 hover:scale-105 transition">
                                        Chọn tiếp
                                    </button>
                                </div>
                            </div>
                            {/* Confetti / Rays */}
                            <div className="absolute inset-0 -z-10 animate-[spin_5s_linear_infinite] opacity-50">
                                <div className="absolute top-1/2 left-1/2 w-[200vh] h-20 bg-yellow-400/30 -translate-x-1/2 -translate-y-1/2 rotate-0"></div>
                                <div className="absolute top-1/2 left-1/2 w-[200vh] h-20 bg-yellow-400/30 -translate-x-1/2 -translate-y-1/2 rotate-45"></div>
                                <div className="absolute top-1/2 left-1/2 w-[200vh] h-20 bg-yellow-400/30 -translate-x-1/2 -translate-y-1/2 rotate-90"></div>
                                <div className="absolute top-1/2 left-1/2 w-[200vh] h-20 bg-yellow-400/30 -translate-x-1/2 -translate-y-1/2 rotate-135"></div>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'idle' && (
                    <div className="absolute bottom-10 animate-bounce text-yellow-200 font-bold text-xl bg-black/40 px-6 py-2 rounded-full border border-yellow-500/50">
                        Chọn một quả trứng để đập!
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes wiggle {
                    0%, 100% { transform: rotate(-3deg); }
                    50% { transform: rotate(3deg); }
                }
            `}</style>
        </div>
    )
}

// --- GAME 8: GOLD MINER ---
const GoldMinerGame: React.FC<{
    students: StudentAccount[];
    onBack: () => void;
}> = ({ students, onBack }) => {
    const [status, setStatus] = useState<'swing' | 'shoot' | 'rewind' | 'result'>('swing');
    const [angle, setAngle] = useState(0); // -60 to 60
    const [length, setLength] = useState(10); // 10 to 90%
    const [winner, setWinner] = useState<StudentAccount | null>(null);
    const directionRef = useRef(1);
    const frameRef = useRef<number>(0);

    // Swing Logic
    useEffect(() => {
        if (status === 'swing') {
            const swing = () => {
                setAngle(prev => {
                    let next = prev + directionRef.current * 1.5;
                    if (next > 60) directionRef.current = -1;
                    if (next < -60) directionRef.current = 1;
                    return next;
                });
                frameRef.current = requestAnimationFrame(swing);
            };
            frameRef.current = requestAnimationFrame(swing);
        } else if (status === 'shoot') {
            cancelAnimationFrame(frameRef.current);
            const shootInterval = setInterval(() => {
                setLength(prev => {
                    if (prev >= 80) {
                        clearInterval(shootInterval);
                        setStatus('rewind');
                        playSound('mechanical');
                        return prev;
                    }
                    return prev + 3;
                });
            }, 16);
            return () => clearInterval(shootInterval);
        } else if (status === 'rewind') {
            const rewindInterval = setInterval(() => {
                setLength(prev => {
                    if (prev <= 10) {
                        clearInterval(rewindInterval);
                        setStatus('result');
                        playSound('win');
                        const w = students[Math.floor(Math.random() * students.length)];
                        setWinner(w);
                        return 10;
                    }
                    return prev - 2;
                });
            }, 20);
            return () => clearInterval(rewindInterval);
        }
        return () => cancelAnimationFrame(frameRef.current);
    }, [status, students]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#3f2e18] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 p-4 z-50 text-white flex justify-between">
                <button onClick={onBack} className="bg-white/10 p-2 rounded-full"><X/></button>
                <div className="bg-yellow-600 px-4 py-1 rounded font-bold border-2 border-yellow-400">ĐÀO VÀNG</div>
            </div>

            {/* Miner Base */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20">
                <div className="text-6xl">👷</div>
            </div>

            {/* Hook Mechanism */}
            <div className="absolute top-24 left-1/2 w-0 h-0 z-10" style={{ transform: `rotate(${angle}deg)` }}>
                <div className="w-1 bg-black absolute top-0 left-0" style={{ height: `${length}vh`, transformOrigin: 'top' }}></div>
                <div className="absolute -translate-x-1/2 text-3xl transition-transform" style={{ top: `${length}vh` }}>
                    {status === 'rewind' ? GOLD_ICON : '⚓'}
                </div>
            </div>

            {/* Underground */}
            <div className="absolute top-32 bottom-0 left-0 right-0 bg-[#5d4037] border-t-8 border-[#795548] overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(#000 10%, transparent 10%)', backgroundSize: '20px 20px'}}></div>
                {/* Random Rocks/Gold Decoration */}
                {Array.from({length: 8}).map((_, i) => (
                    <div key={i} className="absolute text-4xl opacity-50" style={{ 
                        left: `${Math.random() * 90}%`, 
                        top: `${Math.random() * 80}%` 
                    }}>
                        {Math.random() > 0.7 ? GOLD_ICON : ROCK_ICON}
                    </div>
                ))}
            </div>

            {/* Controls */}
            {status === 'swing' && (
                <button onClick={() => setStatus('shoot')} className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white w-20 h-20 rounded-full border-4 border-white shadow-xl animate-pulse z-50 text-xl font-bold">
                    GẮP
                </button>
            )}

            {/* Result Modal */}
            {status === 'result' && winner && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[100] animate-[fadeIn_0.5s]">
                    <div className="bg-yellow-100 p-8 rounded-3xl text-center border-8 border-yellow-500 max-w-sm">
                        <div className="text-6xl mb-4 animate-bounce">{GOLD_ICON}</div>
                        <h3 className="text-yellow-800 font-bold text-xl uppercase">Đào được tên:</h3>
                        <div className="text-3xl font-black text-gray-900 my-4">{winner.fullName}</div>
                        <div className="flex gap-2">
                            <button onClick={onBack} className="flex-1 bg-gray-300 py-2 rounded font-bold">Thoát</button>
                            <button onClick={() => {setStatus('swing'); setWinner(null);}} className="flex-1 bg-yellow-500 py-2 rounded font-bold text-white">Đào Tiếp</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- GAME 3: REALISTIC SVG LUCKY WHEEL ---
const SVGLuckyWheel: React.FC<{ 
    students: StudentAccount[]; 
    onBack: () => void;
}> = ({ students, onBack }) => {
    const [winner, setWinner] = useState<StudentAccount | null>(null);
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [removeWinner, setRemoveWinner] = useState(false);
    const [currentStudents, setCurrentStudents] = useState(students);

    const radius = 150; 
    const center = 200;
    const totalSlices = currentStudents.length;
    const sliceAngle = 360 / totalSlices;

    const startSpin = () => {
        if (spinning || totalSlices < 1) return;
        setWinner(null);
        setSpinning(true);
        playSound('start');

        const minSpin = 360 * 10; 
        const randomDegree = Math.floor(Math.random() * 360);
        const newRotation = rotation + minSpin + randomDegree;
        
        setRotation(newRotation);

        let currentDelay = 40;
        let elapsed = 0;
        const totalDuration = 6000; 
        const playTick = () => {
            if (elapsed >= totalDuration) return;
            playSound('tick');
            currentDelay = currentDelay * 1.05; 
            elapsed += currentDelay;
            setTimeout(playTick, currentDelay);
        }
        playTick();

        setTimeout(() => {
            setSpinning(false);
            playSound('win');
            const actualRotation = newRotation % 360;
            const winningAngle = (360 - actualRotation) % 360;
            const winnerIndex = Math.floor(winningAngle / sliceAngle);
            const winStudent = currentStudents[winnerIndex];
            setWinner(winStudent);
            if(removeWinner && winStudent) {
                setTimeout(() => {
                    setCurrentStudents(prev => prev.filter(s => s.id !== winStudent.id));
                }, 3000);
            }
        }, 6000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900 overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#334155_0%,_#0f172a_100%)] z-0"></div>
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[9999] pointer-events-auto">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="bg-white/10 text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer border border-white/20 shadow active:scale-95">
                        <X className="w-6 h-6"/>
                    </button>
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 hidden md:block">
                        Vòng Quay May Mắn ({currentStudents.length})
                    </h2>
                </div>
                <div className="flex items-center gap-4 text-white">
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-black/30 px-3 py-1 rounded-full border border-white/10 hover:bg-black/50 transition">
                        <input type="checkbox" checked={removeWinner} onChange={e => setRemoveWinner(e.target.checked)} className="accent-purple-500 w-4 h-4"/>
                        <span className="text-sm">Loại bỏ người thắng</span>
                    </label>
                    <button onClick={() => setCurrentStudents(students)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><RefreshCcw className="w-5 h-5"/></button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative z-10 w-full h-full p-4 overflow-hidden">
                <div className="relative flex items-center justify-center" style={{ width: 'min(90vw, 90vh)', height: 'min(90vw, 90vh)', aspectRatio: '1/1' }}>
                    <div className="w-full h-full transition-transform ease-[cubic-bezier(0.1,0.7,0.1,1)] will-change-transform filter drop-shadow-2xl" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: '6000ms' }}>
                        <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                            <circle cx={center} cy={center} r={radius + 8} fill="#1e293b" stroke="#fbbf24" strokeWidth="8"/>
                            <circle cx={center} cy={center} r={radius} fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.5"/>
                            {currentStudents.map((s, i) => {
                                const startAngle = i * sliceAngle;
                                const endAngle = (i + 1) * sliceAngle;
                                const startRad = (Math.PI / 180) * startAngle;
                                const endRad = (Math.PI / 180) * endAngle;
                                const x1 = center + radius * Math.cos(startRad);
                                const y1 = center + radius * Math.sin(startRad);
                                const x2 = center + radius * Math.cos(endRad);
                                const y2 = center + radius * Math.sin(endRad);
                                const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                                const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                                const pinX = center + (radius) * Math.cos(endRad);
                                const pinY = center + (radius) * Math.sin(endRad);
                                return (
                                    <g key={s.id}>
                                        <path d={pathData} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} stroke="white" strokeWidth="1" />
                                        <text x={center + radius * 0.65} y={center} fill="white" fontSize={totalSlices > 40 ? "7" : (totalSlices > 25 ? "9" : "12")} fontWeight="900" textAnchor="middle" alignmentBaseline="middle" transform={`rotate(${startAngle + sliceAngle / 2}, ${center}, ${center})`} style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)', fontFamily: 'Arial Black, sans-serif' }}>
                                            {s.fullName.split(' ').slice(-2).join(' ')}
                                        </text>
                                        <circle cx={pinX} cy={pinY} r="4" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
                                    </g>
                                );
                            })}
                            <circle cx={center} cy={center} r="35" fill="white" stroke="#fbbf24" strokeWidth="5"/>
                            <circle cx={center} cy={center} r="15" fill="#333"/>
                            <text x={center} y={center} dy="2" textAnchor="middle" fontSize="18">⭐</text>
                        </svg>
                    </div>
                    <div className={`absolute right-0 top-1/2 z-30 pointer-events-none origin-right ${spinning ? 'animate-[wiggle_0.1s_linear_infinite]' : ''} drop-shadow-lg`} style={{ transform: 'translateY(-50%) translateX(-15%)', right: '10px' }}>
                        <svg width="60" height="40" viewBox="0 0 60 40"><path d="M0,20 L60,0 L60,40 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="2"/></svg>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                         <button onClick={startSpin} disabled={spinning} className="bg-gradient-to-b from-yellow-400 to-orange-500 w-20 h-20 md:w-24 md:h-24 rounded-full font-black text-white shadow-[0_5px_20px_rgba(0,0,0,0.6)] border-4 border-white hover:scale-110 active:scale-95 transition flex items-center justify-center text-xl md:text-2xl uppercase tracking-wider">QUAY</button>
                    </div>
                </div>
            </div>

            {winner && !spinning && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[200] animate-[fadeIn_0.3s]">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-12 rounded-[2rem] text-center shadow-[0_0_60px_rgba(168,85,247,0.6)] border-4 border-white/20 max-w-lg mx-4 animate-[popIn_0.5s] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent)]"></div>
                        <div className="text-8xl mb-6 animate-bounce relative z-10">🎉</div>
                        <h3 className="text-white/80 font-bold uppercase tracking-[0.3em] text-sm mb-4 relative z-10">Người May Mắn Là</h3>
                        <div className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-lg relative z-10 leading-tight">{winner.fullName}</div>
                        <div className="text-white/60 font-mono mb-10 relative z-10 bg-black/20 inline-block px-6 py-2 rounded-full text-lg">{winner.username}</div>
                        <button onClick={() => setWinner(null)} className="w-full bg-white text-purple-700 px-10 py-4 rounded-2xl font-black text-xl hover:bg-purple-50 shadow-xl transform transition hover:scale-105 relative z-10">TIẾP TỤC</button>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes wiggle {
                    0% { transform: translateY(-50%) translateX(-15%) rotate(0deg); }
                    50% { transform: translateY(-50%) translateX(-15%) rotate(-25deg); }
                    100% { transform: translateY(-50%) translateX(-15%) rotate(0deg); }
                }
            `}</style>
        </div>
    );
};

// --- GAME 4: TIME BOMB GAME (REPLACES MYSTERY CHEST) ---
const TimeBombGame: React.FC<{
    students: StudentAccount[];
    onBack: () => void;
}> = ({ students, onBack }) => {
    const [gameState, setGameState] = useState<'idle' | 'ticking' | 'exploded'>('idle');
    const [currentName, setCurrentName] = useState('...');
    const [winner, setWinner] = useState<StudentAccount | null>(null);
    const [fuseWidth, setFuseWidth] = useState(100);
    const timerRef = useRef<any>(null);
    const tickRef = useRef<any>(null);

    const startGame = () => {
        if (gameState === 'ticking') return;
        setGameState('ticking');
        setWinner(null);
        setFuseWidth(100);
        
        // Random duration between 5s and 10s
        const duration = Math.random() * 5000 + 5000;
        const startTime = Date.now();
        const winnerIndex = Math.floor(Math.random() * students.length);
        
        // Rapid name cycle
        timerRef.current = setInterval(() => {
            const rand = Math.floor(Math.random() * students.length);
            setCurrentName(students[rand].fullName);
        }, 80);

        // Fuse & Tick logic
        const updateLoop = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const progress = (remaining / duration) * 100;
            setFuseWidth(progress);

            // Play tick sound (increase frequency as time runs out)
            const tickRate = progress > 50 ? 500 : (progress > 20 ? 250 : 100);
            if (Date.now() % tickRate < 20) { // Rough check for interval
                 playSound('tick');
            }

            if (remaining <= 0) {
                // EXPLODE
                clearInterval(timerRef.current);
                cancelAnimationFrame(tickRef.current);
                setGameState('exploded');
                setWinner(students[winnerIndex]);
                setCurrentName(students[winnerIndex].fullName);
                playSound('boom');
            } else {
                tickRef.current = requestAnimationFrame(updateLoop);
            }
        };
        tickRef.current = requestAnimationFrame(updateLoop);
    };

    // Cleanup
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            cancelAnimationFrame(tickRef.current);
        }
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 overflow-hidden font-mono">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#450a0a_0%,_#000000_100%)] z-0"></div>
            {gameState === 'ticking' && <div className="absolute inset-0 bg-red-500/10 animate-pulse z-0"></div>}

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[50]">
                <button onClick={onBack} className="text-white/50 hover:text-white p-2"><X className="w-8 h-8"/></button>
                <h2 className="text-red-500 font-black text-2xl uppercase tracking-widest animate-pulse">Quả Bom Hẹn Giờ</h2>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-4">
                
                {/* Fuse Bar */}
                <div className="w-full max-w-lg h-4 bg-gray-800 rounded-full mb-8 overflow-hidden border border-gray-700 relative">
                    <div 
                        className="h-full bg-gradient-to-r from-yellow-500 to-red-600 transition-all duration-75 ease-linear"
                        style={{ width: `${fuseWidth}%` }}
                    ></div>
                    {gameState === 'ticking' && (
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 -ml-2 text-yellow-300 filter drop-shadow-[0_0_5px_rgba(255,200,0,0.8)]"
                            style={{ left: `${fuseWidth}%` }}
                        >
                            <Flame className="w-6 h-6 animate-bounce" fill="orange"/>
                        </div>
                    )}
                </div>

                {/* The Bomb */}
                <div className={`relative mb-8 transition-transform duration-100 ${gameState === 'ticking' ? 'animate-[wiggle_0.2s_infinite]' : ''}`}>
                    <div className={`text-[15rem] md:text-[20rem] leading-none select-none filter drop-shadow-2xl ${gameState === 'exploded' ? 'scale-150 opacity-0 transition duration-200' : 'scale-100'}`}>
                        {BOMB_ICON}
                    </div>
                    {gameState === 'exploded' && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15rem] md:text-[25rem] animate-[ping_0.5s_ease-out]">
                            {EXPLOSION_ICON}
                        </div>
                    )}
                </div>

                {/* Current Name Display */}
                <div className="h-24 flex items-center justify-center w-full">
                    {gameState === 'idle' ? (
                        <button 
                            onClick={startGame}
                            className="bg-red-600 text-white font-black text-2xl px-12 py-4 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:scale-105 transition hover:bg-red-700 border-4 border-red-800 uppercase"
                        >
                            Kích Hoạt Bom
                        </button>
                    ) : (
                        <div className={`text-3xl md:text-5xl font-black text-white text-center transition-all ${gameState === 'exploded' ? 'scale-150 text-yellow-400 drop-shadow-[0_0_20px_rgba(255,0,0,1)]' : ''}`}>
                            {currentName}
                        </div>
                    )}
                </div>
            </div>

            {/* Winner Overlay */}
            {gameState === 'exploded' && winner && (
                <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex items-center justify-center z-[200] animate-[fadeIn_0.1s]">
                    <div className="text-center p-8 bg-black/80 rounded-3xl border-4 border-red-500 shadow-[0_0_100px_rgba(255,0,0,0.8)] max-w-2xl mx-4">
                        <h3 className="text-red-500 font-bold text-3xl mb-2 uppercase tracking-widest">BÙMMMM!</h3>
                        <div className="text-white/70 text-lg mb-6 uppercase">Người bị loại là</div>
                        <div className="text-5xl md:text-7xl font-black text-white mb-8 drop-shadow-lg">{winner.fullName}</div>
                        <div className="flex gap-4 justify-center">
                            <button onClick={onBack} className="px-8 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600">Thoát</button>
                            <button onClick={startGame} className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg">Chơi Lại</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes wiggle {
                    0%, 100% { transform: rotate(-2deg); }
                    50% { transform: rotate(2deg); }
                }
            `}</style>
        </div>
    );
};

// --- GAME 5: CLAW MACHINE (GẮP THÚ) ---
const ClawMachineGame: React.FC<{
    students: StudentAccount[];
    onBack: () => void;
}> = ({ students, onBack }) => {
    const [gameState, setGameState] = useState<'idle' | 'moving' | 'dropping' | 'grabbing' | 'returning' | 'revealed'>('idle');
    const [clawX, setClawX] = useState(50); // 0 to 100%
    const [clawHeight, setClawHeight] = useState(10); // % height
    const [winner, setWinner] = useState<StudentAccount | null>(null);
    const animationRef = useRef<number | null>(null);
    const directionRef = useRef(1); // 1 for right, -1 for left

    // Start moving the claw horizontally
    useEffect(() => {
        if (gameState === 'moving') {
            const animate = () => {
                setClawX(prev => {
                    let next = prev + (directionRef.current * 0.8); // Speed
                    if (next >= 90) directionRef.current = -1;
                    if (next <= 10) directionRef.current = 1;
                    return next;
                });
                playSound('mechanical');
                animationRef.current = requestAnimationFrame(animate);
            };
            animationRef.current = requestAnimationFrame(animate);
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }
    }, [gameState]);

    // Handle Dropping Logic
    useEffect(() => {
        if (gameState === 'dropping') {
            const interval = setInterval(() => {
                setClawHeight(prev => {
                    if (prev >= 80) { // Hit bottom
                        clearInterval(interval);
                        setGameState('grabbing');
                        setTimeout(() => setGameState('returning'), 500); // Grab delay
                        return prev;
                    }
                    return prev + 2;
                });
            }, 20);
            return () => clearInterval(interval);
        }
        if (gameState === 'returning') {
            const interval = setInterval(() => {
                setClawHeight(prev => {
                    if (prev <= 10) { // Back to top
                        clearInterval(interval);
                        setGameState('revealed');
                        playSound('pop'); // ADDED: Pop Sound on reveal
                        return 10;
                    }
                    return prev - 2;
                });
            }, 20);
            return () => clearInterval(interval);
        }
    }, [gameState]);

    const startGame = () => {
        setWinner(null);
        setGameState('moving');
        // Pre-select winner
        const w = students[Math.floor(Math.random() * students.length)];
        setWinner(w);
    }

    const dropClaw = () => {
        if (gameState !== 'moving') return;
        setGameState('dropping');
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 overflow-hidden font-sans">
             {/* Header */}
             <div className="absolute top-0 left-0 right-0 p-4 z-50 flex justify-between items-center pointer-events-auto">
                 <button onClick={onBack} className="bg-white/10 text-white p-2 rounded-full hover:bg-white/20"><X/></button>
                 <div className="text-white font-bold text-xl uppercase tracking-widest bg-black/30 px-4 py-1 rounded-full border border-white/10">Máy Gắp Thú</div>
             </div>

             {/* Machine Container */}
             <div className="relative w-full h-full flex flex-col">
                 
                 {/* Top Rail */}
                 <div className="absolute top-16 left-0 right-0 h-4 bg-gray-700 border-b border-gray-600 shadow-xl z-20"></div>

                 {/* The Claw Mechanism */}
                 <div 
                    className="absolute top-16 w-12 z-10 flex flex-col items-center transition-none"
                    style={{ left: `${clawX}%`, transform: 'translateX(-50%)' }}
                 >  
                    {/* The Cord */}
                    <div className="w-1 bg-gray-400" style={{ height: `calc(${clawHeight}vh)` }}></div>
                    
                    {/* The Claw Hand */}
                    <div className={`transition-transform duration-300 ${gameState === 'grabbing' || gameState === 'returning' ? 'scale-90' : 'scale-110'}`}>
                         <Grab className={`w-16 h-16 text-red-500 drop-shadow-lg ${gameState === 'grabbing' ? 'text-red-700' : ''}`} />
                    </div>

                    {/* The Prize (Visible only when returning) */}
                    {(gameState === 'returning' || gameState === 'revealed') && (
                        <div className="mt-[-20px] bg-yellow-400 w-12 h-12 rounded-full border-4 border-red-500 shadow-lg animate-bounce flex items-center justify-center text-xs font-bold z-20">
                            ???
                        </div>
                    )}
                 </div>

                 {/* Prize Pit (Students) */}
                 <div className="mt-auto h-[30vh] bg-gray-800 border-t-4 border-gray-700 relative overflow-hidden flex flex-wrap content-end justify-center gap-2 p-4">
                     {students.map((s, idx) => (
                         <div key={s.id} className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white/30 shadow-lg flex items-center justify-center text-xl select-none animate-[bounce_3s_infinite]" style={{ animationDelay: `${idx * 0.1}s` }}>
                             {['🐻', '🐶', '🐱', '🐼', '🐨', '🐸'][idx % 6]}
                         </div>
                     ))}
                     {/* Glass Overlay */}
                     <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] pointer-events-none border-t border-white/10"></div>
                 </div>

                 {/* Controls */}
                 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                    {gameState === 'idle' && (
                        <button onClick={startGame} className="bg-green-500 hover:bg-green-600 text-white text-2xl font-black px-12 py-6 rounded-full shadow-[0_10px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[10px] transition-all border-4 border-green-400 uppercase">
                            Bắt đầu
                        </button>
                    )}
                    {gameState === 'moving' && (
                        <button onClick={dropClaw} className="bg-red-500 hover:bg-red-600 text-white text-3xl font-black w-32 h-32 rounded-full shadow-[0_10px_0_rgb(185,28,28)] active:shadow-none active:translate-y-[10px] transition-all border-4 border-red-400 flex items-center justify-center animate-pulse">
                            GẮP
                        </button>
                    )}
                 </div>
             </div>

             {/* Winner Reveal Modal */}
             {gameState === 'revealed' && winner && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[200] animate-[fadeIn_0.5s]">
                    <div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center shadow-[0_0_100px_rgba(239,68,68,0.6)] border-8 border-red-500 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-8 bg-red-500"></div>
                        
                        <div className="mt-4 text-6xl mb-4 animate-bounce">🎁</div>
                        <h3 className="text-2xl font-bold text-gray-500 mb-2 uppercase tracking-widest">Gắp trúng rồi!</h3>
                        <div className="text-5xl font-black text-red-600 mb-8 leading-tight drop-shadow-sm">{winner.fullName}</div>
                        
                        <div className="flex gap-4">
                            <button onClick={onBack} className="flex-1 py-4 bg-gray-100 font-bold rounded-2xl text-gray-600 hover:bg-gray-200">Thoát</button>
                            <button onClick={() => setGameState('idle')} className="flex-1 py-4 bg-red-500 font-bold rounded-2xl text-white hover:bg-red-600 shadow-lg">Chơi Lại</button>
                        </div>
                    </div>
                </div>
             )}
        </div>
    )
}

// --- MAIN WRAPPER ---
export const GameCenter: React.FC<GameCenterProps> = ({ students, className }) => {
    const [selectedGame, setSelectedGame] = useState<GameType>(null);

    // If no students, show warning
    if (!students || students.length === 0) {
        return (
            <div className="bg-white p-10 rounded-xl shadow text-center border-2 border-dashed border-gray-200">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4"/>
                <h3 className="text-lg font-bold text-gray-500">Lớp học chưa có học sinh</h3>
                <p className="text-gray-400">Vui lòng thêm học sinh vào lớp {className} để chơi.</p>
            </div>
        )
    }

    if (selectedGame === 'snail') return <RealRaceGame students={students} type="snail" onBack={() => setSelectedGame(null)}/>;
    if (selectedGame === 'duck') return <RealRaceGame students={students} type="duck" onBack={() => setSelectedGame(null)}/>;
    if (selectedGame === 'wheel') return <SVGLuckyWheel students={students} onBack={() => setSelectedGame(null)}/>;
    if (selectedGame === 'bomb') return <TimeBombGame students={students} onBack={() => setSelectedGame(null)}/>;
    if (selectedGame === 'claw') return <ClawMachineGame students={students} onBack={() => setSelectedGame(null)}/>;
    if (selectedGame === 'rocket') return <VerticalRaceGame students={students} onBack={() => setSelectedGame(null)}/>;
    if (selectedGame === 'egg') return <GoldenEggGame students={students} onBack={() => setSelectedGame(null)}/>;
    if (selectedGame === 'miner') return <GoldMinerGame students={students} onBack={() => setSelectedGame(null)}/>;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 animate-[fadeIn_0.3s_ease-out]">
            <div 
                onClick={() => setSelectedGame('snail')}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-brand-300 cursor-pointer transition group text-center h-48 flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-blue-50 transform scale-0 group-hover:scale-100 transition rounded-xl origin-bottom"></div>
                <span className="text-5xl select-none mb-4 relative z-10 group-hover:scale-110 transition">{SNAIL_ICON}</span>
                <h3 className="text-lg font-bold text-gray-800 relative z-10 group-hover:text-brand-700">Đua Ốc Sên</h3>
            </div>

            <div 
                onClick={() => setSelectedGame('duck')}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-yellow-300 cursor-pointer transition group text-center h-48 flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-yellow-50 transform scale-0 group-hover:scale-100 transition rounded-xl origin-bottom"></div>
                <span className="text-5xl select-none mb-4 relative z-10 group-hover:scale-110 transition">{DUCK_ICON}</span>
                <h3 className="text-lg font-bold text-gray-800 relative z-10 group-hover:text-yellow-700">Đua Vịt</h3>
            </div>

            <div 
                onClick={() => setSelectedGame('wheel')}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-purple-300 cursor-pointer transition group text-center h-48 flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-purple-50 transform scale-0 group-hover:scale-100 transition rounded-xl origin-bottom"></div>
                <RotateCw className="w-12 h-12 mb-4 text-purple-300 relative z-10 group-hover:text-purple-600 transition duration-500 group-hover:rotate-180"/>
                <h3 className="text-lg font-bold text-gray-800 relative z-10 group-hover:text-purple-700">Vòng Quay</h3>
            </div>

            <div 
                onClick={() => setSelectedGame('bomb')}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-red-300 cursor-pointer transition group text-center h-48 flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-red-50 transform scale-0 group-hover:scale-100 transition rounded-xl origin-bottom"></div>
                <Bomb className="w-12 h-12 mb-4 text-red-300 relative z-10 group-hover:text-red-600 transition duration-500 group-hover:animate-pulse"/>
                <h3 className="text-lg font-bold text-gray-800 relative z-10 group-hover:text-red-700">Quả Bom</h3>
            </div>

             <div 
                onClick={() => setSelectedGame('claw')}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-300 cursor-pointer transition group text-center h-48 flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-blue-50 transform scale-0 group-hover:scale-100 transition rounded-xl origin-bottom"></div>
                <Grab className="w-12 h-12 mb-4 text-blue-300 relative z-10 group-hover:text-blue-600 transition duration-500 group-hover:-translate-y-2"/>
                <h3 className="text-lg font-bold text-gray-800 relative z-10 group-hover:text-blue-700">Gắp Thú</h3>
            </div>

            <div 
                onClick={() => setSelectedGame('rocket')}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-indigo-300 cursor-pointer transition group text-center h-48 flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-indigo-50 transform scale-0 group-hover:scale-100 transition rounded-xl origin-bottom"></div>
                <Rocket className="w-12 h-12 mb-4 text-indigo-300 relative z-10 group-hover:text-indigo-600 transition duration-500 group-hover:-translate-y-2"/>
                <h3 className="text-lg font-bold text-gray-800 relative z-10 group-hover:text-indigo-700">Đua Tên Lửa</h3>
            </div>

            <div 
                onClick={() => setSelectedGame('egg')}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-green-300 cursor-pointer transition group text-center h-48 flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-green-50 transform scale-0 group-hover:scale-100 transition rounded-xl origin-bottom"></div>
                <Egg className="w-12 h-12 mb-4 text-green-300 relative z-10 group-hover:text-green-600 transition duration-500 group-hover:rotate-12"/>
                <h3 className="text-lg font-bold text-gray-800 relative z-10 group-hover:text-green-700">Đập Trứng</h3>
            </div>

            <div 
                onClick={() => setSelectedGame('miner')}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-yellow-600 cursor-pointer transition group text-center h-48 flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-yellow-50 transform scale-0 group-hover:scale-100 transition rounded-xl origin-bottom"></div>
                <Hammer className="w-12 h-12 mb-4 text-yellow-600/50 relative z-10 group-hover:text-yellow-700 transition duration-500 group-hover:rotate-45"/>
                <h3 className="text-lg font-bold text-gray-800 relative z-10 group-hover:text-yellow-800">Đào Vàng</h3>
            </div>
        </div>
    );
};
