/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as HeapSnapshotModel from "./HeapSnapshotModel";
import { JSHeapSnapshot } from "./HeapSnapshot";

const UIStrings = {
  /**
   *@description Generic text with two placeholders separated by a comma
   *@example {1 613 680} PH1
   *@example {44 %} PH2
   */
  genericStringsTwoPlaceholders: "{PH1}, {PH2}",
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  internalArray: "(internal array)[]",
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  userObjectReachableFromWindow: "User object reachable from window",
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  detachedFromDomTree: "Detached from DOM tree",
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  previewIsNotAvailable: "Preview is not available",
  /**
   *@description A context menu item in the Heap Profiler Panel of a profiler tool
   */
  revealInSummaryView: "Reveal in Summary view",
  /**
   *@description Text for the summary view
   */
  summary: "Summary",
  /**
   *@description A context menu item in the Heap Profiler Panel of a profiler tool
   *@example {SomeClassConstructor} PH1
   *@example {12345} PH2
   */
  revealObjectSWithIdSInSummary:
    "Reveal object '{PH1}' with id @{PH2} in Summary view",
  /**
   *@description Text to store an HTML element or JavaScript variable or expression result as a global variable
   */
  storeAsGlobalVariable: "Store as global variable",
  /**
   *@description Text in Heap Snapshot Grid Nodes of a profiler tool that indicates an element contained in another
   * element.
   */
  inElement: "in",
};
export class HeapSnapshotGridNode {
  _instanceCount: number;
  _retrievedChildrenRanges: {
    from: number;
    to: number;
  }[];
  _providerObject: any | null;
  _reachableFromWindow: boolean;
  _populated?: boolean;
  _savedChildren?: any;
  _dataGrid: any;

  constructor(tree: any, hasChildren: boolean) {
    this._dataGrid = tree;
    this._instanceCount = 0;

    this._savedChildren = new Map();

    /**
     * List of position ranges for all visible nodes: [startPos1, endPos1),...,[startPosN, endPosN)
     * Position is an item position in the provider.
     */
    this._retrievedChildrenRanges = [];

    this._providerObject = null;
    this._reachableFromWindow = false;
  }

  get name(): string | undefined {
    return undefined;
  }

  createProvider(): any {
    throw new Error("Not implemented.");
  }

  comparator(): HeapSnapshotModel.ComparatorConfig {
    throw new Error("Not implemented.");
  }

  _getHash(): number {
    throw new Error("Not implemented.");
  }
  _createChildNode(
    _item: HeapSnapshotModel.Node | HeapSnapshotModel.Edge
  ): HeapSnapshotGridNode {
    throw new Error("Not implemented.");
  }
  _provider(): any {
    if (!this._providerObject) {
      this._providerObject = this.createProvider();
    }
    return this._providerObject;
  }

  tryQueryObjectContent(
    _heapProfilerModel: any,
    _objectGroupName: string
  ): Promise<any | null> {
    throw new Error("Not implemented.");
  }

  _toPercentString(num: number): string {
    return num.toFixed(0) + "\xa0%"; // \xa0 is a non-breaking space.
  }

  _toUIDistance(distance: number): string {
    const baseSystemDistance = HeapSnapshotModel.baseSystemDistance;
    return distance >= 0 && distance < baseSystemDistance
      ? distance.toString()
      : "\u2212";
  }

  allChildren(): HeapSnapshotGridNode[] {
    return this._dataGrid.allChildren(this) as HeapSnapshotGridNode[];
  }

  removeChildByIndex(index: number): void {
    this._dataGrid.removeChildByIndex(this, index);
  }

  childForPosition(nodePosition: number): HeapSnapshotGridNode | null {
    let indexOfFirstChildInRange = 0;
    for (let i = 0; i < this._retrievedChildrenRanges.length; i++) {
      const range = this._retrievedChildrenRanges[i];
      if (range.from <= nodePosition && nodePosition < range.to) {
        const childIndex = indexOfFirstChildInRange + nodePosition - range.from;
        return this.allChildren()[childIndex];
      }
      indexOfFirstChildInRange += range.to - range.from + 1;
    }
    return null;
  }

  _childHashForEntity(
    entity: HeapSnapshotModel.Node | HeapSnapshotModel.Edge
  ): number {
    if ("edgeIndex" in entity) {
      return entity.edgeIndex;
    }
    return entity.id;
  }

