import { client } from '../main.js';

export function findNeighbors() {
    return client.beliefSet.deliveroo_graph.neighbors(client.beliefSet.deliveroo_graph.grid[client.beliefSet.me.x][client.beliefSet.me.y]);
}