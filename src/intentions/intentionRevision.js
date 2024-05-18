import { Intention } from './intention.js';
import { MAX_PICKED_PARCELS } from '../../config/config.js';
import { me, n_parcels, delivery_tiles, parcels, } from '../main.js';
import { findBestTile } from '../tools/findBestTile.js';


let put_down_in_queue = false
let go_put_down_tries = 0


class IntentionRevision {

    #intention_queue = new Array();
    get intention_queue() {
        return this.#intention_queue;
    }

    #map_graph
    get map_graph() {
        return this.#map_graph;
    }

    /**
     * Start intention revision loop
     */
    async loop() {
        while (true) {

            // Consumes intention_queue if not empty
            console.log("dimensione:", this.#intention_queue.length)
            console.log(go_put_down_tries)
            if (this.intention_queue.length > 0) {
                var result = "";
                for (var i = 0; i < this.intention_queue.length; i++) {
                    result += this.intention_queue[i].predicate;
                    if (i !== this.intention_queue.length - 1) {
                        result += " "; // Aggiungi uno spazio tra gli elementi, tranne l'ultimo
                    }
                }

                console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));

                if (n_parcels == MAX_PICKED_PARCELS && !put_down_in_queue && me.x != undefined && me.y != undefined && go_put_down_tries < 10) {

                    go_put_down_tries += 1;

                    /**
                     * Options filtering (trovo la tile di consegnap più vicina)
                     */
                    let best_option = findBestTile(delivery_tiles);

                    if (best_option) {
                        this.push(['go_put_down', best_option[0], best_option[1]]);
                        put_down_in_queue = true;
                    }
                }

                // Current intention
                const intention = this.intention_queue[0];
                console.log(intention)

                // Is queued intention still valid? Do I still want to achieve it?
                if (intention[0] == 'go_pick_up') {
                    let id = intention.predicate[3]
                    let p = parcels.get(id)

                    if (p && p.carriedBy || parcel_locations[p.x][p.y] == 0) {
                        console.log('Skipping intention because no more valid', intention.predicate)
                        continue;
                    }
                }
                // Start achieving intention
                await intention.achieve()
                    // Catch eventual error and continue
                    .catch(error => {
                        console.log(error)
                        console.log('Failed intention', ...intention.predicate, 'with error:', ...error)
                    });

                // Remove from the queue
                this.intention_queue.shift();

            } else if (n_parcels && go_put_down_tries < 10) {

                go_put_down_tries += 1;

                /**
                 * Options filtering (trovo la tile di consegnap più vicina)
                 */
                let best_option = findBestTile(delivery_tiles);
                if (best_option) {
                    this.push(['go_put_down', best_option[0], best_option[1]]);
                    put_down_in_queue = true;
                }
            } else {
                if (go_put_down_tries >= 10) {
                    go_put_down_tries = 0;
                }
                console.log("pushing random")
                this.push(['random_move'])
            }



            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }

    // async push ( predicate ) { }

    log(...args) {
        console.log(...args)
    }

}

class IntentionRevisionQueue extends IntentionRevision {

    async push(predicate) {

        if (predicate) {
            // console.log("predicate is: ", predicate)
            // Check if already queued
            if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' ')))
                return; // intention is already queued

            console.log('IntentionRevisionReplace.push', predicate);
            const intention = new Intention(this, predicate);
            this.intention_queue.push(intention);
        }
    }

}

class IntentionRevisionStack extends IntentionRevision {

    async push(predicate) {

        if (predicate) {
            // console.log("predicate is: ", predicate)
            // Check if already queued
            if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' ')))
                return; // intention is already queued

            console.log('IntentionRevisionReplace.push', predicate);
            const intention = new Intention(this, predicate);
            this.intention_queue.unshift(intention);
        }
    }

}

class IntentionRevisionReplace extends IntentionRevision {

    async push(predicate) {

        // Check if already queued
        const last = this.intention_queue.at(this.intention_queue.length - 1);
        if (last && last.predicate.join(' ') == predicate.join(' ')) {
            return; // intention is already being achieved
        }

        console.log('IntentionRevisionReplace.push', predicate);
        const intention = new Intention(this, predicate);
        this.intention_queue.push(intention);

        // Force current intention stop 
        if (last) {
            last.stop();
        }
    }

}

class IntentionRevisionRevise extends IntentionRevision {

    async push(predicate) {
        //     console.log('Revising intention queue. Received', ...predicate);
        //     // TODO
        //     // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        //     // - eventually stop current one
        //     // - evaluate validity of intention
        // }
    }

}




export { IntentionRevisionQueue, IntentionRevisionStack, IntentionRevisionReplace, IntentionRevision, go_put_down_tries, put_down_in_queue}