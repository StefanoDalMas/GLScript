
import {Plan} from './plan.js';
import {findBestTile} from '../tools/findBestTile.js';
import { astar, Graph } from "../tools/astar.js"
import {deliveroo_graph,delivery_tiles,spawning_tiles,me, client, parcel_locations} from '../main.js';

class GoTo extends Plan {

    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(go_to, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit

        //follow path until destination is reached
        let me_x = Math.round(me.x);
        let me_y = Math.round(me.y);
        while (me_x != x || me_y != y) {
            if (deliveroo_graph.getNode(x, y).isWall() || deliveroo_graph.getNode(me_x, me_y).isWall()) {
                this.log('stucked, walking to wall');
                throw ['stucked', 'walking to wall'];
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit
            let path = astar.search(deliveroo_graph, deliveroo_graph.grid[me_x][me_y], deliveroo_graph.grid[x][y]);
            if (path.length === 0) {
                this.log('stucked, no path foound');
                throw ['stucked', 'no path foound'];
            }
            for (let index = 0; index < path.length; index++) {
                if (this.stopped) throw ['stopped']; // if stopped then quit

                let status = false;
                let next_tile = path[index];
                //evaluate if it is a up, down, left or right move
                //TODO using deliveroo_graph.neighbors()???
                if (next_tile.x == me_x + 1 && next_tile.y == me_y && !deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
                    status = await client.move('right')
                } else if (next_tile.x == me_x - 1 && next_tile.y == me_y && !deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
                    status = await client.move('left')
                } else if (next_tile.x == me_x && next_tile.y == me_y + 1 && !deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
                    status = await client.move('up')
                } else if (next_tile.x == me_x && next_tile.y == me_y - 1 && !deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
                    status = await client.move('down')
                }
                if (status) {
                    me.x = Math.round(status.x);
                    me_x = me.x;
                    me.y = Math.round(status.y);
                    me_y = me.y;
                } else {
                    this.log('stucked, movement fail');
                    throw ['stucked', 'movement fail'];
                }

                // if (this.stopped) throw ['stopped']; // if stopped then quit

                if (me_x != x || me_y != y) {
                    // se sono su una consegna, consegno
                    if (delivery_tiles.some(tile => tile[0] === me_x && tile[1] === me_y) && n_parcels > 0) {
                        await client.putdown()
                    }
                    if (this.stopped) throw ['stopped']; // if stopped then quit
                    // if I pass on a parcel, I pick it up and remove it from belief set
                    // if (parcel_locations.some(arr => arr[0] === me.x && arr[1] === me.y)){
                    if (parcel_locations[me_x][me_y] == 1) {
                        console.log("provo a tirar su con MOVE")
                        let status = await client.pickup()
                        // parcel_locations = parcel_locations.filter(item => !(item[0] !== me.x && item[1] !== me.y))
                        if (status) {
                            parcel_locations[me_x][me_y] = 0
                        }
                    }
                }
                if (this.stopped) throw ['stopped']; // if stopped then quit
            }

            if (this.stopped) throw ['stopped']; // if stopped then quit
        }

        return true;
    }
}

export {GoTo};