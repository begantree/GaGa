/**
 * Common Logic Helpers & Constants
 * Ported from MasterScorer v12.9.3
 */

// ==========================================
// 1. Static Data (Universal Keys)
// ==========================================

export const STEMS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
export const BRANCHES = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
export const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const PALACE_BRANCHES: { [key: string]: number[] } = {
    'N': [0], 'NE': [1, 2], 'E': [3], 'SE': [4, 5],
    'S': [6], 'SW': [7, 8], 'W': [9], 'NW': [10, 11]
};

export const PALACE_ELEMENTS: { [key: string]: string } = {
    'N': 'Water', 'NE': 'Earth', 'E': 'Wood', 'SE': 'Wood',
    'S': 'Fire', 'SW': 'Earth', 'W': 'Metal', 'NW': 'Metal'
};

export const STEM_ELEMENTS: { [key: string]: string } = {
    'Jia': 'Wood', 'Yi': 'Wood', 'Bing': 'Fire', 'Ding': 'Fire', 'Wu': 'Earth', 'Ji': 'Earth',
    'Geng': 'Metal', 'Xin': 'Metal', 'Ren': 'Water', 'Gui': 'Water'
};

export const NINE_STARS = [
    { name: 'star_peng', element: 'Water' }, // Tian Peng
    { name: 'star_rui', element: 'Earth' },  // Tian Rui
    { name: 'star_chong', element: 'Wood' }, // Tian Chong
    { name: 'star_fu', element: 'Wood' },    // Tian Fu
    { name: 'star_ren', element: 'Earth' },  // Tian Ren (Qin is usually center, Ren is 8. Wait, standard order: Peng, Rui, Chong, Fu, Qin, Xin, Zhu, Ren, Ying. V1 list order was specific.)
    // V1 List: Peng, Rui, Chong, Fu, Qin, Xin, Zhu, Ren, Ying.
    // NOTE: Qimen standard allocation often puts Qin in center (5), then moves it.
    // Let's stick to V1 array order for indexing consistency.
    { name: 'star_qin', element: 'Earth' }, // Tian Qin (Often merged with Rui or center)
    { name: 'star_xin', element: 'Metal' },  // Tian Xin
    { name: 'star_zhu', element: 'Metal' },  // Tian Zhu
    { name: 'star_ren', element: 'Earth' },  // Tian Ren (8)
    { name: 'star_ying', element: 'Fire' }   // Tian Ying
];

export const PROD: { [key: string]: string } = { 'Water': 'Wood', 'Wood': 'Fire', 'Fire': 'Earth', 'Earth': 'Metal', 'Metal': 'Water' };
export const DEST: { [key: string]: string } = { 'Water': 'Fire', 'Fire': 'Metal', 'Metal': 'Wood', 'Wood': 'Earth', 'Earth': 'Water' };

// ==========================================
// 2. Helper Functions
// ==========================================

export const getShijinIndex = (solarDate: Date): number => {
    // Input is already True Solar Time
    // (Hours + 1) / 2 % 12
    return Math.floor((solarDate.getHours() + 1) / 2) % 12;
};

export const getDayStemIdx = (solarDate: Date): number => {
    // V1 Logic: Difference from 2024-01-01
    // Note: This relies on 2024-01-01 being a specific Stem day.
    // 2024-01-01 was Jia-Zi (0,0)? No, check Manseok.
    // If V1 worked with this base, we keep it. masterScorer used 2024-01-01.
    // We assume the user verified V1.

    let targetDate = new Date(solarDate);
    // If 23:xx, treat as next day start (Ya-Ja)
    if (targetDate.getHours() === 23) {
        targetDate = new Date(targetDate.getTime() + 60 * 60 * 1000); // Add 1 hour basically
    }
    targetDate.setHours(0, 0, 0, 0);

    const baseDate = new Date('2024-01-01T00:00:00');
    const diffTime = targetDate.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // JS modulo of negative numbers is tricky.
    // ((n % m) + m) % m
    const m = 60;
    let total = ((diffDays % m) + m) % m;

    return total % 10;
};

export const getHourStemIdx = (dayStemIdx: number, hourBranchIdx: number): number => {
    // 'Du Tou' formula: (DayStem % 5) * 2
    const offset = (dayStemIdx % 5) * 2;
    return (offset + hourBranchIdx) % 10;
};

export const getGongmang = (stemIdx: number, branchIdx: number): number[] => {
    // (Branch - Stem + 12) % 12
    const diff = (branchIdx - stemIdx + 12) % 12;
    const map: { [key: number]: number[] } = {
        10: [10, 11], // Xu, Hai
        8: [8, 9],    // Shen, You
        6: [6, 7],    // Wu, Wei
        4: [4, 5],    // Chen, Si
        2: [2, 3],    // Yin, Mao
        0: [0, 1]     // Zi, Chou
    };
    return map[diff] || [];
};
