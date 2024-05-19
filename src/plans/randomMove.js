
import { Plan } from './plan.js';
import { findBestTile } from '../tools/findBestTile.js';
import { astar, Graph } from "../tools/astar.js"
import { global } from '../tools/globals.js';


class RandomMove extends Plan {

    static isApplicableTo(random_move, x, y) {
        return random_move == 'random_move';
    }

    async execute(random_move) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        console.log("entro random")
        if (global.me.x != undefined && global.me.y != undefined) {
            // console.log("entro if", global.me.x)
            // console.log("entro if", global.me.y)
            //from my position, choose an adjacent tile in deliveroo_map
            //see all the adjacent tiles that have value 1 in deliveroo_map and choose one randomly

            let me_x = Math.round(global.me.x);
            let me_y = Math.round(global.me.y);
            let neighbours = global.deliveroo_graph.neighbors(global.deliveroo_graph.grid[me_x][me_y]).filter(node => !node.isWall())
            //not using this one because of check me_x and me_y

            if (neighbours.length === 0) {
                this.log('stucked');
                throw ['stucked', ' no possible moves'];
            }

            let objective_tile;
            let path_length = 0;
            //if all spawn, go to closest delivery tile, else closest spawn tile
            let best_option = global.all_spawning ? findBestTile(global.delivery_tiles) : findBestTile(global.spawning_tiles);
            let new_tile;
            if (best_option) {
                let random = Math.random();
                let max_distance = 10;
                let max_probability = 0.7;
                let probability = 0.0;
                let path = astar.search(global.deliveroo_graph, global.deliveroo_graph.grid[me_x][me_y], global.deliveroo_graph.grid[best_option[0]][best_option[1]]);
                if (path.length > 0) {
                    objective_tile = path[0];
                    path_length = path.length;
                    probability = Math.min(1, max_probability * ((path_length - 1) / (max_distance - 1)))
                    if (random < probability && global.deliveroo_graph) {
                        // console.log("objective tile", objective_tile.x, objective_tile.y)
                        // let tile = global.deliveroo_graph.grid[objective_tile.x][objective_tile.y]
                        new_tile = objective_tile
                    } else {
                        let filtered_neighbours = neighbours.filter(node => node.x !== objective_tile.x || node.y !== objective_tile.y)
                        if (filtered_neighbours.length > 0) {
                            new_tile = filtered_neighbours[Math.floor(Math.random() * filtered_neighbours.length)]
                        }
                        else {
                            throw ['stucked', ' cant get closer to delivery'];
                        }
                    }
                }
                //extra check if path becomes unreachable while calcualting astar
                new_tile = neighbours[Math.floor(Math.random() * neighbours.length)]
            } else {
                new_tile = neighbours[Math.floor(Math.random() * neighbours.length)]
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit
            await this.subIntention(['go_to', new_tile.x, new_tile.y]);
            return true;

        } else {
            return false;
        }
    }
}

export { RandomMove };