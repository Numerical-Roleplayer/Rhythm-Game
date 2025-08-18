function completeHold(laneIndex, noteObj, opts) {
  const { lanes, laneContainer, onHoldComplete } = opts;
  const queue = lanes[laneIndex];
  if (queue[0] === noteObj) {
    queue.shift();
  } else {
    const idx = queue.indexOf(noteObj);
    if (idx !== -1) queue.splice(idx, 1);
  }
  if (noteObj.holdTimer) clearTimeout(noteObj.holdTimer);
  noteObj.el.remove();
  const indicator = laneContainer.children[laneIndex].querySelector('.hit-indicator');
  if (indicator) indicator.classList.remove('sustaining');
  if (onHoldComplete) onHoldComplete();
}

export function spawnNote(laneIndex, opts) {
  const { laneContainer, laneKeys, lanes, travelDuration, hitY, LATE_WINDOW, handleLapse } = opts;
  const el = document.createElement('div');
  const laneKey = laneKeys[laneIndex];
  el.className = `note ${laneKey}`;
  laneContainer.children[laneIndex].appendChild(el);

  const hitTime = performance.now() + travelDuration;
  const noteObj = { el, hitTime, type: 'normal' };
  lanes[laneIndex].push(noteObj);

  const lapseDelay = hitTime + LATE_WINDOW - performance.now();
  noteObj.lapseTimer = setTimeout(() => handleLapse(laneIndex, noteObj), lapseDelay);

  const spawnTime = performance.now();
  function animate() {
    const now = performance.now();
    const progress = Math.min((now - spawnTime) / travelDuration, 1);
    const y = progress * (hitY + 40);
    el.style.top = `${y - 40}px`;
    if (!el.isConnected) return;
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }
  }
  requestAnimationFrame(animate);
}

export function spawnHoldNote(laneIndex, holdDuration, opts) {
  const { laneContainer, laneKeys, lanes, travelDuration, hitY, LATE_WINDOW, handleLapse, onHoldComplete } = opts;
  const el = document.createElement('div');
  const laneKey = laneKeys[laneIndex];
  el.className = 'hold';

  const head = document.createElement('div');
  head.className = `hold-head note ${laneKey}`;
  el.appendChild(head);

  const tail = document.createElement('div');
  tail.className = `hold-tail ${laneKey}`;
  el.appendChild(tail);

  laneContainer.children[laneIndex].appendChild(el);

  const distance = hitY + 40;
  const tailHeight = (holdDuration * distance) / travelDuration;
  tail.style.height = `${tailHeight}px`;
  el.style.height = `${tailHeight + 20}px`;

  const spawnTime = performance.now();
  const hitTime = spawnTime + travelDuration;
  const releaseTime = hitTime + holdDuration;

  const noteObj = {
    el,
    hitTime,
    releaseTime,
    type: 'hold',
    headEl: head,
    tailEl: tail,
    tailHeight,
    holding: false,
    animFrame: null,
  };
  lanes[laneIndex].push(noteObj);

  const lapseDelay = hitTime + LATE_WINDOW - performance.now();
  noteObj.lapseTimer = setTimeout(() => handleLapse(laneIndex, noteObj), lapseDelay);

  const totalDuration = travelDuration + holdDuration;
  const startTop = -40 - tailHeight;
  const totalDistance = hitY + 40 + tailHeight;
  function animate() {
    if (noteObj.holding) return;
    const now = performance.now();
    const progress = Math.min((now - spawnTime) / totalDuration, 1);
    const y = startTop + progress * totalDistance;
    el.style.top = `${y}px`;
    if (!el.isConnected) return;
    if (progress < 1) {
      noteObj.animFrame = requestAnimationFrame(animate);
    } else {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }
  }
  noteObj.animFrame = requestAnimationFrame(animate);

  noteObj.completeHold = () => completeHold(laneIndex, noteObj, { lanes, laneContainer, onHoldComplete });
}
