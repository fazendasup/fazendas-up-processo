import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPERATIONAL_RESET_CLUSTERS,
  hasAnyOperationalResetCluster,
  type OperationalResetClusters,
} from "./operationalReset";

describe("hasAnyOperationalResetCluster", () => {
  it("false quando tudo desmarcado", () => {
    const z: OperationalResetClusters = Object.fromEntries(
      Object.keys(DEFAULT_OPERATIONAL_RESET_CLUSTERS).map((k) => [k, false]),
    ) as OperationalResetClusters;
    expect(hasAnyOperationalResetCluster(z)).toBe(false);
  });

  it("true se pelo menos um cluster", () => {
    expect(hasAnyOperationalResetCluster({ ...DEFAULT_OPERATIONAL_RESET_CLUSTERS, estoque: false })).toBe(true);
  });
});
