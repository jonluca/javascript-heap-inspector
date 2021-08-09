import { HeapSnapshotLoader } from "./lib/HeapSnapshotLoader";
import * as fs from "fs";
import * as path from "path";
import { Node, Edge } from "./lib/HeapSnapshotModel";
import { HeapSnapshotObjectNode } from "./lib/HeapSnapshotGridNodes";
import { JSHeapSnapshot } from "./lib/HeapSnapshot";

class JavascriptHeapInspector {
  data: any;
  snapshot?: JSHeapSnapshot;
  constructor(data: any) {
    this.data = data;
  }

  init = async () => {
    const loader = new HeapSnapshotLoader(this.data);
    await loader.init();
    const snapshot = loader.buildSnapshot();
    const staticData = await snapshot.updateStaticData();
    this.snapshot = snapshot;

    const node = new Node(-1, "root", 0, snapshot.rootNodeIndex, 0, 0, "");
    const fakeEdge = new Edge("", node, "", -1);
    const hsON = new HeapSnapshotObjectNode(this, snapshot, fakeEdge, null);
    console.log(staticData);
  };
}
const data = fs.readFileSync(
  path.join(__dirname, "../sample.heapsnapshot"),
  "utf-8"
);

const jhi = new JavascriptHeapInspector(data);
jhi.init();
