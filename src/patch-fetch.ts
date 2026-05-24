// Fix window.fetch being getter-only in sandboxed iframe environments
// By defining both a getter and a setter, we allow standard and third-party
// libraries to safely assign to or wrap window/globalThis.fetch without throwing
// "Cannot set property fetch of #<Window> which has only a getter".

function patchFetchOnObject(obj: any, name: string) {
  if (!obj) return;
  try {
    let currentFetch = obj.fetch;
    if (!currentFetch && typeof window !== 'undefined') {
      currentFetch = window.fetch;
    }
    if (!currentFetch) return;

    Object.defineProperty(obj, 'fetch', {
      get() {
        return currentFetch;
      },
      set(newFetch) {
        currentFetch = newFetch;
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.warn(`Unable to redefine ${name}.fetch with getter/setter`, e);
  }
}

if (typeof Window !== 'undefined' && Window.prototype) {
  patchFetchOnObject(Window.prototype, 'Window.prototype');
}
if (typeof window !== 'undefined') {
  patchFetchOnObject(window, 'window');
}
if (typeof globalThis !== 'undefined') {
  patchFetchOnObject(globalThis, 'globalThis');
}
if (typeof self !== 'undefined') {
  patchFetchOnObject(self, 'self');
}

