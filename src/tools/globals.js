import { local, remote } from '../../config/config.js';

//make Global contain put_down_in_queue and go_put_down_tries
class Global {
    constructor() {
        this.client = local;
        this.parcel_locations;


        this.put_down_in_queue = false;
        this.go_put_down_tries = 0;
        this.MAX_QUEUE_SIZE = 3;
        this.MAX_PICKED_PARCELS = 3;

        this.me = {};

        this.parcels = new Map();
        this.parcel_locations = [];
        this.n_parcels = 0
        this.delivery_tiles = [];
        this.spawning_tiles = [];
        this.all_spawning = false;

    }
}

let global = new Global();
export { global };