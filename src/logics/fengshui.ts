// 24 Mountain Definitions
export interface Mountain {
    name: string; // Hanja
    uName: string; // Romanized
    angleStart: number;
    angleEnd: number;
    element: string; // Wood, Fire, Earth, Metal, Water
    yinYang: string; // Yin, Yang
    uNameKr?: string; // Korean Name for UI
}

export const MOUNTAINS: Mountain[] = [
    // North (Water)
    { name: '壬', uNameKr: '임', uName: 'Ren', angleStart: 337.5, angleEnd: 352.5, element: 'Water', yinYang: 'Yang' },
    { name: '子', uNameKr: '자', uName: 'Zi', angleStart: 352.5, angleEnd: 7.5, element: 'Water', yinYang: 'Yin' },
    { name: '癸', uNameKr: '계', uName: 'Gui', angleStart: 7.5, angleEnd: 22.5, element: 'Water', yinYang: 'Yin' },

    // Northeast (Earth)
    { name: '丑', uNameKr: '축', uName: 'Chou', angleStart: 22.5, angleEnd: 37.5, element: 'Earth', yinYang: 'Yin' },
    { name: '艮', uNameKr: '간', uName: 'Gan', angleStart: 37.5, angleEnd: 52.5, element: 'Earth', yinYang: 'Yang' },
    { name: '寅', uNameKr: '인', uName: 'Yin', angleStart: 52.5, angleEnd: 67.5, element: 'Wood', yinYang: 'Yang' },

    // East (Wood)
    { name: '甲', uNameKr: '갑', uName: 'Jia', angleStart: 67.5, angleEnd: 82.5, element: 'Wood', yinYang: 'Yang' },
    { name: '卯', uNameKr: '묘', uName: 'Mao', angleStart: 82.5, angleEnd: 97.5, element: 'Wood', yinYang: 'Yin' },
    { name: '乙', uNameKr: '을', uName: 'Yi', angleStart: 97.5, angleEnd: 112.5, element: 'Wood', yinYang: 'Yin' },

    // Southeast (Wood/Wind)
    { name: '辰', uNameKr: '진', uName: 'Chen', angleStart: 112.5, angleEnd: 127.5, element: 'Earth', yinYang: 'Yang' },
    { name: '巽', uNameKr: '손', uName: 'Xun', angleStart: 127.5, angleEnd: 142.5, element: 'Wood', yinYang: 'Yin' },
    { name: '巳', uNameKr: '사', uName: 'Si', angleStart: 142.5, angleEnd: 157.5, element: 'Fire', yinYang: 'Yang' },

    // South (Fire)
    { name: '丙', uNameKr: '병', uName: 'Bing', angleStart: 157.5, angleEnd: 172.5, element: 'Fire', yinYang: 'Yang' },
    { name: '午', uNameKr: '오', uName: 'Wu', angleStart: 172.5, angleEnd: 187.5, element: 'Fire', yinYang: 'Yin' },
    { name: '丁', uNameKr: '정', uName: 'Ding', angleStart: 187.5, angleEnd: 202.5, element: 'Fire', yinYang: 'Yin' },

    // Southwest (Earth)
    { name: '未', uNameKr: '미', uName: 'Wei', angleStart: 202.5, angleEnd: 217.5, element: 'Earth', yinYang: 'Yin' },
    { name: '坤', uNameKr: '곤', uName: 'Kun', angleStart: 217.5, angleEnd: 232.5, element: 'Earth', yinYang: 'Yang' },
    { name: '申', uNameKr: '신', uName: 'Shen', angleStart: 232.5, angleEnd: 247.5, element: 'Metal', yinYang: 'Yang' },

    // West (Metal)
    { name: '庚', uNameKr: '경', uName: 'Geng', angleStart: 247.5, angleEnd: 262.5, element: 'Metal', yinYang: 'Yang' },
    { name: '酉', uNameKr: '유', uName: 'You', angleStart: 262.5, angleEnd: 277.5, element: 'Metal', yinYang: 'Yin' },
    { name: '辛', uNameKr: '신', uName: 'Xin', angleStart: 277.5, angleEnd: 292.5, element: 'Metal', yinYang: 'Yin' },

    // Northwest (Metal/Heaven)
    { name: '戌', uNameKr: '술', uName: 'Xu', angleStart: 292.5, angleEnd: 307.5, element: 'Earth', yinYang: 'Yang' },
    { name: '乾', uNameKr: '건', uName: 'Qian', angleStart: 307.5, angleEnd: 322.5, element: 'Metal', yinYang: 'Yang' },
    { name: '亥', uNameKr: '해', uName: 'Hai', angleStart: 322.5, angleEnd: 337.5, element: 'Water', yinYang: 'Yin' },
];

