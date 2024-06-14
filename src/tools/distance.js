import { Graph, astar } from "./astar.js";
import { client } from "../main.js";

// return lenght of astar path
function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    let path = astar.search(client.beliefSet.deliveroo_graph, client.beliefSet.deliveroo_graph.grid[Math.round(x2)][Math.round(y2)], client.beliefSet.deliveroo_graph.grid[Math.round(x1)][Math.round(y1)]);
    return path.length;

}

export { distance }