import React, { useState, useEffect, useRef } from 'react';
import Logo from './Logo';
import {
  DEFAULT_CONFIG as DEFAULT_SPRING_CONFIG,
  createSpringState,
  getTension,
  onDrag,
  onGrab,
  onRelease,
  stepSpring,
} from './physics/rubberBandLogo';

const DEFAULT_LAYOUT = {
  containerHeight: 500,
  beltTop: 300,
  packageTrackTop: 290,
  packageInspectingTop: 320,
  threatDropTop: 320,
  inspectionBeamTop: 290,
  arcTop: 120,
  logoBaseTopUp: 180,
  logoBaseTopDown: 240,
  catapultPullDirection: -1,
  gestureForceDirection: 1,
  collisionAreaTop: 170,
  collisionAreaHeight: 96,
  maxGestureOffset: 130,
  catapultScaleMultiplier: 0.45,
};

const TOUCH_LAYOUT = {
  containerHeight: 640,
  beltTop: 300,
  packageTrackTop: 290,
  packageInspectingTop: 320,
  threatDropTop: 320,
  inspectionBeamTop: 285,
  arcTop: 150,
  logoBaseTopUp: 450,
  logoBaseTopDown: 520,
  catapultPullDirection: 1,
  gestureForceDirection: -1,
  collisionAreaTop: 240,
  collisionAreaHeight: 120,
  maxGestureOffset: 240,
  catapultScaleMultiplier: 1,
};

const TOUCH_SPRING_TUNING = {
  k: 190,
  c: 14,
  mass: 1,
  gravity: 820,
};

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

  // Hide/unhide the debug button
  const [debugHidden, setDebugHidden] = useState(true);

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
  const touchStateRef = useRef({
    active: false,
    startY: 0,
    startTime: 0,
    lastY: 0,
    lastTime: 0,
    maxDownPull: 0,
    fastestUpwardVelocity: 0,
  });
  const returnTimeoutRef = useRef(null);
  const inspectingRef = useRef(false);
  const springStateRef = useRef(null);
  const springConfigRef = useRef(null);
  const springAnimationRef = useRef(null);
  const springLastTimeRef = useRef(null);

  // Hover & wiggle states
  const [isHovered, setIsHovered] = useState(false);
  const [wiggleActive, setWiggleActive] = useState(false);

  // Floating notifications
  const [floatingHits, setFloatingHits] = useState([]);
  const [catapultPull, setCatapultPull] = useState(0);
  const [gestureForce, setGestureForce] = useState(0);
  const [isTouchLayout, setIsTouchLayout] = useState(false);
  const [isTouchPressing, setIsTouchPressing] = useState(false);
  const [springY, setSpringY] = useState(null);
  const [springTension, setSpringTension] = useState(0);

 // Each entry has the same width (80px) and starts at top=170, 
// just like your click area, but shifted left/right by 80px.

