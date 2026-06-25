class BitSet {
    #arr;
    #capacity;

    constructor(capacity = 32) {
        if(!Number.isInteger(capacity) || capacity < 0) throw new Error("Invalid capacity.");
        if(capacity < 32) {
            this.#arr = new Uint32Array(1).fill(0);
        } else {
            const nCap = Math.ceil(capacity / 32);
            this.#arr = new Uint32Array(nCap).fill(0);
        }
        this.#capacity = capacity;
    }

    set(idx) {
        if(!Number.isInteger(idx)) throw new Error("Invalid capacity.");
        if(idx < 0 || idx >= this.#capacity) throw new Error("Index Error: Out of range.");

        const bucket = Math.floor(idx / 32);
        const buckIdx = idx % 32;

        this.#arr[bucket] = this.#arr[bucket] | (1 << buckIdx);
    }

    reset(idx) {
        if(!Number.isInteger(idx)) throw new Error("Invalid capacity.");
        if(idx < 0 || idx >= this.#capacity) throw new Error("Index Error: Out of range.");

        const bucket = Math.floor(idx / 32);
        const buckIdx = idx % 32;

        const tmpArr = this.#arr[bucket] | (1 << buckIdx);
        if(tmpArr === this.#arr[bucket]) {
            this.#arr[bucket] = this.#arr[bucket] ^ (1 << buckIdx);
        }
    }

    toString() {
        return [...this.#arr];
    }
}
