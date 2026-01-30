import { create } from 'zustand';
import type { GeoLocation, LogicSettings, UserProfile } from '../logics/types';

interface AppState {
  // --- Space-Time Input ---
  center: GeoLocation;
  gpsPosition: GeoLocation | null; // Real hardware location
  targetA: GeoLocation | null; // User defined target A
  targetB: GeoLocation | null; // User defined target B
  inspectionMode: 'GPS' | 'TargetA' | 'TargetB'; // Which target to analyze
  currentTime: Date;

  // --- Application State ---
  heading: number; // Device or Map rotation
  zoom: number;

  // --- Data & Settings ---
  users: UserProfile[];
  activeUserId: string | null;
  settings: LogicSettings;

  // --- Actions ---
  setCenter: (lat: number, lng: number) => void;
  setGpsPosition: (lat: number, lng: number) => void;
  setTargetA: (lat: number, lng: number) => void;
  setTargetB: (lat: number, lng: number) => void;
  setInspectionMode: (mode: 'GPS' | 'TargetA' | 'TargetB') => void;
  setCurrentTime: (date: Date) => void;
  setHeading: (heading: number) => void;
  setZoom: (zoom: number) => void;

  addUser: (user: UserProfile) => void;
  removeUser: (id: string) => void;
  setActiveUser: (id: string) => void;
  updateSettings: (settings: Partial<LogicSettings>) => void;

  // --- UI State ---
  isInputtingUser: boolean;
  setIsInputtingUser: (isInputting: boolean) => void;
  isGPSTracking: boolean;
  setGPSTracking: (isTracking: boolean) => void;
  isScaleLocked: boolean;
  setScaleLocked: (locked: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Default: Seoul City Hall, Current Time
  center: { lat: 37.5665, lng: 126.9780 },
  gpsPosition: null,
  targetA: null,
  targetB: null,
  inspectionMode: 'GPS',
  currentTime: new Date(),

  heading: 0,
  zoom: 13,

  users: [],
  activeUserId: null,

  settings: {
    useTrueSolarTime: true,
    useMagneticNorth: false,
    languageMode: 'KOR',
    layers: {
      'doors': { opacity: 1, visible: true },
      'stars': { opacity: 1, visible: true },
    }
  },

  setCenter: (lat, lng) => set({ center: { lat, lng } }),
  setGpsPosition: (lat, lng) => set({ gpsPosition: { lat, lng } }),
  setTargetA: (lat, lng) => set({ targetA: { lat, lng } }),
  setTargetB: (lat, lng) => set({ targetB: { lat, lng } }),
  setInspectionMode: (mode) => set({ inspectionMode: mode }),
  setCurrentTime: (date) => set({ currentTime: date }),
  setHeading: (heading) => set({ heading }),
  setZoom: (zoom) => set({ zoom }),

  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  setActiveUser: (id) => set({ activeUserId: id }),
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  removeUser: (id) => set((state) => {
    const newUsers = state.users.filter(u => u.id !== id);
    // If active user is deleted, pick first or null
    const newActiveId = (state.activeUserId === id)
      ? (newUsers[0]?.id || null)
      : state.activeUserId;
    return { users: newUsers, activeUserId: newActiveId };
  }),

  // UI State
  isInputtingUser: false,
  setIsInputtingUser: (isInputting) => set({ isInputtingUser: isInputting }),
  isGPSTracking: false, // Default DISABLED to prevent map fighting
  setGPSTracking: (isTracking) => set({ isGPSTracking: isTracking }),

  isScaleLocked: false,
  setScaleLocked: (locked: boolean) => set({ isScaleLocked: locked }),
}));
