
import { Plan } from './plan.js';
import { global } from '../tools/globals.js';

class GoPutDown extends Plan {

    static isApplicableTo(go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }

    async execute(go_put_down, x, y, id) {
        console.log("put_down_in_queue", global.put_down_in_queue)
        //TODO qui si rompe!!!
        global.put_down_in_queue = false;
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let status = await global.client.putdown();
        if (status) {
            global.go_put_down_tries = 0
            return true;
        }
        return false;
    }

}

export { GoPutDown };