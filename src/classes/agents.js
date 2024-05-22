import { global } from "../tools/globals.js";


class Agent {
    constructor(agent) {
        this.id = agent.id;
        this.x = Math.round(agent.x);
        this.y = Math.round(agent.y);
        this.score = agent.score;
    }
}

export { Agent }