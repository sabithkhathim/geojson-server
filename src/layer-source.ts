
export interface ILayer {
    layerName: string,
    sourceQuery: string,
    extend: number
}

export async function getLayers(): Promise<ILayer[]> {
    const layers: ILayer[] = [{
        layerName: 'network-sections',
        sourceQuery: `select 'FeatureCollection' As type, array_to_json(array_agg(f)) As features from (select 'Feature' As type, ST_AsGeoJSON(ns.geom,5):: json As geometry, row_to_json(ns) As properties from network_sections as ns where 'geom' is not null and (end_date > now() or end_date is null)) As f`,
        extend: 4096
    },{
        layerName: 'assets',
        sourceQuery: `select 'FeatureCollection' As type, array_to_json(array_agg(f)) As features from (select 'Feature' As type, ST_AsGeoJSON(pa.geom,5):: json As geometry, row_to_json(pa) As properties from point_assets as pa where 'geom' is not null) As f`,
        extend: 4096
    }];
    return Promise.resolve(layers)
}