import { Graph } from "./tools/astar.js"
import { distance } from "./tools/distance.js"
import { IntentionRevisionQueue } from "./intentions/intentionRevision.js";
import { global } from "./tools/globals.js"



// TODO evaluation of decaying parcels & data for timers to be checked
let OBSERVATION_DISTANCE;
let CLOCK;
let MOVEMENT_DURATION;
let PARCEL_DECADING_INTERVAL;
global.client.onConfig(config => {
    console.log("config", config)
    OBSERVATION_DISTANCE = config.PARCELS_OBSERVATION_DISTANCE
    CLOCK = config.CLOCK
    MOVEMENT_DURATION = config.MOVEMENT_DURATION
    PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL
})

let deliveroo_map;
let MAX_WIDTH;
let MAX_HEIGHT;


global.client.onMap((width, height, tiles) => {
    console.log(tiles);

    MAX_WIDTH = width - 1;
    MAX_HEIGHT = height - 1;

    deliveroo_map = [];
    for (let i = 0; i < width; i++) {
        deliveroo_map[i] = [];
        global.parcel_locations[i] = [];
        for (let j = 0; j < height; j++) {
            deliveroo_map[i][j] = 0;
            global.parcel_locations[i][j] = 0;
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
        console.log("aSDKJFHSADLKJFHASDLKJFHALSKJDHFLAKJSDHF", global.all_spawning)
    }

    global.deliveroo_graph = new Graph(deliveroo_map);
    // global.deliveroo_graph.setWall(1, 0);
    // global.deliveroo_graph.setWall(9, 3);
    // global.deliveroo_graph.setWall(5, 0);
    // global.deliveroo_graph.setWall(6, 9);

})


let agentsLocations = new Map(); //agent.id -> (old_location, new_location)

global.client.onAgentsSensing(async (agents) => {
    let agent_x = Math.round(global.me.x);
    let agent_y = Math.round(global.me.y);
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
    //         global.deliveroo_graph.setWalkable(old_location.x, old_location.y);
    //         global.deliveroo_graph.setWall(new_location.x, new_location.y);
    // })
    // Better? idea: I only set wall to the agents that I actually see
    for (let i = 0; i < MAX_WIDTH; i++) {
        for (let j = 0; j < MAX_HEIGHT; j++) {
            if (deliveroo_map[i][j] == 1) {
                global.deliveroo_graph.setWalkable(i, j);
            }
        }
    }
    agents.forEach(agent => {
        let agent_id = agent.id;
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
    //         global.parcel_locations[i][j] = 0
    //     }
    // }
    for (const p of perceived_parcels) {
        global.parcels.set(p.id, p)
        if (!p.carriedBy && p.reward > 0) {
            global.parcel_locations[p.x][p.y] = 1
        }
        else {
            if (p.carriedBy === global.me.id) {
                counter += 1;
            }
        }
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
            options.push(['go_pick_up', Math.round(parcel.x), Math.round(parcel.y), parcel.id]);
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
            let current_d = distance({ x, y }, global.me)
            if (current_d > 0 && current_d < nearest) {
                best_option = option
                nearest = current_d
            }
        }
    }

    /**
     * Best option is selected
     */
    if (best_option && myAgent.intention_queue.length < global.MAX_QUEUE_SIZE) {
        // console.log("best option: ", best_option)
        myAgent.push(best_option)
    }


})

/**
 * Intention revision loop
 */

const myAgent = new IntentionRevisionQueue();
// const myAgent = new IntentionRevisionStack();
// const myAgent = new IntentionRevisionReplace();
// const myAgent = new IntentionRevisionRevise();
myAgent.loop();


//is the export needed now?
export { myAgent}
