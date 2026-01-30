import type { LogicFunction, LogicInput, RingSegment } from './types';
import {
    NINE_STARS, DIRECTIONS,
    getShijinIndex, getDayStemIdx, getDayBranchIdx, getGongmang, PALACE_BRANCHES,
    getHourStemIdx, STEM_COMBOS
} from './common';

// Translation Keys for Doors (Korean Traditional)
const DOOR_NAMES_KR = [
    '개문', '휴문', '생문', '상문',
    '두문', '경문', '사문', '경문(驚)'
];

export const calculateQimen: LogicFunction = (input: LogicInput) => {
    const { time } = input; // This is True Solar Time

    // 1. Calculate Time Parameters
    const shijinIdx = getShijinIndex(time);
    const dayStemIdx = getDayStemIdx(time);
    const dayBranchIdx = getDayBranchIdx(time);
    const hourStemIdx = getHourStemIdx(dayStemIdx, shijinIdx);

    // 2. Emptiness & Clash
    const gongmangBranches = getGongmang(dayStemIdx, dayBranchIdx);
    const chungBranch = (dayBranchIdx + 6) % 12; // Simple 180 deg clash

    // 3. Qimen Chart Algorithm (Simplified V1 logic for "Visual Data")
    const baseDate = new Date('2024-01-01T00:00:00');
    const diffTime = time.getTime() - baseDate.getTime();
    let diff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diff < 0) diff = (diff % 1000) + 1000;

    const dayShift = diff % 8;
    const starShift = (shijinIdx * 2 + diff) % 9;

    // 4. Generate Rings & Palace Data
    const doorSegments: RingSegment[] = [];
    const starSegments: RingSegment[] = [];
    const palaceFlags: any[] = [];

    DIRECTIONS.forEach((dir, i) => {
        // Doors (8)
        const doorIndex = (i + shijinIdx + dayShift) % 8;
        const doorName = DOOR_NAMES_KR[doorIndex];

        // Stars (9)
        const starIndex = (i + starShift) % 9;
        const starKey = NINE_STARS[starIndex].displayName;

        // Auspicious Check
        const isGoodDoor = ['개문', '휴문', '생문'].includes(doorName);

        const startAngle = i * 45;
        const endAngle = (i + 1) * 45;

        // Gong-mang & Chung Detection
        const pBranches = PALACE_BRANCHES[dir];
        const isGongmang = pBranches.some(b => gongmangBranches.includes(b));
        const isChung = pBranches.includes(chungBranch);

        // --- Pattern (Gyeok-guk) Detection ---
        // Basic Gil/Hyung logic
        let pattern: 'gil' | 'hyung' | null = null;
        if (isGoodDoor && !isGongmang && !isChung) pattern = 'gil';
        if (['사문', '경문(驚)', '상문'].includes(doorName)) pattern = 'hyung';
        if (isChung) pattern = 'hyung';

        // Advanced Pattern Names (from STEM_COMBOS)
        const earthStemIdx = (i + dayShift) % 10;
        const comboKey = `${hourStemIdx},${earthStemIdx}`;
        const patternName = STEM_COMBOS[comboKey] || null;

        doorSegments.push({
            label: doorName,
            angleStart: startAngle,
            angleEnd: endAngle,
            isAus: isGoodDoor,
            description: isGoodDoor ? 'Best' : ''
        });

        starSegments.push({
            label: starKey,
            angleStart: startAngle,
            angleEnd: endAngle,
            isAus: false
        });

        palaceFlags.push({
            dir,
            isGongmang,
            isChung,
            pattern,
            patternName
        });
    });

    return {
        summary: `Time: ${time.toLocaleTimeString()} (TrueSolar)`,
        rings: [
            { id: 'doors', order: 1, segments: doorSegments },
            { id: 'stars', order: 2, segments: starSegments }
        ],
        palaceFlags
    };
};
