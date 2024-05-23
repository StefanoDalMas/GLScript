import { Intention } from './intention.js';
import { findBestTile } from '../tools/findBestTile.js';
import { global } from '../tools/globals.js';
import { Parcel } from '../classes/parcel.js';
import { MaxHeap } from '../tools/maxHeap.js';
import { distance } from '../tools/distance.js';


class IntentionRevision {

    // [MaxHeap]
    // #intention_queue = new Array();
    #intention_queue = new MaxHeap();
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
            console.log("go_put_down_tries = ", global.go_put_down_tries)
            if (this.intention_queue.length > 0) {
                var result = "";

                // for (var i = 0; i < this.intention_queue.length; i++) {
                //     result += this.intention_queue[i].predicate;
                //     if (i !== this.intention_queue.length - 1) {
                //         result += " "; // Aggiungi uno spazio tra gli elementi, tranne l'ultimo
                //     }
                // }

                // [MaxHeap]
                // console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));
                console.log('intentionRevision.loop', this.intention_queue.toArray().map(i => i.predicate));

                // -----------
                console.log("n_paracels >= maxPickedParacels: ", global.n_parcels >= global.MAX_PICKED_PARCELS)
                console.log("put_down_in_queue: ", global.put_down_in_queue)
                console.log("me.x && me.y: ", global.me.x && global.me.y)
                console.log("go_put_down_tries < 10: ", global.go_put_down_tries < 10)
                // -----------
                if (global.n_parcels >= global.MAX_PICKED_PARCELS && !global.put_down_in_queue && global.me.x && global.me.y && global.go_put_down_tries < 10) {


                    /**
                     * Options filtering (trovo la tile di consegnap più vicina)
                    */
                    let best_option = findBestTile(global.delivery_tiles);

                    if (best_option) {
                        global.go_put_down_tries += 1;
                        this.push(['go_put_down', best_option[0], best_option[1]]);
                        global.put_down_in_queue = true;
                    }
                }

                // Current intention
                // [MaxHeap]
                // const intention = this.intention_queue[0];
                const intention = this.intention_queue.extractMax();

                // Is queued intention still valid? Do I still want to achieve it?
                if (intention.predicate[0] === 'go_pick_up') {
                    let id = intention.predicate[3]
                    let p = global.parcels.get(id);
                    let current_d = distance(p.getLocation(), global.me);
                    let guessed_reward = p.rewardAfterNSteps(current_d);

                    //parcelLocations lo settiamo mai a 0?
                    if (p && p.carriedBy || global.parcelLocations[p.x][p.y].present == 0 || guessed_reward <= 0) {
                        console.log('Skipping intention because no more valid', intention.predicate)
                        // [MaxHeap]
                        // this.intention_queue.shift();
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
                // [MaxHeap]
                // this.intention_queue.shift();

            } else if (global.n_parcels && global.go_put_down_tries < 10 && !global.put_down_in_queue) {


                /**
                 * Options filtering (trovo la tile di consegnap più vicina)
                */
                let best_option = findBestTile(global.delivery_tiles);
                if (best_option) {
                    global.go_put_down_tries += 1;
                    this.push(['go_put_down', best_option[0], best_option[1]]);
                    global.put_down_in_queue = true;
                }
            } else {
                if (global.go_put_down_tries >= 10) {
                    global.go_put_down_tries = 0;
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

class IntentionRevisionMaxHeap extends IntentionRevision {

    async push(predicate) {

        if (predicate) {
            // Check if already queued
            if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' ')))
                return; // intention is already queued

            console.log('IntentionRevisionReplace.push', predicate);
            const intention = new Intention(this, predicate);
            this.intention_queue.insert(intention);
        }
    }

}




export { IntentionRevisionQueue, IntentionRevisionStack, IntentionRevisionReplace, IntentionRevision, IntentionRevisionMaxHeap }