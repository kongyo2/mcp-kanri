import type { McpServer, McpServerInput } from '../../../shared/schema';
import type { KanriApi } from '../../../shared/ipc';
import type { Locale } from '../../../shared/i18n';
import type { Ports, TimerPort } from '../mvp/ports';

export interface FakeApi extends KanriApi {
  readonly store: McpServer[];
  failNextWith: (message: string) => void;
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

export function createFakeApi(initial: readonly McpServer[] = []): FakeApi {
  const store: McpServer[] = [...initial];
  let pendingFailure: string | null = null;
  let created = 0;

  const takeFailure = (): void => {
    if (pendingFailure === null) return;
    const message = pendingFailure;
    pendingFailure = null;
    throw new Error(message);
  };

  return {
    store,
    failNextWith: (message: string) => {
      pendingFailure = message;
    },
    list: async () => {
      takeFailure();
      return [...store];
    },
    create: async (input) => {
      takeFailure();
      created += 1;
      const server = materialize(input, `new-${created}`);
      store.push(server);
      return server;
    },
    update: async (id, input) => {
      takeFailure();
      const index = store.findIndex((s) => s.id === id);
      const server = materialize(input, id);
      if (index >= 0) store.splice(index, 1, server);
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

export interface ManualTimers {
  readonly port: TimerPort;
  readonly pending: () => number;
  readonly runAll: () => void;
}

export function createManualTimers(): ManualTimers {
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
}

export function createTestPorts(
  options: {
    readonly servers?: readonly McpServer[];
    readonly locale?: Locale;
    readonly clipboardFails?: boolean;
  } = {},
): TestPorts {
  const api = createFakeApi(options.servers ?? []);
  const timerControl = createManualTimers();
  const copied: string[] = [];
  const persistedLocales: Locale[] = [];
  const titles: string[] = [];
  const langs: string[] = [];
  const warnings: string[] = [];

  return {
    api,
    timerControl,
    copied,
    persistedLocales,
    titles,
    langs,
    warnings,
    timers: timerControl.port,
    clipboard: {
      writeText: async (text) => {
        if (options.clipboardFails === true) throw new Error('clipboard denied');
        copied.push(text);
      },
    },
    document: {
      setTitle: (title) => titles.push(title),
      setLang: (lang) => langs.push(lang),
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
