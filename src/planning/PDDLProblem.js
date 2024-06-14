export class PDDLProblem {
    constructor(graph, from, to) {
        this.graph = graph;
        this.from = from;
        this.to = to;
    }
    async setUpStrings() {
        // get the statements and objects of the graph
        this.problem_str = '(define (problem deliverooProblem) '
        this.domain_str = '(:domain deliveroo_js) ';
        let { statementList, idsToObjectMap } = await this.map_to_statements();
        // add initial point
        statementList.push(`(at ${this.from.id})`);
        // add all of the objects
        let objects_str = '(:objects ';
        for (let id of idsToObjectMap) {
            objects_str += ` ${id} - Tile `;
        }
        objects_str += `) `;
        this.objects_str = objects_str;
        let initState = '(:init ';
        // add all initial states
        for (let statement of statementList) {
            initState += `${statement} `;
        }
        initState += ') ';
        this.initState = initState;
        // add goal
        this.goalState = `(:goal (at ${this.to.id})) )`; //last parenthesis is for the problem
    }

    async getProblemString() {
        await this.setUpStrings();
        return this.problem_str + this.domain_str + this.objects_str + this.initState + this.goalState;
    }

    async map_to_statements() {
        let statements = []; // contains all of the statements
        // I need a set in which I just insert the item, it has to be unique and I only insert the id as value
        let idsToMakeObjects = new Set();
    
        for (let node of this.graph.nodes) {
            // skip all walls
            if (node.weight !== 0) {
                idsToMakeObjects.add(node.id);
                let tile = this.graph.find((tileCheck) => tileCheck.x === (node.x - 1) && tileCheck.y === node.y)
                //check if the tile found is not a wall
                if (tile !== undefined && tile.weight !== 0) {
                    idsToMakeObjects.add(tile.id);
                    statements.push(`(right_of ${node.id} ${tile.id})`);
                }
                tile = this.graph.find((tileCheck) => tileCheck.x === (node.x + 1) && tileCheck.y === node.y)
                if (tile !== undefined && tile.weight !== 0) {
                    idsToMakeObjects.add(tile.id);
                    statements.push(`(left_of ${node.id} ${tile.id})`);
                }
                tile = this.graph.find((tileCheck) => tileCheck.x === node.x && tileCheck.y === (node.y - 1))
                if (tile !== undefined && tile.weight !== 0) {
                    idsToMakeObjects.add(tile.id);
                    statements.push(`(up_of ${node.id} ${tile.id})`);
                }
                tile = this.graph.find((tileCheck) => tileCheck.x === node.x && tileCheck.y === (node.y + 1))
                if (tile !== undefined && tile.weight !== 0) {
                    idsToMakeObjects.add(tile.id);
                    statements.push(`(down_of ${node.id} ${tile.id})`);
                }
            }
        }
    
        //how can I return the statements and the idsToMakeObjects?
        return { statementList: statements, idsToObjectMap: idsToMakeObjects };
    }

}