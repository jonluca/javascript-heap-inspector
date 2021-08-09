import { HeapSnapshotLoader } from "./lib/HeapSnapshotLoader";
import fs from "fs";
import path from "path";

const main = async (seed: any) => {
  const loader = new HeapSnapshotLoader(seed);
  await loader.init();
  const snapshot = loader.buildSnapshot();
  console.log(snapshot);
};

const data = fs.readFileSync(
  path.join(__dirname, "../sample.heapsnapshot"),
  "utf-8"
);
main(data);
