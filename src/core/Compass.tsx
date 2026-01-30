import { useStore } from '../store/useStore';
import { useLogicEngine } from '../logics/useLogicEngine';
import { useTranslation } from '../locales/useTranslation';
import './compass.css';

const OFFSET_ANGLE = -22.5;
const MAG_DECLINATION = -8.5; // Physical Rotation for Korea

const RingRender = ({ ring, radius, color = '#333', heading, segmentColors, doubleLayer = false }: { ring: any; radius: number; color?: string; heading: number, segmentColors?: string[], doubleLayer?: boolean }) => {
    const { t } = useTranslation();
    const { segments, id } = ring;
    const layerSettings = useStore((state) => state.settings.layers[id]);

    if (layerSettings && !layerSettings.visible) return null;
    const opacity = layerSettings ? layerSettings.opacity : 1;
    const totalRotation = heading + MAG_DECLINATION;

    return (
        <g className="compass-ring" style={{ opacity }}>
            {segments.map((seg: any, i: number) => {
                const midAngle = (seg.angleStart + seg.angleEnd) / 2 + OFFSET_ANGLE;
                const rad = (midAngle - 90) * (Math.PI / 180);
                const x = 50 + radius * Math.cos(rad);
                const y = 50 + radius * Math.sin(rad);
                const isAus = seg.isAus;
                const textColor = segmentColors ? segmentColors[i] : (isAus ? '#ff0000' : color);

                return (
                    <g key={i}>
                        {doubleLayer && (
                            <text
                                x={x + 0.5} y={y + 0.5} textAnchor="middle" dominantBaseline="central"
                                className={`compass-ring-text`}
                                style={{ fill: '#222', fontWeight: '900', fontSize: isAus ? '7px' : '4.5px', opacity: 0.7, pointerEvents: 'none' }}
                                transform={`rotate(${-totalRotation}, ${x + 0.5}, ${y + 0.5})`}
                            >
                                {t(seg.label)}
                            </text>
                        )}
                        <text
                            x={x} y={y} textAnchor="middle" dominantBaseline="central"
                            className={`compass-ring-text ${isAus ? 'auspicious' : ''}`}
                            style={{ fill: textColor, fontWeight: '900', fontSize: isAus ? '7px' : '4.5px', transition: 'font-size 0.2s ease-out, fill 0.2s', filter: 'drop-shadow(0px 0px 1px rgba(128,128,128,0.8))' }}
                            transform={`rotate(${-totalRotation}, ${x}, ${y})`}
                        >
                            {t(seg.label)}
                        </text>
                    </g>
                );
            })}
        </g>
    );
};

