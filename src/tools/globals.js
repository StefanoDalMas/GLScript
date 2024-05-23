import { local, remote } from '../../config/config.js';

//make Global contain put_down_in_queue and go_put_down_tries
class Global {
    constructor() {
        this.client = local;


        this.put_down_in_queue = false;
        this.go_put_down_tries = 0;
        this.MAX_QUEUE_SIZE = 3;
        this.MAX_PICKED_PARCELS = 3;

        this.me = {};
        this.agentsLocations = new Map();

        this.parcels = new Map();
        this.parcelLocations = []; // {present : 1/0, id : parcel_id}
        this.parcels_on_head = 0
        this.delivery_tiles = [];
        this.spawning_tiles = [];
        this.all_spawning = false;

        this.PARCEL_DECADING_INTERVAL;
        this.MOVEMENT_DURATION;
        this.MOVEMENT_STEPS;
        this.CLOCK;

        //might be needed for map stuff
        this.deliveroo_map;
        this.MAX_WIDTH;
        this.MAX_HEIGHT;
    }

    decaying_active() {
        return this.PARCEL_DECADING_INTERVAL !== "infinite";
    }
}

let global = new Global();
export { global };