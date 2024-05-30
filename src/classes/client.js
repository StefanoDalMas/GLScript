import { consts } from './consts.js';
import { IntentionRevisionMaxHeap } from '../intentions/intentionRevision.js';
import { Parcel } from './parcel.js';
import { Agent } from './agents.js';
import { Graph } from '../tools/astar.js';
import { distance } from '../tools/distance.js';
import { Message } from '../classes/message.js';
import { BeliefSet } from './beliefSet.js';
import { onConfigHander } from '../handlers/onConfigHandler.js'
import { onMapHandler } from '../handlers/onMapHandler.js';
import { onParcelSensingHandler, onParcelSensingHandlerAsync } from '../handlers/onParcelSensingHandler.js';
import { onYouHandler } from '../handlers/onYouHandler.js';
import { onAgentSensingHandler } from '../handlers/onAgentSensingHandler.js';
import { onMsgHandler } from '../handlers/onMsgHandler.js';
import { CollaborationClass } from './collaborationClass.js';


class Client {
    constructor(configuration, usingPddl, isMaster, secretToken) {
        this.deliverooApi = configuration;
        this.usingPddl = usingPddl;
        this.isMaster = isMaster; // to tell if he is Master or Slave
        this.secretToken = secretToken;
        this.intentionQueue = new IntentionRevisionMaxHeap();
        this.beliefSet = new BeliefSet();
        this.allyList = new Set();
        this.collaborationClass = new CollaborationClass();
    }

    async configure() {
        await this.setUpCallbacks();
        await this.commTest();

        this.intentionQueue.loop();

    }

    async setUpCallbacks() {
        this.deliverooApi.onConfig(config => onConfigHander(config))

        this.deliverooApi.onMap((width, height, tiles) => onMapHandler(width, height, tiles, this.beliefSet))

        this.deliverooApi.onYou(({ id, name, x, y, score }) => onYouHandler(id, name, x, y, score, this.beliefSet))

        this.deliverooApi.onParcelsSensing(parcels => onParcelSensingHandler(parcels, this.beliefSet, this.intentionQueue))

        this.deliverooApi.onParcelsSensing(async (perceived_parcels) => onParcelSensingHandlerAsync(perceived_parcels, this.beliefSet, this.allyList, this.deliverooApi, this.secretToken))

        this.deliverooApi.onAgentsSensing(async (agents) => onAgentSensingHandler(agents, this.beliefSet, this.deliverooApi, this.secretToken, this.allyList))

        this.deliverooApi.onMsg((id, name, msg, callbackResponse) => onMsgHandler(id, name, msg, callbackResponse, this.isMaster, this.allyList, this.deliverooApi,this.secretToken, this.beliefSet, this.intentionQueue, this.collaborationClass))

    }

    async commTest() {
        if (this.isMaster) {
            await this.deliverooApi.shout(new Message("ALLYGLS?"))
        }
        // await this.deliverooApi.ask('0a8dd3ae6f5', new Message(this.beliefSet.me.id, "superSecretToken!",'0a8dd3ae6f5', 'test', 'Hello from GIELLESSE!'))
    }
}


export { Client };