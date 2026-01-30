import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { calculateQimen } from './qimen';
import { calculateMyeongri } from './myeongri';
import { calculateFengShui } from './fengshui';
import { calculateSolarTime } from './solarTime';
import { BRANCHES, MAG_DECLINATION } from './common';
import type { LogicInput } from './types';

export const useLogicEngine = () => {
    const center = useStore((state) => state.center);
    const gpsPosition = useStore((state) => state.gpsPosition);
    const isInputtingUser = useStore((state) => state.isInputtingUser);
    const currentTime = useStore((state) => state.currentTime);
    const settings = useStore((state) => state.settings);
    const activeUserId = useStore((state) => state.activeUserId);
    const users = useStore((state) => state.users);

    const activeUser = activeUserId ? users.find(u => u.id === activeUserId) : undefined;

    const targetA = useStore((state) => state.targetA);
    const targetB = useStore((state) => state.targetB);
    const inspectionMode = useStore((state) => state.inspectionMode);

    const getTargetLocation = () => {
        if (isInputtingUser) return center;

        switch (inspectionMode) {
            case 'TargetA': return targetA || center;
            case 'TargetB': return targetB || center;
            case 'GPS':
            default:
                return gpsPosition || center;
        }
    };

    const targetLocation = getTargetLocation();

    // Geodetic Correction
    const solarTimeResult = useMemo(() => {
        if (settings.useTrueSolarTime) {
            return calculateSolarTime(currentTime, targetLocation.lat, targetLocation.lng, 9);
        }
        return { trueSolarTime: currentTime, equationOfTimeMin: 0, longitudeCorrectionMin: 0 };
    }, [currentTime, targetLocation.lat, targetLocation.lng, settings.useTrueSolarTime]);

    // Standardize Input
    const input: LogicInput = useMemo(() => ({
        location: targetLocation,
        time: solarTimeResult.trueSolarTime,
        settings: settings,
        user: activeUser
    }), [targetLocation, solarTimeResult.trueSolarTime, settings, activeUser]);

    // Execute Logic (Combined)
    const result = useMemo(() => {
        const qimen = calculateQimen(input);
        const myeongri = calculateMyeongri(input);

        return {
            qimen,
            myeongri,
            summary: `${qimen.summary} | ${myeongri.summary}`
        };
    }, [input]);

    const heading = useStore((state) => state.heading);

    const fengshui = useMemo(() => {
        const hourIdx = Math.floor((solarTimeResult.trueSolarTime.getHours() + 1) / 2) % 12;
        const hourBranch = BRANCHES[hourIdx];

        // --- REAL-TIME SCORE JITTER (Yodong Logic) ---
        // Add tiny fluctuation every second to make it feel "Alive"
        const sec = solarTimeResult.trueSolarTime.getSeconds() + solarTimeResult.trueSolarTime.getMilliseconds() / 1000;
        const jitter = Math.sin(sec * Math.PI) * 0.82; // +/- 0.82 drift

        const rawFs = calculateFengShui(heading + MAG_DECLINATION, undefined, hourBranch);
        return {
            ...rawFs,
            score: Number((rawFs.score + jitter).toFixed(2))
        };
    }, [heading, solarTimeResult.trueSolarTime]);

    return {
        result: {
            ...result,
            fengshui
        },
        solarData: solarTimeResult,
        targetLocation,
    };
};
