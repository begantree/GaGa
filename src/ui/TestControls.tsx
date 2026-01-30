import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useLogicEngine } from '../logics/useLogicEngine';
import { MapPin, Navigation, RefreshCw, Lock, List, Trash2, User, X, Hash } from 'lucide-react';

export const TestControls = () => {
    // Unused: setting, updateSettings
    const { center, gpsPosition, currentTime, setHeading, setCenter, setGpsPosition, setCurrentTime, users, activeUserId, addUser, removeUser, setActiveUser, setIsInputtingUser, isGPSTracking, setGPSTracking, isScaleLocked, setScaleLocked, settings, updateSettings } = useStore();
    const { solarData, result } = useLogicEngine(); // Get entire result 

    const [isTimeLocked, setIsTimeLocked] = useState(false);

    // Unused: languageMode
    // const { } = useTranslation();


    // --- 0. Forced System Time Sync ---
    useEffect(() => {
        if (isTimeLocked) return; // Skip sync if manual override is active

        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, [setCurrentTime, isTimeLocked]);

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

    // UI State for Registration
    const [isRegExpanded, setIsRegExpanded] = useState(false); // Collapsible Registration Form
    const [showUserListPopup, setShowUserListPopup] = useState(false);

    // Detailed New User State
    const now = new Date();
    const [newName, setNewName] = useState('');
    const [newGender, setNewGender] = useState<'male' | 'female'>('male');
    const [newCalendar, setNewCalendar] = useState<'solar' | 'lunar'>('solar');
    const [newYear, setNewYear] = useState(now.getFullYear());
    const [newMonth, setNewMonth] = useState(now.getMonth()); // 0-11
    const [newDay, setNewDay] = useState(now.getDate());
    const [newHour, setNewHour] = useState(12);
    const [newMinute, setNewMinute] = useState(0);
    const [birthLat, setBirthLat] = useState('37.5665');
    const [birthLng, setBirthLng] = useState('126.9780');

    // Device Compass State
    const [useDeviceCompass, setUseDeviceCompass] = useState(false);

    // Device Compass Logic
    useEffect(() => {
        if (!useDeviceCompass) {
            setHeading(0); // Reset to North Up when disabled
            return;
        }
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
    const activeUser = users.find(u => u.id === activeUserId);

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

    const handleRegister = () => {
        if (!newName) return alert('Input Name!');
        const id = Date.now().toString();

        // Construct Date with Minute Precision
        const d = new Date(newYear, newMonth, newDay, newHour, newMinute);

        addUser({
            id,
            name: newName,
            birthDate: d.toISOString(),
            gender: newGender,
            calendarType: newCalendar,
            birthLat: parseFloat(birthLat),
            birthLng: parseFloat(birthLng),
            birthPlace: `${birthLat},${birthLng}`
        });

        // Reset & Activate
        setActiveUser(id);
        setIsRegExpanded(false); // Collapse after add
        setGPSTracking(true);
        setNewName('');
    };

    return (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%',
            backgroundColor: 'rgba(255,255,255,0.98)',
            borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            zIndex: 9999, /* Forced High Z-Index */
            display: 'flex', flexDirection: 'column',
            maxHeight: '60vh', backdropFilter: 'blur(10px)', overflow: 'hidden'
        }}>
            {/* 1. Header: Title, Icons, Time */}
            <div style={{ padding: '10px 15px 5px 15px', borderBottom: '1px solid #eee', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Universal Engine</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isTimeLocked && (
                            <button
                                onClick={() => { setIsTimeLocked(false); setCurrentTime(new Date()); }}
                                style={{
                                    fontSize: '9px', padding: '4px 8px', borderRadius: '12px',
                                    background: '#333', color: '#fff', border: 'none', fontWeight: 'bold'
                                }}
                            >
                                현재 시간으로
                            </button>
                        )}
                        {/* GPS */}
                        <button onClick={handleGPS} style={{ padding: '4px', borderRadius: '4px', border: isGPSTracking ? '1px solid green' : '1px solid #ddd', background: isGPSTracking ? '#e8f5e9' : 'white' }}>
                            <Navigation size={14} color={isGPSTracking ? 'green' : '#666'} />
                        </button>
                        {/* Rotation */}
                        <button onClick={() => setUseDeviceCompass(!useDeviceCompass)} style={{ padding: '4px', borderRadius: '4px', border: useDeviceCompass ? '1px solid blue' : '1px solid #ddd', background: useDeviceCompass ? '#e3f2fd' : 'white' }}>
                            <RefreshCw size={14} color={useDeviceCompass ? 'blue' : '#666'} className={useDeviceCompass ? 'spin-anim' : ''} />
                        </button>
                        {/* Scale Lock */}
                        <button onClick={() => setScaleLocked(!isScaleLocked)} style={{ padding: '4px', borderRadius: '4px', border: isScaleLocked ? '1px solid red' : '1px solid #ddd', background: isScaleLocked ? '#ffebee' : 'white' }}>
                            <Lock size={14} color={isScaleLocked ? 'red' : '#666'} />
                        </button>
                        {/* Rounding Toggle */}
                        <button
                            onClick={() => updateSettings({ scorePrecision: settings.scorePrecision === 'high' ? 'low' : 'high' })}
                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd', background: settings.scorePrecision === 'low' ? '#f0f0f0' : 'white' }}
                        >
                            <Hash size={14} color={settings.scorePrecision === 'low' ? '#333' : '#666'} />
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {/* Year */}
                    <input type="number" value={currentTime.getFullYear()} onChange={e => { const d = new Date(currentTime); d.setFullYear(parseInt(e.target.value)); setCurrentTime(d); setIsTimeLocked(true); }} style={{ width: '100%', fontSize: '11px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }} />
                    {/* Month */}
                    <select value={currentTime.getMonth()} onChange={e => { const d = new Date(currentTime); d.setMonth(parseInt(e.target.value)); setCurrentTime(d); setIsTimeLocked(true); }} style={{ width: '100%', fontSize: '11px', padding: '0px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
                        {Array.from({ length: 12 }, (_, i) => i).map(m => <option key={m} value={m}>{m + 1}월</option>)}
                    </select>
                    {/* Day */}
                    <select value={currentTime.getDate()} onChange={e => { const d = new Date(currentTime); d.setDate(parseInt(e.target.value)); setCurrentTime(d); setIsTimeLocked(true); }} style={{ width: '100%', fontSize: '11px', padding: '0px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}일</option>)}
                    </select>
                    {/* Sijin (2-hour block) */}
                    <select value={Math.floor(currentTime.getHours() / 2)} onChange={e => { const d = new Date(currentTime); d.setHours(parseInt(e.target.value) * 2, 0, 0, 0); setCurrentTime(d); setIsTimeLocked(true); }} style={{ width: '100%', fontSize: '11px', padding: '0px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
                        {[
                            { n: '자시', t: '23-01' }, { n: '축시', t: '01-03' }, { n: '인시', t: '03-05' },
                            { n: '묘시', t: '05-07' }, { n: '진시', t: '07-09' }, { n: '사시', t: '09-11' },
                            { n: '오시', t: '11-13' }, { n: '미시', t: '13-15' }, { n: '신시', t: '15-17' },
                            { n: '유시', t: '17-19' }, { n: '술시', t: '19-21' }, { n: '해시', t: '21-23' }
                        ].map((s, i) => <option key={i} value={i}>{s.n}({s.t})</option>)}
                    </select>
                </div>
            </div>

            {/* 3. Info Panel & Register Toggle */}
            <div style={{ padding: '0 15px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', margin: '10px 0' }}>
                    <div style={{ background: '#fff0f0', padding: '6px', borderRadius: '6px', fontSize: '10px', border: '1px solid #ffccc7' }}>
                        <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>SOLAR: {solarTimeString}</div>
                        <div style={{ color: '#666' }}>Clock: {timeString}</div>
                    </div>
                    {result?.fengshui && (
                        <div style={{ background: '#fffbe6', padding: '6px', borderRadius: '6px', fontSize: '10px', border: '1px solid #ffe58f' }}>
                            <div style={{ color: '#d48806', fontWeight: 'bold' }}>SCORE: {result.fengshui.score.toFixed(2)}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Registration Form (Expanded) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 15px', background: '#fafafa' }}>
                {/* Modified Header: Active User & List Icon */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', background: '#e3f2fd', borderRadius: '8px',
                    marginBottom: '10px', border: '1px solid #bbdefb'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={16} color="#1976d2" />
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#0d47a1' }}>
                            {activeUser ? activeUser.name : 'Guest User'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => setIsRegExpanded(!isRegExpanded)} style={{ fontSize: '10px', padding: '4px 8px', background: '#fff', border: '1px solid #bbdefb', borderRadius: '12px', color: '#1976d2' }}>
                            {isRegExpanded ? 'Close Form' : '+ New'}
                        </button>
                        <button onClick={() => setShowUserListPopup(true)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                            <List size={20} color="#1565c0" />
                        </button>
                    </div>
                </div>

                {isRegExpanded && (
                    <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        {/* Name & Gender */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '5px', marginBottom: '8px' }}>
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" style={{ padding: '6px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} />
                            <select value={newGender} onChange={e => setNewGender(e.target.value as any)} style={{ padding: '6px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>

                        {/* Calendar Type */}
                        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                            {['solar', 'lunar', 'leap'].map(t => (
                                <button key={t} onClick={() => setNewCalendar(t as any)}
                                    style={{ flex: 1, padding: '4px', fontSize: '11px', borderRadius: '4px', border: newCalendar === t ? '1px solid #2196f3' : '1px solid #ddd', background: newCalendar === t ? '#e3f2fd' : 'white', color: newCalendar === t ? '#2196f3' : '#666' }}>
                                    {t.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Date: Y/M/D */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: '5px', marginBottom: '8px' }}>
                            <input type="number" value={newYear} onChange={e => setNewYear(parseInt(e.target.value))} placeholder="YYYY" style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }} />
                            <select value={newMonth} onChange={e => setNewMonth(parseInt(e.target.value))} style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}>
                                {Array.from({ length: 12 }, (_, i) => i).map(m => <option key={m} value={m}>{m + 1}월</option>)}
                            </select>
                            <select value={newDay} onChange={e => setNewDay(parseInt(e.target.value))} style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}일</option>)}
                            </select>
                        </div>

                        {/* Time: HH:mm */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px', padding: '0 4px', background: 'white' }}>
                                <span style={{ fontSize: '10px', color: '#999', marginRight: '4px' }}>Hour</span>
                                <select value={newHour} onChange={e => setNewHour(parseInt(e.target.value))} style={{ flex: 1, border: 'none', padding: '4px', textAlign: 'center' }}>
                                    {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px', padding: '0 4px', background: 'white' }}>
                                <span style={{ fontSize: '10px', color: '#999', marginRight: '4px' }}>Min</span>
                                <input type="number" value={newMinute} onChange={e => setNewMinute(parseInt(e.target.value))} style={{ flex: 1, border: 'none', padding: '4px', textAlign: 'center', width: '100%' }} />
                            </div>
                        </div>

                        {/* Birth Place */}
                        <div style={{ marginBottom: '10px' }}>
                            <button onClick={() => { setBirthLat(center.lat.toFixed(6)); setBirthLng(center.lng.toFixed(6)); setIsInputtingUser(true); }} style={{ width: '100%', padding: '6px', background: '#333', color: '#fff', fontSize: '11px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <MapPin size={12} /> Set Birth Place (Current Center)
                            </button>
                            <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                <input value={birthLat} readOnly style={{ flex: 1, fontSize: '10px', background: '#eee', border: 'none', padding: '4px' }} />
                                <input value={birthLng} readOnly style={{ flex: 1, fontSize: '10px', background: '#eee', border: 'none', padding: '4px' }} />
                            </div>
                        </div>

                        {/* Submit */}
                        <button onClick={handleRegister} style={{ width: '100%', padding: '10px', background: '#2196f3', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px' }}>
                            Register User
                        </button>
                    </div>
                )}

                {/* 5. User List (Always Visible) */}
                {/* 5. Logic Popup: User List */}
                {showUserListPopup && (
                    <>
                        <div style={{
                            position: 'fixed', bottom: '0', left: '0', right: '0',
                            background: 'white', borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
                            zIndex: 2000, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
                            boxShadow: '0 -4px 20px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>User List</h3>
                                <button onClick={() => setShowUserListPopup(false)} style={{ background: 'none', border: 'none' }}><X size={20} /></button>
                            </div>

                            <div style={{ padding: '10px 15px', overflowY: 'auto' }}>
                                {users.map(u => (
                                    <div key={u.id} onClick={() => { setActiveUser(u.id); setShowUserListPopup(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px', borderRadius: '8px', marginBottom: '8px',
                                            border: activeUserId === u.id ? '2px solid #2196f3' : '1px solid #eee',
                                            background: activeUserId === u.id ? '#e3f2fd' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: activeUserId === u.id ? '#1565c0' : '#333' }}>{u.name}</div>
                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                {new Date(u.birthDate).toLocaleDateString()} {new Date(u.birthDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete user ${u.name}?`)) removeUser(u.id);
                                        }} style={{ padding: '8px', background: '#ffebee', borderRadius: '50%', border: 'none', cursor: 'pointer' }}>
                                            <Trash2 size={16} color="#c62828" />
                                        </button>
                                    </div>
                                ))}
                                {users.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No Users Found</div>}

                                <button onClick={() => { setShowUserListPopup(false); setIsRegExpanded(true); }}
                                    style={{ width: '100%', padding: '12px', background: '#f5f5f5', border: '1px dashed #ccc', borderRadius: '8px', color: '#666', marginTop: '10px' }}>
                                    + Add New User
                                </button>
                            </div>
                        </div>
                        <div onClick={() => setShowUserListPopup(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1999, background: 'rgba(0,0,0,0.5)' }} />
                    </>
                )}
            </div>
        </div>
    );
};
