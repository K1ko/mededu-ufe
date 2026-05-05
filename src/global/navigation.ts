type NavigationResult = {
  committed: Promise<void>;
  finished: Promise<void>;
};

type NavigationLike = EventTarget & {
  navigate?: (url: string | URL, options?: { state?: unknown; info?: unknown }) => NavigationResult;
  back?: () => NavigationResult;
};

declare global {
  interface Window {
    navigation: NavigationLike;
  }
}

class PolyNavigationDestination {
  constructor(public url: string) {}
}

class PolyNavigateEvent extends Event {
  canIntercept = true;
  destination: PolyNavigationDestination;
  downloadRequest: string | null = null;
  formData: FormData | null = null;
  hashChange = false;
  info: unknown;
  signal = new AbortController().signal;
  userInitiated = false;

  private intercepted = false;

  constructor(url: string, info?: unknown) {
    super('navigate', { bubbles: false, cancelable: true });
    this.destination = new PolyNavigationDestination(url);
    this.info = info;
  }

  get isIntercepted() {
    return this.intercepted;
  }

  intercept(options?: { handler?: () => Promise<void> | void }) {
    this.intercepted = true;
    void options?.handler?.();
  }
}

export function registerNavigationApi() {
  const win = window as unknown as { navigation?: NavigationLike };

  if (win.navigation) {
    return;
  }

  const navigation = new EventTarget() as NavigationLike;
  win.navigation = navigation;

  let lastHref = window.location.href;
  const originalPushState = window.history.pushState.bind(window.history);

  const absoluteUrl = (url: string | URL | null | undefined) =>
    new URL(url?.toString() || window.location.href, window.location.href).href;

  const dispatchNavigate = (url: string | URL | null | undefined) => {
    const nextUrl = absoluteUrl(url);
    lastHref = nextUrl;
    navigation.dispatchEvent(new PolyNavigateEvent(nextUrl));
  };

  window.history.pushState = ((state: unknown, title: string, url?: string | URL | null) => {
    const result = originalPushState(state, title, url);
    dispatchNavigate(url);
    return result;
  }) as History['pushState'];

  window.addEventListener('popstate', () => dispatchNavigate(window.location.href));

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastHref) {
        dispatchNavigate(window.location.href);
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }

  navigation.navigate = (url: string | URL, options: { state?: unknown; info?: unknown } = {}) => {
    const nextUrl = absoluteUrl(url);
    const event = new PolyNavigateEvent(nextUrl, options.info);
    navigation.dispatchEvent(event);

    if (event.isIntercepted) {
      originalPushState(options.state ?? {}, '', nextUrl);
      lastHref = nextUrl;
    } else {
      window.open(nextUrl, '_self');
    }

    return {
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    };
  };

  navigation.back = () => {
    window.history.back();

    return {
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    };
  };
}
