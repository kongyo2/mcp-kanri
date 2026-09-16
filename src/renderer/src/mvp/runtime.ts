import { errorMessage } from '../errors';
import type { Effect, TimerKey } from './effects';
import type { DomainIntent } from './intents';
import type { Ports } from './ports';

export class EffectRunner {
  readonly #ports: Ports;
  readonly #emit: (intent: DomainIntent) => void;
  readonly #timers = new Map<TimerKey, number>();

  constructor(ports: Ports, emit: (intent: DomainIntent) => void) {
    this.#ports = ports;
    this.#emit = emit;
  }

  run(effect: Effect): void {
    switch (effect.kind) {
      case 'store/list':
        void this.#settle(
          this.#ports.api.list(),
          (servers) => ({ scope: 'domain', type: 'store/listed', servers }),
          (message) => ({ scope: 'domain', type: 'store/failed', message }),
        );
        return;

      case 'store/path':
        void this.#ports.api.getStorePath().then(
          (path) => {
            this.#emit({ scope: 'domain', type: 'store/path-resolved', path });
          },
          (err: unknown) => {
            this.#ports.logger.warn('failed to resolve store path', err);
          },
        );
        return;

      case 'store/create':
        void this.#settle(
          this.#ports.api.create(effect.input),
          (server) => ({ scope: 'domain', type: 'submit/succeeded', server }),
          (message) => ({ scope: 'domain', type: 'submit/failed', message }),
        );
        return;

      case 'store/update':
        void this.#settle(
          this.#ports.api.update(effect.id, effect.input),
          (server) => ({ scope: 'domain', type: 'submit/succeeded', server }),
          (message) => ({ scope: 'domain', type: 'submit/failed', message }),
        );
        return;

      case 'store/remove':
        void this.#settle(
          this.#ports.api.remove(effect.serverId),
          () => ({ scope: 'domain', type: 'removal/succeeded' }),
          (message) => ({ scope: 'domain', type: 'removal/failed', message }),
        );
        return;

      case 'locale/publish':
        void this.#ports.api.setLocale(effect.locale).catch((err: unknown) => {
          this.#ports.logger.warn('failed to publish locale to main process', err);
        });
        return;

      case 'locale/persist':
        this.#ports.preferences.writeLocale(effect.locale);
        return;

      case 'document/title':
        this.#ports.document.setTitle(effect.title);
        return;

      case 'document/lang':
        this.#ports.document.setLang(effect.lang);
        return;

      case 'clipboard/write':
        void this.#settle(
          this.#ports.clipboard.writeText(effect.text),
          () => ({ scope: 'domain', type: 'clipboard/succeeded' }),
          (message) => ({ scope: 'domain', type: 'clipboard/failed', message }),
        );
        return;

      case 'timer/start': {
        this.#cancelTimer(effect.key);
        const intent = effect.intent;
        const handle = this.#ports.timers.start(effect.ms, () => {
          this.#timers.delete(effect.key);
          this.#emit(intent);
        });
        this.#timers.set(effect.key, handle);
        return;
      }

      case 'timer/cancel':
        this.#cancelTimer(effect.key);
        return;

      default:
        return;
    }
  }

  dispose(): void {
    for (const handle of this.#timers.values()) this.#ports.timers.cancel(handle);
    this.#timers.clear();
  }

  async #settle<T>(
    work: Promise<T>,
    onSuccess: (value: T) => DomainIntent,
    onFailure: (message: string) => DomainIntent,
  ): Promise<void> {
    try {
      this.#emit(onSuccess(await work));
    } catch (err) {
      this.#emit(onFailure(errorMessage(err)));
    }
  }

  #cancelTimer(key: TimerKey): void {
    const handle = this.#timers.get(key);
    if (handle === undefined) return;
    this.#ports.timers.cancel(handle);
    this.#timers.delete(key);
  }
}
