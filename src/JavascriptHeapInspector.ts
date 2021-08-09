import { HeapSnapshotLoader } from "./lib/HeapSnapshotLoader";
import * as fs from "fs";
import * as path from "path";
import { Node, Edge, NodeFilter } from "./lib/HeapSnapshotModel";
import { HeapSnapshotObjectNode } from "./lib/HeapSnapshotGridNodes";
import { JSHeapSnapshot } from "./lib/HeapSnapshot";

class JavascriptHeapInspector {
  data: any;
  snapshot?: JSHeapSnapshot;
  _filterInProgress?: NodeFilter | null;
  _nextRequestedFilter?: NodeFilter | null;
  _lastFilter?: NodeFilter | null;

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
    this._populateChildren();
    console.log(staticData);
  };

  async _populateChildren(maybeNodeFilter?: NodeFilter): Promise<void> {
    const nodeFilter = maybeNodeFilter || new NodeFilter();

    if (this._filterInProgress) {
      this._nextRequestedFilter = this._filterInProgress.equals(nodeFilter)
        ? null
        : nodeFilter;
      return;
    }
    if (this._lastFilter && this._lastFilter.equals(nodeFilter)) {
      return;
    }
    this._filterInProgress = nodeFilter;

    if (this.snapshot) {
      const aggregates = await this.snapshot.aggregatesWithFilter(nodeFilter);
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
