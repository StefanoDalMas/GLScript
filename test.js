import { astar, Graph } from './src/astar.js';

// let graph;
// graph = new Graph([
//     [1,1,1,1],
//     [0,1,1,1],
//     [0,0,0,1],
//     [0,0,1,1],
// ]);
// var start = graph.grid[0][0];
// var end = graph.grid[3][2];
// var result = astar.search(graph, start, end);
// console.log(result)
// let db = [[2, 3], [4, 3], [9, 10]];
// if (db.some(arr => arr[0] === 2 && arr[1] === 3)) { // i hate js
//     console.log("yes");
// }

class ParcelLocationsSet {
    constructor() {
        this.parcel_locations = {}
    }

    _hash(x, y) {
        return ((x.toString() + y.toString()).hashCode())
    }

    add(x, y) {
        const hash = this._hash(x, y)
        this.parcel_locations[hash] = true;
    }
    has(x, y) {
        const hash = this._hash(x, y)
        return this.parcel_locations[hash] === true;
    }
    delete(x, y) {
        const hash = this._hash(x, y)
        this.parcel_locations[hash] = false;
    }
}

String.prototype.hashCode = function () {
    let hash = 0;
    if (this.length === 0) return hash;
    for (let i = 0; i < this.length; i++) {
        const char = this.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};


const customSet = new ParcelLocationsSet();
customSet.add(2, 3);
console.log(customSet.has(2, 3));
console.log(customSet.has(2, 4));
customSet.delete(2, 3);
console.log(customSet.has(2, 3));