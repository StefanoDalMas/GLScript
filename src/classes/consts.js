class Consts{
    constructor(){
        this.put_down_in_queue = false;
        this.go_put_down_tries = 0;
        this.MAX_QUEUE_SIZE = 3;
        this.MAX_PICKED_PARCELS = 3;
        
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