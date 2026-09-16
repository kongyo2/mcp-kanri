import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { bubble, type ChainLink, type DispatchOutcome } from './chain';
import type { LocalIntent } from './intents';
import type { Mediator } from './mediator';
import type { AppState } from './state';

const MediatorContext = createContext<Mediator | null>(null);
const ChainContext = createContext<readonly ChainLink[]>([]);

interface RuntimeProviderProps {
  readonly mediator: Mediator;
  readonly links: readonly ChainLink[];
  readonly children: React.ReactNode;
}

export function RuntimeProvider({ mediator, links, children }: RuntimeProviderProps): JSX.Element {
  return (
    <MediatorContext.Provider value={mediator}>
      <ChainContext.Provider value={links}>{children}</ChainContext.Provider>
    </MediatorContext.Provider>
  );
}

export function useMediator(): Mediator {
  const mediator = useContext(MediatorContext);
  if (mediator === null) throw new Error('useMediator must be used within <RuntimeProvider>');
  return mediator;
}

export function useAppState(): AppState {
  const mediator = useMediator();
  return useSyncExternalStore(mediator.subscribe, mediator.getState, mediator.getState);
}

interface ChainNodeProps {
  readonly link: ChainLink;
  readonly children: React.ReactNode;
}

export function ChainNode({ link, children }: ChainNodeProps): JSX.Element {
  const parents = useContext(ChainContext);
  const links = useMemo(() => [link, ...parents], [link, parents]);
  return <ChainContext.Provider value={links}>{children}</ChainContext.Provider>;
}

export function useEmit(): (intent: LocalIntent) => DispatchOutcome {
  const links = useContext(ChainContext);
  const mediator = useMediator();
  return useCallback(
    (intent: LocalIntent) => bubble(links, intent, mediator.getState()),
    [links, mediator],
  );
}
