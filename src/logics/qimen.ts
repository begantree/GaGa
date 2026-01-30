import type { LogicFunction, LogicInput, RingSegment } from './types';
import {
    NINE_STARS, DIRECTIONS,
    getShijinIndex, getDayStemIdx, getDayBranchIdx, getGongmang
} from './common';

// ==========================================
// 1. Logic Constants (The Brain Schema)
// ==========================================

// Translation Keys for Doors (Korean Traditional)
const DOOR_NAMES_KR = ['개문', '휴문', '생문', '상문', '두문', '경문', '사문', '경문(驚)'];

const STEM_COMBOS: { [key: string]: { score: number, name: string } } = {
    // Auspicious
    '1,2': { score: 20, name: '기의상좌' }, // Yi+Bing
    '2,0': { score: 25, name: '비조질혈' }, // Bing+Jia
    '4,2': { score: 25, name: '청룡회명' }, // Wu+Bing
    '3,1': { score: 22, name: '옥녀수신' }, // Ding+Yi
    '2,4': { score: 20, name: '화련적마' }, // Bing+Wu
    '3,8': { score: 25, name: '성기득사' }, // Ding+Ren
    '1,3': { score: 15, name: '기의상좌' }, // Yi+Ding
    '0,5': { score: 15, name: '귀인입택' }, // Jia+Ji
    '4,6': { score: 10, name: '천을귀인' }, // Wu+Geng
    '8,4': { score: 10, name: '천을귀인' }, // Ren+Wu

    // Inauspicious
    '6,1': { score: -20, name: '태백입영' }, // Geng+Yi
    '6,9': { score: -20, name: '대격형' },   // Geng+Gui
    '7,1': { score: -25, name: '백호창광' }, // Xin+Yi
    '9,3': { score: -22, name: '등사요교' }, // Gui+Ding
    '8,5': { score: -20, name: '반음' },     // Ren+Ji
    '9,0': { score: -20, name: '형격' },     // Gui+Jia
    '0,6': { score: -25, name: '태백입영' }, // Jia+Geng
};

const DOOR_ELEMENTS: { [key: string]: string } = {
    '휴문': 'Water', '생문': 'Earth', '상문': 'Wood', '두문': 'Wood',
    '경문': 'Fire', '사문': 'Earth', '경문(驚)': 'Metal', '개문': 'Metal'
};

const PALACE_BRANCHES: { [key: string]: number[] } = {
    'N': [0], 'NE': [1, 2], 'E': [3], 'SE': [4, 5],
    'S': [6], 'SW': [7, 8], 'W': [9], 'NW': [10, 11]
};

const PALACE_ELEMENTS: { [key: string]: string } = {
    'N': 'Water', 'NE': 'Earth', 'E': 'Wood', 'SE': 'Wood',
    'S': 'Fire', 'SW': 'Earth', 'W': 'Metal', 'NW': 'Metal'
};

const PROD: { [key: string]: string } = { 'Water': 'Wood', 'Wood': 'Fire', 'Fire': 'Earth', 'Earth': 'Metal', 'Metal': 'Water' };
const DEST: { [key: string]: string } = { 'Water': 'Fire', 'Fire': 'Metal', 'Metal': 'Wood', 'Wood': 'Earth', 'Earth': 'Water' };

// ==========================================
// 2. Logic Helpers (The Brain Functions)
// ==========================================

const getCheongang = (monthIdx: number, shijinIdx: number): string => {
    // (Month + Shijin) % 12 -> Branch
    const cgBranch = (monthIdx + shijinIdx) % 12;
    let cgDir = 'C';
    Object.entries(PALACE_BRANCHES).forEach(([dir, branches]) => {
        if (branches.includes(cgBranch)) cgDir = dir;
    });
    return cgDir;
};

const getYeokma = (shijinIdx: number): string | null => {
    if ([8, 0, 4].includes(shijinIdx)) return 'NE'; // Shen-Zi-Chen -> Yin
    if ([2, 6, 10].includes(shijinIdx)) return 'SW'; // Yin-Wu-Xu -> Shen
    if ([5, 9, 1].includes(shijinIdx)) return 'NW'; // Si-You-Chou -> Hai
    if ([11, 3, 7].includes(shijinIdx)) return 'SE'; // Hai-Mao-Wei -> Si
    return null;
};

