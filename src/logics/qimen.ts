import type { LogicFunction, LogicInput, RingSegment } from './types';
import {
    NINE_STARS, DIRECTIONS,
    getShijinIndex
} from './common';

// Translation Keys for Doors
const DOOR_KEYS = [
    'door_open', 'door_rest', 'door_life', 'door_harm',
    'door_du', 'door_scene', 'door_death', 'door_fear'
];

export const calculateQimen: LogicFunction = (input: LogicInput) => {
    const { time } = input; // This is True Solar Time

    // 1. Calculate Time Parameters
    const shijinIdx = getShijinIndex(time);

    // 2. Qimen Chart Algorithm (Simplified V1 logic for "Visual Data")
    const baseDate = new Date('2024-01-01T00:00:00');
    const diffTime = time.getTime() - baseDate.getTime();
    let diff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diff < 0) diff = (diff % 1000) + 1000;

    const dayShift = diff % 8;
    const starShift = (shijinIdx * 2 + diff) % 9;

    // 3. Generate Rings
    const doorSegments: RingSegment[] = [];
    const starSegments: RingSegment[] = [];

    DIRECTIONS.forEach((_dir, i) => {
        // Doors (8)
        const doorIndex = (i + shijinIdx + dayShift) % 8;
        const doorKey = DOOR_KEYS[doorIndex];

        // Stars (9)
        const starIndex = (i + starShift) % 9;
        const starKey = NINE_STARS[starIndex].name;

        // Auspicious Check
        const isGoodDoor = ['door_open', 'door_rest', 'door_life'].includes(doorKey);

        const startAngle = i * 45;

        const endAngle = (i + 1) * 45;

        doorSegments.push({
            label: doorKey,
            angleStart: startAngle,
            angleEnd: endAngle,
            isAus: isGoodDoor,
            description: isGoodDoor ? 'Best' : ''
        });

        starSegments.push({
            label: starKey,
            angleStart: startAngle,
            angleEnd: endAngle,
            isAus: false // Stars usually don't scale in V1 spec, only Doors? "Open/Rest/Life... 120% expanding"
        });
    });

    return {
        summary: `Time: ${time.toLocaleTimeString()} (TrueSolar)`,
        rings: [
            { id: 'doors', order: 1, segments: doorSegments },
            { id: 'stars', order: 2, segments: starSegments }
        ]
    };
};
