import { Graph } from "./tools/astar.js"
import { distance } from "./tools/distance.js"
import { IntentionRevisionQueue, IntentionRevisionMaxHeap } from "./intentions/intentionRevision.js";
import { Parcel } from './classes/parcel.js';
import { Agent } from './classes/agents.js';
import { local, remote, local2 } from '../config/config.js';
import { Client } from './classes/client.js'


let secretToken = crypto.randomUUID();
let isMaster = process.argv[2] === "master" ? true : false;
let usingPddl = process.argv[3] === "pddl" ? true : false;
let clientApi = local;
if (!isMaster) {
    clientApi = local2;
}

const client = new Client(clientApi, usingPddl, isMaster, secretToken);
await client.configure();


export { client }