// 12-Unseong Scoring (Lifecycle)
const getUnseongScore = (stemIdx: number, branchIdx: number, purpose: string = 'Life'): number => {
    let start = 0;
    const isYang = (stemIdx % 2 === 0);

    // Unseong Start Map (Jia->Hai(11), Yi->Wu(6), etc.)
    switch (stemIdx) {
        case 0: start = 11; break; // Jia -> Hai
        case 2: case 4: start = 2; break; // Bing/Wu -> Yin
        case 6: start = 5; break; // Geng -> Si
        case 8: start = 8; break; // Ren -> Shen
        case 1: start = 6; break; // Yi -> Wu
        case 3: case 5: start = 9; break; // Ding/Ji -> You
        case 7: start = 0; break; // Xin -> Zi
        case 9: start = 3; break; // Gui -> Mao
    }

    let offset = 0;
    if (isYang) offset = (branchIdx - start + 12) % 12;
    else offset = (start - branchIdx + 12) % 12;

    let score = 0;
    if (offset === 4) score = 20; // Peak
    else if (offset === 3 || offset === 0) score = 15; // Prosperous/Birth
    else if (offset === 2 || offset === 11) score = 10; // Belt/Nourish
    else if (offset === 8) score = -35; // Grave (Severe)
    else if (offset === 9) score = -15; // Cut (Jeol)
    else if (offset === 7) score = -15; // Death
    else if (offset === 6) score = -10; // Sick

    if (offset === 1) { // Bath (Mok-yok)
        const isFun = ['휴문', '경문', '개문'].includes(purpose); // Use KR names since mapping is KR
        if (isFun) score = 10;
    }
    return score;
};

