import * as React from "react";
import { sort, compareNumber, compareString } from "@dcos/sorting";
import Node from "#SRC/js/structs/Node";
// TODO: DCOS-39079
// import { IWidthArgs as WidthArgs } from "@dcos/ui-kit/packages/table/components/Column";
import { IWidthArgs as WidthArgs } from "#PLUGINS/nodes/src/js/types/IWidthArgs";
import {
  SortDirection,
  directionAwareComparators
} from "plugins/nodes/src/js/types/SortDirection";
import { TextCell } from "@dcos/ui-kit";

function getRegionName(data: Node) {
  return data.getRegionName();
}
function getHostname(data: Node): string {
  return data.getHostName();
}

export function regionRenderer(
  masterRegion: string,
  data: Node
): React.ReactNode {
  const regionName =
    getRegionName(data) +
    (masterRegion === getRegionName(data) ? " (Local)" : "");

  return (
    <TextCell>
      <span title={regionName}>{regionName}</span>
    </TextCell>
  );
}

export function regionSorter(
  data: Node[],
  sortDirection: SortDirection
): Node[] {
  return sort(
    directionAwareComparators(
      [compareNumber(getRegionName), compareString(getHostname)],
      sortDirection
    ),
    data
  );
}

export function regionSizer(args: WidthArgs): number {
  return Math.max(170, args.width / args.totalColumns);
}
