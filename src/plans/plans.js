import { Intention } from '../intentions/intention.js';
import { consts } from '../classes/consts.js';
import { astar } from "../tools/astar.js"
import { findBestTile } from '../tools/findBestTile.js';
import { onlineSolver } from "@unitn-asa/pddl-client";
import { PDDLProblem } from '../planning/PDDLProblem.js';
import { client } from '../main.js';
import { Message } from '../classes/message.js';
import { Parcel } from '../classes/parcel.js';
import fs from 'fs';
import { sleep } from '../tools/sleep.js';
import { distance } from '../tools/distance.js'

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
        let status = await client.deliverooApi.pickup()
        // client.beliefSet.parcelLocations = client.beliefSet.parcelLocations.filter(item => !(item[0] !== x && item[1] !== y))
        if (status) {
            client.beliefSet.parcelLocations[x][y] = { location: 0, id: undefined };
            console.log("provo a tirar su con PICK UP")
            if (this.stopped) throw ['stopped']; // if stopped then quit
            return true;
        } else {
            console.log("mhhhhhhh food")
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
        let me_x = Math.round(client.beliefSet.me.x);
        let me_y = Math.round(client.beliefSet.me.y);
        let goToTries = 0;
        while ((me_x != x || me_y != y) && goToTries < consts.MAX_PLAN_TRIES) {
            if (client.beliefSet.deliveroo_graph.getNode(x, y).isWall() || client.beliefSet.deliveroo_graph.getNode(me_x, me_y).isWall()) {
                this.log('stucked, walking to wall');
                return false;
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit
            let path = astar.search(client.beliefSet.deliveroo_graph, client.beliefSet.deliveroo_graph.grid[me_x][me_y], client.beliefSet.deliveroo_graph.grid[x][y]);
            goToTries += 1;
            if (path.length === 0) {
                this.log('stucked, no path found');
                return false;
            }
            let blocked = false;
            for (let index = 0; index < path.length && !blocked; index++) {
                if (this.parent instanceof GoPickUp) {
                    if (client.beliefSet.parcelLocations[x][y].present != 0) {
                        let possible_parcel_id = client.beliefSet.parcelLocations[x][y].id;
                        if (possible_parcel_id) {
                            let parcel = client.beliefSet.parcels.get(possible_parcel_id);
                            if (parcel.carriedBy && parcel.carriedBy !== client.beliefSet.me.id) {
                                return false;
                            }
                        }
                    }
                }
                if (this.parent instanceof GoPutDown) {
                    if (client.beliefSet.me.parcels_on_head === 0) {
                        return false;
                    }
                }

                if (this.stopped) throw ['stopped']; // if stopped then quit

                let status = false;
                let next_tile = path[index];
                //evaluate if it is a up, down, left or right move
                //TODO using client.beliefSet.deliveroo_graph.neighbors()???
                if (next_tile.x == me_x + 1 && next_tile.y == me_y && !client.beliefSet.deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
                    status = await client.deliverooApi.move('right')
                } else if (next_tile.x == me_x - 1 && next_tile.y == me_y && !client.beliefSet.deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
                    status = await client.deliverooApi.move('left')
                } else if (next_tile.x == me_x && next_tile.y == me_y + 1 && !client.beliefSet.deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
                    status = await client.deliverooApi.move('up')
                } else if (next_tile.x == me_x && next_tile.y == me_y - 1 && !client.beliefSet.deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
                    status = await client.deliverooApi.move('down')
                }
                if (status) {
                    client.beliefSet.me.x = Math.round(status.x);
                    me_x = client.beliefSet.me.x;
                    client.beliefSet.me.y = Math.round(status.y);
                    me_y = client.beliefSet.me.y;
                } else {
                    blocked = true;
                    // TODO logica del riprovare il percorso
                    // this.log('stucked, movement fail');
                    // throw ['stucked', 'movement fail'];
                }


                if (me_x != x || me_y != y) {
                    // se sono su una consegna, consegno
                    if (client.beliefSet.delivery_tiles.some(tile => tile[0] === me_x && tile[1] === me_y) && client.beliefSet.me.parcels_on_head > 0) {
                        let status = await client.deliverooApi.putdown();
                        if (status) {
                            client.beliefSet.me.parcels_on_head = 0;
                        }
                    }
                    if (this.stopped) throw ['stopped']; // if stopped then quit
                    // if I pass on a parcel, I pick it up and remove it from belief set
                    // if (client.beliefSet.parcelLocations.some(arr => arr[0] === client.beliefSet.me.x && arr[1] === client.beliefSet.me.y)){
                    if (client.beliefSet.parcelLocations[me_x][me_y].present == 1) {
                        console.log("provo a tirar su con MOVE")
                        let status = await client.deliverooApi.pickup()
                        // client.beliefSet.parcelLocations = client.beliefSet.parcelLocations.filter(item => !(item[0] !== client.beliefSet.me.x && item[1] !== client.beliefSet.me.y))
                        if (status) {
                            client.beliefSet.parcelLocations[me_x][me_y] = { location: 0, id: undefined };
                        }
                    }
                }
                if (this.stopped) throw ['stopped']; // if stopped then quit

            }

            if (this.stopped) throw ['stopped']; // if stopped then quit
        }
        if (goToTries >= consts.MAX_PLAN_TRIES) {
            return false;
        }

        return true;
    }
}

