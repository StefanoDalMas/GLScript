import { Intention } from '../intentions/intention.js';
import { global } from '../tools/globals.js';
import { astar } from "../tools/astar.js"
import { findBestTile } from '../tools/findBestTile.js';
import { onlineSolver } from "@unitn-asa/pddl-client";
import { PDDLProblem } from '../planning/PDDLProblem.js';
import { client } from '../main.js';
import fs from 'fs';

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
        if (this.stopped) throw ['stopped']; // if stopped then quit)
        if (client.usingPddl) {
            await this.subIntention(['pddl_move', x, y]);
        }
        else {
            await this.subIntention(['go_to', x, y]);
        }
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await global.client.pickup()
        // global.parcelLocations = global.parcelLocations.filter(item => !(item[0] !== x && item[1] !== y))
        if (status) {
            global.parcelLocations[x][y] = { location: 0, id: undefined };
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
            let blocked = false;
            for (let index = 0; index < path.length && !blocked; index++) {
                if (this.parent instanceof GoPickUp) {
                    let possible_parcel_id = global.parcelLocations[x][y].id;
                    if (possible_parcel_id) {
                        let parcel = global.parcels.get(possible_parcel_id);
                        if (parcel.carriedBy && parcel.carriedBy !== global.me.id) {
                            throw ['someone took the parcel, exiting'];
                        }
                    }
                }
                if (this.parent instanceof GoPutDown) {
                    if (global.me.parcels_on_head === 0) {
                        throw ['no parcels on head, exiting'];
                    }
                }

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
                    blocked = true;
                    // TODO logica del riprovare il percorso
                    // this.log('stucked, movement fail');
                    // throw ['stucked', 'movement fail'];
                }

                // if (this.stopped) throw ['stopped']; // if stopped then quit

                if (me_x != x || me_y != y) {
                    // se sono su una consegna, consegno
                    if (global.delivery_tiles.some(tile => tile[0] === me_x && tile[1] === me_y) && global.me.parcels_on_head > 0) {
                        let status = await global.client.putdown();
                        if (status) {
                            global.me.parcels_on_head = 0;
                        }
                    }
                    if (this.stopped) throw ['stopped']; // if stopped then quit
                    // if I pass on a parcel, I pick it up and remove it from belief set
                    // if (global.parcelLocations.some(arr => arr[0] === global.me.x && arr[1] === global.me.y)){
                    if (global.parcelLocations[me_x][me_y].present == 1) {
                        console.log("provo a tirar su con MOVE")
                        let status = await global.client.pickup()
                        // global.parcelLocations = global.parcelLocations.filter(item => !(item[0] !== global.me.x && item[1] !== global.me.y))
                        if (status) {
                            global.parcelLocations[me_x][me_y] = { location: 0, id: undefined };
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
        if (client.usingPddl) {
            await this.subIntention(['pddl_move', x, y]);
        } else {
            await this.subIntention(['go_to', x, y]);
        }
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await global.client.putdown();
        if (status) {
            global.go_put_down_tries = 0;
            global.me.parcels_on_head = 0;
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
            if (client.usingPddl) {
                //since planner is too slow, it is better do directly move to the tile here
                let status = false;
                if (new_tile.x == me_x + 1 && new_tile.y == me_y && !global.deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
                    status = await global.client.move('right')
                } else if (new_tile.x == me_x - 1 && new_tile.y == me_y && !global.deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
                    status = await global.client.move('left')
                } else if (new_tile.x == me_x && new_tile.y == me_y + 1 && !global.deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
                    status = await global.client.move('up')
                } else if (new_tile.x == me_x && new_tile.y == me_y - 1 && !global.deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
                    status = await global.client.move('down')
                }
                if (status) {
                    global.me.x = Math.round(status.x);
                    me_x = global.me.x;
                    global.me.y = Math.round(status.y);
                    me_y = global.me.y;
                } else {
                    throw ['got blocked by someone, exiting random_move'];
                }
            } else {
                await this.subIntention(['go_to', new_tile.x, new_tile.y]);
            }
            return true;

        } else {
            return false;
        }
    }
}

class PDDLMove extends Plan {
    static isApplicableTo(pddl_move, x, y) {
        return pddl_move == 'pddl_move';
    }
    async execute(pddl_move, x, y) {
        if (global.me.x != undefined && global.me.y != undefined) {

            let me_x = Math.round(global.me.x);
            let me_y = Math.round(global.me.y);

            console.log("create PDDL string");
            let graph = global.deliveroo_graph
            let from = global.deliveroo_graph.grid[me_x][me_y]
            let to = global.deliveroo_graph.grid[x][y]
            let problem = new PDDLProblem(graph, from, to);
            let problemString = await problem.getProblemString();
            let domainString = fs.readFileSync('./src/planning/deliveroojs.pddl', 'utf8').replace(/\r?\n|\r/g, '').replace(/\s\s+/g, ' ');

            console.log("sending to remote solver");
            let plan = await onlineSolver(domainString, problemString);

            if (plan) {
                //since we have to await for the result, we have to check again if 
                // the parcel was not picked up by someone else 
                // and if the reward is still positive
                if (this.parent instanceof GoPickUp) {
                    let possible_parcel_id = global.parcelLocations[x][y].id;
                    if (possible_parcel_id) {
                        let parcel = global.parcels.get(possible_parcel_id);
                        if (!parcel.carriedBy || parcel.carriedBy === global.me.id) {
                            let delta_seconds = Date.now() - parcel.timestamp;
                            let reward = parcel.rewardAfterNSeconds(delta_seconds / 1000);
                            if (reward <= 0) {
                                throw ['bad reward, exiting'];
                            }
                        }
                        else {
                            throw ['someone took the parcel, exiting'];
                        }
                    }
                }
                if (this.parent instanceof GoPutDown){
                    if (global.me.parcels_on_head === 0) {
                        throw ['no parcels on head, exiting'];
                    }
                }
                console.log("unpack plan");
                let status = false;
                for (let step of plan) {
                    if (step.action == 'move_right') {
                        console.log("move right")
                        status = await global.client.move('right')
                    }
                    if (step.action == 'move_left') {
                        console.log("move left")
                        status = await global.client.move('left')
                    }
                    if (step.action == 'move_up') {
                        console.log("move up")
                        status = await global.client.move('up')
                    }
                    if (step.action == 'move_down') {
                        console.log("move down")
                        status = await global.client.move('down')
                    }

                    if (status) {
                        global.me.x = Math.round(status.x);
                        me_x = global.me.x;
                        global.me.y = Math.round(status.y);
                        me_y = global.me.y;
                    } else {
                        console.log("blocked")
                        // da decidere cosa fare se provo a muovermi ma qualche infame mi viene davanti e mi blocca
                        // esce dall'intenzione, verrà visto il nuovo path da fare e si pusha un altro pddl_move
                        throw ['got blocked by someone, exiting pddl_move'];
                    }

                    if (me_x != x || me_y != y) {
                        // se sono su una consegna, consegno
                        if (global.delivery_tiles.some(tile => tile[0] === me_x && tile[1] === me_y) && global.me.parcels_on_head > 0) {
                            let status = await global.client.putdown();
                            if (status) {
                                global.me.parcels_on_head = 0;
                            }
                        }
                        if (this.stopped) throw ['stopped']; // if stopped then quit
                        // if I pass on a parcel, I pick it up and remove it from belief set
                        // if (global.parcelLocations.some(arr => arr[0] === global.me.x && arr[1] === global.me.y)){
                        if (global.parcelLocations[me_x][me_y].present == 1) {
                            console.log("provo a tirar su con MOVE")
                            let status = await global.client.pickup()
                            // global.parcelLocations = global.parcelLocations.filter(item => !(item[0] !== global.me.x && item[1] !== global.me.y))
                            if (status) {
                                global.parcelLocations[me_x][me_y] = { location: 0, id: undefined };
                            }
                        }
                    }
                }
            } else {
                // qua da mettere cosa fare nel caso in cui non viene trovato un plan per andare da qualche parte (non c'è una strada perchè qualcuno in mezzo)
                console.log("bo")
                //direi che se non trova nulla, riprova a fare un random move
                await this.subIntention(['random_move']);
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit

        }
    }
}


const planLibrary = []
planLibrary.push(GoPickUp);
planLibrary.push(GoPutDown);
planLibrary.push(GoTo);
planLibrary.push(RandomMove);
planLibrary.push(PDDLMove);

export { planLibrary };