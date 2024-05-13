import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { remote, local, MAX_PICKED_PARCELS } from "../config/config.js"
import { astar, Graph } from "./astar.js"
import LocationsSet from "./locationSet.js"

/**
 * Intention
 */
class Intention {

    // Plan currently used for achieving the intention 
    #current_plan;

    // This is used to stop the intention
    #stopped = false;
    get stopped() {
        return this.#stopped;
    }
    stop() {
        this.log('stop intention', ...this.#predicate);
        this.#stopped = true;
        if (this.#current_plan)
            this.#current_plan.stop();
    }

    /**
     * #parent refers to caller
     */
    #parent;

    /**
     * predicate is in the form ['go_to', x, y]
     */
    get predicate() {
        return this.#predicate;
    }
    #predicate;

    constructor(parent, predicate) {
        this.#parent = parent;
        this.#predicate = predicate;
    }

    log(...args) {
        if (this.#parent && this.#parent.log)
            this.#parent.log('\t', ...args)
        else
            console.log(...args)
    }

    #started = false;
    /**
     * Using the plan library to achieve an intention
     */
    async achieve() {
        // Cannot start twice
        if (this.#started)
            return this;
        else
            this.#started = true;

        // Trying all plans in the library
        for (const planClass of planLibrary) {

            // if stopped then quit
            if (this.stopped) throw ['stopped intention', ...this.predicate];

            // if plan is 'statically' applicable
            if (planClass.isApplicableTo(...this.predicate)) {
                // plan is instantiated
                this.#current_plan = new planClass(this.#parent);
                console.log("current plan", this.#current_plan)
                this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    const plan_res = await this.#current_plan.execute(...this.predicate);
                    this.log('succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res);
                    return plan_res
                    // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log('failed intention', ...this.predicate, 'with plan', planClass.name, 'with error:', ...error);
                }
            }

        }

        // if stopped then quit
        if (this.stopped) throw ['stopped intention', ...this.predicate];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate]
    }

}


let n_parcels = 0
const MAX_QUEUE = 3
let go_put_down_tries = 0

const client = local
// const client = remote


// TODO evaluation of decaying parcels & data for timers to be checked
let OBSERVATION_DISTANCE;
let CLOCK;
let MOVEMENT_DURATION;
let PARCEL_DECADING_INTERVAL;
client.onConfig(config => {
    console.log("config", config)
    OBSERVATION_DISTANCE = config.PARCELS_OBSERVATION_DISTANCE
    CLOCK = config.CLOCK
    MOVEMENT_DURATION = config.MOVEMENT_DURATION
    PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL
})

let deliveroo_map;
let delivery_tiles;
let deliveroo_graph;
let MAX_WIDTH;
let MAX_HEIGHT;
let parcel_locations;

client.onMap((width, height, tiles) => {

    MAX_WIDTH = width - 1;
    MAX_HEIGHT = height - 1;

    deliveroo_map = [];
    parcel_locations = [];
    for (let i = 0; i < width; i++) {
        deliveroo_map[i] = [];
        parcel_locations[i] = [];
        for (let j = 0; j < height; j++) {
            deliveroo_map[i][j] = 0;
            parcel_locations[i][j] = 0;
        }
    }

    delivery_tiles = [];
    tiles.forEach(tile => {
        deliveroo_map[tile.x][tile.y] = 1;
        if (tile.delivery) {
            delivery_tiles.push([tile.x, tile.y]);
        }
    });

    deliveroo_graph = new Graph(deliveroo_map);
    // deliveroo_graph.setWall(1, 0);
    // deliveroo_graph.setWall(9, 3);
    // deliveroo_graph.setWall(5, 0);
    // deliveroo_graph.setWall(6, 9);

})


let agentsLocations = new Map(); //agent.id -> (old_location, new_location)

client.onAgentsSensing(async (agents) => {
    let agent_x = Math.round(me.x);
    let agent_y = Math.round(me.y);
//     //for each agent that I see, set the old location and the new location
//     // if it is the first time I see the agent, the old location is the same as the new location
//     agents.forEach(agent => {
//         let agent_id = agent.id;
//         let old_location = agentsLocations.get(agent_id) ? agentsLocations.get(agent_id)[1] : { x: agent_x, y: agent_y };
//         let new_location = { x: Math.round(agent.x), y: Math.round(agent.y) };
//         agentsLocations.set(agent_id, [old_location, new_location]);
//     })
//     //for clarity, the 2 for loops are separated
//     agentsLocations.forEach((value, key) => {
//         console.log("value is      ", value);
//         let old_location = value[0];
//         let new_location = value[1];
//         deliveroo_graph.setWalkable(old_location.x, old_location.y);
//         deliveroo_graph.setWall(new_location.x, new_location.y);
// })
// Better? idea: I only set wall to the agents that I actually see
    for(let i=0;i<MAX_WIDTH;i++){
        for(let j=0;j<MAX_HEIGHT;j++){
            if(deliveroo_map[i][j]==1){
                deliveroo_graph.setWalkable(i,j);
            }
        }
    }
    agents.forEach(agent => {
        let agent_id = agent.id;
        let new_location = { x: Math.round(agent.x), y: Math.round(agent.y) };
        deliveroo_graph.setWall(new_location.x, new_location.y);
    })
})

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    // const dx = Math.abs(Math.round(x1) - Math.round(x2))
    // const dy = Math.abs(Math.round(y1) - Math.round(y2))
    // return dx + dy;
    // console.log("primo", x1, y1);
    // console.log("my position", x2, y2);
    let path = astar.search(deliveroo_graph, deliveroo_graph.grid[Math.round(x2)][Math.round(y2)], deliveroo_graph.grid[Math.round(x1)][Math.round(y1)]);
    return path.length;
}

/**
 * Beliefset revision function
 */
const me = {};
client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = Math.round(x)
    me.y = Math.round(y)
    me.score = score
})
const parcels = new Map();
// let parcel_locations = []
client.onParcelsSensing(async (perceived_parcels) => {
    let counter = 0
    // TODO check this one!!! Is it a good assumption?
    // assumption : If I do not see a parcel, it is most likely been taken by someone else
    // for (let i=0;i< MAX_WIDTH; i++){
    //     for(let j=0;j<MAX_HEIGHT;j++){
    //         parcel_locations[i][j] = 0
    //     }
    // }
    for (const p of perceived_parcels) {
        parcels.set(p.id, p)
        if (!p.carriedBy) {
            parcel_locations[p.x][p.y] = 1
        }
        else {
            if (p.carriedBy === me.id) {
                counter += 1;
            }
        }
    }
    n_parcels = counter;

})


/**
 * Options generation and filtering function
 */
client.onParcelsSensing(parcels => {

    // TODO revisit beliefset revision so to trigger option generation only in the case a new parcel is observed

    /**
     * Options generation
     */
    // belief set
    const options = []
    for (const parcel of parcels.values())
        if (!parcel.carriedBy)
            options.push(['go_pick_up', parcel.x, parcel.y, parcel.id]);
    // myAgent.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id ] )

    /**
     * Options filtering (belief filtering)
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        //check if option is in myAgent.intention_queue
        if (option[0] == 'go_pick_up' && !myAgent.intention_queue.find((i) => i.predicate.join(' ') == option.join(' '))) {
            let [go_pick_up, x, y, id] = option;
            let current_d = distance({ x, y }, me)
            if (current_d > 0 && current_d < nearest) {
                best_option = option
                nearest = current_d
            }
        }
    }

    /**
     * Best option is selected
     */
    if (best_option && myAgent.intention_queue.length < MAX_QUEUE) {
        // console.log("best option: ", best_option)
        myAgent.push(best_option)
    }


})
// client.onAgentsSensing( agentLoop )



/**
 * Intention revision loop
 */
class IntentionRevision {

