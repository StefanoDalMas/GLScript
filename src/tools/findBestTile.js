
import { distance } from "./distance.js";
import { client } from "../main.js";

// find closest tile among a list of tiles
function findBestTile(tiles_to_check) {
    let best_option = undefined;
    let nearest = Number.MAX_VALUE;
    for (const option of tiles_to_check) {
        if (client.beliefSet.me.x == option[0] && client.beliefSet.me.y == option[1]) {
            return option;
        }
        let [x, y] = option;
        let current_d = distance({ x, y }, client.beliefSet.me)
        if (current_d > 0 && current_d < nearest) {
            best_option = option
            nearest = current_d
        }
    }
    return best_option;
}

// as above with custom position
function findBestTileGivenPosition(tiles_to_check, custom_x, custom_y) {
    let best_option = undefined;
    let nearest = Number.MAX_VALUE;
    for (const option of tiles_to_check) {
        if (client.beliefSet.me.x == option[0] && client.beliefSet.me.y == option[1]) {
            return option;
        }
        let [x, y] = option;
        let current_d = distance({ x, y }, { x: custom_x, y: custom_y })
        if (current_d > 0 && current_d < nearest) {
            best_option = option
            nearest = current_d
        }
    }
    return best_option;
}

export { findBestTile, findBestTileGivenPosition };