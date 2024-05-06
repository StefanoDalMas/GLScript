import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { remote, local, MAX_PICKED_PARCELS, MIN_MAP_INDEX, MAX_MAP_INDEX } from "../config/config.js"
import { astar, Graph } from "./astar.js"
import ParcelLocationsSet from "./parcelLocationSet.js"

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
        this.log( 'stop intention', ...this.#predicate );
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
                console.log("current plan",this.#current_plan)
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

const client = local
// const client = remote

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy;
}


/**
 * Beliefset revision function
 */
const me = {};
client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
})
const parcels = new Map();
// let parcel_locations = []
let parcel_locations = new ParcelLocationsSet()
client.onParcelsSensing(async (perceived_parcels) => {
    for (const p of perceived_parcels) {
        parcels.set(p.id, p)
        // parcel_locations.push([p.x, p.y])
        parcel_locations.add(p.x, p.y)
    }
})

// client.onConfig((param) => {
//     console.log(param);
// })

let delivery_tiles = [] // contains delivery tiles
// init map to 0
let deliveroo_graph;
let deliveroo_map = [];
for (let i =  MIN_MAP_INDEX; i <  MAX_MAP_INDEX; i++) {
    deliveroo_map[i] = [];
    for (let j =  MIN_MAP_INDEX; j <  MAX_MAP_INDEX; j++) {
        deliveroo_map[i][j] = 0;
    }
}

client.onTile((x, y, delivery) => {
    if (delivery) {
        delivery_tiles.push([x, y]);
    }
    deliveroo_map[x][y] = 1;
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
        if (option[0] == 'go_pick_up') {
            let [go_pick_up, x, y, id] = option;
            let current_d = distance({ x, y }, me)
            if (current_d < nearest) {
                best_option = option
                nearest = current_d
            }
        }
    }

    /**
     * Best option is selected
     */
    if (best_option){
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
            if (this.intention_queue.length > 0) {
                var result = "";
                for (var i = 0; i < this.intention_queue.length; i++) {
                    result += this.intention_queue[i].predicate;
                    if (i !== this.intention_queue.length - 1) {
                        result += " "; // Aggiungi uno spazio tra gli elementi, tranne l'ultimo
                    }
                }

                console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));

                if (n_parcels > MAX_PICKED_PARCELS) {

                    /**
                     * Options filtering (trovo la tile di consegnap più vicina)
                     */
                    let best_option;
                    let nearest = Number.MAX_VALUE;
                    for (const option of delivery_tiles) {
                        let [x, y] = option;
                        let current_d = distance({ x, y }, me)
                        // console.log("option is: ", option, " and distance is: ", current_d)
                        if (current_d < nearest) {
                            best_option = option
                            nearest = current_d
                        }
                    }

                    console.log("putting down...")
                    this.push(['go_put_down', best_option[0], best_option[1]])
                }

                // Current intention
                const intention = this.intention_queue[0];

                // Is queued intention still valid? Do I still want to achieve it?
                if (intention[0] == 'go_pick_up') {
                    let id = intention.predicate[3]
                    let p = parcels.get(id)

                    if (p && p.carriedBy) {
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
                        console.log( 'Failed intention', ...intention.predicate, 'with error:', ...error )
                    });

                // Remove from the queue
                this.intention_queue.shift();

            } else {
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


// const myAgent = new IntentionRevisionQueue();
// const myAgent = new IntentionRevisionStack();
const myAgent = new IntentionRevisionReplace();
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
        this.log( 'stop plan' );
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
        await client.pickup()
        // parcel_locations = parcel_locations.filter(item => !(item[0] !== x && item[1] !== y))
        parcel_locations.delete(x, y)
        n_parcels += 1;
        console.log("provo a tirar su con PICK UP")
        if (this.stopped) throw ['stopped']; // if stopped then quit
        return true;
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
        await client.putdown();
        n_parcels = 0;
        return true;
    }

}

class Move extends Plan {

    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(go_to, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        if (deliveroo_graph == undefined) {
            deliveroo_graph = new Graph(deliveroo_map);
        }
        
        //follow path until destination is reached
        while (me.x != x || me.y != y) {
            if (this.stopped) throw ['stopped']; // if stopped then quit

            let path = astar.search(deliveroo_graph, deliveroo_graph.grid[me.x][me.y], deliveroo_graph.grid[x][y]);

            for (let index=0; index<path.length; index++) {
                if (this.stopped) throw ['stopped']; // if stopped then quit

                let status = false;
                let next_tile = path[index];
                //evaluate if it is a up, down, left or right move
                if (next_tile.x == me.x + 1 && next_tile.y == me.y) {
                    status = await client.move('right')
                } else if (next_tile.x == me.x - 1 && next_tile.y == me.y) {
                    status = await client.move('left')
                } else if (next_tile.x == me.x && next_tile.y == me.y + 1) {
                    status = await client.move('up')
                } else if (next_tile.x == me.x && next_tile.y == me.y - 1) {
                    status = await client.move('down')
                }
                if (status) {
                    me.x = status.x;
                    me.y = status.y;
                } else {
                    this.log('stucked');
                    throw 'stucked';
                }
    
                if (this.stopped) throw ['stopped']; // if stopped then quit
    
                if (me.x != x && me.y != y) {
                    // se sono su una consegna, consegno
                    if (delivery_tiles.some(tile => tile[0] === me.x && tile[1] === me.y) && n_parcels > 0) {
                        await client.putdown()
                        n_parcels = 0
                    }
                    if (this.stopped) throw ['stopped']; // if stopped then quit
                    // if I pass on a parcel, I pick it up and remove it from belief set
                    // if (parcel_locations.some(arr => arr[0] === me.x && arr[1] === me.y)){
                    if (parcel_locations.has(me.x, me.y)) {
                        console.log("provo a tirar su con MOVE")
                        await client.pickup()
                        // parcel_locations = parcel_locations.filter(item => !(item[0] !== me.x && item[1] !== me.y))
                        parcel_locations.delete(me.x, me.y)
                        n_parcels += 1;
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

        if (me.x != undefined && me.y != undefined) {
            //from my position, choose an adjacent tile in deliveroo_map
            let possible_moves = []
            //see all the adjacent tiles that have value 1 in deliveroo_map and choose one randomly
            if (me.x != MAX_MAP_INDEX && deliveroo_map[me.x + 1][me.y] == 1) {
                possible_moves.push({ x: me.x + 1, y: me.y })
            }
            if (me.x != MIN_MAP_INDEX && deliveroo_map[me.x - 1][me.y] == 1) {
                possible_moves.push({ x: me.x - 1, y: me.y })
            }
            if (me.y != MAX_MAP_INDEX && deliveroo_map[me.x][me.y + 1] == 1) {
                possible_moves.push({ x: me.x, y: me.y + 1 })
            }
            if (me.y != MIN_MAP_INDEX && deliveroo_map[me.x][me.y - 1] == 1) {
                possible_moves.push({ x: me.x, y: me.y - 1 })
            }

            if (possible_moves.length === 0) {
                this.log('stucked');
                throw 'stucked';
            }

            console.log("possible moves", possible_moves)
            let new_tile = possible_moves[Math.floor(Math.random() * possible_moves.length)]
            console.log("new tile", new_tile)
            
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




