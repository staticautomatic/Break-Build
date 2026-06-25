import fs from "fs";

const CHUNK_SIZE = 80 * 1024 * 1024;
const OUT_BUFFER_SIZE = 64 * 1024;

export function countingSort(inputFile, outputFile) {
  const counts = new Int32Array(121); // индексы 0..120

  // Проход 1: считаем частоты
  const fd = fs.openSync(inputFile, "r");
  const buffer = Buffer.allocUnsafe(CHUNK_SIZE);

  while (true) {
    const bytes = fs.readSync(fd, buffer, 0, CHUNK_SIZE, null);
    if (!bytes) break;

    for (let i = 0; i < bytes; i += 4) {
      counts[buffer.readInt32LE(i)]++;
    }
  }

  fs.closeSync(fd);

  // Проход 2: записываем результат
  const out = fs.openSync(outputFile, "w");
  const outBuf = Buffer.allocUnsafe(OUT_BUFFER_SIZE);
  let outPos = 0;

  function flush() {
    if (outPos > 0) {
      fs.writeSync(out, outBuf, 0, outPos);
      outPos = 0;
    }
  }

  for (let value = 0; value <= 120; value++) {
    let remaining = counts[value];

    while (remaining > 0) {
      outBuf.writeInt32LE(value, outPos);
      outPos += 4;
      remaining--;

      if (outPos >= OUT_BUFFER_SIZE) flush();
    }
  }

  flush();
  fs.closeSync(out);
}