import { beliefSet } from './beliefSet.js';
import { consts } from './consts.js';
import { IntentionRevisionMaxHeap } from '../intentions/intentionRevision.js';
import { Parcel } from './parcel.js';
import { Agent } from './agents.js';
import { Graph } from '../tools/astar.js';
import { distance } from '../tools/distance.js';
import { Message } from '../classes/message.js';

class Client {
    constructor(configuration, usingPddl, isMaster, secretToken) {
        this.deliverooApi = configuration;
        this.usingPddl = usingPddl;
        this.isMaster = isMaster; // to tell if he is Master or Slave
        this.secretToken = secretToken;
        this.intentionQueue = new IntentionRevisionMaxHeap();
        this.allyList = new Set();
    }

    async configure() {
        await this.setUpCallbacks();
        await this.commTest();

        this.intentionQueue.loop();

    }

    async setUpCallbacks() {
        this.deliverooApi.onConfig(config => {
            console.log("config", config)
            // beliefSet.PARCELS_OBSERVATION_DISTANCE = config.PARCELS_OBSERVATION_DISTANCE
            consts.CLOCK = config.CLOCK
            consts.MOVEMENT_STEPS = config.MOVEMENT_STEPS
            consts.MOVEMENT_DURATION = config.MOVEMENT_DURATION
            consts.PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL
            console.log("decaying?", consts.decayingActive())
        })

        this.deliverooApi.onMap((width, height, tiles) => {

            let MAX_WIDTH = width - 1;
            let MAX_HEIGHT = height - 1;

            let deliveroo_map = [];
            for (let i = 0; i < width; i++) {
                deliveroo_map[i] = [];
                beliefSet.parcelLocations[i] = [];
                for (let j = 0; j < height; j++) {
                    deliveroo_map[i][j] = 0;
                    beliefSet.parcelLocations[i][j] = { present: 0, id: undefined };
                }
            }

            tiles.forEach(tile => {
                deliveroo_map[tile.x][tile.y] = 1;
                if (tile.delivery) {
                    beliefSet.delivery_tiles.push([tile.x, tile.y]);
                }
                if (tile.parcelSpawner) {
                    beliefSet.spawning_tiles.push([tile.x, tile.y]);
                }
            });

            if (beliefSet.spawning_tiles.length === tiles.length - beliefSet.delivery_tiles.length) {
                beliefSet.all_spawning = true;
            }

            beliefSet.deliveroo_graph = new Graph(deliveroo_map);
            beliefSet.deliveroo_map = deliveroo_map;
            consts.MAX_HEIGHT = MAX_HEIGHT;
            consts.MAX_WIDTH = MAX_WIDTH;
        })

        this.deliverooApi.onAgentsSensing(async (agents) => {
            //     //for each agent that I see, set the old location and the new location
            //     // if it is the first time I see the agent, the old location is the same as the new location
            agents.forEach(agent => {
                beliefSet.agentsLocations.set(agent.id, new Agent(agent));
            })
            // For now I only set wall to the agents that I actually see
            for (let i = 0; i < consts.MAX_WIDTH; i++) {
                for (let j = 0; j < consts.MAX_HEIGHT; j++) {
                    if (beliefSet.deliveroo_map[i][j] == 1) {
                        beliefSet.deliveroo_graph.setWalkable(i, j);
                    }
                }
            }
            //has to be changed!
            agents.forEach(agent => {
                let new_location = { x: Math.round(agent.x), y: Math.round(agent.y) };
                beliefSet.deliveroo_graph.setWall(new_location.x, new_location.y);
            })
        })
        this.deliverooApi.onYou(({ id, name, x, y, score }) => {
            beliefSet.me.id = id
            beliefSet.me.name = name
            beliefSet.me.x = Math.round(x)
            beliefSet.me.y = Math.round(y)
            beliefSet.me.score = score
        })

        this.deliverooApi.onParcelsSensing(async (perceived_parcels) => {
            let counter = 0
            for (const p of perceived_parcels) {
                beliefSet.parcels.set(p.id, new Parcel(p))
                if (!p.carriedBy && p.reward > 0) {
                    beliefSet.parcelLocations[p.x][p.y] = { present: 1, id: p.id }
                }
                else {
                    if (p.carriedBy === beliefSet.me.id) {
                        counter += 1;
                    }
                }
            }
            beliefSet.me.parcels_on_head = counter;
        })
        this.deliverooApi.onParcelsSensing(parcels => {

            // TODO revisit beliefset revision so to trigger option generation only in the case a new parcel is observed

            /**
             * Options generation
             */
            // belief set
            const options = []
            for (const parcel of parcels.values())
                if (!parcel.carriedBy)
                    options.push(['go_pick_up', new Parcel(parcel)]);

            /**
             * Options filtering (belief filtering)
             */
            let best_option;
            let reward = Number.NEGATIVE_INFINITY;
            for (const option of options) {
                //check if option is in intention_queue
                if (option[0] == 'go_pick_up' && !this.intentionQueue.find((i) => i.predicate.join(' ') == option.join(' '))) {
                    let parcel = option[1];
                    let current_d = distance(parcel.getLocation(), beliefSet.me);
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
            if (best_option && this.intentionQueue.length() < consts.MAX_QUEUE_SIZE) {
                // console.log("best option: ", best_option)
                let parcel = best_option[1];
                this.intentionQueue.push(parcel.intoPredicate(best_option[0]))
            }
        })

        this.deliverooApi.onMsg(async (id, name, msg, callbackResponse) => {
            console.log("received message from ", id, " with content: ", msg)
            if (!this.isMaster) {
                if (msg.topic == "ALLYGLS?") {
                    console.log("GIELLESSE SRL found an ally!");
                    this.allyList.add(id);
                    await this.deliverooApi.say(id, new Message("ALLYGLS!", this.secretToken, id, "I'm the slave! :)"));
                }
            } else {
                if (msg.topic == "ALLYGLS!") {
                    console.log("GIELLESSE SRL found an ally!");
                    this.allyList.add(id);
                    await this.deliverooApi.say(id, new Message("ALLYGLS!", this.secretToken, id, "I'm the master! :)"));
                }
            }
        })

    }

    async commTest() {
        if (this.isMaster) {
            await this.deliverooApi.shout(new Message("ALLYGLS?"))
        }
        // await this.deliverooApi.ask('0a8dd3ae6f5', new Message(beliefSet.me.id, "superSecretToken!",'0a8dd3ae6f5', 'test', 'Hello from GIELLESSE!'))
    }
}


export { Client };