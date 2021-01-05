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
      console.log("All done. Listening on http://localhost:8123/");
    }
  });

  const httpPort = options.port || process.env.PORT || 8123;
  const app = express();
  app.use(cors());
  app.use(express.static(process.env.PUBLIC_FOLDER || options.static));

  const send404 = (res: Response) => {
    res.status(404).send(
      `<h1>Welcome!</h1>`
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
