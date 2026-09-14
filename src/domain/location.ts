const EARTH_METERS_PER_DEGREE = 111_320;
export const LOCATION_CELL_SIZE_METERS = 50;

export interface ApproximateCell {
  id: string;
  centerLatitude: number;
  centerLongitude: number;
}

/** Converts a precise coordinate into a ~50 m grid and never returns the raw point. */
export function approximateLocation(latitude: number, longitude: number): ApproximateCell {
  const latStep = LOCATION_CELL_SIZE_METERS / EARTH_METERS_PER_DEGREE;
  const longitudeScale = Math.max(Math.cos((latitude * Math.PI) / 180), 0.2);
  const lngStep = LOCATION_CELL_SIZE_METERS / (EARTH_METERS_PER_DEGREE * longitudeScale);
  const latIndex = Math.floor(latitude / latStep);
  const lngIndex = Math.floor(longitude / lngStep);
  const centerLatitude = (latIndex + 0.5) * latStep;
  const centerLongitude = (lngIndex + 0.5) * lngStep;

  return {
    id: `cell:${LOCATION_CELL_SIZE_METERS}:${latIndex}:${lngIndex}`,
    centerLatitude: Number(centerLatitude.toFixed(5)),
    centerLongitude: Number(centerLongitude.toFixed(5)),
  };
}
