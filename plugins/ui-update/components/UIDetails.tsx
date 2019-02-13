import * as React from "react";
import { componentFromStream, graphqlObservable } from "@dcos/data-service";
import {
  catchError,
  delay,
  filter,
  map,
  startWith,
  switchMap,
  take
} from "rxjs/operators";
import { BehaviorSubject, combineLatest, merge, Observable, of } from "rxjs";
import gql from "graphql-tag";

import ConfigurationMapSection from "#SRC/js/components/ConfigurationMapSection";
import { schema as cosmosSchema } from "#SRC/js/data/cosmos";
import { Package } from "#SRC/js/data/cosmos/Package";
import { default as uiServiceSchema } from "#SRC/js/data/ui-update";
import {
  DEFAULT_UI_METADATA,
  UIMetadata
} from "#SRC/js/data/ui-update/UIMetadata";

import AvailableUpdateRow from "#PLUGINS/ui-update/components/AvailableUpdateRow";
import InstalledVersion from "#PLUGINS/ui-update/components/InstalledVersion";
import InitialScreen from "#PLUGINS/ui-update/components/InitialScreen";
import FallbackScreen from "#PLUGINS/ui-update/components/FallbackScreen";

import {
  EMPTY_ACTION,
  UIAction,
  UIActions,
  UIActionType
} from "#PLUGINS/ui-update/types/UIAction";
import { versionUpdateAvailable } from "#PLUGINS/ui-update/utils";

interface MutationError {
  message: string;
  name: string;
}
interface UIUpdateResult {
  data: { updateDCOSUI: string };
}
interface UIRollbackResult {
  data: { resetDCOSUI: string | null };
}

const uiServiceActions$ = new BehaviorSubject<UIAction>(EMPTY_ACTION);

function queryCosmosForUIVersions(): Observable<Package> {
  return graphqlObservable(
    gql`
      query {
        package(name: $packageName) {
          name
          versions
        }
      }
    `,
    cosmosSchema,
    { packageName: "dcos-ui" }
  ).pipe(map(result => result.data.package));
}

function queryUIServiceForMetadata(): Observable<UIMetadata> {
  return graphqlObservable(
    gql`
      query {
        ui {
          clientBuild
          packageVersion
          packageVersionIsDefault
          serverBuild
        }
      }
    `,
    uiServiceSchema,
    { packageName: "dcos-ui" }
  ).pipe(
    map(result => result.data.ui),
    catchError(() => of(DEFAULT_UI_METADATA))
  );
}

function onClickRollbackUI(
  _e: React.MouseEvent<HTMLElement> | null,
  delayMs: number = 45000
) {
  uiServiceActions$.next({
    type: UIActionType.Reset,
    action: UIActions.Started,
    value: ""
  });
  graphqlObservable(
    gql`
      mutation {
        resetDCOSUI
      }
    `,
    uiServiceSchema,
    {}
  )
    .pipe(
      take(1),
      delay(delayMs)
    )
    .subscribe(
      (result: UIRollbackResult) => {
        uiServiceActions$.next({
          type: UIActionType.Reset,
          action: UIActions.Completed,
          value: result.data.resetDCOSUI || ""
        });
      },
      (error: MutationError) => {
        uiServiceActions$.next({
          type: UIActionType.Reset,
          action: UIActions.Error,
          value: error.message
        });
      }
    );
}

function onClickStartUpdate(version: string, delayMs: number = 45000) {
  uiServiceActions$.next({
    type: UIActionType.Update,
    action: UIActions.Started,
    value: version
  });
  graphqlObservable(
    gql`
      mutation {
        updateDCOSUI(newVersion: $version)
      }
    `,
    uiServiceSchema,
    {
      version
    }
  )
    .pipe(
      take(1),
      delay(delayMs)
    )
    .subscribe(
      (result: UIUpdateResult) => {
        uiServiceActions$.next({
          type: UIActionType.Update,
          action: UIActions.Completed,
          value: result.data.updateDCOSUI
        });
      },
      (error: MutationError) => {
        uiServiceActions$.next({
          type: UIActionType.Update,
          action: UIActions.Error,
          value: error.message
        });
      }
    );
}

const UIDetails = componentFromStream(() => {
  const cosmosVersions$ = queryCosmosForUIVersions();
  const uiMetadata$ = queryUIServiceForMetadata();
  const uiMetadataOnAction$ = uiServiceActions$.pipe(
    filter(
      uiAction =>
        uiAction.action === UIActions.Completed ||
        uiAction.action === UIActions.Error
    ),
    switchMap(() => queryUIServiceForMetadata())
  );

  return combineLatest<[Package, UIMetadata, UIAction]>([
    cosmosVersions$,
    merge(uiMetadata$, uiMetadataOnAction$),
    uiServiceActions$
  ]).pipe(
    map(([packageInfo, uiMetadata, uiAction]) => {
      if (!packageInfo || !uiMetadata) {
        return <InitialScreen />;
      }
      const latestUpdateAvailable = versionUpdateAvailable(
        packageInfo,
        uiMetadata
      );

      return (
        <ConfigurationMapSection>
          <InstalledVersion
            uiMetaData={uiMetadata}
            uiAction={uiAction}
            onRollbackClick={onClickRollbackUI}
          />
          <AvailableUpdateRow
            latestVersion={latestUpdateAvailable}
            uiAction={uiAction}
            onUpdateClick={onClickStartUpdate}
          />
        </ConfigurationMapSection>
      );
    }),
    catchError(() => of(<FallbackScreen />)),
    startWith(<InitialScreen />)
  );
});

export {
  UIDetails as default,
  uiServiceActions$,
  onClickRollbackUI,
  onClickStartUpdate,
  queryCosmosForUIVersions,
  queryUIServiceForMetadata
};
