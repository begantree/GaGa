/**
 * Geodetic Engine: True Solar Time Correction
 * 
 * Corrects Standard Time to True Solar Time based on:
 * 1. Longitude Difference (Local Lng vs Standard Meridian)
 * 2. Equation of Time (Orbital Eccentricity)
 */

interface EOTResult {
    trueSolarTime: Date;
    equationOfTimeMin: number; // EOT value in minutes
    longitudeCorrectionMin: number; // Longitude correction in minutes
}

export const calculateSolarTime = (standardTime: Date, _latitude: number, longitude: number, timezoneOffset: number = 9): EOTResult => {
    // 1. Longitude Correction
    // KST is UTC+9, based on 135°E.
    // 1 Degree = 4 Minutes.
    // Correction = (Local Longitude - Standard Meridian) * 4 minutes
    const standardMeridian = timezoneOffset * 15; // 9 * 15 = 135
    const lngDiff = longitude - standardMeridian;
    const lngCorrectionMin = lngDiff * 4;

    // 2. Equation of Time (EOT)
    // Approximation formula
    const dayOfYear = getDayOfYear(standardTime);
    // B calculation (radians)
    const B = (360 * (dayOfYear - 81)) / 365;
    const B_rad = B * (Math.PI / 180);

    // EOT Formula (in minutes)
    const eotMin = 9.87 * Math.sin(2 * B_rad) - 7.53 * Math.cos(B_rad) - 1.5 * Math.sin(B_rad);

    // 3. Total Correction
    const totalCorrectionMin = lngCorrectionMin + eotMin;

    // 4. Apply to Standard Time
    const solarTime = new Date(standardTime.getTime() + totalCorrectionMin * 60 * 1000);

    return {
        trueSolarTime: solarTime,
        equationOfTimeMin: eotMin,
        longitudeCorrectionMin: lngCorrectionMin
    };
};

// Helper: Get Day of Year (1-365/366)
const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};
