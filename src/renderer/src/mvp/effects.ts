import type { Locale } from '../../../shared/i18n';
import type { McpServerInput } from '../../../shared/schema';
import type { DomainIntent } from './intents';

export type TimerKey = 'toast' | 'clipboard';

export type Effect =
  | { readonly kind: 'store/list' }
  | { readonly kind: 'store/path' }
  | { readonly kind: 'store/create'; readonly input: McpServerInput; readonly ticket: number }
  | {
      readonly kind: 'store/update';
      readonly id: string;
      readonly input: McpServerInput;
      readonly ticket: number;
    }
  | { readonly kind: 'store/remove'; readonly serverId: string }
  | { readonly kind: 'locale/publish'; readonly locale: Locale }
  | { readonly kind: 'locale/persist'; readonly locale: Locale }
  | { readonly kind: 'document/title'; readonly title: string }
  | { readonly kind: 'document/lang'; readonly lang: string }
  | { readonly kind: 'clipboard/write'; readonly text: string }
  | {
      readonly kind: 'timer/start';
      readonly key: TimerKey;
      readonly ms: number;
      readonly intent: DomainIntent;
    }
  | { readonly kind: 'timer/cancel'; readonly key: TimerKey };
