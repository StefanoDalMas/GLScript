
import {Plan} from './plan.js';
import {findBestTile} from '../tools/findBestTile.js';
import { astar, Graph } from "../tools/astar.js"
import {deliveroo_graph,delivery_tiles,spawning_tiles,me, parcel_locations, client} from '../main.js';

class GoPickUp extends Plan {

    static isApplicableTo(go_pick_up, x, y, id) {
        return go_pick_up == 'go_pick_up';
    }

    async execute(go_pick_up, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await client.pickup()
        // parcel_locations = parcel_locations.filter(item => !(item[0] !== x && item[1] !== y))
        if (status) {
            parcel_locations[x][y] = 0
            console.log("provo a tirar su con PICK UP")
            if (this.stopped) throw ['stopped']; // if stopped then quit
            return true;
        }
        return false;
    }

}

export {GoPickUp};