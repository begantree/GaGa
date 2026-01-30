// import React from 'react'; // Unused with new JSX transform

import { MapWrapper } from './core/MapWrapper';
import { TestControls } from './ui/TestControls';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <MapWrapper />
        <TestControls />
      </div>
    </ErrorBoundary>
  );
}

export default App;
