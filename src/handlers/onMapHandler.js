import { consts } from '../classes/consts.js'
import { Graph } from '../tools/astar.js';

async function onMapHandler(width, height, tiles, beliefs) {
    let MAX_WIDTH = width - 1;
    let MAX_HEIGHT = height - 1;

    let deliveroo_map = [];
    for (let i = 0; i < width; i++) {
        deliveroo_map[i] = [];
        beliefs.parcelLocations[i] = [];
        for (let j = 0; j < height; j++) {
            deliveroo_map[i][j] = 0;
            beliefs.parcelLocations[i][j] = { present: 0, id: undefined };
        }
    }

    tiles.forEach(tile => {
        deliveroo_map[tile.x][tile.y] = 1;
        if (tile.delivery) {
            beliefs.delivery_tiles.push([tile.x, tile.y]);
        }
        if (tile.parcelSpawner) {
            beliefs.spawning_tiles.push([tile.x, tile.y]);
        }
    });

    if (beliefs.spawning_tiles.length === tiles.length - beliefs.delivery_tiles.length) {
        beliefs.all_spawning = true;
    }

    beliefs.deliveroo_graph = new Graph(deliveroo_map);
    beliefs.deliveroo_map = deliveroo_map;
    consts.MAX_HEIGHT = MAX_HEIGHT;
    consts.MAX_WIDTH = MAX_WIDTH;
}

export { onMapHandler }