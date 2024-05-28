
import { consts } from '../classes/consts.js'
import { distance } from '../tools/distance.js'
import { Parcel } from '../classes/parcel.js'

function onParcelSensingHandler(parcels, beliefs, intentionQueue) {
    const options = []
    for (const parcel of parcels.values())
        if (!parcel.carriedBy)
            options.push(['go_pick_up', new Parcel(parcel)]);

    /**
     * Options filtering (belief filtering)
     */
    let best_option;
    let reward = Number.NEGATIVE_INFINITY;
    for (const option of options) {
        //check if option is in intention_queue
        if (option[0] == 'go_pick_up' && !intentionQueue.find((i) => i.predicate.join(' ') == option.join(' '))) {
            let parcel = option[1];
            let current_d = distance(parcel.getLocation(), beliefs.me);
            let current_reward = parcel.rewardAfterNSteps(current_d);
            if (current_d === 0){
                current_reward = 0;
            }
            if (current_reward > 0 && current_reward > reward) {
                best_option = option
                reward = current_reward
            }
        }
    }

    /**
     * Best option is selected
     */
    if (best_option && intentionQueue.length() < consts.MAX_QUEUE_SIZE) {
        // console.log("best option: ", best_option)
        let parcel = best_option[1];
        intentionQueue.push(parcel.intoPredicate(best_option[0]))
    }

}

async function onParcelSensingHandlerAsync(perceived_parcels, beliefs) {
    let counter = 0
    for (const p of perceived_parcels) {
        beliefs.parcels.set(p.id, new Parcel(p))
        if (!p.carriedBy && p.reward > 0) {
            beliefs.parcelLocations[p.x][p.y] = { present: 1, id: p.id }
        }
        else {
            if (p.carriedBy === beliefs.me.id) {
                counter += 1;
            }
        }
    }
    //se non la vedo decremento la sua probabilità E valuto il suo reward coi timestamp

    //se ho il set non vuoto, comunico a ogni alleato le mie parcelle
    beliefs.me.parcels_on_head = counter;
}

export { onParcelSensingHandler, onParcelSensingHandlerAsync }