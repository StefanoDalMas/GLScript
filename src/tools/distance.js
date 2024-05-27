import { Graph, astar } from "./astar.js";
import { client } from "../main.js";

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    //since we cannot use astar with pddl, we have to use the distanza aerea
    let path = astar.search(client.beliefSet.deliveroo_graph, client.beliefSet.deliveroo_graph.grid[Math.round(x2)][Math.round(y2)], client.beliefSet.deliveroo_graph.grid[Math.round(x1)][Math.round(y1)]);
    return path.length;

}

export { distance }