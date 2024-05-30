class Agent {
    constructor(agent) {
        this.id = agent.id;
        this.x = Math.round(agent.x);
        this.y = Math.round(agent.y);
        this.score = agent.score;
        this.probability = 1;
        this.timestamp = Date.now();
    }
}

export { Agent }