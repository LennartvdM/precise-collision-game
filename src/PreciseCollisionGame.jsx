import React, { useState, useEffect, useRef } from 'react';
import Logo from './Logo';

const PreciseCollisionGame = () => {
  // Game state
  const [score, setScore] = useState({ safe: 0, malicious: 0, missed: 0 });
  const [logoPosition, setLogoPosition] = useState('up');
  const [packages, setPackages] = useState([]);
  const [gameActive, setGameActive] = useState(true);
  const [inspecting, setInspecting] = useState(false);
  const [currentInspection, setCurrentInspection] = useState(null);

  // Debug / Autopilot states
  const [debugMode, setDebugMode] = useState(false);
  const [autoPilot, setAutoPilot] = useState(false);

  // Hide/unhide debug button
  const [debugHidden, setDebugHidden] = useState(true); // Hidden on start

  const [conveyorSpeed, setConveyorSpeed] = useState(120);

  // Refs for animation and timing
  const gameAreaRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const packageSpeedRef = useRef(120);
  const nextPackageTimeRef = useRef(0);
  const burstModeRef = useRef(false);

  // Collision detection
  const logoWidthRef = useRef(80);
  const logoHitscanRef = useRef(null);
  const packageWidthRef = useRef(48);

  // Hover & wiggle states
  const [isHovered, setIsHovered] = useState(false);
  const [wiggleActive, setWiggleActive] = useState(false);

  // Floating notifications
  const [floatingHits, setFloatingHits] = useState([]);

  // Calm notifications positions
  const calmPositions = [
    { top: 40, left: 'calc(50% - 120px)' },
    { top: 60, left: 'calc(50% + 100px)' },
    { top: 80, left: 'calc(50% - 80px)' },
    { top: 100, left: 'calc(50% + 120px)' },
    { top: 120, left: 'calc(50% - 60px)' },
    { top: 140, left: 'calc(50% + 80px)' },
  ];
  const calmIndexRef = useRef(0);

  // Triple-click tracking on "Threats"
  const threatsClickRef = useRef(0);

  // Toggle debug mode
  const toggleDebugMode = () => setDebugMode((d) => !d);

  // Toggle QUBE MODE
  const toggleAutoPilot = () => {
    setAutoPilot((a) => {
      // Reset missed to 0 whenever we enable QUBE MODE
      if (!a) {
        setScore((prev) => ({ ...prev, missed: 0 }));
      }
      return !a;
    });
  };

  // Handle triple-click on "Threats"
  const handleThreatsLabelClick = () => {
    threatsClickRef.current++;
    if (threatsClickRef.current >= 3) {
      threatsClickRef.current = 0;
      setDebugHidden((prev) => !prev);
    }
  };

  // Handle logo hover
  const handleLogoHover = (hovering) => {
    setIsHovered(hovering);
    if (hovering) setWiggleActive(true);
  };

  // Handle logo click
  const handleLogoClick = () => {
    // If QUBE MODE is active, disable it immediately and revert to manual
    if (autoPilot) {
      setAutoPilot(false);
    } else if (gameActive) {
      setLogoPosition('down');
      setTimeout(() => setLogoPosition('up'), 200);
    }
  };

  // Wiggle animation end
  const handleWiggleEnd = (e) => {
    if (e.animationName === 'wiggleInner') {
      setWiggleActive(false);
    }
  };

  // Example spawnHitIndicator function
  const spawnHitIndicator = (isMalicious) => {
    // ...
  };

  // Example main game loop
  useEffect(() => {
    const gameLoop = (timestamp) => {
      // ...
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameActive, inspecting, logoPosition, packages, autoPilot, conveyorSpeed]);

  // Scoreboard with hidden debug logic
  const renderScoreboard = () => {
    return (
      <div
        className="absolute top-4 left-4 bg-gray-100 bg-opacity-80 p-3 rounded-sm flex flex-col gap-1 text-center"
        style={{ width: '180px' }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase font-extrabold text-purple-300">
            Safe
          </span>
          <span className="text-base font-medium text-green-500">
            {score.safe}
          </span>
        </div>

        {/* "Threats" label becomes the hidden click target */}
        <div className="flex justify-between items-center">
          <span
            className="text-xs uppercase font-extrabold text-purple-300 cursor-pointer"
            onClick={handleThreatsLabelClick}
            title="Click me 3 times..."
          >
            Threats
          </span>
          <span className="text-base font-medium text-red-500">
            {score.malicious}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs uppercase font-extrabold text-purple-300">
            Missed
          </span>
          <span className="text-base font-medium text-yellow-500">
            {score.missed}
          </span>
        </div>

        <div className="mt-1">
          <span className="text-xs font-extrabold text-purple-300 uppercase">
            {autoPilot ? 'QUBE MODE ACTIVE' : 'MANUAL MODE'}
          </span>
        </div>
      </div>
    );
  };

  // Example of rendering packages
  const renderPackage = (pkg) => {
    // ...
  };

  // Example of collision debug
  const renderCollisionDebug = () => {
    if (!debugMode) return null;
    return <div> {/* Debug visuals here... */} </div>;
  };

  // Example of floating hits
  const renderFloatingHits = () => {
    // ...
  };

  // Example inspection beam
  const renderInspectionBeam = () => {
    // ...
  };

  return (
    <div className="flex justify-center items-center w-full bg-gray-50">
      <style jsx>{`
        /* Your animations and styles here */
      `}</style>

      <div
        className="relative w-full max-w-4xl mx-auto bg-gray-50 overflow-hidden"
        style={{ height: '500px' }}
        ref={gameAreaRef}
      >
        {/* Top-right buttons */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          {/* Only render the debug button if debugHidden == false */}
          {!debugHidden && (
            <button
              onClick={toggleDebugMode}
              className={`px-4 py-2 rounded-lg shadow-md font-medium ${
                debugMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-700 border border-purple-200'
              }`}
            >
              {debugMode ? 'Debug Mode: ON' : 'Debug Mode: OFF'}
            </button>
          )}
          <button
            onClick={toggleAutoPilot}
            className={`px-4 py-2 rounded-lg shadow-md font-medium text-white ${
              autoPilot ? 'bg-purple-800 animate-pulse-subtle' : 'bg-purple-600'
            }`}
          >
            QUBE MODE
          </button>
        </div>

        {/* Scoreboard */}
        {renderScoreboard()}

        <div className="relative w-full h-full">
          {/* Example conveyor belt */}
          <div
            className={`absolute h-5 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full ${
              inspecting && !autoPilot
                ? 'opacity-50 border-2 border-red-300'
                : 'opacity-100'
            }`}
            style={{
              top: '300px',
              transition:
                'opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), border 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              left: '50px',
              right: '50px',
            }}
          ></div>

          {renderCollisionDebug()}

          <Logo
            logoPosition={logoPosition}
            isHovered={isHovered}
            wiggleActive={wiggleActive}
            autoPilot={autoPilot}
            handleClick={handleLogoClick}
            handleMouseEnter={() => handleLogoHover(true)}
            handleMouseLeave={() => handleLogoHover(false)}
            handleAnimationEnd={handleWiggleEnd}
            logoWidth={logoWidthRef.current}
          />

          {renderInspectionBeam()}
          {packages.map(renderPackage)}
          {renderFloatingHits()}
        </div>
      </div>
    </div>
  );
};

export default PreciseCollisionGame;
