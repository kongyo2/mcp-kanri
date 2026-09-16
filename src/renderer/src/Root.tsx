import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE } from '../../shared/i18n';
import type { ChainLink } from './mvp/chain';
import { traceLink } from './mvp/links';
import { Mediator } from './mvp/mediator';
import type { Ports } from './mvp/ports';
import { RuntimeProvider, useAppState } from './mvp/react';
import { createInitialState } from './mvp/state';
import { presentRoot } from './presenter/presenter';
import { ConfirmDialogView } from './views/ConfirmDialogView';
import { MainPanelView } from './views/MainPanelView';
import { DialogNode, ModalGuardNode, SidebarNode } from './views/nodes';
import { SidebarView } from './views/SidebarView';
import { ToastView } from './views/ToastView';

interface Runtime {
  readonly mediator: Mediator;
  readonly links: readonly ChainLink[];
}

function createRuntime(ports: Ports): Runtime {
  const mediator = new Mediator(
    ports,
    createInitialState(ports.preferences.readLocale() ?? DEFAULT_LOCALE),
  );
  return { mediator, links: [traceLink(), mediator] };
}

export function Root({ ports }: { readonly ports: Ports }): JSX.Element {
  const [runtime] = useState<Runtime>(() => createRuntime(ports));

  useEffect(() => {
    runtime.mediator.start();
    return () => {
      runtime.mediator.dispose();
    };
  }, [runtime]);

  return (
    <RuntimeProvider mediator={runtime.mediator} links={runtime.links}>
      <RootView />
    </RuntimeProvider>
  );
}

function RootView(): JSX.Element {
  const state = useAppState();
  const vm = useMemo(() => presentRoot(state), [state]);

  return (
    <>
      <ModalGuardNode>
        <div className="app">
          <SidebarNode>
            <SidebarView vm={vm.sidebar} />
          </SidebarNode>
          <main className="main">
            <MainPanelView vm={vm.main} />
          </main>
        </div>
      </ModalGuardNode>

      {vm.toast !== null ? <ToastView vm={vm.toast} /> : null}

      {vm.dialog !== null ? (
        <DialogNode>
          <ConfirmDialogView vm={vm.dialog} />
        </DialogNode>
      ) : null}
    </>
  );
}
