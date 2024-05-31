class Consts {
    constructor() {
        this.put_down_in_queue = false;
        this.go_put_down_tries = 0;
        
        // this.deliveryingAfterCollaboration = false;
        this.MAX_QUEUE_SIZE = 3;
        this.MAX_PICKED_PARCELS = 3;
        this.MAX_PLAN_TRIES = 3;

        this.PARCEL_PROBABILITY_DECAY = 0.03;
        this.PARCEL_THRESHOLD_REMOVAL = 0.4;

        this.AGENT_PROBABILITY_DECAY = 0.05;
        this.AGENT_THRESHOLD_REMOVAL = 0.5;

        this.PARCEL_DECADING_INTERVAL;
        this.MOVEMENT_DURATION;
        this.MOVEMENT_STEPS;
        this.CLOCK;

        this.MAX_WIDTH;
        this.MAX_HEIGHT;

        //avoid flooding
        this.lastParcelExchange = Date.now();
        this.lastAgentExchange = Date.now();
        this.MAX_DATA_EXCHANGE_INTERVAL = 1000;
    }
    decayingActive() {
        return this.PARCEL_DECADING_INTERVAL !== "infinite";
    }
}

let consts = new Consts();
export { consts }