  _populateChildren(
    fromPosition?: number | null,
    toPosition?: number | null
  ): Promise<void> {
    return new Promise((resolve) => {
      fromPosition = fromPosition || 0;
      toPosition =
        toPosition || fromPosition + this._dataGrid.defaultPopulateCount();
      let firstNotSerializedPosition: number = fromPosition;
      serializeNextChunk.call(this, toPosition as number);

      function serializeNextChunk(
        this: HeapSnapshotGridNode,
        toPosition: number
      ): void {
        if (firstNotSerializedPosition >= toPosition) {
          return;
        }
        const end = Math.min(
          firstNotSerializedPosition + this._dataGrid.defaultPopulateCount(),
          toPosition
        );

        firstNotSerializedPosition = end;
      }

      function insertRetrievedChild(
        this: HeapSnapshotGridNode,
        item: HeapSnapshotModel.Node | HeapSnapshotModel.Edge,
        insertionIndex: number
      ): void {
        if (this._savedChildren) {
          const hash = this._childHashForEntity(item);
          const child = this._savedChildren.get(hash);
          if (child) {
            this._dataGrid.insertChild(this, child, insertionIndex);
            return;
          }
        }
        this._dataGrid.insertChild(
          this,
          this._createChildNode(item),
          insertionIndex
        );
      }
    });
  }
}

export namespace HeapSnapshotGridNode {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Events {
    PopulateComplete = "PopulateComplete",
  }
}

export abstract class HeapSnapshotGenericObjectNode extends HeapSnapshotGridNode {
  _referenceName?: string | null;
  _name: string | undefined;
  _type: string | undefined;
  _distance: number | undefined;
  _shallowSize: number | undefined;
  _retainedSize: number | undefined;
  snapshotNodeId: number | undefined;
  snapshotNodeIndex: number | undefined;
  detachedDOMTreeNode: boolean | undefined;
  data: any;

  constructor(dataGrid: any, node: HeapSnapshotModel.Node) {
    super(dataGrid, false);
    // node is null for DataGrid root nodes.
    if (!node) {
      return;
    }
    this._referenceName = null;
    this._name = node.name;
    this._type = node.type;
    this._distance = node.distance;
    this._shallowSize = node.selfSize;
    this._retainedSize = node.retainedSize;
    this.snapshotNodeId = node.id;
    this.snapshotNodeIndex = node.nodeIndex;
    if (this._type === "string") {
      this._reachableFromWindow = true;
    } else if (this._type === "object" && this._name.startsWith("Window")) {
      this._name = this.shortenWindowURL(this._name, false);
      this._reachableFromWindow = true;
    } else if (node.canBeQueried) {
      this._reachableFromWindow = true;
    }
    if (node.detachedDOMTreeNode) {
      this.detachedDOMTreeNode = true;
    }

    const snapshot = dataGrid.snapshot as JSHeapSnapshot;
    const shallowSizePercent = (this._shallowSize / snapshot.totalSize) * 100.0;
    const retainedSizePercent =
      (this._retainedSize / snapshot.totalSize) * 100.0;
    this.data = {
      distance: this._toUIDistance(this._distance),
      shallowSize: this._shallowSize,
      retainedSize: this._retainedSize,
      "shallowSize-percent": this._toPercentString(shallowSizePercent),
      "retainedSize-percent": this._toPercentString(retainedSizePercent),
    };
  }

  get name(): string | undefined {
    return this._name;
  }

  async queryObjectContent(
    heapProfilerModel: any,
    objectGroupName: string
  ): Promise<any> {
    const remoteObject = await this.tryQueryObjectContent(
      heapProfilerModel,
      objectGroupName
    );
    return (
      remoteObject ||
      heapProfilerModel
        .runtimeModel()
        .createRemoteObjectFromPrimitiveValue("na")
    );
  }

  async tryQueryObjectContent(
    heapProfilerModel: any,
    objectGroupName: string
  ): Promise<any | null> {
    if (this._type === "string") {
      return heapProfilerModel
        .runtimeModel()
        .createRemoteObjectFromPrimitiveValue(this._name);
    }
    return await heapProfilerModel.objectForSnapshotObjectId(
      String(this.snapshotNodeId),
      objectGroupName
    );
  }

