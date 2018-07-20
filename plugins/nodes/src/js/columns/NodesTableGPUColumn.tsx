import * as React from "react";
import { sort, compareNumber, compareString } from "@dcos/sorting";
import Node from "#SRC/js/structs/Node";
// TODO: DCOS-39079
// import { IWidthArgs as WidthArgs } from "@dcos/ui-kit/packages/table/components/Column";
import { IWidthArgs as WidthArgs } from "../types/IWidthArgs";
import {
  SortDirection,
  directionAwareComparators
} from "../types/SortDirection";
import { TextCell } from "@dcos/ui-kit";

function getGpuUsage(data: Node) {
  return data.getUsageStats("gpus").percentage;
}
function getHostname(node: Node) {
  return node.getHostName().toLowerCase();
}

export function gpuRenderer(data: Node): React.ReactNode {
  return (
    <TextCell>
      <span>{getGpuUsage(data)}%</span>
    </TextCell>
  );
}
export const comparators = [
  compareNumber(getGpuUsage),
  compareString(getHostname)
];
export function gpuSorter(data: Node[], sortDirection: SortDirection): Node[] {
  return sort(directionAwareComparators(comparators, sortDirection), data);
}

export function gpuSizer(args: WidthArgs): number {
  return Math.max(60, args.width / args.totalColumns);
}