import { Request, Response } from 'express';
import * as geojsonvt from 'geojson-vt';
import pgPromise = require('pg-promise');
import { ILayer } from './layer-source';

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
 * Create a tile using geojson-vt
 *
 * @param {ILayer} layer
 * @returns
 */
export const createTile = async (layer: ILayer, connection: pgPromise.IDatabase<{}>, options?: IGeojsonVTOptions) => {
  const geoJSON = await connection.oneOrNone(layer.sourceQuery).then((response) => {
    if (layer.layerName === 'network-sections') {
      response.features = response.features.map((feature: any) => {
        delete feature.properties.geom
        return feature
      })
      return response
    } else {
      return response
    }
  }).catch((err) => {
    console.log(err)
    throw err
  })
  return geojsonvt(
    geoJSON,
    Object.assign(
      {
        maxZoom: 24,  // max zoom to preserve detail on; can't be higher than 24
        tolerance: 2, // simplification tolerance (higher means simpler)
        extent: layer.extend, // tile extent (both width and height)
        buffer: 0,   // tile buffer on each side
        debug: 0,     // logging level (0 to disable, 1 or 2)
        lineMetrics: false, // whether to enable line metrics tracking for LineString/MultiLineString features
        generateId: false,  // whether to generate feature ids. Cannot be used with `promoteId`
        indexMaxZoom: 2,       // max zoom in the initial tile index
        indexMaxPoints: 100000 // max number of points per tile in the index
      } as IGeojsonVTOptions,
      options
    )
  );
};


export const getTile = (tiles: { [key: string]: any }, req: Request) => {
  const layer = req.params["layer"];
  const z = +req.params["z"];
  const x = +req.params["x"];
  const y = +req.params["y"];
  const tile = tiles[layer].getTile(z, x, y);
  return { tile, x, y, z };
};

export const send404 = (res: Response) => {
  res.status(404).send(
    `<!DOCTYPE html> 
    <html>
       <head>
          <meta charset="utf-8"/>
          <title>iRoads - Map Demo</title>
          <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
          <script src="https://api.mapbox.com/mapbox-gl-js/v2.0.1/mapbox-gl.js"></script>
          <link href="https://api.mapbox.com/mapbox-gl-js/v2.0.1/mapbox-gl.css" rel="stylesheet" />
          <style>body{margin: 0; padding: 0;}#map{position: absolute; top: 0; bottom: 0; width: 100%;}#features{position: absolute;top: 0;right: 0;bottom: 0;width: 33%;height:50%;overflow: auto;background: rgb(241 241 241 / 72%); z-index:1}</style>
          
       </head>
       <body>
          <pre id="features"></pre>
          <div id="map"></div>
          <script>
            mapboxgl.accessToken = 'pk.eyJ1Ijoic2FiaXRobWsiLCJhIjoiY2tqMmg3bzJyMDBpYTJ6bm96eG03NTAwMyJ9.vb6GhDsYSQU_tAVOKNjDGQ';
            var map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/streets-v11',
              zoom: 14,
              center: [77.00270298411137, 8.522177315218222]
            });

            map.on('load', function () {
              map.loadImage('https://www.google.com/maps/vt/icon/name=assets/icons/poi/tactile/pinlet_shadow_v3-2-medium.png,assets/icons/poi/tactile/pinlet_outline_v3-2-medium.png,assets/icons/poi/tactile/pinlet_v3-2-medium.png,assets/icons/poi/quantum/pinlet/ferriswheel_pinlet-2-medium.png&highlight=ff000000,ffffff,12b5cb,ffffff?scale=0.5', function (error, image) {
                map.addImage('custom-marker', image);
              });

              map.addSource('network-sections', {
                'type': 'vector',
                'tiles': [
                  window.location.href + 'network-sections/{z}/{x}/{y}.mvt'
                ],
                'minzoom': 6,
                'maxzoom': 24
              });

              map.addSource('assets', {
                'type': 'vector',
                'tiles': [
                  window.location.href + 'assets/{z}/{x}/{y}.mvt'
                ],
                'minzoom': 6,
                'maxzoom': 24
              });
              
              map.addLayer({
                id: 'network-sections-layer',
                type: 'line',
                source: 'network-sections',
                'source-layer': 'all',
                layout: {
                  'line-cap': 'round',
                  'line-join': 'round'
                },
                paint: {
                  'line-opacity': 0.6,
                  'line-color': 'rgb(53, 175, 109)',
                  'line-width': 2,
                }
              });
              
              map.addLayer({
                'id': 'places',
                'type': 'symbol',
                'source-layer': 'all',
                'source': 'assets',
                'layout': {
                  'icon-image': 'custom-marker',
                  'icon-allow-overlap': true
                }
              });

              map.on('mousemove', function (e) {
                var features = map.queryRenderedFeatures(e.point);
                 
                var displayProperties = [
                  'type',
                  'properties',
                  'id',
                  'layer',
                  'source',
                  'sourceLayer',
                  'state'
                ];
                 
                var displayFeatures = features.map(function (feat) {
                  var displayFeat = {};
                  displayProperties.forEach(function (prop) {
                    displayFeat[prop] = feat[prop];
                  });
                  return displayFeat;
                });
                 
                document.getElementById('features').innerHTML = JSON.stringify(
                  displayFeatures,
                  null,
                  2);
                });

            });
            map.addControl(new mapboxgl.NavigationControl());
          </script> 
       </body>
    </html>`
  );
};