export const Compass = () => {
    const heading = useStore((state) => state.heading);
    const isInputtingUser = useStore((state) => state.isInputtingUser);
    const inspectionMode = useStore((state) => state.inspectionMode);
    const currentTime = useStore((state) => state.currentTime);
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

    // Door Colors Logic
    const doorRing = qimen.rings.find(r => r.id === 'doors');
    const doorColors = doorRing ? [...Array(8)].map((_, i) => {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const mScore = myeongri.debugScore ? myeongri.debugScore[dirs[i]] : 0;
        const seg = doorRing.segments.find(s => s.angleStart === i * 45);
        const isQimenAus = seg?.isAus;

        let total = 50 + mScore * 2;
        if (isQimenAus) total += 20;
        if (total > 100) total = 100;

        if (total >= 90) return '#b39200';
        if (total >= 70) return '#1565c0';
        if (total >= 40) return '#2e7d32';
        return '#616161';
    }) : undefined;

    // --- Dynamic Center Radius Calculation ---
    const rawName = (myeongri.summary || 'Guest').split('(')[0].replace('User: ', '').replace('Guest Mode', 'Guest');
    // Calculate radius based on name length. 
    // Reduced by 30% as requested.
    const centerRadius = Math.max(6, (6 + rawName.length * 1.5) * 0.7);

    return (
        <div className="compass-container" style={{ pointerEvents: 'none' }}>
            <div className="compass-plate" style={{ transform: `rotate(${totalRotation}deg)` }}>
                <svg viewBox="0 0 100 100" className="compass-svg">
                    {/* 1. Base Sectors (Annular - Donut Shape) */}
                    {[...Array(8)].map((_, i) => {
                        const startA = i * 45 + OFFSET_ANGLE;
                        const endA = (i + 1) * 45 + OFFSET_ANGLE;
                        const toRad = (deg: number) => (deg - 90) * Math.PI / 180;

                        // Outer Points (R=49)
                        const ox1 = 50 + 49 * Math.cos(toRad(startA));
                        const oy1 = 50 + 49 * Math.sin(toRad(startA));
                        const ox2 = 50 + 49 * Math.cos(toRad(endA));
                        const oy2 = 50 + 49 * Math.sin(toRad(endA));

                        // Inner Points (r=centerRadius)
                        const ix1 = 50 + centerRadius * Math.cos(toRad(startA));
                        const iy1 = 50 + centerRadius * Math.sin(toRad(startA));
                        const ix2 = 50 + centerRadius * Math.cos(toRad(endA));
                        const iy2 = 50 + centerRadius * Math.sin(toRad(endA));

                        // 5-Color Logic (Vivid Stage)
                        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                        const mScore = myeongri.debugScore ? myeongri.debugScore[dirs[i]] : 0;
                        const doorSeg = qimen.rings.find(r => r.id === 'doors')?.segments.find(s => s.angleStart === i * 45);
                        const isQimenAus = doorSeg?.isAus;
                        let total = 50 + mScore * 2;
                        if (isQimenAus) total += 20;
                        if (total > 100) total = 100;
                        if (total < 0) total = 0;

                        let bg;
                        if (total >= 90) { bg = 'rgba(255, 215, 0, 0.45)'; } // Gold
                        else if (total >= 75) { bg = 'rgba(46, 125, 50, 0.4)'; } // Green
                        else if (total >= 60) { bg = 'rgba(21, 101, 192, 0.35)'; } // Blue
                        else if (total <= 30) { bg = 'rgba(198, 40, 40, 0.3)'; } // Red
                        else { bg = 'rgba(128, 128, 128, 0.2)'; } // Grey

                        return (
                            <path
                                key={`sector-${i}`}
                                // Draw from Inner1 -> Outer1 -> Outer2 -> Inner2 -> Close
                                d={`M ${ix1} ${iy1} L ${ox1} ${oy1} L ${ox2} ${oy2} L ${ix2} ${iy2} Z`}
                                fill={bg}
                                stroke="none"
                            />
                        );
                    })}

                    {/* 2. Sector Lines (From Center Radius to Outer) */}
                    {[...Array(8)].map((_, i) => {
                        const angle = i * 45 + OFFSET_ANGLE;
                        const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
                        const ix = 50 + centerRadius * Math.cos(toRad(angle));
                        const iy = 50 + centerRadius * Math.sin(toRad(angle));
                        const ox = 50 + 49 * Math.cos(toRad(angle));
                        const oy = 50 + 49 * Math.sin(toRad(angle));
                        // Changed to Lighter Blue and matched opacity
                        return <line key={`line-${i}`} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(0, 100, 255, 0.6)" strokeWidth="0.5" />;
                    })}

                    {/* 2b. Surgical Score Labels (Inside Sectors) */}
                    {[...Array(8)].map((_, i) => {
                        const midAngle = i * 45;
                        const rad = (midAngle + OFFSET_ANGLE + 22.5 - 90) * (Math.PI / 180);
                        const r = 32; // Centered within the sector area
                        const x = 50 + r * Math.cos(rad);
                        const y = 50 + r * Math.sin(rad);

                        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                        const mScore = myeongri.debugScore ? myeongri.debugScore[dirs[i]] : 0;
                        const doorSeg = qimen.rings.find(r => r.id === 'doors')?.segments.find(s => s.angleStart === i * 45);

                        // --- DYNAMIC ENERGY CALCULATION (Real-time yodong) ---
                        // Use True Solar Minutes/Seconds for micro-fluctuation (0.00 ~ 5.00 range)
                        const tDate = (result.myeongri as any).dayStem ? (solarData.trueSolarTime || currentTime) : currentTime;
                        const microFactor = (tDate.getMinutes() * 60 + tDate.getSeconds()) / 3600;
                        const jitter = Math.sin(microFactor * Math.PI * 8 + i) * 2.5; // Oscillates 2.5 pts based on time + sector index

                        let total = 50 + mScore * 2 + jitter;
                        if (doorSeg?.isAus) total += 20;
                        if (total > 100) total = 100;
                        if (total < 0) total = 0;

                        // Score-based Text Color
                        let scoreColor = '#333'; // Default Grey
                        if (total >= 90) scoreColor = '#b39200'; // Gold
                        else if (total >= 75) scoreColor = '#2e7d32'; // Green
                        else if (total >= 60) scoreColor = '#1565c0'; // Blue
                        else if (total <= 35) scoreColor = '#c62828'; // Red

                        return (
                            <g key={`score-${i}`} transform={`rotate(${-totalRotation}, ${x}, ${y})`}>
                                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="3px" fontWeight="900"
                                    fill={scoreColor} style={{ textShadow: '0 0 1.5px white, 0 0 1.5px white' }}>
                                    {total.toFixed(2)}
                                </text>
                            </g>
                        );
                    })}

                    {/* 3. Cardinal Text */}
                    {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((label, i) => {
                        const angle = i * 45;
                        const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
                        const r = 44;
                        const x = 50 + r * Math.cos(toRad(angle));
                        const y = 50 + r * Math.sin(toRad(angle));
                        const isCard = ['N', 'E', 'S', 'W'].includes(label);
                        return (
                            <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="4px" fontWeight="bold" fill={isCard ? "#d32f2f" : "#666"} transform={`rotate(${-totalRotation}, ${x}, ${y})`} style={{ textShadow: '0 0 2px rgba(255,255,255,0.3)' }}>
                                {label}
                            </text>
                        );
                    })}

                    {/* 4. Rings (Doors, Stars) */}
                    {doorRing && <RingRender ring={doorRing} radius={25} color="#333" heading={heading} segmentColors={doorColors} doubleLayer={true} />}
                    <RingRender ring={qimen.rings.find(r => r.id === 'stars')!} radius={38} color="#666" heading={heading} />

                    {/* 5. Center Regular Octagon Frame - Rotates with Plate (Aligned to Sectors) */}
                    {(() => {
                        // Generate 8 points matching the Sector Lines (OFFSET_ANGLE base)
                        const points = [];
                        for (let i = 0; i < 8; i++) {
                            // Match the sector boundary angles exactly
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
                                stroke="rgba(0, 100, 255, 0.6)" // Lighter Blue
                                strokeWidth="0.5" // Matched to Outer Lines
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



            {/* Logic Summary Display REMOVED */}


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
