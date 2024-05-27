import { consts } from "../classes/consts.js";
import { Agent } from '../classes/agents.js'


//TODO MAP THIS ONE

async function onAgentSensingHandler(agents, beliefs) {
    agents.forEach(agent => {
        beliefs.agentsLocations.set(agent.id, new Agent(agent));
    })
    // For now I only set wall to the agents that I actually see
    for (let i = 0; i < consts.MAX_WIDTH; i++) {
        for (let j = 0; j < consts.MAX_HEIGHT; j++) {
            if (beliefs.deliveroo_map[i][j] == 1) {
                beliefs.deliveroo_graph.setWalkable(i, j);
            }
        }
    }
    //has to be changed!
    agents.forEach(agent => {
        let new_location = { x: Math.round(agent.x), y: Math.round(agent.y) };
        beliefs.deliveroo_graph.setWall(new_location.x, new_location.y);
    })
}

export { onAgentSensingHandler }