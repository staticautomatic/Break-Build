import fs from "fs";
import { MinHeap } from "../MinHeap.js";

const CHUNK_SIZE = 80 * 1024 * 1024;
const BUFFER_SIZE = 64 * 1024;
const OUT_BUFFER_SIZE = 64 * 1024;

function split(file, dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  fs.mkdirSync(dir);

  const fd = fs.openSync(file, "r");
  const buffer = Buffer.alloc(CHUNK_SIZE);

  let run = 0;

  while (true) {
    const bytes = fs.readSync(fd, buffer, 0, CHUNK_SIZE, null);
    if (!bytes) break;

    const arr = new Int32Array(bytes / 4);

    for (let i = 0, j = 0; i < bytes; i += 4, j++) {
      arr[j] = buffer.readInt32LE(i);
    }

    arr.sort((a, b) => a - b);

    const out = Buffer.allocUnsafe(bytes);

    for (let i = 0; i < arr.length; i++) {
      out.writeInt32LE(arr[i], i * 4);
    }

    fs.writeFileSync(`${dir}/r${run++}.bin`, out);
  }

  fs.closeSync(fd);
}

function merge(dir, outFile) {
  const files = fs.readdirSync(dir);
  const heap = new MinHeap();
  const fds = [];
  const buffers = [];
  const positions = [];
  const sizes = [];

  for (let i = 0; i < files.length; i++) {
    const fd = fs.openSync(`${dir}/${files[i]}`, "r");
    fds[i] = fd;
    buffers[i] = Buffer.allocUnsafe(BUFFER_SIZE);
    positions[i] = 0;

    const size = fs.readSync(fd, buffers[i], 0, BUFFER_SIZE, null);
    sizes[i] = size;

    if (size > 0) {
      heap.insert({ value: buffers[i].readInt32LE(0), i });
      positions[i] = 4;
    }
  }

  const out = fs.openSync(outFile, "w");
  const outBuf = Buffer.allocUnsafe(OUT_BUFFER_SIZE);
  let outPos = 0;

  function flush() {
    if (outPos > 0) {
      fs.writeSync(out, outBuf, 0, outPos);
      outPos = 0;
    }
  }

  while (!heap.isEmpty()) {
    const min = heap.extractMin();
    const i = min.i;

    outBuf.writeInt32LE(min.value, outPos);
    outPos += 4;

    if (outPos >= OUT_BUFFER_SIZE) flush();

    if (positions[i] >= sizes[i]) {
      sizes[i] = fs.readSync(fds[i], buffers[i], 0, BUFFER_SIZE, null);
      positions[i] = 0;
      if (sizes[i] === 0) continue;
    }

    const value = buffers[i].readInt32LE(positions[i]);
    positions[i] += 4;
    heap.insert({ value, i });
  }

  flush();
  for (const fd of fds) fs.closeSync(fd);
  fs.closeSync(out);
}

export function externalMergeSort(inputFile, outputFile) {
  split(inputFile, "runs");
  merge("runs", outputFile);
  fs.rmSync("runs", { recursive: true, force: true });
}