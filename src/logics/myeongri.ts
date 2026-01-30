import type { LogicFunction, LogicInput, UserProfile } from './types';
import { STEMS, getDayStemIdx } from './common';


// ===================================
// 1. Fixed Rules (Exceptions)
// ===================================
const FIXED_SAJU: { [key: string]: { dayStem: string, dayBranch: string } } = {
    '1972-03-25': { dayStem: 'Yi', dayBranch: 'Hai' }, // 乙亥
    '1993-04-14': { dayStem: 'Jia', dayBranch: 'Yin' }, // 甲寅
};

// ===================================
// 2. 12 Unseong Logic (Ported)
// ===================================
const getUnseongScore = (stemIdx: number, branchIdx: number): number => {
    let start = 0;
    const isYang = (stemIdx % 2 === 0);

    // Starting Branch for each Stem (Yang: Birth, Yin: Death-like mapping inverse)
    switch (stemIdx) {
        case 0: start = 11; break; // Jia -> Hai (Birth)
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

    // Score Mapping (MasterScorer Logic)
    if (offset === 4) return 20; // Peak (King)
    if (offset === 3 || offset === 0) return 15; // Prosperous/Birth
    if (offset === 2 || offset === 11) return 10; // Belt/Nourish
    if (offset === 8) return -35; // Grave (Severe)
    if (offset === 9) return -15; // Cut (Jeol)
    if (offset === 7) return -15; // Death
    if (offset === 6) return -10; // Sick

    // Bath (offset 1) - Conditional Good in MasterScorer logic, 
    // but here we return raw score, logic engine can adjust based on purpose.
    if (offset === 1) return 5; // Bath (Neutral/Social)

    return 0; // Weak/Neutral
};

// ===================================
// 3. User Saju Helper
// ===================================
const getUserDayStem = (user?: UserProfile, time?: Date): string => {
    // 1. Guest Mode: Use Current Time as "Birth Time"
    if (!user) {
        if (!time) return 'Jia'; // Fallback
        const idx = getDayStemIdx(time);
        return STEMS[idx];
    }

    // 2. User Mode: Use Birth Date
    // Check Fixed Rules
    if (user.birthDate) {
        const dateStr = user.birthDate.split('T')[0];
        if (FIXED_SAJU[dateStr]) {
            return FIXED_SAJU[dateStr].dayStem;
        }
        // Normal Calculation (Using common.ts logic)
        // Ideally we need a full Manseok library here. 
        // Re-using common logic for now (2024 Base).
        const bDate = new Date(user.birthDate);
        const idx = getDayStemIdx(bDate);
        return STEMS[idx];
    }

    return 'Jia'; // Fallback
};

// ===================================
// 4. Main Engine
// ===================================
export const calculateMyeongri: LogicFunction = (input: LogicInput) => {
    const { time, user } = input;
    const dayStem = getUserDayStem(user, time);
    const dayStemIdx = STEMS.indexOf(dayStem);

    // Calculate Score for each Direction (Palace) based on 12 Unseong
    // Direction -> Palace Branch. (e.g. N -> Zi, NE -> Chou/Yin...)
    // Common.ts: PALACE_BRANCHES
    // We need to import PALACE_BRANCHES or re-define if not exported.
    // Assuming PALACE_BRANCHES is in common.ts and exported.

    // NOTE: MasterScorer: "pBranches.forEach(b => maxUnseong = Math.max...)"
    // Palace has 1 or 2 branches. We take the Max score (Best case).

    // Wait, let's just make a simple map here for now to avoid circular deps if common is simple.
    // Actually common.ts has it.
    const PALACE_BRANCHES_LOCAL = {
        'N': [0], 'NE': [1, 2], 'E': [3], 'SE': [4, 5],
        'S': [6], 'SW': [7, 8], 'W': [9], 'NW': [10, 11]
    };

    let summary = user ? `User: ${user?.name || 'User'} (${dayStem})` : `Guest Mode (${dayStem})`;
    const scores: { [key: string]: number } = {};

    Object.entries(PALACE_BRANCHES_LOCAL).forEach(([dir, branches]) => {
        let maxScore = -100;
        branches.forEach(b => {
            const s = getUnseongScore(dayStemIdx, b);
            if (s > maxScore) maxScore = s;
        });
        scores[dir] = maxScore; // Only returning Unseong score component
    });

    return {
        summary,
        // Rings? Myeongri usually just modifies the final score/color, 
        // but we can return a "Luck Ring" if we want visualization.
        // For now, return empty rings, but 'scores' will be used by the aggregator.
        rings: [],
        debugScore: scores // Custom property for Aggregator
    };
};
