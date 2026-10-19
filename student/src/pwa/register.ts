let registration: Promise<ServiceWorkerRegistration> | undefined;

export function registerPwa(): Promise<ServiceWorkerRegistration> {
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    return Promise.reject(new Error('A secure HTTPS connection is required.'));
  }
  registration ??= navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(async () => {
      // Do not hang forever if installation fails or the device is offline.
      return Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('App setup timed out. Please reconnect and try again.')), 15000)),
      ]);
    }).catch(error => { registration = undefined; throw error; });
  return registration;
}
