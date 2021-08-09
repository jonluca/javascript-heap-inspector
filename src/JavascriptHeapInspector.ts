import { HeapSnapshotLoader } from "./lib/HeapSnapshotLoader";
import * as fs from "fs";
import * as path from "path";
import { Node, Edge, NodeFilter, Aggregate } from "./lib/HeapSnapshotModel";
import { HeapSnapshotObjectNode } from "./lib/HeapSnapshotGridNodes";
import { JSHeapSnapshot } from "./lib/HeapSnapshot";

class JavascriptHeapInspector {
  data: any;
  snapshot?: JSHeapSnapshot;
  aggregates?: Record<string, Aggregate>;
  provider?: any;

  constructor(data: any) {
    this.data = data;
  }

  init = async () => {
    const loader = new HeapSnapshotLoader(this.data);
    await loader.init();
    const snapshot = loader.buildSnapshot();
    this.snapshot = snapshot;
    this.provider = snapshot.createNodesProviderForClass(
      "(system)",
      new NodeFilter()
    );
    const node = new Node(-1, "root", 0, snapshot.rootNodeIndex, 0, 0, "");
    const fakeEdge = new Edge("", node, "", -1);
    const hsON = new HeapSnapshotObjectNode(this, snapshot, fakeEdge, null);
    await this._populateChildren();
  };

  async _populateChildren(maybeNodeFilter?: NodeFilter): Promise<void> {
    const nodeFilter = maybeNodeFilter || new NodeFilter();

    if (this.snapshot) {
      const aggregates = await this.snapshot.aggregatesWithFilter(nodeFilter);
      this.aggregates = aggregates;
      console.log(aggregates);
    }
  }
}
const data = fs.readFileSync(
  path.join(__dirname, "../sample.heapsnapshot"),
  "utf-8"
);

const jhi = new JavascriptHeapInspector(data);
jhi.init();
