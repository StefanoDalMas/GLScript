
import { Plan } from './plan.js';
import { astar } from "../tools/astar.js"
import { global } from '../tools/globals.js';

class GoTo extends Plan {

    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(go_to, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit

        //follow path until destination is reached
        let me_x = Math.round(global.me.x);
        let me_y = Math.round(global.me.y);
        while (me_x != x || me_y != y) {
            if (global.deliveroo_graph.getNode(x, y).isWall() || global.deliveroo_graph.getNode(me_x, me_y).isWall()) {
                this.log('stucked, walking to wall');
                throw ['stucked', 'walking to wall'];
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit
            let path = astar.search(global.deliveroo_graph, global.deliveroo_graph.grid[me_x][me_y], global.deliveroo_graph.grid[x][y]);
            if (path.length === 0) {
                this.log('stucked, no path foound');
                throw ['stucked', 'no path foound'];
            }
            for (let index = 0; index < path.length; index++) {
                if (this.stopped) throw ['stopped']; // if stopped then quit

                let status = false;
                let next_tile = path[index];
                //evaluate if it is a up, down, left or right move
                //TODO using global.deliveroo_graph.neighbors()???
                if (next_tile.x == me_x + 1 && next_tile.y == me_y && !global.deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
                    status = await global.client.move('right')
                } else if (next_tile.x == me_x - 1 && next_tile.y == me_y && !global.deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
                    status = await global.client.move('left')
                } else if (next_tile.x == me_x && next_tile.y == me_y + 1 && !global.deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
                    status = await global.client.move('up')
                } else if (next_tile.x == me_x && next_tile.y == me_y - 1 && !global.deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
                    status = await global.client.move('down')
                }
                if (status) {
                    global.me.x = Math.round(status.x);
                    me_x = global.me.x;
                    global.me.y = Math.round(status.y);
                    me_y = global.me.y;
                } else {
                    this.log('stucked, movement fail');
                    throw ['stucked', 'movement fail'];
                }

                // if (this.stopped) throw ['stopped']; // if stopped then quit

                if (me_x != x || me_y != y) {
                    // se sono su una consegna, consegno
                    if (global.delivery_tiles.some(tile => tile[0] === me_x && tile[1] === me_y) && global.n_parcels > 0) {
                        await global.client.putdown()
                    }
                    if (this.stopped) throw ['stopped']; // if stopped then quit
                    // if I pass on a parcel, I pick it up and remove it from belief set
                    // if (global.parcel_locations.some(arr => arr[0] === global.me.x && arr[1] === global.me.y)){
                    if (global.parcel_locations[me_x][me_y] == 1) {
                        console.log("provo a tirar su con MOVE")
                        let status = await global.client.pickup()
                        // global.parcel_locations = global.parcel_locations.filter(item => !(item[0] !== global.me.x && item[1] !== global.me.y))
                        if (status) {
                            global.parcel_locations[me_x][me_y] = 0
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

export { GoTo };