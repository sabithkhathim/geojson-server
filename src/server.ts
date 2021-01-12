import * as express from "express";
import * as cors from "cors";
import * as compression from 'compression'
import * as chalk from 'chalk';
import * as vtpbf from "vt-pbf";
import { createTile, getTile, send404 } from "./utils";
import { ICommandOptions } from "./cli";
import { IVectorTile, toFeatureCollection } from "./vt2geojson";
import { getLayers, ILayer } from "./layer-source";
import connection from './database'

/** GeojsonVT extent option */
let layerFailure = false

const startService = async (options: ICommandOptions) => {
  
  console.log(chalk.yellow(`Initializing...`));
  console.log(chalk.yellow(`Fetching list of layers...`));

  const layers: ILayer[] = await getLayers().then(layers => {
    console.log(chalk.green(`List of layers loaded.`))
    return layers
  }).catch(err => {
    layerFailure = true
    console.log(chalk.bold.red(`Error while fetching list of layers.`));
    return err
  });
  const tiles: { [key: string]: any } = {};
  
  for (const layer of layers) {
    if(layerFailure) {
      console.log(chalk.bold.red(`Skipping further layer processing.`));
      break;
    }
    console.log(chalk.yellow(`Processing layer ${layer.layerName}...`));
    const tile = await createTile(layer, connection, {
      extent: layer.extend,
      maxZoom: options.maxZoom,
      generateId: options.generatedId,
      promoteId: options.promoteId,
      buffer: options.buffer,
    }).then(data => {
      console.log(chalk.green(`Layer ${layer.layerName} loaded.`))
      return data
    }).catch(err => {
      console.log(err)
      layerFailure = true
      console.log(chalk.bold.red(`Failed to load ${layer.layerName}.`))
    });
    tiles[layer.layerName] = tile;
  }

  if(layerFailure) {
    console.log(chalk.bold.red(`One of the layers failed to load. Server initialization halted.`))
    return false
  }

  const app = express();
  app.use(cors());
  app.use(compression())
  app.get("/", (_, res) => send404(res));

  app.use("/:layer/:z/:x/:y.*", (req, res, next) => {
    tiles.hasOwnProperty(req.params["layer"]) ? next() : send404(res);
  });

  app.get("/:layer/:z/:x/:y.geojson", (req, res) => {
    const { tile, x = 0, y = 0, z = 0 } = getTile(tiles, req);
    if (!tile || !tile.features) return res.writeHead(204).end()
    res.json(toFeatureCollection(tile.features as IVectorTile[], x, y, z));
  });

  app.get("/:layer/:z/:x/:y.mvt", (req, res) => {
    const { tile } = getTile(tiles, req);
    if (!tile || !tile.features) return res.writeHead(204).end()
    res.send(Buffer.from(vtpbf.fromGeojsonVt({ all: tile })));
  });
  
  const httpPort = options.port || process.env.port || 8080;
  app.listen(httpPort, () =>
    console.info(`Server started listening at http://localhost:${httpPort}/..`)
  );
};

export const createService = (options: ICommandOptions) => {
  startService(options);
};