    #intention_queue = new Array();
    get intention_queue() {
        return this.#intention_queue;
    }

    #map_graph
    get map_graph() {
        return this.#map_graph;
    }

    /**
     * Start intention revision loop
     */
    async loop() {
        while (true) {

            // Consumes intention_queue if not empty
            console.log("dimensione:", this.#intention_queue.length)
            console.log(go_put_down_tries)
            if (this.intention_queue.length > 0) {
                var result = "";
                for (var i = 0; i < this.intention_queue.length; i++) {
                    result += this.intention_queue[i].predicate;
                    if (i !== this.intention_queue.length - 1) {
                        result += " "; // Aggiungi uno spazio tra gli elementi, tranne l'ultimo
                    }
                }

                console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));

                if (n_parcels == MAX_PICKED_PARCELS && me.x != undefined && me.y != undefined && go_put_down_tries < 10) {

                    go_put_down_tries += 1;

                    /**
                     * Options filtering (trovo la tile di consegnap più vicina)
                     */
                    let best_option;
                    let nearest = Number.MAX_VALUE;
                    for (const option of delivery_tiles) {
                        let [x, y] = option;
                        let current_d = distance({ x, y }, me)
                        // console.log("option is: ", option, " and distance is: ", current_d))
                        if (current_d > 0 && current_d < nearest) {
                            best_option = option
                            nearest = current_d
                        }
                    }
                    if (best_option) {
                        this.push(['go_put_down', best_option[0], best_option[1]])
                    }
                }

                // Current intention
                const intention = this.intention_queue[0];

                // Is queued intention still valid? Do I still want to achieve it?
                if (intention[0] == 'go_pick_up') {
                    let id = intention.predicate[3]
                    let p = parcels.get(id)

                    if (p && p.carriedBy || parcel_locations[p.x][p.y] == 0) {
                        console.log('Skipping intention because no more valid', intention.predicate)
                        continue;
                    }
                }
                // else if () {

                // }

                // Start achieving intention
                await intention.achieve()
                    // Catch eventual error and continue
                    .catch(error => {
                        console.log(error)
                        console.log('Failed intention', ...intention.predicate, 'with error:', ...error)
                    });

                // Remove from the queue
                this.intention_queue.shift();

            } else if (n_parcels && go_put_down_tries < 10) {

                go_put_down_tries += 1;

                /**
                 * Options filtering (trovo la tile di consegnap più vicina)
                 */
                let best_option;
                let nearest = Number.MAX_VALUE;
                for (const option of delivery_tiles) {
                    let [x, y] = option;
                    // let me_x = me.x;
                    // let me_y = me.y;
                    // let current_d = distance({ x, y }, {me_x, me_y})
                    let current_d = distance({ x, y }, me)
                    // console.log("option is: ", option, " and distance is: ", current_d)
                    if (current_d > 0 && current_d < nearest) {
                        best_option = option
                        nearest = current_d
                    }
                }
                if(best_option){
                    this.push(['go_put_down', best_option[0], best_option[1]])
                }
            } else {
                if (go_put_down_tries >= 10){
                    go_put_down_tries = 0;
                }
                console.log("pushing random")
                this.push(['random_move'])
            }



            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }

