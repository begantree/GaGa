import { useStore } from '../store/useStore';
import { ko } from './ko';
import { en } from './en';
import { zh } from './zh';

const translations = {
    KOR: ko,
    ENG: en,
    CHN: zh,
    MIX: ko, // Fallback or Custom logic
};

export const useTranslation = () => {
    const languageMode = useStore((state) => state.settings.languageMode);

    // Simple lookup
    const t = (key: string): string => {
        const dict = translations[languageMode] || ko;
        // @ts-ignore
        return dict[key] || key;
    };

    return { t, languageMode };
};
