
import { distance } from "./distance.js";
import { me } from "../main.js";

function findBestTile(tiles_to_check) {
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of tiles_to_check) {
        let [x, y] = option;
        let current_d = distance({ x, y }, me)
        // console.log("option is: ", option, " and distance is: ", current_d))
        if (current_d > 0 && current_d < nearest) {
            best_option = option
            nearest = current_d
        }
    }
    return best_option;
}

export {findBestTile};