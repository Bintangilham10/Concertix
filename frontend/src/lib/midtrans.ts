type SnapCallback = (result?: unknown) => void;

interface SnapPayCallbacks {
  onSuccess?: SnapCallback;
  onPending?: SnapCallback;
  onError?: SnapCallback;
  onClose?: () => void;
}

interface MidtransSnap {
  pay: (snapToken: string, callbacks?: SnapPayCallbacks) => void;
}

declare global {
  interface Window {
    snap?: MidtransSnap;
  }
}

interface StartMidtransPaymentOptions extends SnapPayCallbacks {
  snapToken: string;
  redirectUrl?: string;
  onFallback?: () => void;
}

const SNAP_SCRIPT_ID = "midtrans-snap-js";
const SANDBOX_SNAP_URL = "https://app.sandbox.midtrans.com/snap/snap.js";
const PRODUCTION_SNAP_URL = "https://app.midtrans.com/snap/snap.js";

function getSnapScriptUrl(redirectUrl?: string): string {
  if (redirectUrl?.startsWith("https://app.midtrans.com")) {
    return PRODUCTION_SNAP_URL;
  }
  return SANDBOX_SNAP_URL;
}

function getClientKey(): string {
  const key = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
  if (!key || key.startsWith("your_")) {
    throw new Error("Midtrans client key belum dikonfigurasi.");
  }
  return key;
}

function loadSnapScript(redirectUrl?: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Midtrans hanya bisa dijalankan di browser."));
  }

  if (window.snap) {
    return Promise.resolve();
  }

  const src = getSnapScriptUrl(redirectUrl);
  const existingScript = document.getElementById(SNAP_SCRIPT_ID) as HTMLScriptElement | null;

  if (existingScript) {
    if (existingScript.dataset.loaded === "true") {
      return window.snap
        ? Promise.resolve()
        : Promise.reject(new Error("Midtrans Snap belum siap."));
    }

    if (existingScript.dataset.error === "true") {
      return Promise.reject(new Error("Gagal memuat Midtrans Snap."));
    }

    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Gagal memuat Midtrans Snap.")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SNAP_SCRIPT_ID;
    script.src = src;
    script.async = true;
    script.dataset.clientKey = getClientKey();
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      script.dataset.error = "true";
      reject(new Error("Gagal memuat Midtrans Snap."));
    };
    document.body.appendChild(script);
  });
}

export async function startMidtransPayment({
  snapToken,
  redirectUrl,
  onFallback,
  ...callbacks
}: StartMidtransPaymentOptions): Promise<"snap" | "fallback"> {
  try {
    await loadSnapScript(redirectUrl);
    if (!window.snap) {
      throw new Error("Midtrans Snap belum siap.");
    }
    window.snap.pay(snapToken, callbacks);
    return "snap";
  } catch (error) {
    if (!redirectUrl) {
      throw error;
    }

    const tab = window.open(redirectUrl, "_blank", "noopener,noreferrer");
    if (!tab) {
      throw error;
    }
    onFallback?.();
    return "fallback";
  }
}