    // async push ( predicate ) { }

    log(...args) {
        console.log(...args)
    }

}

class IntentionRevisionQueue extends IntentionRevision {

    async push(predicate) {

        if (predicate) {
            // console.log("predicate is: ", predicate)
            // Check if already queued
            if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' ')))
                return; // intention is already queued

            console.log('IntentionRevisionReplace.push', predicate);
            const intention = new Intention(this, predicate);
            this.intention_queue.push(intention);
        }
    }

}

class IntentionRevisionStack extends IntentionRevision {

    async push(predicate) {

        if (predicate) {
            // console.log("predicate is: ", predicate)
            // Check if already queued
            if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' ')))
                return; // intention is already queued

            console.log('IntentionRevisionReplace.push', predicate);
            const intention = new Intention(this, predicate);
            this.intention_queue.unshift(intention);
        }
    }

}

class IntentionRevisionReplace extends IntentionRevision {

    async push(predicate) {

        // Check if already queued
        const last = this.intention_queue.at(this.intention_queue.length - 1);
        if (last && last.predicate.join(' ') == predicate.join(' ')) {
            return; // intention is already being achieved
        }

        console.log('IntentionRevisionReplace.push', predicate);
        const intention = new Intention(this, predicate);
        this.intention_queue.push(intention);

        // Force current intention stop 
        if (last) {
            last.stop();
        }
    }

}

class IntentionRevisionRevise extends IntentionRevision {

    async push(predicate) {
        //     console.log('Revising intention queue. Received', ...predicate);
        //     // TODO
        //     // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        //     // - eventually stop current one
        //     // - evaluate validity of intention
        // }
    }

}


