class BeliefSet {
    constructor() {
        this.me = {};
        this.agentsLocations = new Map();

        this.parcels = new Map();
        this.parcelLocations = []; // {present : 1/0, id : parcel_id}
        this.parcels_on_head = 0
        this.delivery_tiles = [];
        this.spawning_tiles = [];
        this.all_spawning = false;

        this.deliveroo_map;
        this.deliveroo_graph;
    }
}


export { BeliefSet };