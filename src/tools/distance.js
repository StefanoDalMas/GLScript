import { Graph, astar } from "./astar.js";
import { global } from "./globals.js";
import { client } from "../main.js";

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    //since we cannot use astar with pddl, we have to use the distanza aerea
    if (client.usingPddl){
        let path = Math.abs(Math.round(x1) - Math.round(x2)) + Math.abs(Math.round(y1) - Math.round(y2));
        return path;

    } else {
        let path = astar.search(global.deliveroo_graph, global.deliveroo_graph.grid[Math.round(x2)][Math.round(y2)], global.deliveroo_graph.grid[Math.round(x1)][Math.round(y1)]);
    return path.length;
    }
    
}

export { distance }