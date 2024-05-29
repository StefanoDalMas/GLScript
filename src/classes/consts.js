class Consts{
    constructor(){
        this.put_down_in_queue = false;
        this.go_put_down_tries = 0;
        this.MAX_QUEUE_SIZE = 3;
        this.MAX_PICKED_PARCELS = 3;
        this.MAX_GOTO_TRIES = 3;

        this.PROBABILITY_DECAY = 0.03;
        this.THRESHOLD_REMOVAL = 0.4;
        
        this.PARCEL_DECADING_INTERVAL;
        this.MOVEMENT_DURATION;
        this.MOVEMENT_STEPS;
        this.CLOCK;

        this.MAX_WIDTH;
        this.MAX_HEIGHT;
    }
    decayingActive(){
        return this.PARCEL_DECADING_INTERVAL !== "infinite";
    }
}

let consts = new Consts();
export { consts }