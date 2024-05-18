
import {Plan} from './plan.js';
import {findBestTile} from '../tools/findBestTile.js';
import { astar, Graph } from "../tools/astar.js"
import {deliveroo_graph,delivery_tiles,spawning_tiles,me,client} from '../main.js';
import {go_put_down_tries,put_down_in_queue} from '../intentions/intentionRevision.js';

class GoPutDown extends Plan {

    static isApplicableTo(go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }

    async execute(go_put_down, x, y, id) {
        //TODO qui si rompe!!!
        put_down_in_queue = false;
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await client.putdown();
        if (status) {
            go_put_down_tries = 0
            return true;
        }
        return false;

    }

}

export {GoPutDown};