const calmPositions = [
  // Left column (unchanged, 80px wide)
  { top: 170, left: 'calc(50% - 140px)' },
  { top: 200, left: 'calc(50% - 140px)' },
  { top: 230, left: 'calc(50% - 140px)' },

  // Right column (shifted an extra 40px to the right)
  // Now spans from (50% + 80px) to (50% + 160px)
  { top: 170, left: 'calc(50% + 140px)' },
  { top: 200, left: 'calc(50% + 140px)' },
  { top: 230, left: 'calc(50% + 140px)' },
];




  const calmIndexRef = useRef(0);
  const layoutSettings = isTouchLayout ? TOUCH_LAYOUT : DEFAULT_LAYOUT;

  // Track clicks on "Threats" label for a hidden debug button
  const threatsClickRef = useRef(0);

  // Toggle debug mode
  const toggleDebugMode = () => setDebugMode((d) => !d);

  // Toggle QUBE MODE
  const toggleAutoPilot = () => {
    setAutoPilot((prev) => {
      if (!prev) {
        // Reset missed if enabling autopilot
        setScore((s) => ({ ...s, missed: 0 }));
      }
      return !prev;
    });
  };

  // Handle triple-click on "Threats" label
  const handleThreatsLabelClick = () => {
    threatsClickRef.current++;
    if (threatsClickRef.current >= 3) {
      threatsClickRef.current = 0;
      setDebugHidden((oldVal) => !oldVal);
    }
  };

  // Handle logo hover
  const handleLogoHover = (hovering) => {
    setIsHovered(hovering);
    if (hovering) setWiggleActive(true);
  };

  const getNow = () =>
    typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();

  const scheduleLogoReset = (duration = 220) => {
    if (isTouchLayout) return;
    if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
    returnTimeoutRef.current = setTimeout(() => {
      if (inspectingRef.current) {
        scheduleLogoReset(120);
        return;
      }
      setGestureForce(0);
      setLogoPosition('up');
    }, duration);
  };

  const launchLogoWithForce = ({ impactBoost = 0, hold = 220 } = {}) => {
    if (isTouchLayout) return;
    if (!gameActive) return;
    if (autoPilot) setAutoPilot(false);
    setLogoPosition('down');
    setGestureForce(Math.max(0, Math.min(impactBoost, 160)));
    scheduleLogoReset(Math.max(180, hold));
  };

  const resetTouchState = () => {
    touchStateRef.current = {
      active: false,
      startY: 0,
      startTime: 0,
      lastY: 0,
      lastTime: 0,
      lastVelocity: 0,
    };
    setIsTouchPressing(false);
  };

  // Logo click logic
  const handleLogoClick = () => {
    launchLogoWithForce({ impactBoost: 18, hold: 210 });
  };

  const handleLogoTouchStart = (event) => {
    if (!isTouchLayout || event.touches.length !== 1) return;
    if (inspectingRef.current) return;
    const touch = event.touches[0];
    const now = getNow();
    const rect = gameAreaRef.current?.getBoundingClientRect();
    const fingerY = rect ? touch.clientY - rect.top : touch.clientY;

    const restY = layoutSettings.logoBaseTopUp;
    springConfigRef.current = {
      ...DEFAULT_SPRING_CONFIG,
      ...TOUCH_SPRING_TUNING,
      restY,
      beltY: layoutSettings.beltTop,
      maxPullDistance: layoutSettings.maxGestureOffset,
    };
    if (!springStateRef.current) {
      springStateRef.current = createSpringState(restY);
    }
    onGrab(springStateRef.current, springConfigRef.current);
    onDrag(springStateRef.current, springConfigRef.current, fingerY);
    setSpringY(springStateRef.current.y);
    setSpringTension(getTension(springStateRef.current, springConfigRef.current));
    setGestureForce(0);
    setCatapultPull(0);
    setIsTouchPressing(true);

    touchStateRef.current = {
      active: true,
      startY: fingerY,
      startTime: now,
      lastY: fingerY,
      lastTime: now,
      lastVelocity: 0,
    };
  };

  const handleLogoTouchMove = (event) => {
    if (!isTouchLayout) return;
    const currentTouch = touchStateRef.current;
    if (!currentTouch.active || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const rect = gameAreaRef.current?.getBoundingClientRect();
    const fingerY = rect ? touch.clientY - rect.top : touch.clientY;
    const now = getNow();
    const instantDelta = fingerY - currentTouch.lastY;
    const elapsed = Math.max(now - currentTouch.lastTime, 1);
    const velocity = instantDelta / elapsed;

    currentTouch.lastY = fingerY;
    currentTouch.lastTime = now;
    currentTouch.lastVelocity = velocity;

    if (springStateRef.current && springConfigRef.current) {
      onDrag(springStateRef.current, springConfigRef.current, fingerY);
      setSpringY(springStateRef.current.y);
      setSpringTension(getTension(springStateRef.current, springConfigRef.current));
    }
    event.preventDefault();
  };

  const handleLogoTouchEnd = () => {
    if (!isTouchLayout) return;
    const currentTouch = touchStateRef.current;
    if (!currentTouch.active) return;

    const upwardVelocity = currentTouch.lastVelocity < 0 ? -currentTouch.lastVelocity * 1000 : 0;
    if (springStateRef.current && springConfigRef.current) {
      onRelease(springStateRef.current, springConfigRef.current, upwardVelocity);
    }
    setIsTouchPressing(false);
    resetTouchState();
  };

  const handleLogoTouchCancel = () => {
    if (!isTouchLayout) return;
    setCatapultPull(0);
    setIsTouchPressing(false);
    resetTouchState();
  };

  // Wiggle animation end
  const handleWiggleEnd = (e) => {
    if (e.animationName === 'wiggleInner') {
      setWiggleActive(false);
    }
  };

  useEffect(() => {
    inspectingRef.current = inspecting;
  }, [inspecting]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const coarseQuery = window.matchMedia('(pointer: coarse)');
    const updateLayoutMode = () => {
      const widthMatch = window.innerWidth <= 1024;
      const isCoarse = coarseQuery.matches;
      setIsTouchLayout(widthMatch || isCoarse);
    };

    updateLayoutMode();
    window.addEventListener('resize', updateLayoutMode);
    if (coarseQuery.addEventListener) {
      coarseQuery.addEventListener('change', updateLayoutMode);
    } else if (coarseQuery.addListener) {
      coarseQuery.addListener(updateLayoutMode);
    }

    return () => {
      window.removeEventListener('resize', updateLayoutMode);
      if (coarseQuery.removeEventListener) {
        coarseQuery.removeEventListener('change', updateLayoutMode);
      } else if (coarseQuery.removeListener) {
        coarseQuery.removeListener(updateLayoutMode);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
      resetTouchState();
    };
  }, []);

  useEffect(() => {
    if (!isTouchLayout) {
      if (springAnimationRef.current) {
        cancelAnimationFrame(springAnimationRef.current);
        springAnimationRef.current = null;
      }
      springLastTimeRef.current = null;
      springStateRef.current = null;
      springConfigRef.current = null;
      setGestureForce(0);
      setSpringY(null);
      setSpringTension(0);
      return;
    }

    const restY = layoutSettings.logoBaseTopUp;
    springConfigRef.current = {
      ...DEFAULT_SPRING_CONFIG,
      ...TOUCH_SPRING_TUNING,
      restY,
      beltY: layoutSettings.beltTop,
      maxPullDistance: layoutSettings.maxGestureOffset,
    };

    if (!springStateRef.current) {
      springStateRef.current = createSpringState(restY);
    } else {
      springStateRef.current.y = restY;
      springStateRef.current.vy = 0;
      springStateRef.current.anchorY = restY;
      springStateRef.current.phase = 'idle';
    }

    setSpringY(restY);
    setSpringTension(0);
    springLastTimeRef.current = null;

    const animate = (timestamp) => {
      if (!springLastTimeRef.current) {
        springLastTimeRef.current = timestamp;
      }
      const delta = Math.max((timestamp - springLastTimeRef.current) / 1000, 0);
      springLastTimeRef.current = timestamp;

      const phase = stepSpring(
        springStateRef.current,
        springConfigRef.current,
        delta
      );

      setSpringY(springStateRef.current.y);
      setSpringTension(getTension(springStateRef.current, springConfigRef.current));

      if (phase === 'hit-belt') {
        setLogoPosition((prev) => (prev === 'down' ? prev : 'down'));
      } else if (phase === 'landed' && !inspectingRef.current) {
        setLogoPosition('up');
      }

      springAnimationRef.current = requestAnimationFrame(animate);
    };

    springAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (springAnimationRef.current) {
        cancelAnimationFrame(springAnimationRef.current);
        springAnimationRef.current = null;
      }
      springLastTimeRef.current = null;
    };
  }, [isTouchLayout, layoutSettings.logoBaseTopUp, layoutSettings.beltTop, layoutSettings.maxGestureOffset]);

  // Smooth speed transitions
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

  // Update hitscan line on resize
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

  // Schedule a precise duck for autopilot
  function schedulePreciseDuck(target) {
    const inspLine = logoHitscanRef.current;
    if (!inspLine || !target || !target.centerPoint) return;

    const dist = Math.abs(target.centerPoint.x - inspLine);
    const speedPxPerSec = conveyorSpeed;
    const timeToCenterMs = (dist / speedPxPerSec) * 1000;

    // A small offset so the inspection finishes on center
    const offsetMs = 30;
    const plannedDuckTime = Math.max(0, timeToCenterMs - offsetMs);

    setTimeout(() => {
      if (!autoPilot || inspecting || logoPosition !== 'up') return;
      setLogoPosition('down');
    }, plannedDuckTime);
  }

  // Spawn floating notifications
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
          styleType: 'arc',
          createdAt: Date.now(),
          xOffset: getRandomArcOffset(),
        },
      ]);
      setTimeout(() => {
        setFloatingHits((oldHits) => oldHits.filter((h) => h.id !== id));
      }, 10000);
      return;
    }
    // THREAT + calm
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

    // Calm notification
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
        color: 'text-purple-300',
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

  // Fountain-like offset
