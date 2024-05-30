import { consts } from "../classes/consts.js";
import { Agent } from '../classes/agents.js';
import { Message } from '../classes/message.js';



async function onAgentSensingHandler(agents, beliefs, deliverooApi, secretToken, allyList) {
    agents.forEach(agent => {
        //If I already know the agent, I have to update its position
        if (beliefs.agentsLocations.has(agent.id)) {
            let oldAgentData = beliefs.agentsLocations.get(agent.id);
            let old_x = oldAgentData.x;
            let old_y = oldAgentData.y;
            beliefs.deliveroo_graph.setWalkable(old_x, old_y);
        }
        //set it to wall
        beliefs.agentsLocations.set(agent.id, new Agent(agent));
        beliefs.deliveroo_graph.setWall(Math.round(agent.x), Math.round(agent.y));
    });
    //for every agent that I do not see, I have to reduce its probability of being there
    for (let agent of beliefs.agentsLocations.values()) {
        if (!agents.find((a) => a.id === agent.id)) {
            agent.probability -= consts.AGENT_PROBABILITY_DECAY;
            if (agent.probability > 0 && agent.probability < consts.AGENT_THRESHOLD_REMOVAL) {
                beliefs.deliveroo_graph.setWalkable(agent.x, agent.y);
                beliefs.agentsLocations.delete(agent.id);
            }
        }
    }
    if (beliefs.agentsLocations.size > 0 && allyList.size > 0) {
        let agentsIterator = beliefs.agentsLocations.values();
        let sensedAgents = [];
        for (let agent of agentsIterator) {
            sensedAgents.push(agent);
        }
        for (let ally of allyList) {
            await deliverooApi.say(ally.id, new Message("AGENTS", secretToken, { agents: sensedAgents }));
        }
    }
}

export { onAgentSensingHandler }