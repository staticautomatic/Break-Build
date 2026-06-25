export class MinHeap {
    constructor() {
        this.a = [];
    }

    insert(x) {
        this.a.push(x);
        let i = this.a.length - 1;

        while (i > 0) {
            let p = Math.floor((i - 1) / 2);

            if (this.a[p].value <= this.a[i].value) break;

            [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
            i = p;
        }
    }

    extractMin() {
        const min = this.a[0];
        const last = this.a.pop();

        if (this.a.length) {
            this.a[0] = last;

            let i = 0;

            while (true) {
                let l = i * 2 + 1;
                let r = i * 2 + 2;
                let m = i;

                if (l < this.a.length && this.a[l].value < this.a[m].value) m = l;
                if (r < this.a.length && this.a[r].value < this.a[m].value) m = r;

                if (m === i) break;

                [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
                i = m;
            }
        }

        return min;
    }

    isEmpty() {
        return this.a.length === 0;
    }
}