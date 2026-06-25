import fs from "fs";
import { MinHeap } from "./MinHeap.js";

const SIZE = 4 * 1024 * 1024 * 1024;

const CHUNK_SIZE = 80 * 1024 * 1024; // ~80MB (влезает в 200MB RAM)
const BUFFER_SIZE = 64 * 1024; // IO buffer per run
const OUT_BUFFER_SIZE = 64 * 1024;

function generate(file) {
  return new Promise((resolve) => {
    const stream = fs.createWriteStream(file);
    let written = 0;

    function write() {
      while (written < SIZE) {
        const buf = Buffer.allocUnsafe(1024 * 1024);
        let offset = 0;

        for (; offset < buf.length && written < SIZE; offset += 4) {
          buf.writeInt32LE(Math.floor(Math.random() * 121), offset);
          written += 4;
        }

        if (!stream.write(buf.slice(0, offset))) {
          stream.once("drain", write);
          return;
        }
      }

      stream.end();
    }

    stream.on("finish", resolve);
    write();
  });
}

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

  const bufferSize = BUFFER_SIZE;

  // init runs
  for (let i = 0; i < files.length; i++) {
    const fd = fs.openSync(`${dir}/${files[i]}`, "r");

    fds[i] = fd;
    buffers[i] = Buffer.allocUnsafe(bufferSize);
    positions[i] = 0;

    const size = fs.readSync(fd, buffers[i], 0, bufferSize, null);
    sizes[i] = size;

    if (size > 0) {
      heap.insert({
        value: buffers[i].readInt32LE(0),
        i,
      });

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

    // write output
    outBuf.writeInt32LE(min.value, outPos);
    outPos += 4;

    if (outPos >= OUT_BUFFER_SIZE) {
      flush();
    }

    // advance pointer in run
    if (positions[i] >= sizes[i]) {
      sizes[i] = fs.readSync(fds[i], buffers[i], 0, bufferSize, null);
      positions[i] = 0;

      if (sizes[i] === 0) {
        continue; // run finished
      }
    }

    const value = buffers[i].readInt32LE(positions[i]);
    positions[i] += 4;

    heap.insert({
      value,
      i,
    });
  }

  flush();

  for (const fd of fds) {
    fs.closeSync(fd);
  }

  fs.closeSync(out);
}

function verify(file) {
  const fd = fs.openSync(file, "r");

  const buffer = Buffer.alloc(1024 * 1024);

  let prev = -Infinity;

  while (true) {
    const bytes = fs.readSync(fd, buffer, 0, buffer.length, null);

    if (bytes === 0) break;

    for (let i = 0; i < bytes; i += 4) {
      const value = buffer.readInt32LE(i);

      if (value < prev) {
        fs.closeSync(fd);
        return false;
      }

      prev = value;
    }
  }

  fs.closeSync(fd);
  return true;
}

export async function run() {
  if (fs.existsSync("data.bin")) {
    fs.unlinkSync("data.bin");
  }

  if (fs.existsSync("sorted.bin")) {
    fs.unlinkSync("sorted.bin");
  }

  console.log("GENERATE...");
  await generate("data.bin");

  console.log("SPLIT...");
  split("data.bin", "runs");

  console.log("MERGE...");
  merge("runs", "sorted.bin");

  fs.rmSync("runs", { recursive: true, force: true });

  console.log("VERIFY...");
  console.log(verify("sorted.bin"));

  console.log("DONE");
}
