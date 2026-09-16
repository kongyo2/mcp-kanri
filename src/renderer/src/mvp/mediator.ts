import type { BubbleContext, ChainLink, DispatchOutcome, Next } from './chain';
import type { DomainIntent, UiIntent } from './intents';
import { transition } from './machine';
import type { Ports } from './ports';
import { EffectRunner } from './runtime';
import { createInitialState, type AppState } from './state';

export class Mediator implements ChainLink {
  readonly id = 'mediator';

  #state: AppState;
  #started = false;
  #draining = false;
  readonly #queue: DomainIntent[] = [];
  readonly #listeners = new Set<() => void>();
  readonly #runner: EffectRunner;
  readonly #logger: Ports['logger'];

  constructor(ports: Ports, initial: AppState = createInitialState()) {
    this.#state = initial;
    this.#logger = ports.logger;
    this.#runner = new EffectRunner(ports, (intent) => {
      this.receive(intent);
    });
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.receive({ scope: 'domain', type: 'boot/requested' });
  }

  dispose(): void {
    this.#runner.dispose();
  }

  getState = (): AppState => this.#state;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  receive(intent: DomainIntent): void {
    this.#queue.push(intent);
    this.#drain();
  }

  handle(intent: UiIntent, ctx: BubbleContext, _next: Next): DispatchOutcome {
    if (intent.scope !== 'domain') {
      this.#logger.warn(
        `unpromoted local intent "${intent.type}" reached the mediator (path: ${ctx.path.join(' > ')})`,
      );
      return { status: 'unhandled', intent, path: ctx.path };
    }
    this.receive(intent);
    return { status: 'adjudicated', by: this.id, intent, path: ctx.path };
  }

  #drain(): void {
    if (this.#draining) return;
    this.#draining = true;
    const before = this.#state;
    try {
      for (let intent = this.#queue.shift(); intent !== undefined; intent = this.#queue.shift()) {
        const result = transition(this.#state, intent);
        this.#state = result.state;
        for (const effect of result.effects) this.#runner.run(effect);
      }
    } finally {
      this.#draining = false;
    }
    if (this.#state !== before) {
      const listeners = Array.from(this.#listeners);
      for (const listener of listeners) listener();
    }
  }
}
