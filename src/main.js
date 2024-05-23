import { Graph } from "./tools/astar.js"
import { distance } from "./tools/distance.js"
import { IntentionRevisionQueue, IntentionRevisionMaxHeap } from "./intentions/intentionRevision.js";
import { global } from "./tools/globals.js"
import { Parcel } from './classes/parcel.js';
import { Agent } from './classes/agents.js';



// TODO evaluation of decaying parcels & data for timers to be checked
global.client.onConfig(config => {
    console.log("config", config)
    // global.PARCELS_OBSERVATION_DISTANCE = config.PARCELS_OBSERVATION_DISTANCE
    global.CLOCK = config.CLOCK
    global.MOVEMENT_STEPS = config.MOVEMENT_STEPS
    global.MOVEMENT_DURATION = config.MOVEMENT_DURATION
    global.PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL
    console.log("decaying?", global.decaying_active())
})

let deliveroo_map;
let MAX_WIDTH;
let MAX_HEIGHT;


global.client.onMap((width, height, tiles) => {

    MAX_WIDTH = width - 1;
    MAX_HEIGHT = height - 1;

    deliveroo_map = [];
    for (let i = 0; i < width; i++) {
        deliveroo_map[i] = [];
        global.parcelLocations[i] = [];
        for (let j = 0; j < height; j++) {
            deliveroo_map[i][j] = 0;
            global.parcelLocations[i][j] = { present: 0, id: undefined };
        }
    }

    tiles.forEach(tile => {
        deliveroo_map[tile.x][tile.y] = 1;
        if (tile.delivery) {
            global.delivery_tiles.push([tile.x, tile.y]);
        }
        if (tile.parcelSpawner) {
            global.spawning_tiles.push([tile.x, tile.y]);
        }
    });

    if (global.spawning_tiles.length === tiles.length - global.delivery_tiles.length) {
        global.all_spawning = true;
    }

    global.deliveroo_graph = new Graph(deliveroo_map);
    global.deliveroo_map = deliveroo_map;
    global.MAX_HEIGHT = MAX_HEIGHT;
    global.MAX_WIDTH = MAX_WIDTH;
})



global.client.onAgentsSensing(async (agents) => {
    //     //for each agent that I see, set the old location and the new location
    //     // if it is the first time I see the agent, the old location is the same as the new location
    agents.forEach(agent => {
        global.agentsLocations.set(agent.id, new Agent(agent));
    })
    // For now I only set wall to the agents that I actually see
    for (let i = 0; i < MAX_WIDTH; i++) {
        for (let j = 0; j < MAX_HEIGHT; j++) {
            if (deliveroo_map[i][j] == 1) {
                global.deliveroo_graph.setWalkable(i, j);
            }
        }
    }
    //has to be changed!
    agents.forEach(agent => {
        let new_location = { x: Math.round(agent.x), y: Math.round(agent.y) };
        global.deliveroo_graph.setWall(new_location.x, new_location.y);
    })
})



/**
 * Beliefset revision function
 */
global.client.onYou(({ id, name, x, y, score }) => {
    global.me.id = id
    global.me.name = name
    global.me.x = Math.round(x)
    global.me.y = Math.round(y)
    global.me.score = score
})


global.client.onParcelsSensing(async (perceived_parcels) => {
    let counter = 0
    // TODO check this one!!! Is it a good assumption?
    // assumption : If I do not see a parcel, it is most likely been taken by someone else
    // for (let i=0;i< MAX_WIDTH; i++){
    //     for(let j=0;j<MAX_HEIGHT;j++){
    //         global.parcelLocations[i][j] = 0
    //     }
    // }
    for (const p of perceived_parcels) {
        global.parcels.set(p.id, new Parcel(p))
        if (!p.carriedBy && p.reward > 0) {
            global.parcelLocations[p.x][p.y] = { present: 1, id: p.id }
        }
        else {
            if (p.carriedBy === global.me.id) {
                counter += 1;
            }
        }
    }
    if (perceived_parcels.length !== 0) {
        console.log("parcels", perceived_parcels);
    }
    global.n_parcels = counter;
})


/**
 * Options generation and filtering function
 */
global.client.onParcelsSensing(parcels => {

    // TODO revisit beliefset revision so to trigger option generation only in the case a new parcel is observed

    /**
     * Options generation
     */
    // belief set
    const options = []
    for (const parcel of parcels.values())
        if (!parcel.carriedBy)
            options.push(['go_pick_up', new Parcel(parcel)]);
    // myAgent.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id ] )

    /**
     * Options filtering (belief filtering)
     */
    let best_option;
    let reward = Number.NEGATIVE_INFINITY;
    for (const option of options) {
        //check if option is in myAgent.intention_queue
        if (option[0] == 'go_pick_up' && !myAgent.intention_queue.find((i) => i.predicate.join(' ') == option.join(' '))) {
            let parcel = option[1];
            let current_d = distance(parcel.getLocation(), global.me);
            let current_reward = parcel.rewardAfterNSteps(current_d);
            if (current_reward > 0 && current_reward > reward) {
                best_option = option
                reward = current_reward
            }
        }
    }

    /**
     * Best option is selected
     */
    if (best_option && myAgent.intention_queue.length < global.MAX_QUEUE_SIZE) {
        // console.log("best option: ", best_option)
        let parcel = best_option[1];
        myAgent.push(parcel.intoPredicate(best_option[0]))
    }

})

/**
 * Intention revision loop
 */

// const myAgent = new IntentionRevisionQueue();
// const myAgent = new IntentionRevisionStack();
// const myAgent = new IntentionRevisionReplace();
// const myAgent = new IntentionRevisionRevise();
// [MaxHeap]
const myAgent = new IntentionRevisionMaxHeap();
myAgent.loop();


//is the export needed now?
export { myAgent }
