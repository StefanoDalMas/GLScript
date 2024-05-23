import { Graph } from "./tools/astar.js"
import { distance } from "./tools/distance.js"
import { IntentionRevisionQueue, IntentionRevisionMaxHeap } from "./intentions/intentionRevision.js";
import { global } from "./tools/globals.js"
import { Parcel } from './classes/parcel.js';
import { Agent } from './classes/agents.js';
import { local, remote } from '../config/config.js';
import { Client } from './classes/client.js'


const client = new Client(local);

