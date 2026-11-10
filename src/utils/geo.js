// Location helpers. The position is only used on this device — it's never
// sent to the server (only the gyms' own coordinates are stored).

/** { lat, lon, accuracy } — rejects with a readable message. */
export function getPosition(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not available on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) =>
        reject(
          new Error(
            err.code === 1
              ? 'Location permission is off. Allow location for this site in your phone settings.'
              : err.code === 3
                ? 'Finding your location took too long. Try again.'
                : "Couldn't get your location.",
          ),
        ),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/** Distance in metres between two { lat, lon } points. */
export function distanceMeters(a, b) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
