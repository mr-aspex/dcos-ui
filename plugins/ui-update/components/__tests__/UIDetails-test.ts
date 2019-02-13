const mockDataLayer = jest.fn();
const mockComponentFromStream = jest.fn();
jest.mock("@dcos/data-service", () => ({
  componentFromStream: mockComponentFromStream,
  graphqlObservable: mockDataLayer
}));

import { fakeSchedulers, marbles } from "rxjs-marbles/jest";
import { take } from "rxjs/operators";
import { of, throwError } from "rxjs";

import { DEFAULT_UI_METADATA } from "#SRC/js/data/ui-update/UIMetadata";
import {
  uiServiceActions$,
  onClickRollbackUI,
  onClickStartUpdate,
  queryCosmosForUIVersions,
  queryUIServiceForMetadata
} from "#PLUGINS/ui-update/components/UIDetails";
import { UIActions } from "#PLUGINS/ui-update/types/UIAction";

describe("UIDetails", () => {
  let actionNextSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    actionNextSpy = jest.spyOn(uiServiceActions$, "next");
  });
  afterEach(() => {
    actionNextSpy.mockRestore();
  });

  describe("#queryCosmosForUIVersions", () => {
    it(
      "returns package result from query",
      marbles(m => {
        const queryResp$ = m.cold("--j|", {
          j: {
            data: {
              package: {
                name: "dcos-ui",
                versions: [
                  {
                    version: "2.0.0",
                    revision: "1"
                  }
                ]
              }
            }
          }
        });
        mockDataLayer.mockReturnValueOnce(queryResp$);

        const query$ = queryCosmosForUIVersions();
        const result$ = query$.pipe(take(1));
        m.expect(result$).toBeObservable(
          m.cold("--(j|)", {
            j: {
              name: "dcos-ui",
              versions: [
                {
                  version: "2.0.0",
                  revision: "1"
                }
              ]
            }
          })
        );
      })
    );

    it("makes a single query to data-layer", () => {
      mockDataLayer.mockReturnValueOnce(of({}));

      queryCosmosForUIVersions();
      expect(mockDataLayer).toHaveBeenCalledTimes(1);
    });
  });
  describe("#queryUIServiceForMetadata", () => {
    it(
      "returns result from ui-update-service",
      marbles(m => {
        const queryResp$ = m.cold("--j|", {
          j: {
            data: {
              ui: {
                clientBuild: "unit_test+v2.50.1",
                packageVersion: "2.50.1",
                packageVersionIsDefault: false,
                serverBuild: "master+v2.50.1+hfges"
              }
            }
          }
        });
        mockDataLayer.mockReturnValueOnce(queryResp$);

        const query$ = queryUIServiceForMetadata();
        const result$ = query$.pipe(take(1));
        m.expect(result$).toBeObservable(
          m.cold("--(j|)", {
            j: {
              clientBuild: "unit_test+v2.50.1",
              packageVersion: "2.50.1",
              packageVersionIsDefault: false,
              serverBuild: "master+v2.50.1+hfges"
            }
          })
        );
      })
    );

    it(
      "makes a single query to data-layer",
      marbles(m => {
        const queryResp$ = m.cold("--j|", {
          j: {
            data: {
              ui: {
                clientBuild: "unit_test+v2.50.1",
                packageVersion: "2.50.1",
                packageVersionIsDefault: false,
                serverBuild: "master+v2.50.1+hfges"
              }
            }
          }
        });
        mockDataLayer.mockReturnValueOnce(queryResp$);

        queryUIServiceForMetadata();
        expect(mockDataLayer).toHaveBeenCalledTimes(1);
      })
    );

    it(
      "returns default ui metadata if query errors",
      marbles(m => {
        const queryResp$ = m.cold("--#", undefined, {
          message: "Query Failed",
          name: "Error"
        });
        mockDataLayer.mockReturnValueOnce(queryResp$);

        const query$ = queryUIServiceForMetadata();
        const result$ = query$.pipe(take(1));
        m.expect(result$).toBeObservable(
          m.cold("--(j|)", {
            j: DEFAULT_UI_METADATA
          })
        );
      })
    );
  });
  describe("#onClickRollbackUI", () => {
    it(
      "emits two actions",
      fakeSchedulers(advance => {
        jest.useFakeTimers();
        const mutationResp$ = of({
          data: {
            resetDCOSUI: "OK"
          }
        });
        mockDataLayer.mockReturnValueOnce(mutationResp$);

        onClickRollbackUI(null, 1);
        advance(10);
        expect(actionNextSpy).toHaveBeenCalledTimes(2);
      })
    );
    it(
      "emits start action",
      fakeSchedulers(advance => {
        jest.useFakeTimers();
        const mutationResp$ = of({
          data: {
            resetDCOSUI: null
          }
        });
        mockDataLayer.mockReturnValueOnce(mutationResp$);

        onClickRollbackUI(null, 1);
        advance(10);
        expect(actionNextSpy.mock.calls[0]).toEqual([
          {
            type: "UIReset",
            action: UIActions.Started,
            value: ""
          }
        ]);
      })
    );

    it(
      "emits complete action when mutation succeeds",
      fakeSchedulers(advance => {
        jest.useFakeTimers();
        const mutationResp$ = of({
          data: {
            resetDCOSUI: "OK"
          }
        });
        mockDataLayer.mockReturnValueOnce(mutationResp$);

        onClickRollbackUI(null, 1);
        advance(10);
        expect(actionNextSpy.mock.calls[1]).toEqual([
          {
            type: "UIReset",
            action: UIActions.Completed,
            value: "OK"
          }
        ]);
      })
    );

    it(
      "emits error action if mutation fails",
      fakeSchedulers(advance => {
        jest.useFakeTimers();
        mockDataLayer.mockReturnValueOnce(
          throwError(new Error("Rollback failed"))
        );

        onClickRollbackUI(null, 1);
        advance(10);
        expect(actionNextSpy.mock.calls[1]).toEqual([
          {
            type: "UIReset",
            action: UIActions.Error,
            value: "Rollback failed"
          }
        ]);
      })
    );

    it("makes a single mutation call", () => {
      const mutationResp$ = of(undefined);
      mockDataLayer.mockReturnValueOnce(mutationResp$);
      onClickRollbackUI(null, 1);
      expect(mockDataLayer).toHaveBeenCalledTimes(1);
    });
  });
  describe("#onClickStartUpdate", () => {
    it(
      "emits two actions",
      fakeSchedulers(advance => {
        jest.useFakeTimers();
        const mutationResp$ = of({
          data: {
            updateDCOSUI: "Update to 0.0.0 completed"
          }
        });
        mockDataLayer.mockReturnValueOnce(mutationResp$);

        onClickStartUpdate("0.0.0", 1);
        advance(10);
        expect(actionNextSpy).toHaveBeenCalledTimes(2);
      })
    );
    it(
      "emits start action",
      fakeSchedulers(advance => {
        jest.useFakeTimers();
        const mutationResp$ = of({
          data: {
            updateDCOSUI: "Update to 0.0.1 completed"
          }
        });
        mockDataLayer.mockReturnValueOnce(mutationResp$);

        onClickStartUpdate("0.0.1", 1);
        advance(10);
        expect(actionNextSpy.mock.calls[0]).toEqual([
          {
            type: "UIUpdate",
            action: UIActions.Started,
            value: "0.0.1"
          }
        ]);
      })
    );
    it(
      "emits complete action when mutation succeeds",
      fakeSchedulers(advance => {
        jest.useFakeTimers();
        const mutationResp$ = of({
          data: {
            updateDCOSUI: "Update to 0.0.2 completed"
          }
        });
        mockDataLayer.mockReturnValueOnce(mutationResp$);

        onClickStartUpdate("0.0.2", 1);
        advance(10);
        expect(actionNextSpy.mock.calls[1]).toEqual([
          {
            type: "UIUpdate",
            action: UIActions.Completed,
            value: "Update to 0.0.2 completed"
          }
        ]);
      })
    );

    it(
      "emits error action if mutation fails",
      fakeSchedulers(advance => {
        jest.useFakeTimers();
        mockDataLayer.mockReturnValueOnce(
          throwError(new Error("Update failed"))
        );

        onClickStartUpdate("0.0.3", 1);
        advance(10);
        expect(actionNextSpy.mock.calls[1]).toEqual([
          {
            type: "UIUpdate",
            action: UIActions.Error,
            value: "Update failed"
          }
        ]);
      })
    );

    it("updates to version given", () => {
      const mutationResp$ = of(undefined);
      mockDataLayer.mockReturnValueOnce(mutationResp$);
      onClickStartUpdate("0.0.4", 1);
      expect(mockDataLayer.mock.calls[0][2]).toEqual({ version: "0.0.4" });
    });

    it("makes a single mutation call", () => {
      const mutationResp$ = of(undefined);
      mockDataLayer.mockReturnValueOnce(mutationResp$);
      onClickStartUpdate("0.0.5", 1);
      expect(mockDataLayer).toHaveBeenCalledTimes(1);
    });
  });
});
