import * as fs from 'fs';
import * as path from 'path';
import * as geojsonvt from 'geojson-vt';
import pgPromise = require('pg-promise');

export interface IGeojsonVTOptions {
  /** max zoom to preserve detail on; can't be higher than 24 */
  maxZoom?: number;
  /** simplification tolerance (higher means simpler) */
  tolerance?: number;
  /** tile extent (both width and height) - this needs to match the value that is used in vt2geojson.ts */
  extent?: number;
  /** tile buffer on each side */
  buffer?: number;
  /** logging level (0 to disable, 1 or 2) */
  debug?: 0 | 1 | 2;
  /** whether to enable line metrics tracking for LineString/MultiLineString features */
  lineMetrics?: false;
  /** name of a feature property to promote to feature.id. Cannot be used with `generateId` */
  promoteId?: string;
  /** whether to generate feature ids. Cannot be used with `promoteId` */
  generateId?: boolean;
  /** max zoom in the initial tile index?: if indexMaxZoom === maxZoom, and indexMaxPoints === 0, pre-generate all tiles */
  indexMaxZoom?: number;
  /** max number of points per tile in the index */
  indexMaxPoints?: number;
  /** whether to include solid tile children in the index */
  solidChildren?: boolean;
}

/**
 * Create a tile index using geojson-vt
 *
 * @param {string} filename
 * @returns
 */
export const createTileIndex = async (layer: string, connection: pgPromise.IDatabase<{}>, options?: IGeojsonVTOptions) => {
  const query = "select 'FeatureCollection' As type, array_to_json(array_agg(f)) As features from (select 'Feature' As type, ST_AsGeoJSON(ns.geom,10):: json As geometry, row_to_json((SELECT prop FROM(SELECT id) As prop)) As properties from network_sections as ns where 'geom' is not null and (end_date > now() or end_date is null)) As f"
  const geoJSON = await connection.oneOrNone(query).then((user) => {
      return user
  }).catch((err) => {
      throw err
  })
  return geojsonvt(
    geoJSON,
    Object.assign(
      {
        maxZoom: 22,
        tolerance: 3,
        extent: 4096,
        buffer: 64,
        debug: 0,
        generateId: true,
        indexMaxZoom: 4,
        indexMaxPoints: 100000,
        solidChildren: false,
      } as IGeojsonVTOptions,
      options
    )
  );
};
