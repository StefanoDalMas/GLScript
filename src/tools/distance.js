import { Graph, astar } from "./astar.js";
import { global } from "./globals.js";

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    // const dx = Math.abs(Math.round(x1) - Math.round(x2))
    // const dy = Math.abs(Math.round(y1) - Math.round(y2))
    // return dx + dy;
    // console.log("primo", x1, y1);
    // console.log("my position", x2, y2);
    let path = astar.search(global.deliveroo_graph, global.deliveroo_graph.grid[Math.round(x2)][Math.round(y2)], global.deliveroo_graph.grid[Math.round(x1)][Math.round(y1)]);
    return path.length;
}

export { distance }