function getRandomArcOffset() {
  const angleDegrees = Math.random() * 120 - 60; // range from -60 to 60 degrees
  const angleRad = (angleDegrees * Math.PI) / 180;
  const finalY = 140;
  let offset = finalY * Math.tan(angleRad);
  // Clamp the horizontal offset between -50px and 50px
  offset = Math.max(Math.min(offset, 50), -50);
  return offset;
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
        setPackages((prev) =>
          prev
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

      // Autopilot scheduling
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
          const target = toScan[0];
          schedulePreciseDuck(target);
        }
      }

      // Shared scanning logic
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
                    ? { ...p, status: 'threat', inspectionTime: Date.now() }
                    : p
                );
              } else {
                setScore((sc) => ({ ...sc, safe: sc.safe + 1 }));
                spawnHitIndicator(false);
                return prevPack.map((p) =>
                  p.id === target.id
                    ? { ...p, status: 'safe', safeRecoveryStart: Date.now() }
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

  // Render scoreboard with triple-click area on "Threats"
 const renderScoreboard = () => {
  return (
    <div
      className="absolute top-4 left-4 bg-gray-100 bg-opacity-80 p-3 rounded-sm flex flex-col gap-1 text-center"
      style={{ width: '180px', zIndex: 50 }}
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
          title="Click me 3 times to toggle debug"
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


  // Render each package
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
      const styles = { left: `${pkg.x}px`, width: `${pkg.width}px` };
      if (pkg.status === 'inspecting') {
        return {
          ...styles,
          top: `${layoutSettings.packageInspectingTop}px`,
          transition: 'top 0.3s cubic-bezier(0.17, 0.67, 0.24, 0.99)',
        };
      } else if (pkg.status === 'safe') {
        return {
          ...styles,
          top: `${layoutSettings.packageTrackTop}px`,
          transition:
            'background-color 0.3s, top 0.8s cubic-bezier(0.34, 1.1, 0.64, 1.1)',
        };
      } else if (pkg.status === 'threat') {
        const now = Date.now();
        const elapsed = (now - pkg.inspectionTime) / 1000;
        if (elapsed < 0.15) {
          return {
            ...styles,
            top: `${layoutSettings.packageInspectingTop}px`,
            transition: 'top 0.15s linear',
          };
        }
        return styles;
      }
      return { ...styles, top: `${layoutSettings.packageTrackTop}px` };
    };

    return (
      <div
        key={pkg.id}
        className={`absolute h-10 rounded-md shadow-md flex items-center justify-center text-xs ${packageStyle} ${animationClass} ${extraClassName}`}
        style={{ ...getPackageStyles(), '--random-delay': pkg.randomDelay || 0 }}
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

  // Inspection beam
  const renderInspectionBeam = () => {
    if (inspecting && currentInspection) {
      return (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 rounded-full bg-purple-300 animate-ping"
          style={{
            top: `${layoutSettings.inspectionBeamTop}px`,
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

  // Debug collision visuals
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
          className="absolute bg-blue-200 opacity-20 pointer-events-none"
          style={{
            top: `${layoutSettings.collisionAreaTop}px`,
            left: inspectionPoint - logoWidthRef.current / 2,
            width: logoWidthRef.current,
            height: `${layoutSettings.collisionAreaHeight}px`,
          }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
            Click Detection Area
          </div>
        </div>
      </>
    );
  };

  // Floating hits (SAFE/THREAT arcs, calm notifications)
  const renderFloatingHits = () => {
    const inspectionPoint = logoHitscanRef.current || 0;
    const arcTopPos = `${layoutSettings.arcTop}px`;

    return floatingHits.map((hit) => {
      if (hit.styleType === 'arc') {
        return (
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
        );
      } else {
        // Calm notifications remain at fixed positions
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
          0% {
            top: var(--threat-drop-top, 320px);
            transform: rotate(0deg);
          }
          100% {
            top: calc(var(--threat-drop-top, 320px) + 280px);
            transform: rotate(45deg);
          }
        }
        .falling-threat { animation: fallAnimation 2s ease-in forwards; }

        @keyframes fadeTransition {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .fade-in {
          animation: fadeTransition 0.4s ease-in forwards;
          animation-play-state: running;
        }

        @keyframes pulseSubtle {
          0%, 100% { background-color: #6b21a8; }
          50% { background-color: #9333ea; }
        }
        .animate-pulse-subtle {
          animation: pulseSubtle 1.2s ease-in-out infinite;
        }

        /* High-speed pop with deceleration for the SAFE/THREAT arcs */
@keyframes floatArcTransform {
  0% {
    transform: translate(-50%, 0) scale(1);
  }
  5% {
    transform: translate(calc(-50% + var(--float-x) * 1.1), -30px) scale(1.4);
  }
  15% {
    transform: translate(calc(-50% + var(--float-x) * 0.9), -50px) scale(1.1);
  }
  100% {
    transform: translate(calc(-50% + var(--float-x)), -140px) scale(0.9);
  }
}

@keyframes floatArcOpacity {
  0%, 5% {
    opacity: 0.8;
  }
  35% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

.arc-float {
  /* Define separate animations for transform and opacity */
  animation-name: floatArcTransform, floatArcOpacity;
  animation-duration: 10s, 10s;
  animation-timing-function: ease-out, cubic-bezier(0.42, 0, 1, 1);
  animation-fill-mode: forwards, forwards;
}





        @keyframes calmFloat {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          50% { opacity: 1; transform: translate(-50%, 0px); }
          80% { opacity: 1; transform: translate(-50%, 0px); }
          100% { opacity: 0; transform: translate(-50%, 0px); }
        }
        .calm-float {
          animation: calmFloat 6s ease forwards;
        }
      `}</style>

      <div
        className="relative w-full max-w-4xl mx-auto bg-gray-50 overflow-hidden"
        style={{
          height: `${layoutSettings.containerHeight}px`,
          '--threat-drop-top': `${layoutSettings.threatDropTop}px`,
        }}
        ref={gameAreaRef}
      >
        {/* Top-right buttons */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          {/* Debug button is hidden initially; triple-click on "Threats" toggles */}
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
              top: `${layoutSettings.beltTop}px`,
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
            handleTouchStart={handleLogoTouchStart}
            handleTouchMove={handleLogoTouchMove}
            handleTouchEnd={handleLogoTouchEnd}
            handleTouchCancel={handleLogoTouchCancel}
            handleMouseEnter={() => handleLogoHover(true)}
            handleMouseLeave={() => handleLogoHover(false)}
            handleAnimationEnd={handleWiggleEnd}
            logoWidth={logoWidthRef.current}
            catapultPull={catapultPull}
            gestureForce={gestureForce}
            layoutSettings={layoutSettings}
            isTouchLayout={isTouchLayout}
            isTouchPressing={isTouchPressing}
            customTop={isTouchLayout ? springY ?? layoutSettings.logoBaseTopUp : undefined}
            rubberTension={isTouchLayout ? springTension : 0}
            disableTouchTransitions={isTouchLayout}
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
