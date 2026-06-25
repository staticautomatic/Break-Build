import fs from "fs";
import { externalMergeSort } from "./sorts/externalMergeSort.js";
import { countingSort } from "./sorts/countingSort.js";

const SIZE = 4 * 1024 * 1024 * 1024;
const SORT = process.env.SORT ?? "counting"; // "counting" | "merge"

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
  if (fs.existsSync("data.bin")) fs.unlinkSync("data.bin");
  if (fs.existsSync("sorted.bin")) fs.unlinkSync("sorted.bin");

  console.log("GENERATE...");
  await generate("data.bin");

  console.log(`SORT (${SORT})...`);
  console.time(SORT);

  if (SORT === "merge") {
    externalMergeSort("data.bin", "sorted.bin");
  } else {
    countingSort("data.bin", "sorted.bin");
  }

  console.timeEnd(SORT);

  console.log("VERIFY...");
  console.log(verify("sorted.bin"));

  console.log("DONE");
}

run();