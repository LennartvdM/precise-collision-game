import React from 'react';

const Logo = ({
  logoPosition,
  isHovered,
  wiggleActive,
  autoPilot,
  handleClick,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTouchCancel,
  handleMouseEnter,
  handleMouseLeave,
  handleAnimationEnd,
  logoWidth,
  catapultPull = 0,
  gestureForce = 0,
  layoutSettings,
}) => {
  const {
    logoBaseTopUp = 180,
    logoBaseTopDown = 240,
    catapultPullDirection = -1,
    gestureForceDirection = 1,
  } = layoutSettings || {};
  const baseTop = logoPosition === 'up' ? logoBaseTopUp : logoBaseTopDown;
  const tensionOffset = catapultPull
    ? catapultPullDirection * catapultPull * 0.45
    : 0;
  const impactOffset = gestureForce
    ? Math.min(gestureForce, 130) * gestureForceDirection
    : 0;
  const topPosition = baseTop + tensionOffset + impactOffset;
  const tensionScale = 1 + (catapultPull ? Math.min(catapultPull, 110) / 300 : 0);
  const hoverScale = isHovered ? 1.1 : 1;
  const scaleValue = hoverScale * tensionScale;
  const shouldDisableTopTransition = catapultPull > 2;
  const isActive = logoPosition === 'down';
  const autoPilotGlow = autoPilot ? 'filter drop-shadow-lg' : '';

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: `${topPosition}px`,
        transform: `translateX(-50%) scale(${scaleValue})`,
        transformOrigin: 'center',
        transition: `${
          shouldDisableTopTransition
            ? ''
            : 'top 0.3s cubic-bezier(0.34, 1.76, 0.64, 1.4), '
        }transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1.3)`,
        width: `${logoWidth}px`,
        pointerEvents: 'auto',
        cursor: 'pointer',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      draggable={false}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      aria-label="Launch inspection logo"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <div
        className={`relative flex items-center justify-center ${
          autoPilot ? 'animate-bob-intense' : !isActive ? 'animate-bob' : ''
        } ${autoPilotGlow}`}
        style={{ width: '100%', height: '100%' }}
      >
        <div
          className={`relative w-full h-full flex items-center justify-center ${
            wiggleActive ? 'animate-wiggle-inner' : ''
          }`}
          onAnimationEnd={handleAnimationEnd}
        >
          <div
            className={`w-20 h-20 rounded-lg shadow-md flex items-center justify-center ${
              !isActive ? 'bg-purple-500' : ''
            } ${autoPilot ? 'bg-purple-600' : ''}`}
            style={{
              transition: 'all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1.1)',
              boxShadow: isActive
                ? '0 10px 15px -3px rgba(76, 29, 149, 0.4)'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              backgroundColor: isActive ? '#8054b3' : '',
              transform: 'rotate(45deg)'
            }}
          >
            <div
              className={`w-16 h-16 rounded-lg absolute ${
                !isActive ? 'bg-purple-400' : ''
              }`}
              style={{
                backgroundColor: isActive ? '#9166c7' : '',
                transition: 'background-color 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            ></div>
            <div
              className={`w-12 h-12 rounded-lg absolute flex items-center justify-center ${
                !isActive ? 'bg-purple-300' : ''
              }`}
              style={{
                backgroundColor: isActive ? '#a37dd6' : '',
                transition: 'background-color 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <div className="w-6 h-8 bg-white rounded-sm relative">
                <div
                  className={`w-2 h-2 rounded-full absolute top-4 left-2 ${
                    isActive ? 'bg-red-600' : 'bg-purple-700'
                  } ${autoPilot ? 'bg-orange-500 animate-pulse' : ''}`}
                  style={{
                    transition: 'background-color 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logo;
