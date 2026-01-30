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

    // --- Active Door Focus Message ---
    // Detect which sector is at the top (12 o'clock)
    const facingAngle = ((-totalRotation % 360) + 360) % 360;
    const facingIdx = Math.floor(((facingAngle + 22.5) % 360) / 45) % 8;
    const doorRing = qimen.rings.find(r => r.id === 'doors');
    const facingDoor = doorRing?.segments.find(s => Math.abs(s.angleStart - facingIdx * 45) < 1);
    const isFacingOpen = facingDoor?.state?.isOpen && (facingDoor?.state?.openLevel || 0) > 0.5;
    const facingDoorName = facingDoor?.label || '';

    // --- Dynamic Center Radius Calculation ---
    const rawName = (myeongri.summary || 'Guest').split('(')[0].replace('User: ', '').replace('Guest Mode', 'Guest');
    const centerRadius = Math.max(6, (6 + rawName.length * 1.5) * 0.7);
    const baseOuterR = 34; // Slightly larger base for clearer margins

    return (
        <div className="compass-container" style={{ pointerEvents: 'none' }}>
            {isFacingOpen && (
                <div className="open-door-notice">
                    지금은 {facingDoorName}을 써도 되는 시간입니다
                </div>
            )}
            <div className="compass-plate" style={{ transform: `rotate(${totalRotation}deg)` }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                    <defs>
                        <pattern id="gongmang-hatch" patternUnits="userSpaceOnUse" width="1.5" height="1.5" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="1.5" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
                        </pattern>
                        <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="1.2" result="blur" />
                        </filter>
                    </defs>

                    {/* 100% Border Guide (Removed as per request for cleaner look) */}

                    {/* 1. Base Sectors - Vivid Backgrounds with Dynamic Radius (Piecewise Scaling) */}
                    {[...Array(8)].map((_, i) => {
                        const startA = i * 45 + OFFSET_ANGLE;
                        const endA = (i + 1) * 45 + OFFSET_ANGLE;
                        const toRad = (deg: number) => (deg - 90) * Math.PI / 180;

                        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

                        // --- A. Identify Components ---
                        const flags = qimen.palaceFlags?.[i];
                        const doorSeg = qimen.rings.find(r => r.id === 'doors')?.segments.find(s => s.angleStart === i * 45);
                        const doorName = doorSeg?.label || '';

                        // --- B. Dynamic Score & Jitter ---
                        const scoreFromEngine = qimen.sectorScores ? qimen.sectorScores[dirs[i]] : 0;
                        const agit = qimen.sectorAgitation ? qimen.sectorAgitation[dirs[i]] : { jitter: 1.0, power: 2.5 };

                        const tDate = (result.myeongri as any).dayStem ? (solarData.trueSolarTime || currentTime) : currentTime;
                        const microFactor = (tDate.getMinutes() * 60 + tDate.getSeconds()) / 3600;
                        const jitter = Math.sin(microFactor * Math.PI * 8 * agit.jitter + i) * agit.power;
                        const finalScore = Math.min(100, Math.max(0, scoreFromEngine + jitter));

                        // --- C. Scaling & Radius ---
                        let scaling = 1.0;
                        if (finalScore >= 60) {
                            scaling = 1.0 + ((finalScore - 60) / 40) * 0.25;
                        } else {
                            const clampedLow = Math.max(30, finalScore);
                            scaling = 0.7 + ((clampedLow - 30) / 30) * 0.3;
                        }
                        const currentR = baseOuterR * scaling;

                        // --- D. Dynamic Spread Logic (State Philosophy) ---
                        const sWidth = doorSeg?.state?.activeWidth || 20;
                        const midA = (startA + endA) / 2;
                        const sStart = midA - sWidth / 2;
                        const sEnd = midA + sWidth / 2;

                        const sx1 = 50 + centerRadius * Math.cos(toRad(sStart));
                        const sy1 = 50 + centerRadius * Math.sin(toRad(sStart));
                        const sx2 = 50 + currentR * Math.cos(toRad(sStart));
                        const sy2 = 50 + currentR * Math.sin(toRad(sStart));
                        const sx3 = 50 + currentR * Math.cos(toRad(sEnd));
                        const sy3 = 50 + currentR * Math.sin(toRad(sEnd));
                        const sx4 = 50 + centerRadius * Math.cos(toRad(sEnd));
                        const sy4 = 50 + centerRadius * Math.sin(toRad(sEnd));

                        const spreadPath = `M ${sx1} ${sy1} L ${sx2} ${sy2} A ${currentR} ${currentR} 0 0 1 ${sx3} ${sy3} L ${sx4} ${sy4} A ${centerRadius} ${centerRadius} 0 0 0 ${sx1} ${sy1} Z`;

                        // --- E. Standard Points (45deg Guide) ---
                        const ox1 = 50 + currentR * Math.cos(toRad(startA));
                        const oy1 = 50 + currentR * Math.sin(toRad(startA));
                        const ox2 = 50 + currentR * Math.cos(toRad(endA));
                        const oy2 = 50 + currentR * Math.sin(toRad(endA));
                        const ix1 = 50 + centerRadius * Math.cos(toRad(startA));
                        const iy1 = 50 + centerRadius * Math.sin(toRad(startA));
                        const ix2 = 50 + centerRadius * Math.cos(toRad(endA));
                        const iy2 = 50 + centerRadius * Math.sin(toRad(endA));

                        // --- F. Core Signal Path (Thin center line) ---
                        const cx1 = 50 + centerRadius * Math.cos(toRad(midA - 0.5));
                        const cy1 = 50 + centerRadius * Math.sin(toRad(midA - 0.5));
                        const cx2 = 50 + currentR * Math.cos(toRad(midA - 0.5));
                        const cy2 = 50 + currentR * Math.sin(toRad(midA - 0.5));
                        const cx3 = 50 + currentR * Math.cos(toRad(midA + 0.5));
                        const cy3 = 50 + currentR * Math.sin(toRad(midA + 0.5));
                        const cx4 = 50 + centerRadius * Math.cos(toRad(midA + 0.5));
                        const cy4 = 50 + centerRadius * Math.sin(toRad(midA + 0.5));
                        const corePath = `M ${cx1} ${cy1} L ${cx2} ${cy2} L ${cx3} ${cy3} L ${cx4} ${cy4} Z`;

                        // --- G. Color & Status Logic ---
                        let bg;
                        if (finalScore >= 90) bg = 'rgba(255, 215, 0, 0.45)';
                        else if (finalScore >= 75) bg = 'rgba(46, 125, 50, 0.4)';
                        else if (finalScore >= 60) bg = 'rgba(21, 101, 192, 0.35)';
                        else if (finalScore <= 30) bg = 'rgba(198, 40, 40, 0.3)';
                        else bg = 'rgba(128, 128, 128, 0.2)';


                        // --- Score Status Logic ---
                        // Replaced raw score with "Open State Language"
                        const isOpen = doorSeg?.state?.isOpen || false;
                        const openLevel = doorSeg?.state?.openLevel || 0;

                        let statusText = "닫힘";
                        if (isOpen) {
                            if (openLevel >= 0.8) statusText = "활짝 엶"; // Wide Open
                            else if (openLevel >= 0.5) statusText = "열림"; // Open
                            else statusText = "열림(약)"; // Weakly Open
                        } else {
                            // Even if closed, show 'Closed' or just empty if very low?
                            // User wants explicit state.
                            if (finalScore < 25) statusText = "닫힘";
                            else statusText = "부족"; // Insufficient
                        }

                        // Use Score for Precision Mode, otherwise Status Text
                        const scoreStr = settings.scorePrecision === 'high' ? finalScore.toFixed(0) : statusText;

                        let scoreColor = '#333';
                        if (finalScore >= 90) scoreColor = '#b39200';
                        else if (finalScore >= 75) scoreColor = '#2e7d32';
                        else if (finalScore >= 60) scoreColor = '#1565c0';
                        else if (finalScore <= 35) scoreColor = '#c62828';

                        // --- H. Body Center Positioning ---
                        const bodyMidR = centerRadius + (currentR - centerRadius) * 0.28;
                        const bodyMidA = (i * 45 + OFFSET_ANGLE + 22.5 - 90) * (Math.PI / 180);
                        const bx = 50 + bodyMidR * Math.cos(bodyMidA);
                        const by = 50 + bodyMidR * Math.sin(bodyMidA);



                        return (
                            <g key={`sector-layer-${i}`} style={{ filter: flags?.isGongmang ? 'grayscale(0.9) opacity(0.7)' : 'none' }}>
                                {/* 1. Soft Spread (Blurred background) */}
                                <path
                                    d={spreadPath}
                                    fill={bg}
                                    filter={isOpen ? "url(#soft-glow)" : "none"}
                                    opacity={isOpen ? 0.8 : 0.3}
                                />

                                {/* 2. Core Signal Line (Fixed Center) */}
                                <path
                                    d={corePath}
                                    fill={scoreColor}
                                    opacity={isOpen ? 0.8 : 0.2}
                                />

                                {/* 3. Precision Divider (Etched Hairline at Section Border) */}
                                <line
                                    x1={ix1} y1={iy1} x2={ox1} y2={oy1}
                                    stroke="rgba(255, 255, 255, 0.25)"
                                    strokeWidth="0.1"
                                    pointerEvents="none"
                                />

                                {/* 4. Outer Glass Band (Removed as per request) */}

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

                                    {/* OPEN HALO (If Open) */}
                                    {isOpen && (
                                        <circle cx="0" cy="0" r="5" fill="gold" opacity="0.2" filter="blur(2px)" />
                                    )}

                                    <text x="0" y="2" textAnchor="middle" dominantBaseline="central" fontSize="2.2px" fontWeight="700"
                                        fill={scoreColor} opacity={isOpen ? 1 : 0.6}>
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
                        // DYNAMIC SCORE SYNC
                        // Fetch the EXACT score calculated by the new engine
                        const scoreFromEngine = qimen.sectorScores ? qimen.sectorScores[DIRECTIONS[parentIdx]] : 0;
                        const agit = qimen.sectorAgitation ? qimen.sectorAgitation[DIRECTIONS[parentIdx]] : { jitter: 1.0, power: 2.5 };

                        // Re-calculate Jitter (Needs same tDate reference ideally, but acceptable calc here)
                        // Note: To ensure sync, we replicate the jitter logic
                        const tDate = (result.myeongri as any).dayStem ? (solarData.trueSolarTime || currentTime) : currentTime;
                        const microFactor = (tDate.getMinutes() * 60 + tDate.getSeconds()) / 3600;
                        const jitter = Math.sin(microFactor * Math.PI * 8 * agit.jitter + parentIdx) * agit.power;

                        // Final Score (Engine + Jitter)
                        let baseTotal = scoreFromEngine;
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
        </div >
    );
};
