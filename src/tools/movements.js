import { client } from '../main.js';

export async function executePlannerMove(step){
    let status = false;
    if (step.action == 'move_right') {
        status = await client.deliverooApi.move('right');
    }
    if (step.action == 'move_left') {
        status = await client.deliverooApi.move('left');
    }
    if (step.action == 'move_up') {
        status = await client.deliverooApi.move('up');
    }
    if (step.action == 'move_down') {
        status = await client.deliverooApi.move('down');
    }

    return status;
}

export async function moveToNextTile(next_tile, me_x, me_y) {
    let status = false;
    if (next_tile.x == me_x + 1 && next_tile.y == me_y && !client.beliefSet.deliveroo_graph.getNode(me_x + 1, me_y).isWall()) {
        status = await client.deliverooApi.move('right')
    } else if (next_tile.x == me_x - 1 && next_tile.y == me_y && !client.beliefSet.deliveroo_graph.getNode(me_x - 1, me_y).isWall()) {
        status = await client.deliverooApi.move('left')
    } else if (next_tile.x == me_x && next_tile.y == me_y + 1 && !client.beliefSet.deliveroo_graph.getNode(me_x, me_y + 1).isWall()) {
        status = await client.deliverooApi.move('up')
    } else if (next_tile.x == me_x && next_tile.y == me_y - 1 && !client.beliefSet.deliveroo_graph.getNode(me_x, me_y - 1).isWall()) {
        status = await client.deliverooApi.move('down')
    }

    return status;
}

export async function moveWRTAllay(allyLocation, me_x, me_y, direction) {
    let status = false;
    if (direction === "opposite") {
        if (allyLocation.x === me_x + 1 && allyLocation.y === me_y) {
            status = await client.deliverooApi.move('left');
        } else if (allyLocation.x === me_x - 1 && allyLocation.y === me_y) {
            status = await client.deliverooApi.move('right');
        } else if (allyLocation.x === me_x && allyLocation.y === me_y + 1) {
            status = await client.deliverooApi.move('down');
        } else if (allyLocation.x === me_x && allyLocation.y === me_y - 1) {
            status = await client.deliverooApi.move('up');
        }
    } else if (direction === "towards") {
        if (allyLocation.x === me_x + 1 && allyLocation.y === me_y) {
            status = await client.deliverooApi.move('right');
        } else if (allyLocation.x === me_x - 1 && allyLocation.y === me_y) {
            status = await client.deliverooApi.move('left');
        } else if (allyLocation.x === me_x && allyLocation.y === me_y + 1) {
            status = await client.deliverooApi.move('up');
        } else if (allyLocation.x === me_x && allyLocation.y === me_y - 1) {
            status = await client.deliverooApi.move('down');
        }
    }
    return status
}

export function updatePosition(status) {
    client.beliefSet.me.x = Math.round(status.x);
    client.beliefSet.me.y = Math.round(status.y);
}