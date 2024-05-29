import { Intention } from './intention.js';
import { findBestTile } from '../tools/findBestTile.js';
import { consts } from '../classes/consts.js';
import { Parcel } from '../classes/parcel.js';
import { MaxHeap } from '../tools/maxHeap.js';
import { distance } from '../tools/distance.js';
import { client } from '../main.js';
import { Message } from '../classes/message.js';


class IntentionRevision {

    // [MaxHeap]
    // #intention_queue = new Array();
    intention_queue = new MaxHeap();
    get intention_queue() {
        return this.intention_queue;
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
            // console.log("dimensione:", this.intention_queue.length)
            console.log("go_put_down_tries = ", consts.go_put_down_tries)
            if (this.intention_queue.length > 0) {

                // for (var i = 0; i < this.intention_queue.length; i++) {
                //     result += this.intention_queue[i].predicate;
                //     if (i !== this.intention_queue.length - 1) {
                //         result += " "; // Aggiungi uno spazio tra gli elementi, tranne l'ultimo
                //     }
                // }

                // [MaxHeap]
                // console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));
                // console.log('intentionRevision.loop', this.intention_queue.toArray().map(i => i.predicate));

                // -----------
                // console.log("n_paracels >= maxPickedParacels: ", client.beliefSet.me.parcels_on_head >= consts.MAX_PICKED_PARCELS)
                // console.log("put_down_in_queue: ", consts.put_down_in_queue)
                // console.log("me.x && me.y: ", client.beliefSet.me.x && client.beliefSet.me.y)
                // console.log("go_put_down_tries < 10: ", consts.go_put_down_tries < 10)
                // -----------
                if (client.beliefSet.me.parcels_on_head >= consts.MAX_PICKED_PARCELS && !consts.put_down_in_queue && client.beliefSet.me.x && client.beliefSet.me.y && consts.go_put_down_tries < 10) {


                    /**
                     * Options filtering (trovo la tile di consegnap più vicina)
                    */
                    let best_option = findBestTile(client.beliefSet.delivery_tiles);

                    if (best_option) {
                        consts.go_put_down_tries += 1;
                        this.push(['go_put_down', best_option[0], best_option[1]]);
                        consts.put_down_in_queue = true;
                    }
                }

                // Current intention
                // [MaxHeap]
                // const intention = this.intention_queue[0];
                const intention = this.intention_queue.extractMax();

                // Is queued intention still valid? Do I still want to achieve it?
                if (intention.predicate[0] === 'go_pick_up') {
                    let id = intention.predicate[3]
                    let p = client.beliefSet.parcels.get(id);
                    if (p) {
                        let stepsToReach = distance(client.beliefSet.me, { x: p.x, y: p.y });
                        let guessedReward = p.rewardAfterNSteps(stepsToReach);
                        //parcelLocations lo settiamo mai a 0?
                        if (p.carriedBy || client.beliefSet.parcelLocations[p.x][p.y].present == 0 || guessedReward <= 0) {
                            console.log('Skipping intention because no more valid', intention.predicate)
                            // [MaxHeap]
                            // this.intention_queue.shift();
                            continue;
                        }
                    }

                }
                if (intention.predicate[0] === 'go_put_down') {
                    //ask for Collaboration possibility
                    //IN SINGLE CORRIDOR DOES NOT GET ACCEPTED
                    if (client.allyList.size > 0) {
                        for (let ally of client.allyList) {
                            let parcelsIterator = client.beliefSet.parcels.values().filter(parcel => parcel.carriedBy === client.beliefSet.me.id);
                            let carriedParcels = [];
                            for (let parcel of parcelsIterator) {
                                carriedParcels.push(parcel);
                            }
                            let expectedReward = 0;
                            let dist = distance(client.beliefSet.me, { x: parseInt(intention.predicate[1]), y: parseInt(intention.predicate[2]) });
                            for (let parcel of carriedParcels) {
                                let reward = parcel.rewardAfterNSteps(dist);
                                expectedReward += reward;
                            }
                            if (expectedReward <= 0) {
                                expectedReward = 0;
                            }
                            let msg = new Message("SetUpCollaboration", client.secretToken, { x: client.beliefSet.me.x, y: client.beliefSet.me.y, parcels: carriedParcels, reward: expectedReward });
                            let response = await client.deliverooApi.ask(ally.id, msg);
                            console.log("response: ", response);
                        }
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

            } else if (client.beliefSet.me.parcels_on_head && consts.go_put_down_tries < 10 && !consts.put_down_in_queue) {


                /**
                 * Options filtering (trovo la tile di consegnap più vicina)
                */
                let best_option = findBestTile(client.beliefSet.delivery_tiles);
                if (best_option) {
                    consts.go_put_down_tries += 1;
                    this.push(['go_put_down', best_option[0], best_option[1]]);
                    consts.put_down_in_queue = true;
                } else {
                    if (client.allyList.size > 0) {
                        for (let ally of client.allyList) {
                            let parcelsIterator = client.beliefSet.parcels.values().filter(parcel => parcel.carriedBy === client.beliefSet.me.id);
                            let carriedParcels = [];
                            for (let parcel of parcelsIterator) {
                                carriedParcels.push(parcel);
                            }
                            let msg = new Message("SetUpCollaboration", client.secretToken, { x: client.beliefSet.me.x, y: client.beliefSet.me.y, parcels: carriedParcels, reward: 0 });
                            let response = await client.deliverooApi.ask(ally.id, msg);
                            console.log("response: ", response);
                        }
                    }
                }
            } else {
                if (consts.go_put_down_tries >= 10) {
                    consts.go_put_down_tries = 0;
                }
                console.log("pushing random")
                this.push(['random_move'])
            }



            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }

    length() {
        return this.intention_queue.length;
    }
    find(callback) {
        return this.intention_queue.find(callback);
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




export { IntentionRevisionQueue, IntentionRevisionReplace, IntentionRevision, IntentionRevisionMaxHeap }