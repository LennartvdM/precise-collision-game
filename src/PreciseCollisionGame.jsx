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
  const [debugMode, setDebugMode] = useState(false);
  const [autoPilot, setAutoPilot] = useState(false);
  const [conveyorSpeed, setConveyorSpeed] = useState(120);

  // Refs for animation and timing
  const gameAreaRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const packageSpeedRef = useRef(120);
  const minPackageIntervalRef = useRef(300);
  const maxPackageIntervalRef = useRef(1500);
  const baseSpawnRateRef = useRef(1000);
  const lastPackageTimeRef = useRef(0);
  const nextPackageTimeRef = useRef(0);
  const burstModeRef = useRef(false);
  const gravityRef = useRef(980); // pixels per second squared

  // Collision detection
  const logoWidthRef = useRef(80);
  const logoHitscanRef = useRef(null); // This is our inspection line
  const packageWidthRef = useRef(48);

  // Hover & wiggle states
  const [isHovered, setIsHovered] = useState(false);
  const [wiggleActive, setWiggleActive] = useState(false);

  // Floating notifications
  const [floatingHits, setFloatingHits] = useState([]);

  // Define 6 fixed positions for calm (countermeasure) notifications in two rough arcs
  const calmPositions = [
    { top: 40, left: 'calc(50% - 120px)' },
    { top: 60, left: 'calc(50% + 100px)' },
    { top: 80, left: 'calc(50% - 80px)' },
    { top: 100, left: 'calc(50% + 120px)' },
    { top: 120, left: 'calc(50% - 60px)' },
    { top: 140, left: 'calc(50% + 80px)' },
  ];
  const calmIndexRef = useRef(0);

  // Toggle flags
  const toggleDebugMode = () => setDebugMode((d) => !d);
  const toggleAutoPilot = () => {
    setAutoPilot((a) => {
      if (!a) {
        setScore((prev) => ({ ...prev, missed: 0 }));
      }
      return !a;
    });
  };

  // Handle logo hover: trigger wiggle once on mouse enter
  const handleLogoHover = (hovering) => {
    setIsHovered(hovering);
    if (hovering) {
      setWiggleActive(true);
    }
  };

  // Setup speed transition
  useEffect(() => {
    let animationId;
    let startTime;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      const targetSpeed = inspecting && !autoPilot ? 0 : 120;
      const duration = inspecting && !autoPilot ? 50 : 250;

      const progress = Math.min(elapsed / duration, 1);
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

  // Update inspection line (hitscan) on resize
  useEffect(() => {
    const updateLogoHitscan = () => {
      if (gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        // Use the center of the game area as the inspection line
        logoHitscanRef.current = rect.width / 2;
      }
    };
    updateLogoHitscan();
    window.addEventListener('resize', updateLogoHitscan);
    return () => window.removeEventListener('resize', updateLogoHitscan);
  }, []);

  // Handle logo click
  const handleLogoClick = () => {
    if (gameActive && !autoPilot) {
      setLogoPosition('down');
      setTimeout(() => setLogoPosition('up'), 200);
    }
  };

  // Handle wiggle animation end
  const handleWiggleEnd = (e) => {
    if (e.animationName === 'wiggleInner') {
      setWiggleActive(false);
    }
  };

  // Helper to spawn floating notifications
  const spawnHitIndicator = (isMalicious) => {
    if (!isMalicious) {
      // SAFE notification (arc style) lasting 5000ms
      const id = Date.now() + Math.random();
      setFloatingHits((curr) => [
        ...curr,
        {
          id,
          text: 'SAFE',
          color: 'text-green-500',
          styleType: 'arc',
          createdAt: Date.now(),
          xOffset: getRandomArcOffset(),
        },
      ]);
      setTimeout(() => {
        setFloatingHits((oldHits) => oldHits.filter((h) => h.id !== id));
      }, 5000);
      return;
    }

    // Malicious notification: spawn two notifications

    // 1) Red "THREAT" indicator (arc style) lasting 5000ms
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
    }, 5000);

    // 2) Calm pale purple countermeasure notification lasting 6000ms,
    // using fixed positions from calmPositions.
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
    const chosenPos = calmPositions[posIndex];
    calmIndexRef.current = (posIndex + 1) % calmPositions.length;
    setFloatingHits((curr) => [
      ...curr,
      {
        id: cmId,
        text: cmText,
        color: 'text-purple-300', // Pale purple
        styleType: 'calm',
        createdAt: Date.now(),
        top: chosenPos.top,
        left: chosenPos.left,
      },
    ]);
    setTimeout(() => {
      setFloatingHits((oldHits) => oldHits.filter((h) => h.id !== cmId));
    }, 6000);
  };

  // Helper for generating a random arc offset (for arc notifications)
  function getRandomArcOffset() {
    const angleDegrees = Math.random() * 30 - 15;
    const angleRad = (angleDegrees * Math.PI) / 180;
    const finalY = 70;
    return finalY * Math.tan(angleRad);
  }

  // Main game loop
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
            centerPoint: {
              x: -60 + packageWidthRef.current / 2,
              width: 4,
            },
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
        setPackages((prev) => {
          return prev
            .map((pkg) => {
              if (pkg.status === 'threat') {
                const horizontalSpeed = conveyorSpeed * 0.2;
                return {
                  ...pkg,
                  x: pkg.x + (horizontalSpeed * deltaTime) / 1000,
                };
              }
              const speed = conveyorSpeed;
              const newX = pkg.x + (speed * deltaTime) / 1000;
              const newCenterPoint = {
                ...pkg.centerPoint,
                x: newX + pkg.width / 2,
              };
              const inspLine = logoHitscanRef.current;
              if (pkg.status === 'unprocessed' && newX > inspLine) {
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
              return {
                ...pkg,
                x: newX,
                centerPoint: newCenterPoint,
              };
            })
            .filter((pkg) => {
              const now = Date.now();
              const packageAge = now - (pkg.creationTime || now);
              const lifetimeExceeded = packageAge > 13000;
              const isOffscreenX = pkg.x > window.innerWidth + 100;
              const isOffscreenY = pkg.status === 'threat' && pkg.y > 650;
              return !lifetimeExceeded && !isOffscreenX && !isOffscreenY;
            });
        });
      }

      // AutoPilot: automatically inspect packages at the inspection line
      if (autoPilot && !inspecting && gameActive && logoPosition === 'up') {
        const inspLine = logoHitscanRef.current;
        const unprocessed = packages.filter((p) => p.status === 'unprocessed');
        const toScan = unprocessed.filter((p) => {
          if (!p || !p.centerPoint) return false;
          const dist = Math.abs(p.centerPoint.x - inspLine);
          return dist <= 1;
        });
        if (toScan.length > 0) {
          toScan.sort((a, b) => {
            const aC = a.centerPoint.x;
            const bC = b.centerPoint.x;
            return Math.abs(inspLine - aC) - Math.abs(inspLine - bC);
          });
          setLogoPosition('down');
          setTimeout(() => setLogoPosition('up'), 150);
        }
      }

      // Manual inspection when logo is down
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
                ? {
                    ...pkg,
                    status: 'inspecting',
                    duckStartTime: Date.now(),
                    hideQuestionMark: true,
                  }
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
                    ? {
                        ...p,
                        status: 'threat',
                        inspectionTime: Date.now(),
                      }
                    : p
                );
              } else {
                setScore((sc) => ({ ...sc, safe: sc.safe + 1 }));
                spawnHitIndicator(false);
                return prevPack.map((p) =>
                  p.id === target.id
                    ? {
                        ...p,
                        status: 'safe',
                        safeRecoveryStart: Date.now(),
                      }
                    : p
                );
              }
            });
            setInspecting(false);
            setCurrentInspection(null);
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

  // Redesigned minimalist scoreboard with purple labels and extra bold text
