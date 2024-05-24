import { onlineSolver } from "@unitn-asa/pddl-client";
import { Graph, astar } from './src/tools/astar.js';
import { PDDLProblem } from './src/planning/PDDLProblem.js'
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


// const customSet = new ParcelLocationsSet();
// customSet.add(2, 3);
// console.log(customSet.has(2, 3));
// console.log(customSet.has(2, 4));
// customSet.delete(2, 3);
// console.log(customSet.has(2, 3));


//create a matrix 4 x 4 with 1s and 0s

//given the graph of the game, return a list of statements that describe the map
//removing all the walls, basically it sees everything as a corridor
// async function map_to_statements(tiles) {
//     let statements = []; // contains all of the statements
//     //I need a set in which i just insert the item, it has to be unique and I only insert the id as value
//     let idsToMakeObjects = new Set();

//     for (let node of graph.nodes) {
//         //skip all walls
//         if (node.weight !== 0) {
//             //find the neighbour and state the relation
//             let neighbor = graph.neighbors(node);
//             idsToMakeObjects.add(node.id);
//             let tile = graph.find((tileCheck) => tileCheck.x === (node.x - 1) && tileCheck.y === node.y)
//             //check if the tile found is not a wall
//             if (tile !== undefined && tile.weight !== 0) {
//                 idsToMakeObjects.add(tile.id);
//                 statements.push(`(right_of ${node.id} ${tile.id})`);
//             }
//             tile = graph.find((tileCheck) => tileCheck.x === (node.x + 1) && tileCheck.y === node.y)
//             if (tile !== undefined && tile.weight !== 0) {
//                 idsToMakeObjects.add(tile.id);
//                 statements.push(`(left_of ${node.id} ${tile.id})`);
//             }
//             tile = graph.find((tileCheck) => tileCheck.x === node.x && tileCheck.y === (node.y - 1))
//             if (tile !== undefined && tile.weight !== 0) {
//                 idsToMakeObjects.add(tile.id);
//                 statements.push(`(up_of ${node.id} ${tile.id})`);
//             }
//             tile = graph.find((tileCheck) => tileCheck.x === node.x && tileCheck.y === (node.y + 1))
//             if (tile !== undefined && tile.weight !== 0) {
//                 idsToMakeObjects.add(tile.id);
//                 statements.push(`(down_of ${node.id} ${tile.id})`);
//             }
//         }
//     }

//     //how can I return the statements and the idsToMakeObjects?
//     return { statementList: statements, idsToObjectMap: idsToMakeObjects };
// }

let map = [
    [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
    [0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]
];

let graph = new Graph(map);

let path = astar.search(graph, graph.grid[1][1], graph.grid[16][16]);


// let { statementList, idsToObjectMap } = await map_to_statements(graph);


// class PDDLProblem {
//     constructor(graph, from, to) {
//         this.graph = graph;
//         this.from = from;
//         this.to = to;
//     }
//     async setUpStrings() {
//         //get the statements and objects of the graph
//         this.problem_str = '(define (problem deliverooProblem) '
//         this.domain_str = '(:domain deliveroo_js) ';
//         let { statementList, idsToObjectMap } = await map_to_statements(this.graph);
//         //add initial point
//         // statementList.push(`(at ${graph.grid[1][1].id})`);
//         statementList.push(`(at ${this.from.id})`);
//         //add all of the objects
//         let objects_str = '(:objects ';
//         for (let id of idsToObjectMap) {
//             objects_str += ` ${id} - Tile `;
//         }
//         objects_str += `) `;
//         this.objects_str = objects_str;
//         let initState = '(:init ';
//         for (let statement of statementList) {
//             initState += `${statement} `;
//         }
//         initState += ') ';
//         this.initState = initState;
//         this.goalState = `(:goal (at ${this.to.id})) )`; //last parenthesis is for the problem
//     }
//     async getProblemString() {
//         await this.setUpStrings();
//         return this.problem_str + this.domain_str + this.objects_str + this.initState + this.goalState;
//     }

// }
//now just add the initial and final position(simply access the [x,y] of the node and get its id)

let problem = new PDDLProblem(graph, graph.grid[1][1], graph.grid[16][16]);
//open a file and put the string in it
//import fs like import {}
let problemString = await problem.getProblemString();
import fs from 'fs';

fs.writeFile('problem.pddl', problemString, function (err) {
    if (err) throw err;
    console.log('Saved!');
});


let domainString = fs.readFileSync('./src/planning/deliveroojs.pddl', 'utf8').replace(/\r?\n|\r/g, '').replace(/\s\s+/g, ' ');

// console.log(domainString);

let plan = await onlineSolver(domainString, problemString);

// console.log(plan)

let tmp = graph.findNodeId(plan[0].args[0]);

for (let step of plan) {
    if (step.action == 'move_right') {
        console.log("move right :)")
    }
    if (step.action == 'move_left') {
        console.log("move left :)")
    }
    if (step.action == 'move_up') {
        console.log("move up :)")
    }
    if (step.action == 'move_down') {
        console.log("move down :)")
    }
}

// for (let action of plan) {
//     console.log(graph.findNodeId(action.args[0]).toString(),graph.findNodeId(action.args[1].toString()));
// }
// console.log(path);
console.log("end with len: " + plan.length)



