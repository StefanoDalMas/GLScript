export class MaxHeap {
    constructor() {
        this.heap = [];
    }

    getParentIndex(index) {
        return Math.floor((index - 1) / 2);
    }

    getLeftChildIndex(index) {
        return 2 * index + 1;
    }

    getRightChildIndex(index) {
        return 2 * index + 2;
    }

    swap(index1, index2) {
        [this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]];
    }

    insert(element) {
        this.heap.push(element);
        this.heapifyUp();
    }

    heapifyUp() {
        let index = this.heap.length - 1;
        while (index > 0) {
            const parentIndex = this.getParentIndex(index);
            if (this.heap[parentIndex].priority < this.heap[index].priority) {
                this.swap(parentIndex, index);
                index = parentIndex;
            } else {
                break;
            }
        }
    }

    extractMax() {
        if (this.heap.length === 0) {
            throw new Error('Heap is empty');
        }
        if (this.heap.length === 1) {
            return this.heap.pop();
        }

        const max = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.heapifyDown();
        return max;
    }

    heapifyDown() {
        let index = 0;
        const length = this.heap.length;

        while (this.getLeftChildIndex(index) < length) {
            let largestChildIndex = this.getLeftChildIndex(index);
            const rightChildIndex = this.getRightChildIndex(index);

            if (rightChildIndex < length && this.heap[rightChildIndex].priority > this.heap[largestChildIndex].priority) {
                largestChildIndex = rightChildIndex;
            }

            if (this.heap[index].priority < this.heap[largestChildIndex].priority) {
                this.swap(index, largestChildIndex);
                index = largestChildIndex;
            } else {
                break;
            }
        }
    }

    peek() {
        if (this.heap.length === 0) {
            throw new Error('Heap is empty');
        }
        return this.heap[0];
    }

    get size() {
        return this.heap.length;
    }

    get isEmpty() {
        return this.heap.length === 0;
    }

    get length() {
        return this.heap.length;
    }

    find(callback) {
        return this.heap.find(callback);
    }

    toArray() {
        return this.heap.slice();
    }
}