import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { remote, local, MAX_PICKED_PARCELS } from "../config/config.js"
import { astar, Graph } from "./tools/astar.js"
import LocationsSet from "./locationSet.js"
import {distance} from "./tools/distance.js"
import {findBestTile} from "./tools/findBestTile.js";
import { GoPickUp } from "./plans/goPickUp.js";
import { GoPutDown } from "./plans/goPutDown.js";
import { GoTo } from "./plans/goTo.js";
import { RandomMove } from "./plans/randomMove.js";
import { Plan } from "./plans/plan.js";
import { Intention } from "./intentions/intention.js";
import { IntentionRevision, IntentionRevisionQueue } from "./intentions/intentionRevision.js";

/**
 * Intention
 */



let n_parcels = 0
const MAX_QUEUE = 2


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
let spawning_tiles;
let all_spawning = false;
let deliveroo_graph;
let MAX_WIDTH;
let MAX_HEIGHT;
let parcel_locations;

client.onMap((width, height, tiles) => {
    console.log(tiles);

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
    spawning_tiles = [];
    tiles.forEach(tile => {
        deliveroo_map[tile.x][tile.y] = 1;
        if (tile.delivery) {
            delivery_tiles.push([tile.x, tile.y]);
        }
        if (tile.parcelSpawner) {
            spawning_tiles.push([tile.x, tile.y]);
        }
    });

    if (spawning_tiles.length === tiles.length - delivery_tiles.length) {
        all_spawning = true;
        console.log("aSDKJFHSADLKJFHASDLKJFHALSKJDHFLAKJSDHF", all_spawning)
    }

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
    for (let i = 0; i < MAX_WIDTH; i++) {
        for (let j = 0; j < MAX_HEIGHT; j++) {
            if (deliveroo_map[i][j] == 1) {
                deliveroo_graph.setWalkable(i, j);
            }
        }
    }
    agents.forEach(agent => {
        let agent_id = agent.id;
        let new_location = { x: Math.round(agent.x), y: Math.round(agent.y) };
        deliveroo_graph.setWall(new_location.x, new_location.y);
    })
})



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
        if (!p.carriedBy && p.reward > 0) {
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

/**
 * Intention revision loop
 */

const myAgent = new IntentionRevisionQueue();
// const myAgent = new IntentionRevisionStack();
// const myAgent = new IntentionRevisionReplace();
// const myAgent = new IntentionRevisionRevise();
myAgent.loop();

const planLibrary = [];
planLibrary.push(GoPickUp)
planLibrary.push(GoPutDown)
planLibrary.push(GoTo)
planLibrary.push(RandomMove)


export {myAgent, me, n_parcels, deliveroo_map, deliveroo_graph, client, delivery_tiles, distance, parcel_locations, parcels, spawning_tiles, all_spawning, planLibrary}
