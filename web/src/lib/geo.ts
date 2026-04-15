import { UserLocation } from "./metrics";

const STORAGE_KEY = "ai-speedtest-location";

function roundCoord(val: number): number {
  return Math.round(val * 10) / 10;
}

async function fromBrowserGeolocation(): Promise<UserLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          city: "",
          region: "",
          country: "",
          lat: roundCoord(pos.coords.latitude),
          lon: roundCoord(pos.coords.longitude),
        });
      },
      () => resolve(null),
      { timeout: 5000, maximumAge: 300_000 }
    );
  });
}

async function fromIpApi(): Promise<UserLocation | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      city: data.city ?? "",
      region: data.region ?? "",
      country: data.country_code ?? "",
      lat: roundCoord(data.latitude ?? 0),
      lon: roundCoord(data.longitude ?? 0),
    };
  } catch {
    return null;
  }
}

export async function getUserLocation(): Promise<UserLocation | null> {
  if (typeof window === "undefined") return null;

  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as UserLocation;
    } catch {
      // fall through
    }
  }

  const ipLocation = await fromIpApi();
  if (ipLocation) {
    const browserCoords = await fromBrowserGeolocation();
    if (browserCoords && browserCoords.lat !== 0) {
      ipLocation.lat = browserCoords.lat;
      ipLocation.lon = browserCoords.lon;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ipLocation));
    return ipLocation;
  }

  const browserOnly = await fromBrowserGeolocation();
  if (browserOnly) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(browserOnly));
    return browserOnly;
  }

  return null;
}