export const calculateQimen: LogicFunction = (input: LogicInput) => {
    const { time } = input; // This is True Solar Time

    // 1. Calculate Time Parameters
    const shijinIdx = getShijinIndex(time);
    const dayStemIdx = getDayStemIdx(time);
    const dayBranchIdx = getDayBranchIdx(time);
    // const hourStemIdx = getHourStemIdx(dayStemIdx, shijinIdx); // Unused in this version
    const monthIdx = time.getMonth(); // 0-11

    // 2. Emptiness & Clash
    const gongmangBranches = getGongmang(dayStemIdx, dayBranchIdx);
    const chungBranch = (dayBranchIdx + 6) % 12; // Simple 180 deg clash

    // 2.1 Season Element (WolRyung)
    let seasonEl = 'Earth';
    if ([1, 2, 3].includes(monthIdx)) seasonEl = 'Wood'; // Feb-Apr
    else if ([4, 5, 6].includes(monthIdx)) seasonEl = 'Fire'; // May-Jul
    else if ([7, 8, 9].includes(monthIdx)) seasonEl = 'Metal'; // Aug-Oct
    else seasonEl = 'Water'; // Nov-Jan

    // 2.2 Special Deities (Jikbu/Jiksa)
    const jikbuDirIdx = (shijinIdx + dayStemIdx) % 8;
    const jiksaDirIdx = (jikbuDirIdx + 4) % 8;
    const cheongangDir = getCheongang(monthIdx, shijinIdx);
    const yeokmaDir = getYeokma(shijinIdx);

    // 3. Qimen Chart Algorithm (Visual Data Logic)
    const baseDate = new Date('2024-01-01T00:00:00');
    const diffTime = time.getTime() - baseDate.getTime();
    let diff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diff < 0) diff = (diff % 1000) + 1000;

    const dayShift = diff % 8;
    const starShift = (shijinIdx * 2 + diff) % 9;
    const heavenShift = (shijinIdx + diff) % 10;
    const earthShift = (diff * 2) % 10;

    // 4. Generate Rings & Palace Data
    const doorSegments: RingSegment[] = [];
    const starSegments: RingSegment[] = [];
    const palaceFlags: any[] = [];
    const sectorScores: { [key: string]: number } = {};
    const sectorAgitation: { [key: string]: { jitter: number, power: number } } = {};

    DIRECTIONS.forEach((dir, i) => {
        // --- A. Identify Components ---
        // Door
        const doorIndex = (i + shijinIdx + dayShift) % 8;
        const doorNameKR = DOOR_NAMES_KR[doorIndex];
        const doorEl = DOOR_ELEMENTS[doorNameKR] || 'Earth';
        const isGoodDoor = ['개문', '휴문', '생문'].includes(doorNameKR); // KR check

        // Star
        const starIndex = (i + starShift) % 9;
        const starKey = NINE_STARS[starIndex].displayName;
        // const starEl = NINE_STARS[starIndex].element; // Unused 

        // Stems (Heaven/Earth)
        const hIndex = (i + heavenShift) % 10;
        const eIndex = (i + earthShift) % 10;
        // const heavenStem = STEMS[hIndex]; // Unused
        // const earthStem = STEMS[eIndex]; // Unused

        // Palace
        const palaceEl = PALACE_ELEMENTS[dir];
        const pBranches = PALACE_BRANCHES[dir];

        // --- B. Flags ---
        const isGongmang = pBranches.some(b => gongmangBranches.includes(b));
        const isChung = pBranches.includes(chungBranch);

        // --- C. SCORING ENGINE (The Brain) ---
        // Base Score
        const tieBreaker = (shijinIdx + dir.length) * 0.01;
        let dScore = 65.0 + tieBreaker;
        const reasons: string[] = [];

        // C.1 WolRyung (Seasonality)
        if (seasonEl === palaceEl) { dScore += 15; reasons.push('Wang'); }
        else if (PROD[seasonEl] === palaceEl) { dScore += 10; reasons.push('Sang'); }
        else if (PROD[palaceEl] === seasonEl) { dScore -= 5; reasons.push('Hyu'); }
        else if (DEST[palaceEl] === seasonEl) { dScore -= 10; reasons.push('Su'); }
        else if (DEST[seasonEl] === palaceEl) { dScore -= 15; reasons.push('Sa'); }

        // C.2 Fanyin/Fuyin
        // Map Door to Home Palace (approximate for layout)
        // Home: Open(NW), Rest(N), Life(NE), Harm(E), Delusion(SE), Scenery(S), Death(SW), Fear(W)
        // Note: doorIndex 0=Open.. wait. DOOR_NAMES_KR = ['개문(Open)', '휴문(Rest)', '생문(Life)', '상문(Harm)', '두문(Delusion)', '경문(View)', '사문(Death)', '경문(Fear)']
        // Indices: 0:Open, 1:Rest, 2:Life, 3:Harm, 4:Du, 5:View, 6:Death, 7:Fear
        // const homeIndices = [7, 0, 1, 2, 3, 4, 5, 6]; // Unused
        // Let's use simple string map
        const doorHomeMap: { [key: string]: string } = { '개문': 'NW', '휴문': 'N', '생문': 'NE', '상문': 'E', '두문': 'SE', '경문': 'S', '사문': 'SW', '경문(驚)': 'W' };
        const homePalace = doorHomeMap[doorNameKR];
        const isFuyin = (homePalace === dir);
        const opposites: { [key: string]: string } = { 'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E', 'NE': 'SW', 'SW': 'NE', 'NW': 'SE', 'SE': 'NW' };
        const isFanyin = (opposites[homePalace] === dir);

        if (isFanyin) { dScore -= 15; reasons.push('Fanyin'); }
        if (isFuyin) { dScore -= 10; reasons.push('Fuyin'); }

        // C.3 Deities & Cheongang
        const isJikbu = (i === jikbuDirIdx);
        const isJiksa = (i === jiksaDirIdx);
        if (isJikbu && isJiksa) { dScore += 30; reasons.push('BuSa'); } // BuSa DongGung
        else {
            if (isJikbu) { dScore += 25; reasons.push('Jikbu'); }
            if (isJiksa) { dScore += 20; reasons.push('Jiksa'); }
        }
        if (dir === cheongangDir) { dScore += 10; reasons.push('Cheongang'); }

        // C.4 Munbak/Gungje (Door vs Palace Element)
        if (DEST[doorEl] === palaceEl) { dScore -= 25; reasons.push('Munbak'); }
        else if (DEST[palaceEl] === doorEl) { dScore -= 15; reasons.push('Gungje'); }
        else if (PROD[doorEl] === palaceEl || PROD[palaceEl] === doorEl) { dScore += 12; }

        // C.5 GyeokGuk (Stem Pattern)
        // Key: HeavenIdx, EarthIdx
        const comboKey = `${hIndex},${eIndex}`;
        const gyeok = STEM_COMBOS[comboKey];
        if (gyeok && !isGongmang) {
            dScore += gyeok.score;
            reasons.push(gyeok.name);
        }

        // C.6 Unseong (Lifecycle)
        let maxUnseong = -100;
        pBranches.forEach(b => {
            const s = getUnseongScore(hIndex, b, doorNameKR);
            if (s > maxUnseong) maxUnseong = s;
        });
        dScore += maxUnseong;

        // C.7 Misc Bonuses
        // Samgi (Yi(1), Bing(2), Ding(3))
        if ([1, 2, 3].includes(hIndex)) dScore += 15;
        // Yeokma
        if (dir === yeokmaDir) dScore += 12;
        // South Harm
        if (dir === 'S' && doorNameKR === '상문') { dScore -= 30; reasons.push('SouthHarm'); }

        // C.8 Kill-Switch
        // If Gongmang or Severe Clashes, cap score.
        if (isGongmang) {
            dScore = 0; // Absolute Zero for Void
        } else {
            // Cap high scores if Munbak present (Hidden limit)
            if (reasons.includes('Munbak')) dScore = Math.min(dScore, 40);
        }

        // Clamp
        sectorScores[dir] = Math.min(100, Math.max(0, dScore));

        // --- D. WuXing Agitation Calculation ---
        // Frequency (Agitation): Higher = Faster (Shivering), Lower = Slower (Breathing)
        // Power (Amplitude): Higher = Deeper, Lower = Shallow
        let agitation = 1.0; // Base frequency (Breathing)
        let power = 2.5; // Base amplitude

        if (isChung) agitation += 3.0; // Violent shiver
        if (reasons.includes('Munbak') || reasons.includes('Gungje')) agitation += 2.0;
        if (reasons.includes('Fanyin') || reasons.includes('Fuyin')) agitation += 1.5;
        if (reasons.some(r => r.includes('형') || r.includes('Hyung'))) agitation += 2.5; // Punishment

        if (isGoodDoor) agitation -= 0.2; // Calmer
        if (reasons.includes('Wang') || reasons.includes('Sang')) {
            power += 1.5; // Stronger Qi
            agitation -= 0.1; // Steady
        }
        if (dScore < 40) power -= 1.0; // Weak Qi

        sectorAgitation[dir] = { jitter: agitation, power: power };

        // --- E. Visual Segments Setup ---
        // (Existing Logic)
        let pattern: 'gil' | 'hyung' | null = null;
        if (isGoodDoor && !isGongmang && !isChung) pattern = 'gil';
        if (dScore < 40) pattern = 'hyung'; // Sync visual flag with new score

        const startAngle = i * 45;
        const endAngle = (i + 1) * 45;

        doorSegments.push({
            label: doorNameKR,
            angleStart: startAngle,
            angleEnd: endAngle,
            isAus: isGoodDoor,
            description: reasons.join(', ')
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
            patternName: gyeok?.name
        });
    });

    return {
        summary: `Time: ${time.toLocaleTimeString()} (TrueSolar)`,
        rings: [
            { id: 'doors', order: 1, segments: doorSegments },
            { id: 'stars', order: 2, segments: starSegments }
        ],
        palaceFlags,
        sectorScores, // Return the precise scores
        sectorAgitation // Return animation params
    };
};
