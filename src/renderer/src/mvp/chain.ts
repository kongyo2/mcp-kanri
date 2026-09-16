import type { DomainIntent, LocalIntent, UiIntent } from './intents';
import type { AppState } from './state';

export interface BubbleContext {
  readonly origin: string;
  readonly path: readonly string[];
  readonly state: AppState;
}

export type DispatchOutcome =
  | {
      readonly status: 'adjudicated';
      readonly by: string;
      readonly intent: UiIntent;
      readonly path: readonly string[];
    }
  | {
      readonly status: 'consumed';
      readonly by: string;
      readonly intent: UiIntent;
      readonly path: readonly string[];
    }
  | { readonly status: 'unhandled'; readonly intent: UiIntent; readonly path: readonly string[] };

export type Next = (intent: UiIntent) => DispatchOutcome;

export interface ChainLink {
  readonly id: string;
  handle: (intent: UiIntent, ctx: BubbleContext, next: Next) => DispatchOutcome;
}

export function bubble(
  links: readonly ChainLink[],
  intent: UiIntent,
  state: AppState,
): DispatchOutcome {
  const origin = links[0]?.id ?? '(detached)';
  const walk = (index: number, current: UiIntent, path: readonly string[]): DispatchOutcome => {
    const link = links[index];
    if (link === undefined) return { status: 'unhandled', intent: current, path };
    const nextPath = [...path, link.id];
    const ctx: BubbleContext = { origin, path: nextPath, state };
    return link.handle(current, ctx, (rewritten) => walk(index + 1, rewritten, nextPath));
  };
  return walk(0, intent, []);
}

export function defineLink(id: string, handle: ChainLink['handle']): ChainLink {
  return { id, handle };
}

export function definePromoter(
  id: string,
  promote: (intent: LocalIntent, ctx: BubbleContext) => DomainIntent | null,
): ChainLink {
  return defineLink(id, (intent, ctx, next) => {
    if (intent.scope !== 'local') return next(intent);
    const promoted = promote(intent, ctx);
    return next(promoted ?? intent);
  });
}

export function defineGuard(
  id: string,
  shouldConsume: (intent: UiIntent, ctx: BubbleContext) => boolean,
): ChainLink {
  return defineLink(id, (intent, ctx, next) => {
    if (shouldConsume(intent, ctx)) {
      return { status: 'consumed', by: id, intent, path: ctx.path };
    }
    return next(intent);
  });
}
