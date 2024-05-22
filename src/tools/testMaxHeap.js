import { MaxHeap } from "./maxHeap.js";
import { Intention } from "../intentions/intention.js";

const maxHeap = new MaxHeap();
maxHeap.insert(new Intention(null, ['go_put_down']));
maxHeap.insert(new Intention(null, ['random_move']));
maxHeap.insert(new Intention(null, ['go_pick_up']));

// Using toArray to perform map operation
const predicates = maxHeap.toArray().map(i => i.predicate);
console.log(maxHeap.extractMax().predicate); // Output: [ ['go_put_down'], ['random_move'], ['go_pick_up'] ]