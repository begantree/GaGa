/**
 * Common Logic Helpers & Constants
 * Ported from MasterScorer v12.9.3
 */

// ==========================================
// 1. Static Data (Universal Keys)
// ==========================================

export const MAG_DECLINATION = -8.5;
export const STEMS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
export const STEMS_KR = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

// [Translation Keys for Doors]
// KR: Used for Logic Key
export const DOOR_NAMES_KR = ['개문', '휴문', '생문', '상문', '두문', '경문', '사문', '경문(驚)'];
// Hanja: Used for Display
export const DOOR_NAMES_HANJA = ['開', '休', '生', '傷', '杜', '景', '死', '驚'];

export const BRANCHES = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];

export const STEM_COMBOS: { [key: string]: string } = {
    '0,2': '청룡회명', // 甲 + 丙
    '2,0': '비조질혈', // 丙 + 甲
    '1,2': '화소초로', // 乙 + 丙
    '3,1': '옥녀수문', // 丁 + 乙
};
export const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const PALACE_NAMES_KR = ['감', '간', '진', '손', '리', '곤', '태', '건'];

export const MOUNTAIN_24 = [
    // N (Kan): Im, Ja, Gye
    '임', '자', '계',
    // NE (Gen): Chuk, Gan, In
    '축', '간', '인',
    // E (Zhen): Gap, Myo, Eul
    '갑', '묘', '을',
    // SE (Xun): Jin, Son, Sa
    '진', '손', '사',
    // S (Li): Byeong, O, Jeong
    '병', '오', '정',
    // SW (Kun): Mi, Gon, Sin
    '미', '곤', '신',
    // W (Dui): Gyeong, Yu, Sin
    '경', '유', '신',
    // NW (Qian): Sul, Geon, Hae
    '술', '건', '해'
];

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
    { name: 'star_peng', displayName: '천붕', element: 'Water' },
    { name: 'star_rui', displayName: '천예', element: 'Earth' },
    { name: 'star_chong', displayName: '천충', element: 'Wood' },
    { name: 'star_fu', displayName: '천보', element: 'Wood' },
    { name: 'star_qin', displayName: '천금', element: 'Earth' },
    { name: 'star_xin', displayName: '천심', element: 'Metal' },
    { name: 'star_zhu', displayName: '천주', element: 'Metal' },
    { name: 'star_ren', displayName: '천임', element: 'Earth' },
    { name: 'star_ying', displayName: '천영', element: 'Fire' }
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
    let targetDate = new Date(solarDate);
    if (targetDate.getHours() === 23) {
        targetDate = new Date(targetDate.getTime() + 60 * 60 * 1000);
    }
    targetDate.setHours(0, 0, 0, 0);

    const baseDate = new Date('2024-01-01T00:00:00');
    const diffTime = targetDate.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const m = 60;
    let total = ((diffDays % m) + m) % m;
    return total % 10;
};

export const getDayBranchIdx = (solarDate: Date): number => {
    let targetDate = new Date(solarDate);
    if (targetDate.getHours() === 23) {
        targetDate = new Date(targetDate.getTime() + 60 * 60 * 1000);
    }
    targetDate.setHours(0, 0, 0, 0);

    const baseDate = new Date('2024-01-01T00:00:00');
    const diffTime = targetDate.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const m = 60;
    let total = ((diffDays % m) + m) % m;
    return total % 12;
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