const renderScoreboard = () => {
  return (
    <div className="absolute top-4 left-4 bg-gray-100 bg-opacity-80 p-3 rounded-sm flex flex-col gap-1 text-center">
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase font-extrabold text-purple-300">
          Safe
        </span>
        <span className="text-base font-medium text-green-500">
          {score.safe}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase font-extrabold text-purple-300">
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
        <span className="text-xs font-extrabold text-purple-500 uppercase">
          {autoPilot ? 'QUBE MODE' : 'MANUAL MODE'}
        </span>
      </div>
    </div>
  );
};


  const renderPackage = (pkg) => {
    let packageStyle = '';
    let packageText = '';
    let textColor = '';

    switch (pkg.status) {
      case 'safe':
        packageStyle = 'bg-green-200 border-2 border-green-500';
        packageText = 'SAFE';
        textColor = 'text-green-500';
        break;
      case 'threat':
        packageStyle = 'bg-red-200 border-2 border-red-500';
        packageText = 'THREAT';
        textColor = 'text-red-500';
        break;
      case 'missed':
        packageStyle = 'bg-yellow-200 border-2 border-yellow-500';
        packageText = 'MISSED';
        textColor = 'text-yellow-500';
        break;
      case 'inspecting':
        if (pkg.type === 'malicious') {
          packageStyle = 'bg-red-200 border border-red-400';
          packageText = '';
          textColor = 'text-red-400';
        } else {
          packageStyle = 'bg-green-200 border border-green-400';
          packageText = '';
          textColor = 'text-green-400';
        }
        break;
      case 'unprocessed':
      default:
        packageStyle = 'bg-purple-100 border border-purple-300';
        packageText = pkg.hideQuestionMark ? '' : '?';
        textColor = 'text-purple-800';
    }

    const animationClass =
      pkg.status === 'unprocessed' || pkg.status === 'missed'
        ? 'animate-twitch'
        : '';
    let extraClassName = '';

    if (pkg.status === 'threat' && pkg.inspectionTime) {
      const now = Date.now();
      const elapsed = (now - pkg.inspectionTime) / 1000;
      if (elapsed >= 0.15) {
        extraClassName += ' falling-threat';
      }
    }

    const getPackageStyles = () => {
      const styles = {
        left: `${pkg.x}px`,
        width: `${pkg.width}px`,
      };

      if (pkg.status === 'inspecting') {
        return {
          ...styles,
          top: '320px',
          transition: 'top 0.3s cubic-bezier(0.17, 0.67, 0.24, 0.99)',
        };
      } else if (pkg.status === 'safe') {
        return {
          ...styles,
          top: '290px',
          transition:
            'background-color 0.3s, top 0.8s cubic-bezier(0.34, 1.1, 0.64, 1.1)',
        };
      } else if (pkg.status === 'threat') {
        const now = Date.now();
        const elapsed = (now - pkg.inspectionTime) / 1000;
        if (elapsed < 0.15) {
          return {
            ...styles,
            top: '320px',
            transition: 'top 0.15s linear',
          };
        }
        return styles;
      }
      return { ...styles, top: '290px' };
    };

    return (
      <div
        key={pkg.id}
        className={`absolute h-10 rounded-md shadow-md flex items-center justify-center text-xs ${packageStyle} ${animationClass} ${extraClassName}`}
        style={{
          ...getPackageStyles(),
          '--random-delay': pkg.randomDelay || 0,
        }}
      >
        {debugMode && (
          <div
            className="absolute h-full bg-red-500 z-0"
            style={{
              left: '50%',
              marginLeft: `-${pkg.centerPoint?.width / 2 || 2}px`,
              width: `${pkg.centerPoint?.width || 4}px`,
              opacity: 0.7,
            }}
          ></div>
        )}

        {debugMode && (
          <div className="absolute h-full w-1 bg-gray-400 opacity-40 z-0" />
        )}

        <div className={`z-10 px-2 font-semibold ${textColor} relative`}>
          <div className={pkg.status === 'missed' && pkg.wasUnprocessed ? 'fade-in' : ''}>
            {packageText}
          </div>
        </div>
      </div>
    );
  };

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
        ></div>
      );
    }
    return null;
  };

  const renderCollisionDebug = () => {
    if (!debugMode) return null;
    const inspectionPoint = logoHitscanRef.current;
    return (
      <>
        <div
          className="absolute h-full w-0.5 bg-red-500 opacity-50 z-10"
          style={{ left: inspectionPoint }}
        >
          <div className="absolute top-2 left-2 text-xs bg-white px-2 py-1 rounded shadow-sm">
            Inspection Line
          </div>
        </div>
        <div
          className="absolute h-24 bg-blue-200 opacity-20 pointer-events-none"
          style={{
            top: '170px',
            left: inspectionPoint - logoWidthRef.current / 2,
            width: logoWidthRef.current,
          }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
            Click Detection Area
          </div>
        </div>
      </>
    );
  };

  const renderFloatingHits = () => {
    // Arc notifications will align to the inspection line
    const inspectionPoint = logoHitscanRef.current || 0;
    const arcTopPos = '120px';

    return floatingHits.map((hit) => {
      if (hit.styleType === 'arc') {
        return (
          <div
            key={hit.id}
            className={`absolute arc-float text-lg font-bold ${hit.color}`}
            style={{
              top: arcTopPos,
              left: `${inspectionPoint}px`,
              transform: 'translateX(-50%)',
              '--float-x': `${hit.xOffset}px`,
            }}
          >
            {hit.text}
          </div>
        );
      } else {
        // Calm notifications use their fixed positions (from calmPositions)
        return (
          <div
            key={hit.id}
            className={`absolute calm-float text-md font-semibold ${hit.color}`}
            style={{
              top: `${hit.top}px`,
              left: hit.left,
            }}
          >
            {hit.text}
          </div>
        );
      }
    });
  };

  return (
    <div className="flex justify-center items-center w-full bg-gray-50">
      <style jsx>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bob { animation: bob 2s ease-in-out infinite; }
        @keyframes bobIntense {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bob-intense { animation: bobIntense 1.2s ease-in-out infinite; }
        @keyframes verticalRattle {
          0%, 15%, 35%, 60%, 85%, 100% { transform: translateY(0); }
          7% { transform: translateY(-3px); }
          10% { transform: translateY(4px); }
          12% { transform: translateY(-2px); }
          28% { transform: translateY(3px); }
          32% { transform: translateY(-2px); }
          53% { transform: translateY(-3px); }
          57% { transform: translateY(4px); }
          78% { transform: translateY(3px); }
          82% { transform: translateY(-2px); }
        }
        .animate-twitch {
          animation: verticalRattle 3.5s ease-in-out infinite;
          animation-delay: calc(var(--random-delay) * -3.5s);
        }
        @keyframes wiggleInner {
          0% { transform: rotate(0deg); }
          35% { transform: rotate(2.5deg); }
          65% { transform: rotate(-1.8deg); }
          85% { transform: rotate(0.8deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-wiggle-inner { animation: wiggleInner 1.1s ease-in-out 1; }
        @keyframes fallAnimation {
          0% { top: 320px; transform: rotate(0deg); }
          100% { top: 600px; transform: rotate(45deg); }
        }
        .falling-threat { animation: fallAnimation 2s ease-in forwards; }
        @keyframes fadeTransition {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .fade-in { animation: fadeTransition 0.4s ease-in forwards; animation-play-state: running; }
        @keyframes pulseSubtle {
          0%, 100% { background-color: #6b21a8; }
          50% { background-color: #9333ea; }
        }
        .animate-pulse-subtle { animation: pulseSubtle 1.2s ease-in-out infinite; }
        @keyframes floatArcRand {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(calc(var(--float-x) * 0.5), -35px) scale(1.1);
          }
          100% {
            transform: translate(var(--float-x), -70px) scale(0.9);
            opacity: 0;
          }
        }
        .arc-float { animation: floatArcRand 5s ease-out forwards; }
        @keyframes calmFloat {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          50% { opacity: 1; transform: translate(-50%, 0px); }
          80% { opacity: 1; transform: translate(-50%, 0px); }
          100% { opacity: 0; transform: translate(-50%, 0px); }
        }
        .calm-float { animation: calmFloat 6s ease forwards; }
      `}</style>

      <div
        className="relative w-full max-w-4xl mx-auto bg-gray-50 overflow-hidden"
        style={{ height: '500px' }}
        ref={gameAreaRef}
      >
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
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
          <button
            onClick={toggleAutoPilot}
            className={`px-4 py-2 rounded-lg shadow-md font-medium text-white ${
              autoPilot
                ? 'bg-purple-800 animate-pulse-subtle'
                : 'bg-purple-600'
            }`}
          >
            QUBE MODE
          </button>
        </div>

        {debugMode && (
          <div className="absolute bottom-4 right-4 bg-white px-2 py-1 rounded text-xs">
            Speed: {Math.round(conveyorSpeed)}
          </div>
        )}

        {renderScoreboard()}

        <div ref={gameAreaRef} className="relative w-full h-full">
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

          {debugMode && logoHitscanRef.current && (
            <div
              className="absolute h-full w-0.5 bg-purple-500 opacity-30 z-0"
              style={{ left: logoHitscanRef.current }}
            ></div>
          )}

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
