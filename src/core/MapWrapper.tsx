import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, CircleMarker } from 'react-leaflet';
import { useStore } from '../store/useStore';
import { Compass } from './Compass';
import { useLogicEngine } from '../logics/useLogicEngine';
import 'leaflet/dist/leaflet.css';

// Component to handle map events (Movement)
const MapEvents = () => {
    const map = useMapEvents({
        move: () => {
            const center = map.getCenter();
            // Direct store update for lag-free performance
            useStore.getState().setCenter(center.lat, center.lng);
        },
        // We can also sync zoom if needed
        zoom: () => {
            useStore.getState().setZoom(map.getZoom());
        }
    });

    // The useEffect block that previously synced storeCenter to map.setView is removed
    // because RecenterMap now handles external updates to the store's center.

    return null;
};

// [Visual] Show Golden Circle at User Birth Place
const BirthPlaceMarker = () => {
    const { users, activeUserId } = useStore();
    const user = users.find(u => u.id === activeUserId);

    if (!user || user.birthLat === undefined || user.birthLng === undefined) return null;

    return (
        <CircleMarker
            center={[user.birthLat, user.birthLng]}
            pathOptions={{
                color: '#FFD700',
                fillColor: '#FFD700',
                fillOpacity: 0.6,
                className: 'glowing-circle' // Custom CSS animation
            }}
            radius={12}
        />
    );
};

// [Visual] Show Target A and B Markers
const TargetMarkers = () => {
    const { targetA, targetB } = useStore();

    return (
        <>
            {targetA && (
                <CircleMarker
                    center={[targetA.lat, targetA.lng]}
                    pathOptions={{ color: '#2196f3', fillColor: '#2196f3', fillOpacity: 0.6 }}
                    radius={8}
                >
                </CircleMarker>
            )}
            {targetB && (
                <CircleMarker
                    center={[targetB.lat, targetB.lng]}
                    pathOptions={{ color: '#4caf50', fillColor: '#4caf50', fillOpacity: 0.6 }}
                    radius={8}
                >
                </CircleMarker>
            )}
        </>
    );
};

// [Fix] Component to programmatically move map when store center changes (e.g. GPS)
// [Fix] Component to programmatically move map when store center changes (e.g. GPS)
const RecenterMap = ({ center, zoom }: { center: { lat: number, lng: number }, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        const current = map.getCenter();
        const diffLat = Math.abs(current.lat - center.lat);
        const diffLng = Math.abs(current.lng - center.lng);
        // "FlyTo" for physical feel as requested
        if (diffLat > 0.00001 || diffLng > 0.00001) {
            map.flyTo([center.lat, center.lng], zoom, { animate: true, duration: 1.5 });
        }
    }, [center.lat, center.lng, zoom, map]);
    return null;
};

// [Fix] Scale Lock Handler
const ScaleLockHandler = () => {
    const map = useMap();
    const isScaleLocked = useStore(state => state.isScaleLocked);

    useEffect(() => {
        if (isScaleLocked) {
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            map.scrollWheelZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();
            if ((map as any).tap) (map as any).tap.disable();
        } else {
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
            map.scrollWheelZoom.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            if ((map as any).tap) (map as any).tap.enable();
        }
    }, [isScaleLocked, map]);

    return null;
};

// [Visual] Grounded Compass (Sticks to Map Coordinates) - Optimized with rAF
const GroundCompass = ({ position }: { position: { lat: number, lng: number } }) => {
    const map = useMap();
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frameId: number;

        const updatePosition = () => {
            if (containerRef.current) {
                const point = map.latLngToContainerPoint([position.lat, position.lng]);
                // Direct DOM manipulation for zero-lag sync
                containerRef.current.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
            }
            frameId = requestAnimationFrame(updatePosition);
        };

        // Start Loop
        updatePosition();

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, [map, position.lat, position.lng]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                // transform is handled by rAF
                zIndex: 450,
                pointerEvents: 'none',
                width: '0', height: '0', overflow: 'visible'
            }}
        >
            <div style={{ width: '80vmin', height: '80vmin', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass />
            </div>
        </div>
    );
};

export const MapWrapper = () => {
    const center = useStore((state) => state.center);
    const zoom = useStore((state) => state.zoom);
    const isInputtingUser = useStore((state) => state.isInputtingUser);
    const { targetLocation } = useLogicEngine(); // Get the active logic target

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={zoom}
                style={{ width: '100%', height: '100%', zIndex: 0 }}
                zoomControl={false} // Custom UI usually replaces stock controls
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                <MapEvents />
                <RecenterMap center={center} zoom={zoom} />
                <ScaleLockHandler />
                <BirthPlaceMarker />
                <TargetMarkers />

                {/* GROUND COMPASS: Only visible in Normal Mode */}
                {!isInputtingUser && <GroundCompass position={targetLocation} />}

            </MapContainer>

            {/* HUD COMPASS: Fixed to Screen Center. Only visible in Registration Mode */}
            {isInputtingUser && (
                // Re-use existing Compass overlay logic but scoped
                <Compass />
            )}
        </div>
    );
};
