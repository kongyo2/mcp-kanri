import type { McpServer, McpServerInput } from '../../../shared/schema';
import type { KanriApi } from '../../../shared/ipc';
import type { Locale } from '../../../shared/i18n';
import { createFocusAnchor, type Ports, type TimerPort } from '../mvp/ports';

interface FakeApi extends KanriApi {
  readonly store: McpServer[];
  failNextWith: (message: string) => void;
  holdNextWrite: () => () => void;
}

let idCounter = 0;

export function makeServer(overrides: Partial<McpServer> = {}): McpServer {
  idCounter += 1;
  return {
    id: `srv-${idCounter}`,
    name: `server-${idCounter}`,
    description: '',
    transport: 'stdio',
    command: 'npx',
    args: [],
    env: {},
    scope: 'user',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as McpServer;
}

function materialize(input: McpServerInput, id: string): McpServer {
  return { ...input, id, createdAt: 0, updatedAt: 0 };
}

function createFakeApi(initial: readonly McpServer[] = []): FakeApi {
  const store: McpServer[] = [...initial];
  let pendingFailure: string | null = null;
  let created = 0;

  let gate: { promise: Promise<void>; release: () => void } | null = null;

  const takeFailure = (): void => {
    if (pendingFailure === null) return;
    const message = pendingFailure;
    pendingFailure = null;
    throw new Error(message);
  };

  const passGate = async (): Promise<void> => {
    const held = gate;
    if (held === null) return;
    gate = null;
    await held.promise;
  };

  return {
    store,
    failNextWith: (message: string) => {
      pendingFailure = message;
    },
    holdNextWrite: () => {
      let release = (): void => {};
      const promise = new Promise<void>((resolve) => {
        release = () => {
          resolve();
        };
      });
      gate = { promise, release };
      return release;
    },
    list: async () => {
      takeFailure();
      return [...store];
    },
    create: async (input) => {
      await passGate();
      takeFailure();
      created += 1;
      const server = materialize(input, `new-${created}`);
      store.push(server);
      return server;
    },
    update: async (id, input) => {
      await passGate();
      takeFailure();
      const index = store.findIndex((s) => s.id === id);
      if (index < 0) throw new Error(`Server with id=${id} not found`);
      const server = materialize(input, id);
      store.splice(index, 1, server);
      return server;
    },
    remove: async (id) => {
      takeFailure();
      const index = store.findIndex((s) => s.id === id);
      if (index >= 0) store.splice(index, 1);
    },
    getStorePath: async () => 'C:\\Users\\test\\mcp-kanri\\servers.json',
    setLocale: async () => {},
  };
}

interface ManualTimers {
  readonly port: TimerPort;
  readonly pending: () => number;
  readonly runAll: () => void;
}

function createManualTimers(): ManualTimers {
  const scheduled = new Map<number, () => void>();
  let handle = 0;
  return {
    port: {
      start: (_ms, fn) => {
        handle += 1;
        scheduled.set(handle, fn);
        return handle;
      },
      cancel: (id) => {
        scheduled.delete(id);
      },
    },
    pending: () => scheduled.size,
    runAll: () => {
      const callbacks = Array.from(scheduled.values());
      scheduled.clear();
      for (const callback of callbacks) callback();
    },
  };
}

export interface TestPorts extends Ports {
  readonly api: FakeApi;
  readonly timers: TimerPort;
  readonly timerControl: ManualTimers;
  readonly copied: string[];
  readonly persistedLocales: Locale[];
  readonly titles: string[];
  readonly langs: string[];
  readonly warnings: string[];
  readonly focusCalls: string[];
}

export function createTestPorts(
  options: {
    readonly servers?: readonly McpServer[];
    readonly locale?: Locale;
    readonly clipboardFails?: 'reject' | 'throw';
  } = {},
): TestPorts {
  const api = createFakeApi(options.servers ?? []);
  const timerControl = createManualTimers();
  const copied: string[] = [];
  const persistedLocales: Locale[] = [];
  const titles: string[] = [];
  const langs: string[] = [];
  const warnings: string[] = [];
  const focusCalls: string[] = [];
  const focusAnchor = createFocusAnchor(globalThis.document);

  return {
    api,
    timerControl,
    copied,
    persistedLocales,
    titles,
    langs,
    warnings,
    focusCalls,
    timers: timerControl.port,
    clipboard: {
      writeText: (text) => {
        if (options.clipboardFails === 'throw') throw new Error('clipboard unavailable');
        if (options.clipboardFails === 'reject')
          return Promise.reject(new Error('clipboard denied'));
        copied.push(text);
        return Promise.resolve();
      },
    },
    document: {
      setTitle: (title) => titles.push(title),
      setLang: (lang) => langs.push(lang),
      captureFocus: () => {
        focusCalls.push('capture');
        focusAnchor.capture();
      },
      restoreFocus: () => {
        focusCalls.push('restore');
        focusAnchor.restore();
      },
    },
    preferences: {
      readLocale: () => options.locale ?? 'en',
      writeLocale: (locale) => persistedLocales.push(locale),
    },
    logger: {
      warn: (message) => warnings.push(message),
      error: (message) => warnings.push(message),
    },
  };
}
