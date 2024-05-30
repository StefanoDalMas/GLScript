import { Message } from '../classes/message.js';
import { astar } from '../tools/astar.js';
import { Parcel } from '../classes/parcel.js';
import { findBestTile, findBestTileGivenPosition } from '../tools/findBestTile.js';
import { distance } from '../tools/distance.js';
import { Agent } from '../classes/agents.js';

async function onMsgHandler(id, name, msg, callbackResponse, isMaster, allyList, deliverooApi, secretToken, beliefSet, intentionQueue) {
    console.log("received message from ", id, " with content: ", msg)
    if (allyList.size > 0 && msg.topic !== "ALLYGLS?") {
        //ternary oprator example
        let found = false;
        for (let ally of allyList) {
            if (ally.token === msg.token) {
                found = true;
            }
        }
        //allyList is a Set, we have to fix the line above
        if (!found) {
            console.log("Message from someone else!!!");
            return;
        }
    }
    if (isMaster) {
        if (msg.topic === "ALLYGLS!") {
            console.log("GIELLESSE SRL Master found an ally, sending token!");
            allyList.add({ id: id, token: msg.token });
            await deliverooApi.say(id, new Message("ALLYGLS!", secretToken, "I'm the master! :)"));
        }
    } else {
        if (msg.topic === "ALLYGLS?") {
            console.log("Slave found ally!");
            await deliverooApi.say(id, new Message("ALLYGLS!", secretToken, "I'm the slave! :)"));
        }
        if (msg.topic === "ALLYGLS!") {
            console.log("Slave GLS updating token!");
            allyList.add({ id: id, token: msg.token });
        }
    }
    if (msg.topic === "PARCELS") {
        console.log("Parcels recived")
        let externalParcels = msg.content.parcels;
        for (let parcel of externalParcels) {
            let objParcel = new Parcel(parcel)
            let parcelId = objParcel.id;
            if (beliefSet.parcels.has(parcelId)) {
                // se ho già quella parcella, tengo quella più recente e se non è la mia ricalcolo il reward
                let myParcel = beliefSet.parcels.get(parcelId);
                if (myParcel.timestamp < objParcel.timestamp) {
                    //non serve ricalcolare nulla, il valore è già aggiornato dall'altro sensing
                    beliefSet.parcels.delete(parcelId);
                    beliefSet.parcels.set(parcelId, objParcel)
                }
            } else {
                beliefSet.parcels.set(parcelId, objParcel)
            }
        }
    }
    if (msg.topic === "AGENTS") {
        console.log("Agents received");
        let externalAgents = msg.content.agents;
        for (let agent of externalAgents) {
            let objAgent = new Agent(agent);
            let agentId = objAgent.id;
            if (beliefSet.agentsLocations.has(agentId)) {
                let myAgent = beliefSet.agentsLocations.get(agentId);
                if (myAgent.timestamp < objAgent.timestamp) {
                    beliefSet.agentsLocations.delete(agentId);
                    beliefSet.agentsLocations.set(agentId, objAgent);
                }
            } else {
                beliefSet.agentsLocations.set(agentId, objAgent);
            }
        }
    }
    if (msg.topic === "SetUpCollaboration") {
        if (callbackResponse === undefined) {
            console.log("no callbackResponse");
            return;
        }
        else {
            let message;
            let path = astar.search(beliefSet.deliveroo_graph, beliefSet.deliveroo_graph.grid[msg.content.x][msg.content.y], beliefSet.deliveroo_graph.grid[beliefSet.me.x][beliefSet.me.y]);
            if (path.length === 0) {
                //TODO controllare se ho un alleato affianco, in quel caso collaborare subito!
                console.log("no path found");
                message = new Message("fail", secretToken, "no path was found");
            } else {
                //evaluate the value to surpass in order to collaborate
                let requesterReward = msg.content.reward;
                //evaluate my reward to Delivery 
                let bestTile = findBestTile(beliefSet.delivery_tiles);
                let responderDistanceToDelivery = distance(beliefSet.me, { x: bestTile[0], y: bestTile[1] });
                let responderParcels = beliefSet.parcels.values().filter(parcel => parcel.carriedBy === beliefSet.me.id);
                let responderReward = 0;
                for (let parcel of responderParcels) {
                    responderReward += parcel.rewardAfterNSteps(responderDistanceToDelivery);
                }
                if (responderReward <= 0) {
                    responderReward = 0;
                }
                let noCollaborationThreshold = requesterReward + responderReward;
                //now evaluate what we would gain by collaborating
                let middlePoint = path[Math.floor(path.length / 2) - 1];
                let requesterSteps = distance({ x: middlePoint.x, y: middlePoint.y }, { x: msg.content.x, y: msg.content.y });
                let bestDeliveryFromMiddlePoint = findBestTileGivenPosition(beliefSet.delivery_tiles, middlePoint.x, middlePoint.y);
                let distanceToBestDeliveryFromMiddlePoint = distance({ x: middlePoint.x, y: middlePoint.y }, { x: bestDeliveryFromMiddlePoint[0], y: bestDeliveryFromMiddlePoint[1] });
                let requesterCollaborationReward = 0;
                let requesterTotalSteps = requesterSteps + distanceToBestDeliveryFromMiddlePoint;
                for (let parcel of msg.content.parcels) {
                    let objParcel = new Parcel(parcel)
                    requesterCollaborationReward += objParcel.rewardAfterNSteps(requesterTotalSteps);
                }
                if (requesterCollaborationReward <= 0) {
                    requesterCollaborationReward = 0;
                }
                let responderSteps = distance({ x: middlePoint.x, y: middlePoint.y }, beliefSet.me);
                let responderTotalSteps = responderSteps + distanceToBestDeliveryFromMiddlePoint;
                let responderCollaborationReward = 0;
                for (let parcel of responderParcels) {
                    responderCollaborationReward += parcel.rewardAfterNSteps(responderTotalSteps);
                }
                if (responderCollaborationReward <= 0) {
                    responderCollaborationReward = 0;
                }
                let collaborationReward = requesterCollaborationReward + responderCollaborationReward;
                if (collaborationReward > noCollaborationThreshold + 2) {
                    console.log("we can collaborate!");
                    message = new Message("AtomicExchange", secretToken, { x: middlePoint.x, y: middlePoint.y });
                } else {
                    //do not collaborate
                    console.log("we cannot collaborate!");
                    message = new Message("fail", secretToken, "not worth to set up a collaboration!");

                }

            }
            try {
                console.log("Sending decision!");
                callbackResponse(message);
            }
            catch (error) {
                console.log("error in responding...");
            }

        }

    }
}
export { onMsgHandler }