const myAgent = new IntentionRevisionQueue();
// const myAgent = new IntentionRevisionStack();
// const myAgent = new IntentionRevisionReplace();
// const myAgent = new IntentionRevisionRevise();

myAgent.loop();



/**
 * Plan library
 */
const planLibrary = [];

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
    #parent;

    constructor(parent) {
        this.#parent = parent;
    }

    log(...args) {
        if (this.#parent && this.#parent.log)
            this.#parent.log('\t', ...args)
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
        let status = await client.pickup()
        // parcel_locations = parcel_locations.filter(item => !(item[0] !== x && item[1] !== y))
        if (status) {
            parcel_locations[x][y] = 0
            console.log("provo a tirar su con PICK UP")
            if (this.stopped) throw ['stopped']; // if stopped then quit
            return true;
        }
        return false;
    }

}

class GoPutDown extends Plan {

    static isApplicableTo(go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }

    async execute(go_put_down, x, y, id) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await client.putdown();
        if (status) {
            go_put_down_tries = 0
            return true;
        }
        return false;

    }

}

class Move extends Plan {

    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(go_to, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit

        //follow path until destination is reached
        let me_x = Math.round(me.x);
        let me_y = Math.round(me.y);
        while (me_x != x || me_y != y) {
            if (deliveroo_graph.getNode(x,y).isWall() || deliveroo_graph.getNode(me_x,me_y).isWall()) {
                this.log('stucked, walking to wall');
                throw ['stucked', 'walking to wall'];
            }
            if (this.stopped) throw ['stopped']; // if stopped then quit
            let path = astar.search(deliveroo_graph, deliveroo_graph.grid[me_x][me_y], deliveroo_graph.grid[x][y]);
            if (path.length === 0){
                this.log('stucked, no path foound');
                throw ['stucked', 'no path foound'];
            }
            for (let index = 0; index < path.length; index++) {
                if (this.stopped) throw ['stopped']; // if stopped then quit

                let status = false;
                let next_tile = path[index];
                //evaluate if it is a up, down, left or right move
                if (next_tile.x == me_x + 1 && next_tile.y == me_y && !deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
                    status = await client.move('right')
                } else if (next_tile.x == me_x - 1 && next_tile.y == me_y && !deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
                    status = await client.move('left')
                } else if (next_tile.x == me_x && next_tile.y == me_y + 1 && !deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
                    status = await client.move('up')
                } else if (next_tile.x == me_x && next_tile.y == me_y - 1&& !deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
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

class RandomMove extends Plan {

    static isApplicableTo(random_move, x, y) {
        return random_move == 'random_move';
    }

    async execute(random_move) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        console.log("entro random")
        if (me.x != undefined && me.y != undefined) {
            // console.log("entro if", me.x)
            // console.log("entro if", me.y)
            //from my position, choose an adjacent tile in deliveroo_map
            let possible_moves = []
            //see all the adjacent tiles that have value 1 in deliveroo_map and choose one randomly

            let me_x = Math.round(me.x);
            let me_y = Math.round(me.y);
            if (me_x != MAX_WIDTH && !deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
                possible_moves.push({ x: me_x + 1, y: me_y })
            }
            if (me_x != 0 && !deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
                possible_moves.push({ x: me_x - 1, y: me_y })
            }
            if (me_y != MAX_HEIGHT && !deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
                possible_moves.push({ x: me_x, y: me_y + 1 })
            }
            if (me_y != 0 && !deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
                possible_moves.push({ x: me_x, y: me_y - 1 })
            }

            if (possible_moves.length === 0) {
                this.log('stucked');
                throw 'stucked';
            }

            // console.log("possible moves", possible_moves)
            let new_tile = possible_moves[Math.floor(Math.random() * possible_moves.length)]
            // console.log("new tile", new_tile)

            if (this.stopped) throw ['stopped']; // if stopped then quit

            await this.subIntention(['go_to', new_tile.x, new_tile.y]);
            return true;
        } else {
            return false;
        }
    }
}
// plan classes are added to plan library 
planLibrary.push(GoPickUp)
planLibrary.push(GoPutDown)
planLibrary.push(Move)
planLibrary.push(RandomMove)


export { myAgent, me, n_parcels, deliveroo_map, deliveroo_graph, client, delivery_tiles, distance, parcel_locations, parcels }




