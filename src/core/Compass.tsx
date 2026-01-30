import { useStore } from '../store/useStore';
import { useLogicEngine } from '../logics/useLogicEngine';
import { MAG_DECLINATION, DIRECTIONS, DOOR_NAMES_KR, DOOR_NAMES_HANJA } from '../logics/common';
import './compass.css';

const OFFSET_ANGLE = -22.5;

export const Compass = () => {
    const heading = useStore((state) => state.heading);
    const isInputtingUser = useStore((state) => state.isInputtingUser);
    const inspectionMode = useStore((state) => state.inspectionMode);
    const currentTime = useStore((state) => state.currentTime);
    const settings = useStore((state) => state.settings);
    const { result, solarData } = useLogicEngine();

    if (isInputtingUser) {
        return (
            <div className="compass-container" style={{ pointerEvents: 'none' }}>
                <div className="compass-plate">
                    <svg viewBox="0 0 100 100" className="compass-svg">
                        <circle cx="50" cy="50" r="20" fill="none" stroke="#FFD700" strokeWidth="0.5" opacity="0.8" strokeDasharray="4 2" />
                        <circle cx="50" cy="50" r="10" fill="none" stroke="#FFD700" strokeWidth="1.5" opacity="1" />
                        <line x1="50" y1="40" x2="50" y2="45" stroke="#FFD700" strokeWidth="1" />
                        <line x1="50" y1="55" x2="50" y2="60" stroke="#FFD700" strokeWidth="1" />
                        <line x1="40" y1="50" x2="45" y2="50" stroke="#FFD700" strokeWidth="1" />
                        <line x1="55" y1="50" x2="60" y2="50" stroke="#FFD700" strokeWidth="1" />
                    </svg>
                </div>
            </div>
        );
    }

    if (!result || !result.qimen || !result.myeongri) return null;
    const { qimen, myeongri } = result;
    const totalRotation = heading + MAG_DECLINATION;

    // --- Dynamic Center Radius Calculation ---
    const rawName = (myeongri.summary || 'Guest').split('(')[0].replace('User: ', '').replace('Guest Mode', 'Guest');
    const centerRadius = Math.max(6, (6 + rawName.length * 1.5) * 0.7);
    const baseOuterR = 34; // Slightly larger base for clearer margins

    return (
        <div className="compass-container" style={{ pointerEvents: 'none' }}>
            <div className="compass-plate" style={{ transform: `rotate(${totalRotation}deg)` }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                    <defs>
                        <pattern id="gongmang-hatch" patternUnits="userSpaceOnUse" width="1.5" height="1.5" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="1.5" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
                        </pattern>
                    </defs>

                    {/* 100% Border Guide (Removed as per request for cleaner look) */}

                    {/* 1. Base Sectors - Vivid Backgrounds with Dynamic Radius (Piecewise Scaling) */}
                    {[...Array(8)].map((_, i) => {
                        const startA = i * 45 + OFFSET_ANGLE;
                        const endA = (i + 1) * 45 + OFFSET_ANGLE;
                        const toRad = (deg: number) => (deg - 90) * Math.PI / 180;

                        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                        const mScore = myeongri.debugScore ? myeongri.debugScore[dirs[i]] : 0;
                        const doorSeg = qimen.rings.find(r => r.id === 'doors')?.segments.find(s => s.angleStart === i * 45);
                        // --- Dynamic Score Sync (Living Jitter) ---
                        // Calculate jitter FIRST to apply to radius
                        const tDate = (result.myeongri as any).dayStem ? (solarData.trueSolarTime || currentTime) : currentTime;
                        const microFactor = (tDate.getMinutes() * 60 + tDate.getSeconds()) / 3600;
                        const jitter = Math.sin(microFactor * Math.PI * 8 + i) * 2.5;

                        // Base Total + Jitter
                        let baseTotal = 50 + mScore * 2;
                        if (doorSeg?.isAus) baseTotal += 20;

                        // Final Score for Scaling (Clamped 0-100)
                        const finalScore = Math.min(100, Math.max(0, baseTotal + jitter));

                        // Piecewise Scaling Logic (Boosted)
                        // 60 -> 1.0
                        // 100 -> 1.25 (User wanted distinct 'over 20%')
                        // 30 -> 0.7
                        let scaling = 1.0;
                        if (finalScore >= 60) {
                            scaling = 1.0 + ((finalScore - 60) / 40) * 0.25;
                        } else {
                            const clampedLow = Math.max(30, finalScore);
                            scaling = 0.7 + ((clampedLow - 30) / 30) * 0.3;
                        }
                        const currentR = baseOuterR * scaling;

                        // Points
                        const ox1 = 50 + currentR * Math.cos(toRad(startA));
                        const oy1 = 50 + currentR * Math.sin(toRad(startA));
                        const ox2 = 50 + currentR * Math.cos(toRad(endA));
                        const oy2 = 50 + currentR * Math.sin(toRad(endA));
                        const ix1 = 50 + centerRadius * Math.cos(toRad(startA));
                        const iy1 = 50 + centerRadius * Math.sin(toRad(startA));
                        const ix2 = 50 + centerRadius * Math.cos(toRad(endA));
                        const iy2 = 50 + centerRadius * Math.sin(toRad(endA));

                        let bg;
                        if (finalScore >= 90) bg = 'rgba(255, 215, 0, 0.45)';
                        else if (finalScore >= 75) bg = 'rgba(46, 125, 50, 0.4)';
                        else if (finalScore >= 60) bg = 'rgba(21, 101, 192, 0.35)';
                        else if (finalScore <= 30) bg = 'rgba(198, 40, 40, 0.3)';
                        else bg = 'rgba(128, 128, 128, 0.2)';

                        const flags = qimen.palaceFlags?.[i];
                        const doorName = doorSeg?.label || '';

                        // [Grand Margin Architecture]
                        // 1. Body Center (Doors/Scores) - Compressed into the inner 28% zone
                        const bodyMidR = centerRadius + (currentR - centerRadius) * 0.28;
                        const bodyMidA = (i * 45 + OFFSET_ANGLE + 22.5 - 90) * (Math.PI / 180);
                        const bx = 50 + bodyMidR * Math.cos(bodyMidA);
                        const by = 50 + bodyMidR * Math.sin(bodyMidA);

                        // 2. Glass Band (Outermost 25% of scaled sector)
                        const bandInnerR = currentR * 0.75;
                        const bx1 = 50 + bandInnerR * Math.cos(toRad(startA));
                        const by1 = 50 + bandInnerR * Math.sin(toRad(startA));
                        const bx2 = 50 + bandInnerR * Math.cos(toRad(endA));
                        const by2 = 50 + bandInnerR * Math.sin(toRad(endA));

                        // --- Dynamic Score Used for Text ---
                        // (Jitter already applied above)
                        const scoreStr = settings.scorePrecision === 'high' ? finalScore.toFixed(2) : Math.round(finalScore).toString();

                        let scoreColor = '#333';
                        if (finalScore >= 90) scoreColor = '#b39200';
                        else if (finalScore >= 75) scoreColor = '#2e7d32';
                        else if (finalScore >= 60) scoreColor = '#1565c0';
                        else if (finalScore <= 35) scoreColor = '#c62828';

                        return (
                            <g key={`sector-layer-${i}`} style={{ filter: flags?.isGongmang ? 'grayscale(0.9) opacity(0.7)' : 'none' }}>
                                {/* Base Sector */}
                                <path
                                    d={`M ${ix1} ${iy1} L ${ox1} ${oy1} L ${ox2} ${oy2} L ${ix2} ${iy2} Z`}
                                    fill={bg}
                                    stroke={flags?.isChung ? 'rgba(255, 0, 0, 0.6)' : 'none'}
                                    strokeWidth={flags?.isChung ? '1' : '0'}
                                />
                                {/* Outer Glass Band (rgba 255,255,255,0.5) */}
                                <path
                                    d={`M ${bx1} ${by1} L ${ox1} ${oy1} L ${ox2} ${oy2} L ${bx2} ${by2} Z`}
                                    fill="rgba(255, 255, 255, 0.5)"
                                    stroke="none"
                                />
                                {/* Band Inner Boundary Line */}
                                <path
                                    d={`M ${bx1} ${by1} A ${bandInnerR} ${bandInnerR} 0 0 1 ${bx2} ${by2}`}
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.3)"
                                    strokeWidth="0.3"
                                />
                                {flags?.isGongmang && (
                                    <path
                                        d={`M ${ix1} ${iy1} L ${ox1} ${oy1} L ${ox2} ${oy2} L ${ix2} ${iy2} Z`}
                                        fill="url(#gongmang-hatch)"
                                        pointerEvents="none"
                                    />
                                )}
                                {/* [Internal Body Content] Center: Door Name, Below: Score */}
                                <g transform={`translate(${bx}, ${by}) rotate(${-totalRotation})`}>
                                    {/* Door Name (Hanja + Double Text + Score Color) */}
                                    {(() => {
                                        const idx = DOOR_NAMES_KR.indexOf(doorName);
                                        const hanja = idx >= 0 ? DOOR_NAMES_HANJA[idx] : doorName;
                                        return (
                                            <g>
                                                {/* 1. Stroke Layer */}
                                                <text x="0" y="-1.8" textAnchor="middle" dominantBaseline="central" fontSize="3.8px" fontWeight="900"
                                                    stroke="white" strokeWidth="0.5" fill="none">
                                                    {hanja}
                                                </text>
                                                {/* 2. Fill Layer */}
                                                <text x="0" y="-1.8" textAnchor="middle" dominantBaseline="central" fontSize="3.8px" fontWeight="900"
                                                    fill={scoreColor}>
                                                    {hanja}
                                                </text>
                                            </g>
                                        );
                                    })()}
                                    <text x="0" y="2" textAnchor="middle" dominantBaseline="central" fontSize="2.8px" fontWeight="700" fill={scoreColor}>
                                        {scoreStr}
                                    </text>
                                </g>
                            </g>
                        );
                    })}

                    {/* 2. Sector Lines (Removed as per request for cleaner look) */}
                    {/* Lines removed to allow seamless sector view */}

                    {/* 3. Direction Nodes (Vertical 3-tier Node on Glass Panel) */}
                    {/* 3. Outer 24-Mountain Ring (24 Segments) */}
                    {/* 3. Outer 24-Slot Ring (Star | Dir | Palace) */}
                    {[...Array(24)].map((_, i) => {
                        // 24 segments, 15 degrees each
                        // i % 3 === 0: Left (Star)
                        // i % 3 === 1: Center (Direction + Symbol)
                        // i % 3 === 2: Right (Palace)

                        const parentIdx = Math.floor(i / 3); // 0..7
                        const angle = i * 15 - 15; // Shift by -15 deg to center the triplet (Left=-15, Center=0, Right=+15)
                        const toRad = (deg: number) => (deg - 90) * Math.PI / 180;

                        // Dynamic Radius Logic (Inherited from Parent Sector)
                        const mScore = myeongri.debugScore ? myeongri.debugScore[DIRECTIONS[parentIdx]] : 0;
                        const doorSeg = qimen.rings.find(r => r.id === 'doors')?.segments.find(s => s.angleStart === parentIdx * 45);
                        // Piecewise Scaling Logic (Matching Base Sectors)
                        // Re-calculate Jitter (Needs same tDate reference ideally, but acceptable calc here)
                        // Note: To ensure sync, we replicate the jitter logic
                        const tDate = (result.myeongri as any).dayStem ? (solarData.trueSolarTime || currentTime) : currentTime;
                        const microFactor = (tDate.getMinutes() * 60 + tDate.getSeconds()) / 3600;
                        const jitter = Math.sin(microFactor * Math.PI * 8 + parentIdx) * 2.5; // Use parentIdx for phase

                        let baseTotal = 50 + mScore * 2;
                        if (doorSeg?.isAus) baseTotal += 20;

                        const finalScore = Math.min(100, Math.max(0, baseTotal + jitter));
                        let scaling = 1.0;
                        if (finalScore >= 60) {
                            scaling = 1.0 + ((finalScore - 60) / 40) * 0.25;
                        } else {
                            const clampedLow = Math.max(30, finalScore);
                            scaling = 0.7 + ((clampedLow - 30) / 30) * 0.3;
                        }
                        const currentR = baseOuterR * scaling;

                        // Placement: Tethered to Outer Edge
                        const placementR = currentR - 6; // Slightly closer as ring is denser
                        const x = 50 + placementR * Math.cos(toRad(angle));
                        const y = 50 + placementR * Math.sin(toRad(angle));

                        // Data Preparation
                        const flags = qimen.palaceFlags?.[parentIdx];
                        const starSeg = qimen.rings.find(r => r.id === 'stars')?.segments.find(s => s.angleStart === parentIdx * 45);
                        const starName = starSeg?.label || '';

                        let content = null;
                        const slotType = i % 3;

                        if (slotType === 0) {
                            // Left: 9-Star Name (Korean)
                            content = (
                                <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="3px" fontWeight="bold" fill="#555">
                                    {starName}
                                </text>
                            );
                        } else if (slotType === 1) {
                            // Center: Direction Label Only (N, NE...)
                            const parentLabel = DIRECTIONS[parentIdx];
                            const isCard = ['N', 'E', 'S', 'W'].includes(parentLabel);
                            content = (
                                <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="4.5px" fontWeight="bold" fill={isCard ? "#d32f2f" : "#444"}>
                                    {parentLabel}
                                </text>
                            );
                        } else if (slotType === 2) {
                            // Right: Symbol (★/⚠) - Calculated from Qimen Pattern
                            content = (
                                <>
                                    {flags?.pattern === 'gil' && (
                                        <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="5px" fill="#FFD700" style={{ textShadow: '0 0 2px black' }}>★</text>
                                    )}
                                    {flags?.pattern === 'hyung' && (
                                        <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="5px" fill="#FF0000">⚠</text>
                                    )}
                                </>
                            );
                        }

                        return (
                            <g key={`mt-${i}`} transform={`translate(${x}, ${y}) rotate(${-totalRotation})`}>
                                {content}
                            </g>
                        );
                    })}

                    {/* 5. Center Regular Octagon Frame - Rotates with Plate (Aligned to Sectors) */}
                    {(() => {
                        const points = [];
                        for (let i = 0; i < 8; i++) {
                            const angle = (i * 45 + OFFSET_ANGLE - 90) * (Math.PI / 180);
                            const px = 50 + centerRadius * Math.cos(angle);
                            const py = 50 + centerRadius * Math.sin(angle);
                            points.push(`${px} ${py}`);
                        }
                        const path = `M ${points.join(' L ')} Z`;

                        return (
                            <path
                                d={path}
                                fill="none"
                                stroke="rgba(0, 100, 255, 0.6)"
                                strokeWidth="0.5"
                            />
                        );
                    })()}

                    {/* 6. Center Text - Counter-Rotated (Stays Upright) */}
                    <g transform={`rotate(${-totalRotation}, 50, 50)`}>
                        <text
                            x="50" y="50"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="3.5px" fontWeight="bold" fill="#fff"
                            style={{ textShadow: '0 0 3px #000' }}
                        >
                            {rawName}
                        </text>
                    </g>
                </svg>
            </div>

            {/* Mode Indicator */}
            <div style={{
                position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
                background: inspectionMode === 'GPS' ? '#333' : (inspectionMode === 'TargetA' ? '#2196f3' : '#4caf50'),
                color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                {inspectionMode === 'GPS' ? 'LIVE' : (inspectionMode === 'TargetA' ? 'TARGET A' : 'TARGET B')}
            </div>
        </div>
    );
};
