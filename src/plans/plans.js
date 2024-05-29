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
        while ((me_x != x || me_y != y) && goToTries < consts.MAX_GOTO_TRIES) {
            if (client.beliefSet.deliveroo_graph.getNode(x, y).isWall() || client.beliefSet.deliveroo_graph.getNode(me_x, me_y).isWall()) {
                this.log('stucked, walking to wall');
                throw ['stucked', 'walking to wall'];
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit
            let path = astar.search(client.beliefSet.deliveroo_graph, client.beliefSet.deliveroo_graph.grid[me_x][me_y], client.beliefSet.deliveroo_graph.grid[x][y]);
            goToTries += 1;
            if (path.length === 0) {
                this.log('stucked, no path foound');
                throw ['stucked', 'no path foound'];
            }
            let blocked = false;
            for (let index = 0; index < path.length && !blocked; index++) {
                if (this.parent instanceof GoPickUp) {
                    if (client.beliefSet.parcelLocations[x][y].present != 0) {
                        let possible_parcel_id = client.beliefSet.parcelLocations[x][y].id;
                        if (possible_parcel_id) {
                            let parcel = client.beliefSet.parcels.get(possible_parcel_id);
                            if (parcel.carriedBy && parcel.carriedBy !== client.beliefSet.me.id) {
                                throw ['someone took the parcel, exiting'];
                            }
                        }
                    }
                }
                if (this.parent instanceof GoPutDown) {
                    if (client.beliefSet.me.parcels_on_head === 0) {
                        throw ['no parcels on head, exiting'];
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

                // if (this.stopped) throw ['stopped']; // if stopped then quit

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
        if (goToTries >= consts.MAX_GOTO_TRIES) {
            throw ['maximum numbers of tries reached, exiting...'];
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
        if (client.usingPddl) {
            await this.subIntention(['pddl_move', x, y]);
        } else {
            await this.subIntention(['go_to', x, y]);
        }
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await client.deliverooApi.putdown();
        if (status) {
            consts.go_put_down_tries = 0;
            client.beliefSet.me.parcels_on_head = 0;
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
        if (client.beliefSet.me.x != undefined && client.beliefSet.me.y != undefined) {
            let me_x = Math.round(client.beliefSet.me.x);
            let me_y = Math.round(client.beliefSet.me.y);
            let neighbours = client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[me_x][me_y]).filter(node => !node.isWall())
            //not using this one because of check me_x and me_y

            if (neighbours.length === 0) {
                this.log('stucked');
                throw ['stucked', ' no possible moves'];
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
                    objective_tile = path[0];
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
        if (client.beliefSet.me.x != undefined && client.beliefSet.me.y != undefined) {

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
                                    throw ['bad reward, exiting'];
                                }
                            }
                            else {
                                throw ['someone took the parcel, exiting'];
                            }
                        }
                    }
                }
                if (this.parent instanceof GoPutDown) {
                    if (client.beliefSet.me.parcels_on_head === 0) {
                        throw ['no parcels on head, exiting'];
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
                            throw ['reward is not good anymore, exiting'];
                        }
                    }
                }
                console.log("unpack plan");
                status = false;
                for (let step of plan) {
                    if (step.action == 'move_right') {
                        console.log("move right")
                        status = await client.deliverooApi.move('right')
                    }
                    if (step.action == 'move_left') {
                        console.log("move left")
                        status = await client.deliverooApi.move('left')
                    }
                    if (step.action == 'move_up') {
                        console.log("move up")
                        status = await client.deliverooApi.move('up')
                    }
                    if (step.action == 'move_down') {
                        console.log("move down")
                        status = await client.deliverooApi.move('down')
                    }

                    if (status) {
                        client.beliefSet.me.x = Math.round(status.x);
                        me_x = client.beliefSet.me.x;
                        client.beliefSet.me.y = Math.round(status.y);
                        me_y = client.beliefSet.me.y;
                    } else {
                        console.log("blocked")
                        // da decidere cosa fare se provo a muovermi ma qualche infame mi viene davanti e mi blocca
                        // esce dall'intenzione, verrà visto il nuovo path da fare e si pusha un altro pddl_move
                        //TODO fare come viene fatto per la GoTo standard
                        throw ['got blocked by someone, exiting pddl_move'];
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
            } else {
                // qua da mettere cosa fare nel caso in cui non viene trovato un plan per andare da qualche parte (non c'è una strada perchè qualcuno in mezzo)
                //direi che se non trova nulla, riprova a fare un random move
                throw ['no plan found, exiting'];
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit

        }
    }
}


class AtomicExchange extends Plan {
    static isApplicableTo(atomic_exchange, x, y) {
        return atomic_exchange == 'atomic_exchange';
    }
    async execute(atomic_exchange, x, y) {
        let goToMiddlePointCounter = 0;
        while (distance(client.beliefSet.me, { x: x, y: y }) > 1 && goToMiddlePointCounter < consts.MAX_GOTO_TRIES) {
            await this.subIntention(['go_to', x, y]);
            goToMiddlePointCounter++;
        }
        if (goToMiddlePointCounter >= consts.MAX_GOTO_TRIES) {
            //for each ally in the list of allies
            for (let ally of client.allyList) {
                await client.deliverooApi.say(ally, new Message("fail", client.secretToken, "Can't reach the middle point, exiting plan!"));
            }
            throw ['I cannot reach the middle point, exiting...'];
        }
        if (client.isMaster) {
            for (let ally of client.allyList) {
                await client.deliverooApi.say(ally, new Message("atMiddlePoint", client.secretToken, { x: client.beliefSet.me.x, y: client.beliefSet.me.y }));
                while (!client.collaborationClass.collaboratorOnSite) {
                    //wait for the collaborator to arrive (we set this to true in the onMsgHandler)
                    await new Promise(res => setImmediate(res));
                }
                while (!client.collaborationClass.collaboratorAdjacent) {
                    //wait for the collaborator to be adjacent to me
                    await new Promise(res => setImmediate(res));
                }
            }
        } else {
            if (!client.collaborationClass.collaboratorOnSite) {
                let myNeighbours = client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[client.beliefSet.me.x][client.beliefSet.me.y]);
                let collaborationLocation = client.collaborationClass.collaborationLocation;
                //check if collaborator is in my neighbours
                let found = false;
                for (let neighbour of myNeighbours) {
                    if (neighbour.x == collaborationLocation.x && neighbour.y == collaborationLocation.y) {
                        found = true;
                    }
                }
                if (found){
                    // TODO send message to perform step 2. We are now adjacent and ready to exchange
                } else {
                    for (let ally of client.allyList) {
                        await client.deliverooApi.say(ally, new Message("fail", client.secretToken, "Can't reach the middle point, exiting plan!"));
                    }
                    throw ['collaboration failed, we cannot reach each other'];
                }

            } else {
                while (!client.collaborationClass.collaboratorOnSite) {
                    //wait for the collaborator to arrive
                    await new Promise(res => setImmediate(res));
                }
                let myNeighbours = client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[client.beliefSet.me.x][client.beliefSet.me.y]);
                let collaborationLocation = client.collaborationClass.collaborationLocation;
                //check if collaborator is in my neighbours
                let found = false;
                for (let neighbour of myNeighbours) {
                    if (neighbour.x == collaborationLocation.x && neighbour.y == collaborationLocation.y) {
                        found = true;
                    }
                }
                if(found){
                    // TODO send message to perform step 2. We are now adjacent and ready to exchange
                } else {
                    for(let ally of client.allyList){
                        await client.deliverooApi.say(ally, new Message("fail", client.secretToken, "Can't reach the middle point, exiting plan!"));
                    }
                    throw ['collaboration failed, we cannot reach each other'];
                }
            }
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