class GoPutDown extends Plan {

    static isApplicableTo(go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }

    async execute(go_put_down, x, y, id) {
        console.log("put_down_in_queue", consts.put_down_in_queue)
        consts.put_down_in_queue = false;
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let statusMove = false;
        if (client.usingPddl) {
            statusMove = await this.subIntention(['pddl_move', x, y]);
        } else {
            statusMove = await this.subIntention(['go_to', x, y]);
        }
        if (this.stopped) throw ['stopped']; // if stopped then quit
        if (statusMove) {
            let status = await client.deliverooApi.putdown();
            if (status) {
                consts.go_put_down_tries = 0;
                client.beliefSet.me.parcels_on_head = 0;
                return true;
            }
            return false;
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
        if (client.beliefSet.me.x != undefined && client.beliefSet.me.y != undefined) {
            let me_x = Math.round(client.beliefSet.me.x);
            let me_y = Math.round(client.beliefSet.me.y);
            let neighbours = client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[me_x][me_y]).filter(node => !node.isWall())
            //not using this one because of check me_x and me_y

            if (neighbours.length === 0) {
                this.log('stucked');
                return false;
            }

            let objective_tile;
            let path_length = 0;
            //if all spawn, go to closest delivery tile, else closest spawn tile
            let best_option = client.beliefSet.all_spawning ? findBestTile(client.beliefSet.delivery_tiles) : findBestTile(client.beliefSet.spawning_tiles);
            let new_tile;
            if (best_option) {
                let random = Math.random();
                let max_distance = 10;
                let max_probability = 0.85;
                let probability = 0.0;
                let path = astar.search(client.beliefSet.deliveroo_graph, client.beliefSet.deliveroo_graph.grid[me_x][me_y], client.beliefSet.deliveroo_graph.grid[best_option[0]][best_option[1]]);
                if (path.length > 0) {
                    let neighbors = client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[me_x][me_y]).filter(node => !node.isWall());
                    //if I'm in a corridor, just follow the path
                    objective_tile = path[0];
                    if (neighbors.length >= 1 && neighbors.length <= 2) {
                        new_tile = objective_tile;
                    }
                    else {
                        path_length = path.length;
                        probability = Math.min(1, max_probability * ((path_length - 1) / (max_distance - 1)))
                        if (random < probability && client.beliefSet.deliveroo_graph) {
                            // console.log("objective tile", objective_tile.x, objective_tile.y)
                            // let tile = client.beliefSet.deliveroo_graph.grid[objective_tile.x][objective_tile.y]
                            new_tile = objective_tile
                        } else {
                            let filtered_neighbours = neighbours.filter(node => node.x !== objective_tile.x || node.y !== objective_tile.y)
                            if (filtered_neighbours.length > 0) {
                                new_tile = filtered_neighbours[Math.floor(Math.random() * filtered_neighbours.length)]
                            }
                            else {
                                return false;
                            }
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
            if (client.deliverooApi.usingPddl) {
                //since planner is too slow, it is better do directly move to the tile here
                let status = false;
                if (new_tile.x == me_x + 1 && new_tile.y == me_y && !client.beliefSet.deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
                    status = await client.deliverooApi.move('right')
                } else if (new_tile.x == me_x - 1 && new_tile.y == me_y && !client.beliefSet.deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
                    status = await client.deliverooApi.move('left')
                } else if (new_tile.x == me_x && new_tile.y == me_y + 1 && !client.beliefSet.deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
                    status = await client.deliverooApi.move('up')
                } else if (new_tile.x == me_x && new_tile.y == me_y - 1 && !client.beliefSet.deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
                    status = await client.deliverooApi.move('down')
                }
                if (status) {
                    client.beliefSet.me.x = Math.round(status.x);
                    me_x = client.beliefSet.me.x;
                    client.beliefSet.me.y = Math.round(status.y);
                    me_y = client.beliefSet.me.y;
                } else {
                    return false;
                }
                if (this.stopped) throw ['stopped'];
            } else {
                await this.subIntention(['go_to', new_tile.x, new_tile.y]);
            }
            if (this.stopped) throw ['stopped'];
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
        if (client.beliefSet.me.x != undefined && client.beliefSet.me.y != undefined) {
            if (this.stopped) throw ['stopped'];
            let status = false;
            let me_x = Math.round(client.beliefSet.me.x);
            let me_y = Math.round(client.beliefSet.me.y);
            let neighbours = client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[me_x][me_y]).filter(node => !node.isWall())

            //if im adjecent to a delivery tile, go deliver before calling planner
            let delivery_neighbour = neighbours.find(node => client.beliefSet.delivery_tiles.some(tile => tile[0] === node.x && tile[1] === node.y))
            if (delivery_neighbour) {
                //compute direction to go to the neighbour
                let direction = ''
                if (delivery_neighbour.x == me_x + 1 && delivery_neighbour.y == me_y && !client.beliefSet.deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
                    direction = 'right'
                } else if (delivery_neighbour.x == me_x - 1 && delivery_neighbour.y == me_y && !client.beliefSet.deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
                    direction = 'left'
                } else if (delivery_neighbour.x == me_x && delivery_neighbour.y == me_y + 1 && !client.beliefSet.deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
                    direction = 'up'
                } else if (delivery_neighbour.x == me_x && delivery_neighbour.y == me_y - 1 && !client.beliefSet.deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
                    direction = 'down'
                }
                status = await client.deliverooApi.move(direction)

                if (status) {
                    await client.deliverooApi.putdown();
                    client.beliefSet.me.x = Math.round(status.x);
                    me_x = client.beliefSet.me.x;
                    client.beliefSet.me.y = Math.round(status.y);
                    me_y = client.beliefSet.me.y;
                }
                if (this.stopped) throw ['stopped'];
                //we don't have else here, we're fine
            }


            console.log("create PDDL string");
            let graph = client.beliefSet.deliveroo_graph
            let from = client.beliefSet.deliveroo_graph.grid[me_x][me_y]
            let to = client.beliefSet.deliveroo_graph.grid[x][y]
            let problem = new PDDLProblem(graph, from, to);
            let problemString = await problem.getProblemString();
            let domainString = fs.readFileSync('./src/planning/deliveroojs.pddl', 'utf8').replace(/\r?\n|\r/g, '').replace(/\s\s+/g, ' ');

            console.log("sending to remote solver");
            let plan = await onlineSolver(domainString, problemString);
            if (this.stopped) throw ['stopped'];

            if (plan) {
                //since we have to await for the result, we have to check again if 
                // the parcel was not picked up by someone else 
                // and if the reward is still positive
                if (this.parent instanceof GoPickUp) {
                    let possible_parcel_id = client.beliefSet.parcelLocations[x][y].id;
                    if (possible_parcel_id) {
                        if (client.beliefSet.parcelLocations[x][y].present != 0) {
                            let parcel = client.beliefSet.parcels.get(possible_parcel_id);
                            //this might not be necessary 
                            // because it depends on if the sensing is done here
                            if (!parcel.carriedBy || parcel.carriedBy === client.beliefSet.me.id) {
                                let delta_seconds = Date.now() - parcel.timestamp;
                                let reward = parcel.rewardAfterNSeconds(delta_seconds / 1000);
                                if (reward <= 0) {
                                    return false;
                                }
                            }
                            else {
                                return false;
                            }
                        }
                    }
                }
                if (this.stopped) throw ['stopped'];

                if (this.parent instanceof GoPutDown) {
                    if (client.beliefSet.me.parcels_on_head === 0) {
                        return false;
                    }
                    else {
                        let finalReward = 0;
                        let carriedParcels = client.beliefSet.parcels.values().filter(parcel => parcel.carriedBy === client.beliefSet.me.id);

                        for (let parcel of carriedParcels) {
                            let parcelObj = new Parcel(parcel);
                            let reward = parcelObj.rewardAfterNSteps(plan.length);
                            finalReward += reward;
                        }
                        if (finalReward <= 0) {
                            return false;
                        }
                    }
                }
                if (this.stopped) throw ['stopped'];
                console.log("unpack plan");
                status = false;
                let goToTries = 0;
                for (let i = 0; i < plan.length && goToTries < consts.MAX_PLAN_TRIES; i++) {
                    if (this.stopped) throw ['stopped'];
                    let step = plan[i];

                    if (step.action == 'move_right') {
                        console.log("move right");
                        status = await client.deliverooApi.move('right');
                    }
                    if (step.action == 'move_left') {
                        console.log("move left");
                        status = await client.deliverooApi.move('left');
                    }
                    if (step.action == 'move_up') {
                        console.log("move up");
                        status = await client.deliverooApi.move('up');
                    }
                    if (step.action == 'move_down') {
                        console.log("move down");
                        status = await client.deliverooApi.move('down');
                    }

                    if (status) {
                        if (goToTries > 0) {
                            goToTries -= 1;
                        }
                        client.beliefSet.me.x = Math.round(status.x);
                        me_x = client.beliefSet.me.x;
                        client.beliefSet.me.y = Math.round(status.y);
                        me_y = client.beliefSet.me.y;
                    } else {
                        console.log("blocked")
                        await sleep(500);
                        goToTries += 1;
                        i -= 1;
                    }
                    if (me_x != x || me_y != y) {
                        // se sono su una consegna, consegno
                        if (client.beliefSet.delivery_tiles.some(tile => tile[0] === me_x && tile[1] === me_y) && client.beliefSet.me.parcels_on_head > 0) {
                            let status = await client.deliverooApi.putdown();
                            if (status) {
                                client.beliefSet.me.parcels_on_head = 0;
                            }
                        }
                        if (this.stopped) throw ['stopped']; // if stopped then quit
                        // if I pass on a parcel, I pick it up and remove it from belief set
                        // if (client.beliefSet.parcelLocations.some(arr => arr[0] === client.beliefSet.me.x && arr[1] === client.beliefSet.me.y)){
                        if (client.beliefSet.parcelLocations[me_x][me_y].present == 1) {
                            console.log("provo a tirar su con MOVE")
                            let status = await client.deliverooApi.pickup()
                            // client.beliefSet.parcelLocations = client.beliefSet.parcelLocations.filter(item => !(item[0] !== client.beliefSet.me.x && item[1] !== client.beliefSet.me.y))
                            if (status) {
                                client.beliefSet.parcelLocations[me_x][me_y] = { location: 0, id: undefined };
                            }
                        }
                    }
                }
                if (goToTries >= consts.MAX_PLAN_TRIES) {
                    return false;
                }
            } else {
                // qua da mettere cosa fare nel caso in cui non viene trovato un plan per andare da qualche parte (non c'è una strada perchè qualcuno in mezzo)
                return false;
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit
            return true;

        }
    }
}


class AtomicExchange extends Plan {
    static isApplicableTo(atomic_exchange, x, y, hasToDrop) {
        return atomic_exchange == 'atomic_exchange';
    }
    async execute(atomic_exchange, x, y, hasToDrop) {
        //we never check if (this.stopped) throw ['stopped']; because we cannot preempt this plan

        let goToMiddlePointCounter = 0;
        //se ho l'alleato in mezzo dustance diventa 0 perchè non trova un percorso possibile
        //distance(client.beliefSet.me, { x: x, y: y }) > 1
        let allyFound = false;
        let allyLocation;
        while (goToMiddlePointCounter < consts.MAX_PLAN_TRIES && (client.beliefSet.me.x != x || client.beliefSet.me.y != y) && !allyFound) {
            let neighbors = client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[client.beliefSet.me.x][client.beliefSet.me.y]);
            //find if my ally is what is blocking me
            for (let ally of client.allyList) {
                for (let neighbour of neighbors) {
                    let myAlly = client.beliefSet.agentsLocations.get(ally.id);
                    if (myAlly) {
                        if (neighbour.x === myAlly.x && neighbour.y === myAlly.y) {
                            allyFound = true;
                            allyLocation = { x: Math.round(myAlly.x), y: Math.round(myAlly.y) };
                        }
                    }
                }
            }
            await this.subIntention(['go_to', x, y]);
            goToMiddlePointCounter++;
        }
        if (goToMiddlePointCounter >= consts.MAX_PLAN_TRIES) {
            //for each ally in the list of allies
            for (let ally of client.allyList) {
                // consts.deliveryingAfterCollaboration = false;
                await client.deliverooApi.say(ally, new Message("fail", client.secretToken, "Can't reach the middle point, exiting plan!"));
            }
            return false;
        }
        let ts = Date.now();
        while (!allyFound) {
            for (let ally of client.allyList) {
                let myAlly = client.beliefSet.agentsLocations.get(ally.id);
                let me_x = Math.round(client.beliefSet.me.x);
                let me_y = Math.round(client.beliefSet.me.y);
                let neighbors = client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[me_x][me_y]);
                for (let neighbour of neighbors) {
                    if (neighbour) {
                        if (myAlly.x === neighbour.x && myAlly.y === neighbour.y) {
                            allyFound = true;
                            allyLocation = { x: Math.round(myAlly.x), y: Math.round(myAlly.y) };
                        }
                    }
                }
            }
            await sleep(100);
            if (Date.now() - ts > 3000) {
                for (let ally of client.allyList) {
                    await client.deliverooApi.say(ally.id, new Message("fail", client.secretToken, "Who is there!?"));
                }
                return false;
            }
        }
        await sleep(300);
        //now they are both near to each other, we can start the exchange
        if (hasToDrop) {

            let status = await client.deliverooApi.putdown();
            let me_x = Math.round(client.beliefSet.me.x);
            let me_y = Math.round(client.beliefSet.me.y);
            client.beliefSet.parcelLocations[me_x][me_y] = { location: 0, id: undefined };
            if (status) {
                client.beliefSet.me.parcels_on_head = 0;
            }
            let direction = '';
            if (allyLocation.x === me_x + 1 && allyLocation.y === me_y) {
                direction = 'left';
            } else if (allyLocation.x === me_x - 1 && allyLocation.y === me_y) {
                direction = 'right';
            } else if (allyLocation.x === me_x && allyLocation.y === me_y + 1) {
                direction = 'down';
            } else if (allyLocation.x === me_x && allyLocation.y === me_y - 1) {
                direction = 'up';
            }
            await client.deliverooApi.move(direction);
            await sleep(1000);
            // consts.atomic_exchange_in_queue = false;
        } else {
            let direction = '';
            let me_x = Math.round(client.beliefSet.me.x);
            let me_y = Math.round(client.beliefSet.me.y);
            if (allyLocation.x === me_x + 1 && allyLocation.y === me_y) {
                direction = 'right';
            } else if (allyLocation.x === me_x - 1 && allyLocation.y === me_y) {
                direction = 'left';
            } else if (allyLocation.x === me_x && allyLocation.y === me_y + 1) {
                direction = 'up';
            } else if (allyLocation.x === me_x && allyLocation.y === me_y - 1) {
                direction = 'down';
            }
            let moved = false;
            while (!moved) {
                moved = await client.deliverooApi.move(direction);
            }
            client.beliefSet.me.x = Math.round(moved.x);
            client.beliefSet.me.y = Math.round(moved.y);
            await client.deliverooApi.pickup();
            client.beliefSet.parcelLocations[me_x][me_y] = { location: 0, id: undefined };
            let closestDelivery = findBestTile(client.beliefSet.delivery_tiles);
            if (closestDelivery === undefined) {
                for (let allyId of client.allyList) {
                    await client.deliverooApi.say(allyId, new Message("fail", client.secretToken, "No delivery tiles found"));
                }
                return false;
            }
            await this.subIntention(['go_put_down', closestDelivery[0], closestDelivery[1]]);
            for (let allyId of client.allyList) {
                await client.deliverooApi.say(allyId, new Message("AtomicExchangeFinished", client.secretToken, "Atomic Exchange Finished!"));
            }

        }
        return true;
    }
}

const planLibrary = []
planLibrary.push(GoPickUp);
planLibrary.push(GoPutDown);
planLibrary.push(GoTo);
planLibrary.push(RandomMove);
planLibrary.push(PDDLMove);
planLibrary.push(AtomicExchange);

export { planLibrary };