export const getMountain = (heading: number): Mountain => {
    // Normalize heading to 0-360
    let h = heading % 360;
    if (h < 0) h += 360;

    // Special case for Zi (crossing 0)
    // Zi is 352.5 to 7.5
    if (h >= 352.5 || h < 7.5) {
        const found = MOUNTAINS.find(m => m.uName === 'Zi');
        if (found) return found!;
    }

    // Standard search
    const found = MOUNTAINS.find(m => h >= m.angleStart && h < m.angleEnd);
    return found || MOUNTAINS[0]; // Fallback
};

// 5 Elements Interaction
// Wood(0) -> Fire(1) -> Earth(2) -> Metal(3) -> Water(4) -> Wood(0)
const ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

const getElementIndex = (el: string) => ELEMENTS.indexOf(el);

const getInteractionScore = (subjectEl: string, objectEl: string): number => {
    const sIdx = getElementIndex(subjectEl);
    const oIdx = getElementIndex(objectEl);

    if (sIdx === -1 || oIdx === -1) return 50;

    // Calculate distance in generation cycle
    // 0: Same (Friend) - 80
    // 1: Subject generates Object (Output/Drain) - 40
    // 2: Subject controls Object (Wealth) - 60
    // 3: Object controls Subject (Kill) - 20 (Clash)
    // 4: Object generates Subject (Resource) - 100 (Best)

    // Diff = (Subject - Object + 5) % 5 ?? No, stick to relative distance
    // Let's use (Object - Subject + 5) % 5
    const diff = (oIdx - sIdx + 5) % 5;

    switch (diff) {
        case 0: return 80; // Same
        case 1: return 60; // Subject generates Object (Output) - Actually in FS, leaking is bad but 'Wealth generation' context? Let's say 60.
        case 2: return 40; // Subject controls Object (Wealth/Control) - Laborious? 
        case 3: return 20; // Object controls Subject (Killer) - Bad.
        case 4: return 100; // Object generates Subject (Resource) - Great.
    }
    return 50;
};

// Main Calculation Function
// Parameters: 
// heading: Corrected Magnetic Heading (already applies -8.5 if needed before passing here)
// timeBranch: Current Time Earthly Branch (e.g. 'Zi', 'Chou'...)
export const calculateFengShui = (heading: number, _dayBranch?: string, hourBranch?: string) => {
    const mountain = getMountain(heading);

    // Default score if no time data
    let score = 50;
    let comments: string[] = [];

    // Simple Scoring: Mountain vs Time (Hour Branch)
    // We need element of current Hour Branch.
    // Assuming 'hourBranch' string passed is like '午' (Wu) or 'Zi'

    if (hourBranch) {
        // Find Mountain corresponding to the Hour Branch
        const timeMtn = MOUNTAINS.find(m => m.name === hourBranch || m.uName === hourBranch);
        if (timeMtn) {
            // Compare Time (Subject/Environment) -> Mountain (Object/Location)
            // Simplified: Time Element vs Mountain Element
            // If Time feeds Mountain -> Excellent Energy (100)
            // const interaction = getInteractionScore(timeMtn.element, mountain.element); // Unused for now

            score = getInteractionScore(mountain.element, timeMtn.element);
            comments.push(`Space(${mountain.element}) vs Time(${timeMtn.element})`);
        }
    }

    return {
        score,
        mountain,
        summary: `${mountain.name}향 (${mountain.uNameKr})`,
        details: comments.join(', ')
    };
};
