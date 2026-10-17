const key = (userId: string) => `ua_feature_tour_v1:${userId}`;

// Storage is best-effort: privacy mode must never block authentication.
export function requestRegistrationTour(userId: string, replay = false) {
  try {
    if (replay || !localStorage.getItem(key(userId))) localStorage.setItem(key(userId), 'pending');
  } catch { /* Tour remains available from the sidebar. */ }
}

export function hasPendingTour(userId: string) {
  try { return localStorage.getItem(key(userId)) === 'pending'; }
  catch { return false; }
}

export function finishTour(userId: string) {
  try { localStorage.setItem(key(userId), 'done'); }
  catch { /* Session remains usable without storage. */ }
}
