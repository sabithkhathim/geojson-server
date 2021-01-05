import * as path from "path";
import * as express from "express";
import * as cors from "cors";
import * as vtpbf from "vt-pbf";
import { Request, Response } from "express";
import { createTileIndex } from "./utils";
import { ICommandOptions } from "./cli";
import { IVectorTile, toFeatureCollection } from "./vt2geojson";
import * as pgPromise from 'pg-promise'

/** GeojsonVT extent option */
const extent = 4096;

const emptyResponse = { tile: undefined, x: 0, y: 0, z: 0 };

const startService = async (options: ICommandOptions) => {
  
  // db connection
  console.log(`Starting database connection...`);
  const credentials = {
    host: '20.50.124.143',
    port: 5432,
    database: 'iroads-network-db',
    user: 'postgres',
    password: '1Road5DB',
    max: 30 // use up to 30 connections
  }
  const pgp = pgPromise({/* Initialization Options */})
  const connection = pgp(credentials)

  console.log(`Loading data...`);

  const tileIndexes: { [key: string]: any } = {};
  const layers: string[] = ['layer1'];
  let countLayers = layers.length;
  layers.forEach(async (layer) => {
    console.log(`Processing layer ${layer}...`);
    const tileIndex = await createTileIndex(layer, connection, {
      extent,
      maxZoom: options.maxZoom,
      generateId: options.generatedId,
      promoteId: options.promoteId,
      buffer: options.buffer,
    });
    tileIndexes[layer] = tileIndex;
    countLayers--;
    if (countLayers <= 0) {
      console.log("All done. Listening on http://localhost:8080/");
    }
  });

  const httpPort = options.port || process.env.PORT || 8080;
  const app = express();
  app.use(cors());

  const send404 = (res: Response) => {
    res.status(404).send(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>iRoads - Map Demo</title>
          <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
          <script src="https://api.tiles.mapbox.com/mapbox-gl-js/v1.0.0/mapbox-gl.js"></script>
          <link href="https://api.tiles.mapbox.com/mapbox-gl-js/v1.0.0/mapbox-gl.css" rel="stylesheet" />
          <style>
            body {
              margin: 0;
              padding: 0;
            }
            #map {
              position: absolute;
              top: 0;
              bottom: 0;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            mapboxgl.accessToken = 'pk.eyJ1Ijoic2FiaXRobWsiLCJhIjoiY2tqMmg3bzJyMDBpYTJ6bm96eG03NTAwMyJ9.vb6GhDsYSQU_tAVOKNjDGQ';
            var map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/light-v10',
              zoom: 16,
              center: [77.00270298411137, 8.522177315218222],
            });
      
            map.on('load', function() {
              map.addLayer(
                {
                  id: 'mapillary',
                  type: 'line',
                  source: {
                    tiles: ['http://34.221.6.51:8080/layer1/{z}/{x}/{y}.mvt'],
                    type: 'vector',
                    maxzoom: 22,
                  },
                  'source-layer': 'all',
                  layout: {
                    'line-cap': 'round',
                    'line-join': 'round',
                  },
                  paint: {
                    'line-opacity': 0.6,
                    'line-color': 'rgb(53, 175, 109)',
                    'line-width': 2,
                  },
                },
                'waterway-label'
              );
            });
      
            map.addControl(new mapboxgl.NavigationControl());
          </script>
        </body>
      </html>
      `
    );
  };

  const getTile = (req: Request, res: Response) => {
    const layer = req.params["layer"];
    if (!tileIndexes.hasOwnProperty(layer)) {
      send404(res);
      return emptyResponse;
    }
    const z = +req.params["z"];
    const x = +req.params["x"];
    const y = +req.params["y"];
    const tile = tileIndexes[layer].getTile(z, x, y);
    return { tile, x, y, z };
  };

  app.get("/", (_, res) => send404(res));

  app.get("/:layer/:z/:x/:y.geojson", (req, res) => {
    const { tile, x = 0, y = 0, z = 0 } = getTile(req, res);
    if (!tile || !tile.features) {
      return res.json({});
    }
    const vectorTiles = tile.features as IVectorTile[];
    res.json(toFeatureCollection(vectorTiles, x, y, z, extent));
  });

  app.get("/:layer/:z/:x/:y.vt", (req, res) => {
    const { tile } = getTile(req, res);
    if (!tile || !tile.features) {
      return;
    }
    const vectorTiles = tile.features as IVectorTile[];
    res.json(vectorTiles);
  });

  app.get("/:layer/:z/:x/:y.mvt", (req, res) => {
    const { tile } = getTile(req, res);
    if (!tile || !tile.features) {
      return;
    }
    /** Notice that I set the source-layer (for Mapbox GL) to all */
    res.send(Buffer.from(vtpbf.fromGeojsonVt({ all: tile })));
  });

  app.listen(httpPort, () =>
    console.info(`Wait until data is loaded and processed...`)
  );
};

export const createService = (options: ICommandOptions) => {
  startService(options);
};
