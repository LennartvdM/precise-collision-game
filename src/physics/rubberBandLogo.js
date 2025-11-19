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

export const createSpringState = (restY) => ({
  y: restY,
  vy: 0,
  anchorY: restY,
  phase: 'idle',
});

export const stepSpring = (state, config, dt) => {
  if (!state || state.phase === 'idle') return 'idle';

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

export const onGrab = (state, config) => {
  if (!state) return;
  state.phase = 'held';
  state.anchorY = config.restY;
};

export const onDrag = (state, config, fingerY) => {
  if (!state || state.phase !== 'held') return;
  const pullDown = Math.max(0, fingerY - config.restY);
  const clampedPull = Math.min(pullDown, config.maxPullDistance);
  state.anchorY = config.restY + clampedPull;
};

export const onRelease = (state, config, flickVelocity = 0) => {
  if (!state || state.phase !== 'held') return;

  state.phase = 'launched';
  const stretch = state.y - config.restY;
  const anchorBoost = stretch * 1.8;
  state.anchorY = config.restY - anchorBoost;

  if (flickVelocity > 0) {
    state.vy -= flickVelocity;
  }
};

export const getTension = (state, config) => {
  if (!state) return 0;
  const stretch = Math.abs(state.y - state.anchorY);
  return Math.min(1, stretch / config.maxPullDistance);
};

export const getStretchVector = (state) => ({
  dy: state ? state.anchorY - state.y : 0,
});
