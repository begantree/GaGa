// Standard definition for Logic Engine interactions

export interface GeoLocation {
    lat: number;
    lng: number;
}

export interface UserProfile {
    id: string;
    name: string;
    birthDate: string; // ISO 8601
    gender: 'male' | 'female';
    birthTime?: string; // HH:mm
    birthLat?: number;
    birthLng?: number;
    birthPlace?: string; // e.g. "Seoul, Korea"
    calendarType?: 'solar' | 'lunar';
}

export interface LayerConfig {
    opacity: number; // 0-1
    visible: boolean;
}

export interface LogicSettings {
    useTrueSolarTime: boolean; // Correct time based on longitude
    useMagneticNorth: boolean; // Use magnetic declination
    languageMode: 'KOR' | 'CHN' | 'ENG' | 'MIX';
    scorePrecision: 'high' | 'low';
    layers: { [id: string]: LayerConfig }; // Dynamic layer settings
}

export interface LogicInput {
    location: GeoLocation;
    time: Date; // The "Space-Time" point user is exploring
    user?: UserProfile; // Optional: if present, personalized
    settings: LogicSettings;
}

// Visual data for a single ring (e.g., 8 Doors, 9 Stars)
export interface RingSegment {
    label: string; // Text to display
    angleStart: number; // 0-360
    angleEnd: number; // 0-360
    color?: string; // Optional highlight
    isAus: boolean; // Auspicious? (For sizing 120%)
    description?: string;
}

export interface RingLayer {
    id: string; // 'doors', 'stars', 'deities'
    order: number; // Render order (inner to outer)
    segments: RingSegment[];
}

// Feng Shui Result Type
export interface FengShuiOutput {
    score: number;
    summary: string;
    details: string;
    mountain: {
        name: string;
        uName: string;
        uNameKr?: string;
        element: string;
    };
}

export interface LogicOutput {
    summary: string; // Text summary (e.g., "Great day for travel")
    rings: RingLayer[]; // Visual data for rings
    debugScore?: { [key: string]: number }; // Optional score map for visualization
    fengshui?: FengShuiOutput; // New Feng Shui data
    palaceFlags?: Array<{
        dir: string;
        isGongmang: boolean;
        isChung: boolean;
        pattern: 'gil' | 'hyung' | null;
        patternName?: string | null;
    }>;
    sectorScores?: { [key: string]: number }; // Score map for detailed 8-dir analysis
    sectorAgitation?: { [key: string]: { jitter: number, power: number } }; // UI Agitation params
}

export type LogicFunction = (input: LogicInput) => LogicOutput;