  async updateHasChildren(): Promise<void> {
    const isEmpty = await this._provider().isEmpty();
  }

  shortenWindowURL(fullName: string, hasObjectId: boolean): string {
    const startPos = fullName.indexOf("/");
    const endPos = hasObjectId ? fullName.indexOf("@") : fullName.length;
    if (startPos === -1 || endPos === -1) {
      return fullName;
    }
    const fullURL = fullName.substring(startPos + 1, endPos).trimLeft();
    let url = fullURL;
    return fullName.substr(0, startPos + 2) + url + fullName.substr(endPos);
  }
}

export class HeapSnapshotObjectNode extends HeapSnapshotGenericObjectNode {
  _referenceName: string;
  _referenceType: string;
  _edgeIndex: number;
  _snapshot: any;
  _parentObjectNode: HeapSnapshotObjectNode | null;
  _cycledWithAncestorGridNode: HeapSnapshotObjectNode | null;

  constructor(
    dataGrid: any,
    snapshot: any,
    edge: HeapSnapshotModel.Edge,
    parentObjectNode: HeapSnapshotObjectNode | null
  ) {
    super(dataGrid, edge.node);
    this._referenceName = edge.name;
    this._referenceType = edge.type;
    this._edgeIndex = edge.edgeIndex;
    this._snapshot = snapshot;

    this._parentObjectNode = parentObjectNode;
    this._cycledWithAncestorGridNode =
      this._findAncestorWithSameSnapshotNodeId();
    if (!this._cycledWithAncestorGridNode) {
      this.updateHasChildren();
    }

    const data = this.data;
    data["count"] = "";
    data["addedCount"] = "";
    data["removedCount"] = "";
    data["countDelta"] = "";
    data["addedSize"] = "";
    data["removedSize"] = "";
    data["sizeDelta"] = "";
  }

  retainersDataSource(): {
    snapshot: JSHeapSnapshot;
    snapshotNodeIndex: number;
  } | null {
    return this.snapshotNodeIndex === undefined
      ? null
      : { snapshot: this._snapshot, snapshotNodeIndex: this.snapshotNodeIndex };
  }

  createProvider(): JSHeapSnapshot {
    if (this.snapshotNodeIndex === undefined) {
      throw new Error("Cannot create a provider on a root node");
    }
    return this._snapshot.createEdgesProvider(this.snapshotNodeIndex);
  }

  _findAncestorWithSameSnapshotNodeId(): HeapSnapshotObjectNode | null {
    let ancestor: HeapSnapshotObjectNode | null = this._parentObjectNode;
    while (ancestor) {
      if (ancestor.snapshotNodeId === this.snapshotNodeId) {
        return ancestor;
      }
      ancestor = ancestor._parentObjectNode;
    }
    return null;
  }

  _createChildNode(
    item: HeapSnapshotModel.Node | HeapSnapshotModel.Edge
  ): HeapSnapshotObjectNode {
    return new HeapSnapshotObjectNode(
      this._dataGrid,
      this._snapshot,
      item as HeapSnapshotModel.Edge,
      this
    );
  }

  _getHash(): number {
    return this._edgeIndex;
  }

  comparator(): HeapSnapshotModel.ComparatorConfig {
    const sortAscending = this._dataGrid.isSortOrderAscending();
    const sortColumnId = this._dataGrid.sortColumnId();
    switch (sortColumnId) {
      case "object":
        return new HeapSnapshotModel.ComparatorConfig(
          "!edgeName",
          sortAscending,
          "retainedSize",
          false
        );
      case "count":
        return new HeapSnapshotModel.ComparatorConfig(
          "!edgeName",
          true,
          "retainedSize",
          false
        );
      case "shallowSize":
        return new HeapSnapshotModel.ComparatorConfig(
          "selfSize",
          sortAscending,
          "!edgeName",
          true
        );
      case "retainedSize":
        return new HeapSnapshotModel.ComparatorConfig(
          "retainedSize",
          sortAscending,
          "!edgeName",
          true
        );
      case "distance":
        return new HeapSnapshotModel.ComparatorConfig(
          "distance",
          sortAscending,
          "name",
          true
        );
      default:
        return new HeapSnapshotModel.ComparatorConfig(
          "!edgeName",
          true,
          "retainedSize",
          false
        );
    }
  }
}
