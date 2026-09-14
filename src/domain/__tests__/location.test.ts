import { approximateLocation, LOCATION_CELL_SIZE_METERS } from '../location';

describe('approximateLocation', () => {
  it('descarta la coordenada precisa y produce una celda estable', () => {
    const raw = { latitude: -12.046374, longitude: -77.042793 };
    const first = approximateLocation(raw.latitude, raw.longitude);
    const repeated = approximateLocation(raw.latitude, raw.longitude);
    expect(first.id).toBe(repeated.id);
    expect(first.centerLatitude).not.toBe(raw.latitude);
    expect(first.centerLongitude).not.toBe(raw.longitude);
    expect(LOCATION_CELL_SIZE_METERS).toBe(50);
    expect(first.id).toMatch(/^cell:50:/);
    expect(Math.abs(first.centerLatitude - raw.latitude)).toBeLessThan(0.0005);
    expect(Object.keys(first)).not.toContain('accuracy');
  });
});
