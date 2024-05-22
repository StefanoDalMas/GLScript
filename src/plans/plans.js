import {Intention} from '../intentions/intention.js';
import { global } from '../tools/globals.js';
import { astar } from "../tools/astar.js"
import { findBestTile } from '../tools/findBestTile.js';
class Plan {

    // This is used to stop the plan
    #stopped = false;
    stop() {
        this.log('stop plan');
        this.#stopped = true;
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }
    get stopped() {
        return this.#stopped;
    }

    /**
     * #parent refers to caller
     */
    parent;
    
    constructor(parent) {
        this.parent = parent;
    }

    log(...args) {
        if (this.parent && this.parent.log)
            this.parent.log('\t', ...args)
        else
            console.log(...args)
    }

    // this is an array of sub intention. Multiple ones could eventually being achieved in parallel.
    #sub_intentions = [];

    async subIntention(predicate) {
        const sub_intention = new Intention(this, predicate);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

class GoPickUp extends Plan {

    static isApplicableTo(go_pick_up, x, y, id) {
        return go_pick_up == 'go_pick_up';
    }

    async execute(go_pick_up, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await global.client.pickup()
        // global.parcel_locations = global.parcel_locations.filter(item => !(item[0] !== x && item[1] !== y))
        if (status) {
            global.parcel_locations[x][y] = 0
            console.log("provo a tirar su con PICK UP")
            if (this.stopped) throw ['stopped']; // if stopped then quit
            return true;
        }
        return false;
    }

}
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
                // TODO: controllo da fare per skippare la go put down se non ho niente in testa
                // il valore che si tiene in testa va calcolato con formula, me.score è il punteggio totale T.T
                // if (this.parent instanceof GoPutDown) {
                //     if (global.me.score == 0){ // SBAGLIATO!
                //         console.log(global.me.score)
                //         this.stop()
                //         if (this.stopped) throw ['stopped', '0 value on my head']
                //     }
                // }

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

class GoPutDown extends Plan {

    static isApplicableTo(go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }

    async execute(go_put_down, x, y, id) {
        console.log("put_down_in_queue", global.put_down_in_queue)
        global.put_down_in_queue = false;
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await global.client.putdown();
        if (status) {
            global.go_put_down_tries = 0;
            return true;
        }
        return false;
    }

}

class RandomMove extends Plan {

    static isApplicableTo(random_move, x, y) {
        return random_move == 'random_move';
    }

    async execute(random_move) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        console.log("entro random")
        if (global.me.x != undefined && global.me.y != undefined) {
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
                } else {
                    //extra check if path becomes unreachable while calcualting astar
                    new_tile = neighbours[Math.floor(Math.random() * neighbours.length)]
                }
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


const planLibrary = []
planLibrary.push(GoPickUp);
planLibrary.push(GoPutDown);
planLibrary.push(GoTo);
planLibrary.push(RandomMove);

export {planLibrary};