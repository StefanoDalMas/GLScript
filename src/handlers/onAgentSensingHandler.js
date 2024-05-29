import { consts } from "../classes/consts.js";
import { Agent } from '../classes/agents.js'


//TODO MAP THIS ONE

async function onAgentSensingHandler(agents, beliefs) {
    agents.forEach(agent => {
        beliefs.agentsLocations.set(agent.id, new Agent(agent));
        beliefs.deliveroo_graph.setWall(Math.round(agent.x), Math.round(agent.y));
    });
    //for every agent that I do not see, I have to reduce its probability of being there
    for (let agent of beliefs.agentsLocations.values()) {
        if (!agents.find((a) => a.id === agent.id)) {
            agent.probability -= consts.AGENT_PROBABILITY_DECAY;
            if (agent.probability > 0 && agent.probability < consts.AGENT_THRESHOLD_REMOVAL) {
                beliefs.deliveroo_graph.setWalkable(agent.x, agent.y);
            }
        }
    }
}

export { onAgentSensingHandler }