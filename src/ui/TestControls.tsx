import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useLogicEngine } from '../logics/useLogicEngine';
import { Layers, MapPin, Navigation, RefreshCw, Lock } from 'lucide-react'; // Removed Languages, unused

export const TestControls = () => {
    // Unused: setting, updateSettings
    const { center, gpsPosition, currentTime, setHeading, setCenter, setGpsPosition, setCurrentTime, users, activeUserId, addUser, setActiveUser, isInputtingUser, setIsInputtingUser, isGPSTracking, setGPSTracking, isScaleLocked, setScaleLocked } = useStore();
    const { solarData, result } = useLogicEngine(); // Get entire result 

    // Unused: languageMode
    // const { } = useTranslation();


    // --- 1. Robust Initialization (GPS -> Fallback) ---
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setGpsPosition(latitude, longitude);
                    setCenter(latitude, longitude);
                    setGPSTracking(true);
                },
                (err) => {
                    console.warn('GPS Init Failed', err);
                    applyRegionFallback();
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            applyRegionFallback();
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => setGpsPosition(pos.coords.latitude, pos.coords.longitude),
            undefined,
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const applyRegionFallback = () => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let lat = 37.5665; // Seoul
        let lng = 126.9780;
        if (tz.includes('America')) { lat = 40.7128; lng = -74.0060; }
        else if (tz.includes('Europe')) { lat = 51.5074; lng = -0.1278; }
        else if (tz.includes('China') || tz.includes('Asia/Shanghai')) { lat = 39.9042; lng = 116.4074; }
        setCenter(lat, lng);
        setGPSTracking(false);
    };

    // --- 2. Smart Sync (Jitter Smoothing) ---
    // --- 2. Smart Sync (Jitter Smoothing) ---
    // (prevGpsRef removed)
    // Wait, useState is better if we want to confirm value stability? No, useRef.
    // However, I can't easily add useRef in replace block without adding import.
    // `useRef` is not imported. I need to add it to imports first? 
    // `useState` is imported. I'll use a state or just a let outside... no, component state.
    // Let's assume I can add useRef to import or use `useState`.
    // Actually, line 1 imports `useState, useEffect`. I should add `useRef` to line 1.
    // But I'm editing line 53.
    // I will use a simplified approach: Compare with `center`?
    // User might drag map away, `center` changes.
    // If I compare GPS with `center`, then if I drag map, GPS will assume it needs to recenter?
    // Note: `isGPSTracking` is true. If I drag map, `isGPSTracking` should strictly be false?
    // Current `setCenter` in store does NOT auto-disable `isGPSTracking`.
    // I should fix that in `MapWrapper` (MapEvents move -> disable tracking).
    // User said: "User presses [Track] icon directly".
    // If dragging disables tracking, that's standard behavior.

    // For now, let's implement the threshold check against the *last applied* GPS position.
    // Since I cannot easily add `useRef` without touching line 1, I will use a module-level variable? No, unsafe.
    // I will use `useState` which is available.
    const [lastSyncedGps, setLastSyncedGps] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (isGPSTracking && gpsPosition) {
            // Smoothing Logic: 0.00002 deg ~= 2.2m
            const threshold = 0.00002;
            const dist = lastSyncedGps
                ? Math.abs(gpsPosition.lat - lastSyncedGps.lat) + Math.abs(gpsPosition.lng - lastSyncedGps.lng)
                : 1; // Force first update

            if (dist > threshold) {
                setCenter(gpsPosition.lat, gpsPosition.lng);
                setLastSyncedGps(gpsPosition);
            }
        }
    }, [isGPSTracking, gpsPosition, setCenter, lastSyncedGps]);

    // --- Initialization & Persistence ---
    useEffect(() => {
        const savedUsers = localStorage.getItem('gaga_users');
        const savedActiveId = localStorage.getItem('gaga_active_uid');
        const savedCenter = localStorage.getItem('gaga_center');

        if (savedUsers) {
            useStore.setState({ users: JSON.parse(savedUsers) });
        }
        if (savedActiveId) {
            setActiveUser(savedActiveId);
            if (savedCenter) {
                const c = JSON.parse(savedCenter);
                setCenter(c.lat, c.lng);
            }
        } else {
            const currentUsers = useStore.getState().users;
            if (currentUsers.length === 0) {
                const guestId = 'guest_1';
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                let lat = 37.5665; let lng = 126.9780;
                if (tz.includes('America')) { lat = 40.7128; lng = -74.0060; }
                else if (tz.includes('Europe')) { lat = 51.5074; lng = -0.1278; }
                else if (tz.includes('China') || tz.includes('Asia/Shanghai')) { lat = 39.9042; lng = 116.4074; }

                const guest = { id: guestId, name: 'Guest1', birthDate: new Date().toISOString(), birthPlace: { lat, lng } };
                addUser(guest as any);
                setActiveUser(guestId);
                setCenter(lat, lng);
            }
        }
    }, []);

    useEffect(() => {
        if (users.length > 0) localStorage.setItem('gaga_users', JSON.stringify(users));
        if (activeUserId) localStorage.setItem('gaga_active_uid', activeUserId);
        localStorage.setItem('gaga_center', JSON.stringify(center));
    }, [users, activeUserId, center]);

    // UI State
    const [showUserList, setShowUserList] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '', date: '', time: '12:00', gender: 'male', calendar: 'solar', birthLat: '37.5665', birthLng: '126.9780'
    });
    const [useDeviceCompass, setUseDeviceCompass] = useState(false);

    // Device Compass
    useEffect(() => {
        if (!useDeviceCompass) return;
        const handleOrientation = (e: DeviceOrientationEvent) => {
            let heading = 0;
            if ((e as any).webkitCompassHeading) heading = (e as any).webkitCompassHeading;
            else if (e.alpha !== null) heading = 360 - e.alpha;
            setHeading(heading);
        };
        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [useDeviceCompass, setHeading]);

    const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const solarTimeString = solarData?.trueSolarTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // GPS Handler
    const handleGPS = () => {
        if (!navigator.geolocation) return;
        setGPSTracking(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setGpsPosition(latitude, longitude);
                setCenter(latitude, longitude);
            },
            (err) => console.warn(err),
            { enableHighAccuracy: true }
        );
    };

    return (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%',
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            zIndex: 9999, /* Forced High Z-Index */
            display: 'flex', flexDirection: 'column',
            maxHeight: '45vh', backdropFilter: 'blur(10px)', overflow: 'hidden'
        }}>
            {/* Header: Title, Icons, Time */}
            <div style={{ padding: '10px 15px 5px 15px', borderBottom: '1px solid #eee', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Universal Engine</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {/* 1. GPS (Recenter) */}
                        <button onClick={handleGPS} style={{ padding: '4px', borderRadius: '4px', border: isGPSTracking ? '1px solid green' : '1px solid #ddd', background: isGPSTracking ? '#e8f5e9' : 'white' }}>
                            <Navigation size={14} color={isGPSTracking ? 'green' : '#666'} />
                        </button>
                        {/* 2. Rotation (Sensor Toggle) */}
                        <button onClick={() => setUseDeviceCompass(!useDeviceCompass)} style={{ padding: '4px', borderRadius: '4px', border: useDeviceCompass ? '1px solid blue' : '1px solid #ddd', background: useDeviceCompass ? '#e3f2fd' : 'white' }}>
                            <RefreshCw size={14} color={useDeviceCompass ? 'blue' : '#666'} className={useDeviceCompass ? 'spin-anim' : ''} />
                        </button>
                        {/* 3. Scale Lock (Size Fixed) */}
                        <button onClick={() => setScaleLocked(!isScaleLocked)} style={{ padding: '4px', borderRadius: '4px', border: isScaleLocked ? '1px solid red' : '1px solid #ddd', background: isScaleLocked ? '#ffebee' : 'white' }}>
                            <Lock size={14} color={isScaleLocked ? 'red' : '#666'} />
                        </button>
                    </div>
                </div>

                {/* Independent Time Selectors - Equal Width Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {/* Year */}
                    <input
                        type="number"
                        value={currentTime.getFullYear()}
                        onChange={e => { const d = new Date(currentTime); d.setFullYear(parseInt(e.target.value)); setCurrentTime(d); }}
                        style={{ width: '100%', fontSize: '11px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}
                        placeholder="Year"
                    />
                    {/* Month */}
                    <select
                        value={currentTime.getMonth()}
                        onChange={e => { const d = new Date(currentTime); d.setMonth(parseInt(e.target.value)); setCurrentTime(d); }}
                        style={{ width: '100%', fontSize: '11px', padding: '0px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}
                    >
                        {Array.from({ length: 12 }, (_, i) => i).map(m => <option key={m} value={m}>{m + 1}월</option>)}
                    </select>
                    {/* Day */}
                    <select
                        value={currentTime.getDate()}
                        onChange={e => { const d = new Date(currentTime); d.setDate(parseInt(e.target.value)); setCurrentTime(d); }}
                        style={{ width: '100%', fontSize: '11px', padding: '0px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}
                    >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}일</option>)}
                    </select>
                    {/* Sijin */}
                    <select
                        value={Math.floor(currentTime.getHours() / 2)}
                        onChange={e => { const d = new Date(currentTime); d.setHours(parseInt(e.target.value) * 2, 0, 0, 0); setCurrentTime(d); }}
                        style={{ width: '100%', fontSize: '11px', padding: '0px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}
                    >
                        {[
                            '자시 (23:30~01:29)', '축시 (01:30~03:29)', '인시 (03:30~05:29)', '묘시 (05:30~07:29)',
                            '진시 (07:30~09:29)', '사시 (09:30~11:29)', '오시 (11:30~13:29)', '미시 (13:30~15:29)',
                            '신시 (15:30~17:29)', '유시 (17:30~19:29)', '술시 (19:30~21:29)', '해시 (21:30~23:29)'
                        ].map((s, i) => <option key={i} value={i}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '10px 15px', overflowY: 'auto', pointerEvents: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                    <div style={{ background: '#fff0f0', padding: '6px', borderRadius: '6px', fontSize: '10px', border: '1px solid #ffccc7' }}>
                        <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>SOLAR: {solarTimeString}</div>
                        <div style={{ color: '#666' }}>Clock: {timeString}</div>
                    </div>
                    {result?.fengshui && (
                        <div style={{ background: '#fffbe6', padding: '6px', borderRadius: '6px', fontSize: '10px', border: '1px solid #ffe58f' }}>
                            <div style={{ color: '#d48806', fontWeight: 'bold' }}>SCORE: {result.fengshui.score}</div>
                            <div style={{ color: '#666' }}>{result.fengshui.mountain.uName}</div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <div onClick={(e) => { e.stopPropagation(); setShowUserList(!showUserList) }} style={{ flex: 1, padding: '6px', background: '#e3f2fd', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Layers size={12} />
                        {(activeUserId && users) ? (users.find(u => u.id === activeUserId)?.name || 'Unknown') : 'Guest'}
                    </div>
                    <button onClick={() => { setIsInputtingUser(true); setGPSTracking(false); }} style={{ padding: '6px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px' }}>+Add</button>
                </div>
            </div>

            {/* Popups */}
            {showUserList && (
                <>
                    <div style={{
                        position: 'fixed', bottom: '50%', left: '50%', transform: 'translate(-50%, 50%)',
                        width: '250px', background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', zIndex: 2000, maxHeight: '200px', overflowY: 'auto'
                    }}>
                        {users.map(u => (
                            <div key={u.id} onClick={() => { setActiveUser(u.id); setShowUserList(false) }} style={{ padding: '8px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>{u.name}</div>
                        ))}
                        <button onClick={() => setShowUserList(false)} style={{ marginTop: '5px', width: '100%' }}>Close</button>
                    </div>
                    <div onClick={() => setShowUserList(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1999, background: 'rgba(0,0,0,0.1)' }} />
                </>
            )}

            {isInputtingUser && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '20px',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '12px',
                    borderRadius: '16px 16px 0 0', zIndex: 2000, maxHeight: '80vh', overflowY: 'auto'
                }}>
                    <h4 style={{ margin: 0 }}>Register New User</h4>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <input placeholder="Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} style={{ flex: 2, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                        <select value={newUser.gender} onChange={e => setNewUser({ ...newUser, gender: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                            <option value="male">Male</option><option value="female">Female</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <input type="date" value={newUser.date} onChange={e => setNewUser({ ...newUser, date: e.target.value })} style={{ flex: 2, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                        <input type="time" value={newUser.time} onChange={e => setNewUser({ ...newUser, time: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    </div>
                    {/* Birth Place */}
                    <div style={{ background: '#f9f9f9', padding: '8px', borderRadius: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Birth Place (Drag Map)</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input value={newUser.birthLat} onChange={e => setNewUser({ ...newUser, birthLat: e.target.value })} placeholder="Lat" style={{ width: '50%' }} />
                            <input value={newUser.birthLng} onChange={e => setNewUser({ ...newUser, birthLng: e.target.value })} placeholder="Lng" style={{ width: '50%' }} />
                        </div>
                        <button onClick={() => setNewUser({ ...newUser, birthLat: center.lat.toFixed(6), birthLng: center.lng.toFixed(6) })} style={{ width: '100%', marginTop: '5px', padding: '6px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}>
                            <MapPin size={10} /> Use Map Center
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => {
                            if (!newUser.name) return alert('Name Required');
                            const id = Date.now().toString();
                            addUser({
                                id, name: newUser.name, birthDate: `${newUser.date}T${newUser.time}:00`,
                                gender: newUser.gender as any, calendarType: newUser.calendar as any,
                                birthLat: parseFloat(newUser.birthLat), birthLng: parseFloat(newUser.birthLng), birthPlace: `${newUser.birthLat},${newUser.birthLng}`
                            });
                            setActiveUser(id);
                            setIsInputtingUser(false);
                            setGPSTracking(true);
                        }} style={{ flex: 1, padding: '10px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px' }}>Register</button>
                        <button onClick={() => { setIsInputtingUser(false); setGPSTracking(true); }} style={{ flex: 1, padding: '10px', background: '#ccc', border: 'none', borderRadius: '4px' }}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};
