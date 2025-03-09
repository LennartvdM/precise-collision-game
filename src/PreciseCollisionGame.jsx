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

  // Debug / Autopilot
  const [debugMode, setDebugMode] = useState(false);
  const [autoPilot, setAutoPilot] = useState(false);

  // Hide/unhide debug button
  const [debugHidden, setDebugHidden] = useState(true);

  // Conveyor speed
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

  // All floating notifications
  const [floatingHits, setFloatingHits] = useState([]);

  // Calm positions (not strictly needed if we’re bounding them in a box, 
  // but you can still use them for ordering or extra logic)
  const calmPositions = [
    { top: 40, left: 'calc(50% + 300px)' },
    { top: 60, left: 'calc(50% + 300px)' },
    { top: 80, left: 'calc(50% + 300px)' },
    { top: 100, left: 'calc(50% + 300px)' },
    // ... add as many as you need
  ];
  const calmIndexRef = useRef(0);

  // For the hidden debug button triple-click trick
  const threatsClickRef = useRef(0);

  // ========== Basic Toggles ==========

  const toggleDebugMode = () => setDebugMode((d) => !d);

  const toggleAutoPilot = () => {
    setAutoPilot((a) => {
      if (!a) {
        // reset missed if we switch to autopilot
        setScore((prev) => ({ ...prev, missed: 0 }));
      }
      return !a;
    });
  };

  // ========== Handling Triple-Click on Threats ==========

  const handleThreatsLabelClick = () => {
    threatsClickRef.current++;
    if (threatsClickRef.current >= 3) {
      threatsClickRef.current = 0;
      setDebugHidden((prev) => !prev);
    }
  };

  // ========== Logo Hover & Click ==========

  const handleLogoHover = (hovering) => {
    setIsHovered(hovering);
    if (hovering) {
      setWiggleActive(true);
    }
  };

  const handleLogoClick = () => {
    if (autoPilot) {
      setAutoPilot(false);
    } else if (gameActive) {
      setLogoPosition('down');
      setTimeout(() => setLogoPosition('up'), 200);
    }
  };

  const handleWiggleEnd = (e) => {
    if (e.animationName === 'wiggleInner') {
      setWiggleActive(false);
    }
  };

  // ========== Basic Spawn & Movement Logic ==========

  useEffect(() => {
    // example speed transition
    let animationId;
    let startTime;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      const targetSpeed = inspecting && !autoPilot ? 0 : 120;
      const duration = inspecting && !autoPilot ? 50 : 250;

      const progress = Math.min(elapsed / duration, 1);
      // Ease in/out
      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const startSpeed = inspecting && !autoPilot ? 120 : 0;
      const newSpeed = startSpeed + (targetSpeed - startSpeed) * eased;

      setConveyorSpeed(newSpeed);
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [inspecting, autoPilot]);

  // Update inspection line on resize
  useEffect(() => {
    const updateLogoHitscan = () => {
      if (gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        logoHitscanRef.current = rect.width / 2;
      }
    };
    updateLogoHitscan();
    window.addEventListener('resize', updateLogoHitscan);
    return () => window.removeEventListener('resize', updateLogoHitscan);
  }, []);

  // ========== Example Autopilot "Precise Duck" ==========

  function schedulePreciseDuck(target) {
    const inspLine = logoHitscanRef.current;
    if (!inspLine || !target || !target.centerPoint) return;

    const dist = Math.abs(target.centerPoint.x - inspLine);
    const speedPxPerSec = conveyorSpeed;
    const timeToCenterMs = (dist / speedPxPerSec) * 1000;
    const offsetMs = 30;
    const plannedDuckTime = Math.max(0, timeToCenterMs - offsetMs);

    setTimeout(() => {
      if (!autoPilot || inspecting || logoPosition !== 'up') return;
      setLogoPosition('down');
    }, plannedDuckTime);
  }

  // ========== Example Spawn of "SAFE"/"THREAT"/"Calm" Notifications ==========

  const spawnHitIndicator = (isMalicious) => {
    if (!isMalicious) {
      // SAFE
      const id = Date.now() + Math.random();
      setFloatingHits((curr) => [
        ...curr,
        {
          id,
          text: 'SAFE',
          color: 'text-green-500',
          styleType: 'arc',  // We'll separate arc vs calm
          createdAt: Date.now(),
          xOffset: getRandomArcOffset(),
        },
      ]);
      setTimeout(() => {
        setFloatingHits((oldHits) => oldHits.filter((h) => h.id !== id));
      }, 10000);
      return;
    }

    // THREAT
    const threatId = Date.now() + Math.random();
    setFloatingHits((curr) => [
      ...curr,
      {
        id: threatId,
        text: 'THREAT',
        color: 'text-red-500',
        styleType: 'arc',
        createdAt: Date.now(),
        xOffset: getRandomArcOffset(),
      },
    ]);
    setTimeout(() => {
      setFloatingHits((oldHits) => oldHits.filter((h) => h.id !== threatId));
    }, 10000);

    // Calm
    const cmId = Date.now() + Math.random();
    const countermeasures = [
      'SQL Injection',
      'XSS Attack',
      'Bot',
      'Command Injection',
      'Traffic Spike',
      'Fake Account',
      'Credential Stuffing',
      'Web Scraping',
      'Click Fraud',
      'Click Farming',
      'DDoS',
      'Brute-Force Login',
      'Proxy',
      'VPN',
      'Path Traversal',
      'SSRF Attack',
      'Token Verified',
      'Security Alert',
    ];
    const cmText =
      countermeasures[Math.floor(Math.random() * countermeasures.length)];
    const posIndex = calmIndexRef.current;
    calmIndexRef.current = (posIndex + 1) % calmPositions.length;

    setFloatingHits((curr) => [
      ...curr,
      {
        id: cmId,
        text: cmText,
        color: 'text-purple-300',
        styleType: 'calm',
        createdAt: Date.now(),
      },
    ]);
    setTimeout(() => {
      setFloatingHits((oldHits) => oldHits.filter((h) => h.id !== cmId));
    }, 6000);
  };

  function getRandomArcOffset() {
    const angleDegrees = Math.random() * 120 - 60; // -60..60
    const angleRad = (angleDegrees * Math.PI) / 180;
    const finalY = 140;
    return finalY * Math.tan(angleRad);
  }

  // ========== Main Game Loop ==========

  useEffect(() => {
    const gameLoop = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Spawn packages
      if (timestamp >= nextPackageTimeRef.current && gameActive) {
        const lastPackage = packages[packages.length - 1];
        const minDist = packageWidthRef.current + 5;
        const canSpawn = !lastPackage || lastPackage.x > minDist;
        if (canSpawn) {
          const isMalicious = Math.random() < 0.4;
          const newPackage = {
            id: Date.now(),
            x: -60,
            y: 290,
            width: packageWidthRef.current,
            isMalicious,
            type: isMalicious ? 'malicious' : 'safe',
            status: 'unprocessed',
            centerPoint: { x: -60 + packageWidthRef.current / 2, width: 4 },
            randomDelay: Math.random(),
            velocity: 0,
            creationTime: Date.now(),
          };
          setPackages((p) => [...p, newPackage]);

          if (!burstModeRef.current || burstModeRef.current.remaining <= 0) {
            const comboSize = Math.floor(Math.random() * 4) + 1;
            burstModeRef.current = {
              remaining: comboSize,
              intraComboDelay: 10 + Math.random() * 15,
              postComboDelay: 1200 + Math.random() * 1800,
            };
          }

          let nextInterval;
          if (burstModeRef.current.remaining > 1) {
            nextInterval = burstModeRef.current.intraComboDelay;
          } else {
            nextInterval = burstModeRef.current.postComboDelay;
          }
          burstModeRef.current.remaining--;
          const minTime = (minDist / packageSpeedRef.current) * 1000;
          nextInterval = Math.max(minTime, nextInterval);
          nextPackageTimeRef.current = timestamp + nextInterval;
        } else {
          nextPackageTimeRef.current = timestamp + 50;
        }
      }

      // Move packages
      if (!inspecting || autoPilot) {
        setPackages((prev) =>
          prev
            .map((pkg) => {
              if (pkg.status === 'threat') {
                const horizontalSpeed = conveyorSpeed * 0.2;
                return { ...pkg, x: pkg.x + (horizontalSpeed * deltaTime) / 1000 };
              }
              const speed = conveyorSpeed;
              const newX = pkg.x + (speed * deltaTime) / 1000;
              const newCenterPoint = { ...pkg.centerPoint, x: newX + pkg.width / 2 };
              const inspLine = logoHitscanRef.current;
              if (!autoPilot && pkg.status === 'unprocessed' && newX > inspLine) {
                if (pkg.type === 'malicious') {
                  setScore((s) => ({ ...s, missed: s.missed + 1 }));
                }
                return {
                  ...pkg,
                  x: newX,
                  centerPoint: newCenterPoint,
                  status: 'missed',
                  missedTime: Date.now(),
                  wasUnprocessed: true,
                  originalText: '?',
                };
              }
              return { ...pkg, x: newX, centerPoint: newCenterPoint };
            })
            .filter((pkg) => {
              const now = Date.now();
              const packageAge = now - (pkg.creationTime || now);
              const lifetimeExceeded = packageAge > 13000;
              const isOffscreenX = pkg.x > window.innerWidth + 100;
              const isOffscreenY = pkg.status === 'threat' && pkg.y > 650;
              return !lifetimeExceeded && !isOffscreenX && !isOffscreenY;
            })
        );
      }

      // Autopilot
      if (autoPilot && !inspecting && gameActive && logoPosition === 'up') {
        const inspLine = logoHitscanRef.current;
        const unprocessed = packages.filter((p) => p.status === 'unprocessed');
        const toScan = unprocessed.filter((p) => {
          if (!p || !p.centerPoint) return false;
          const dist = Math.abs(p.centerPoint.x - inspLine);
          return dist <= 80;
        });
        if (toScan.length > 0) {
          toScan.sort((a, b) => {
            const aC = a.centerPoint.x;
            const bC = b.centerPoint.x;
            return Math.abs(inspLine - aC) - Math.abs(inspLine - bC);
          });
          schedulePreciseDuck(toScan[0]);
        }
      }

      // Shared scanning
      if (logoPosition === 'down' && !inspecting) {
        const inspLine = logoHitscanRef.current;
        const toInspect = packages.filter((p) => {
          if (p.status !== 'unprocessed') return false;
          const left = p.x;
          const right = p.x + p.width;
          return left <= inspLine && right >= inspLine;
        });
        if (toInspect.length > 0) {
          const target = toInspect[0];
          setInspecting(true);
          setCurrentInspection({ ...target });
          setPackages((prev) =>
            prev.map((pkg) =>
              pkg.id === target.id
                ? { ...pkg, status: 'inspecting', hideQuestionMark: true }
                : pkg
            )
          );
          setTimeout(() => {
            setPackages((prevPack) => {
              const currentPackage = prevPack.find((p) => p.id === target.id);
              if (!currentPackage) return prevPack;
              const isMal = currentPackage.type === 'malicious';
              if (isMal) {
                setScore((sc) => ({ ...sc, malicious: sc.malicious + 1 }));
                spawnHitIndicator(true);
                return prevPack.map((p) =>
                  p.id === target.id
                    ? { ...p, status: 'threat', inspectionTime: Date.now() }
                    : p
                );
              } else {
                setScore((sc) => ({ ...sc, safe: sc.safe + 1 }));
                spawnHitIndicator(false);
                return prevPack.map((p) =>
                  p.id === target.id
                    ? { ...p, status: 'safe' }
                    : p
                );
              }
            });
            setInspecting(false);
            setCurrentInspection(null);
            setLogoPosition('up');
          }, 350);
        }
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameActive, inspecting, logoPosition, packages, autoPilot, conveyorSpeed]);

  // ========== Rendering the Scoreboard ==========

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
        <div className="flex justify-between items-center">
          <span
            className="text-xs uppercase font-extrabold text-purple-300 cursor-pointer pointer-events-auto"
            onClick={handleThreatsLabelClick}
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

  // ========== Rendering Packages ==========

  const renderPackage = (pkg) => {
    // (Unchanged from earlier code)
    // ...
  };

  // ========== Rendering Collision Debug ==========

  const renderCollisionDebug = () => {
    if (!debugMode) return null;
    // ...
  };

  // ========== Rendering Inspection Beam ==========

  const renderInspectionBeam = () => {
    if (inspecting && currentInspection) {
      return (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 rounded-full bg-purple-300 animate-ping"
          style={{
            top: '290px',
            width: '20px',
            height: '20px',
            marginLeft: '-10px',
            opacity: 0.6,
          }}
        />
      );
    }
    return null;
  };

  // ========== Separating Arc Hits & Calm Hits ==========

  // 1) Arc hits (SAFE/THREAT)
  const arcHits = floatingHits.filter((hit) => hit.styleType === 'arc');

  // 2) Calm hits (countermeasures)
  const calmHits = floatingHits.filter((hit) => hit.styleType === 'calm');

  // ========== Rendering Arc Hits (center pop-ups) ==========

  const renderArcHits = () => {
    const inspectionPoint = logoHitscanRef.current || 0;
    const arcTopPos = '120px';

    return arcHits.map((hit) => (
      <div
        key={hit.id}
        className={`absolute arc-float text-lg font-bold ${hit.color}`}
        style={{
          top: arcTopPos,
          left: `${inspectionPoint}px`,
          '--float-x': `${hit.xOffset || 0}px`,
        }}
      >
        {hit.text}
      </div>
    ));
  };

  // ========== Rendering Calm Hits in a Bounded Box ==========

  const renderCalmHitsBox = () => {
    // We'll place a bounding box on the right side, 
    // with a dashed border for clarity
    return (
      <div
        className="absolute border-2 border-dashed border-purple-500 pointer-events-none"
        style={{
          top: '80px',
          right: '50px',
          width: '220px',
          height: '280px',
          position: 'absolute',
        }}
      >
        {/* We'll position these hits relative to this container */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {calmHits.map((hit, index) => (
            <div
              key={hit.id}
              style={{
                position: 'absolute',
                top: `${index * 30}px`,   // stack them vertically
                left: '10px',
              }}
              className="text-md font-semibold text-purple-300"
            >
              {hit.text}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ========== Putting It All Together ==========

  return (
    <div className="flex justify-center items-center w-full bg-gray-50">
      <style jsx>{`
        /* Keyframes, animations, etc. from your existing code */
      `}</style>

      <div
        className="relative w-full max-w-4xl mx-auto bg-gray-50 overflow-hidden"
        style={{ height: '500px' }}
        ref={gameAreaRef}
      >
        {/* Top-right buttons */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
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

        {renderScoreboard()}

        <div className="relative w-full h-full">
          {/* Conveyor belt */}
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
          {/* Render the central arc hits normally */}
          {renderArcHits()}
          {/* Render the calm hits in a bounding box on the right */}
          {renderCalmHitsBox()}

          {/* Render the packages, etc. */}
          {packages.map(renderPackage)}
        </div>
      </div>
    </div>
  );
};

export default PreciseCollisionGame;
