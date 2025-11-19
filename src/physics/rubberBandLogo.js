// A mass-spring-damper system where the logo lags behind the finger
export const DEFAULT_CONFIG = {
  restY: 600,
  beltY: 150,
  k: 180,
  c: 12,
  mass: 1,
  gravity: 800,
  maxPullDistance: 160,
};

const DRAG_DEADZONE = 8;

export const createSpringState = (restY) => ({
  y: restY,
  vy: 0,
  anchorY: restY,
  phase: 'idle',
  grabFingerY: undefined,
});

export const stepSpring = (state, config, dt) => {
  if (!state || state.phase === 'idle' || state.phase === 'arming') return 'idle';

  const { k, c, mass, gravity } = config;

  const displacement = state.y - state.anchorY;
  const springForce = -k * displacement;
  const dampingForce = -c * state.vy;
  const gravityForce = state.phase === 'launched' ? mass * gravity : 0;

  const netForce = springForce + dampingForce + gravityForce;
  const acceleration = netForce / mass;

  state.vy += acceleration * dt;
  state.y += state.vy * dt;

  if (state.phase === 'launched') {
    if (state.vy < 0 && state.y <= config.beltY) {
      return 'hit-belt';
    }

    if (state.vy > 0 && state.y >= config.restY) {
      state.y = config.restY;
      state.vy = 0;
      state.phase = 'idle';
      state.anchorY = config.restY;
      return 'landed';
    }
    return 'flying';
  }

  return 'held';
};

export const onGrab = (state, config, fingerY) => {
  if (!state) return;
  state.phase = 'arming';
  state.grabFingerY = fingerY;
  state.anchorY = state.y;
  state.vy = 0;
};

export const onDrag = (state, config, fingerY) => {
  if (!state || (state.phase !== 'arming' && state.phase !== 'held')) return;
  if (state.grabFingerY == null) state.grabFingerY = fingerY;

  const totalDrag = fingerY - state.grabFingerY;
  if (state.phase === 'arming' && totalDrag < DRAG_DEADZONE) return;

  state.phase = 'held';

  const rawPull = Math.max(0, fingerY - config.restY);
  const t = Math.min(1, rawPull / config.maxPullDistance);
  const eased = 1 - Math.pow(1 - t, 3);
  const effectivePull = eased * config.maxPullDistance;

  state.anchorY = config.restY + effectivePull;
};

export const onRelease = (state, config, flickVelocity = 0) => {
  if (!state) return;
  if (state.phase === 'arming') {
    state.phase = 'idle';
    state.anchorY = config.restY;
    state.grabFingerY = undefined;
    return;
  }
  if (state.phase !== 'held') return;

  state.phase = 'launched';
  const stretch = Math.max(0, state.y - config.restY);
  const launchImpulse = Math.min(stretch, config.maxPullDistance) * 3.2;

  // Apply the launch impulse immediately, then reset the anchor so the band
  // snaps back on its own without needing another gesture.
  state.vy -= launchImpulse / Math.max(config.mass, 1);
  if (flickVelocity > 0) state.vy -= flickVelocity;
  state.anchorY = config.restY;
};

export const resetSpring = (state, config) => {
  if (!state) return;
  state.y = config.restY;
  state.vy = 0;
  state.anchorY = config.restY;
  state.phase = 'idle';
  state.grabFingerY = undefined;
};

export const getTension = (state, config) => {
  if (!state) return 0;
  const stretch = Math.max(0, Math.abs(state.y - state.anchorY));
  const normalized = Math.min(1, stretch / Math.max(config.maxPullDistance, 1));

  // Bias the curve so tension ramps up sharply near the end of the pull.
  const curved = Math.pow(normalized, 1.2) * (1 - Math.pow(normalized, 2));
  const steepRamp = normalized ** 3;

  return Math.min(1, curved + steepRamp);
};

export const getStretchVector = (state) => ({
  dy: state ? state.anchorY - state.y : 0,
});
