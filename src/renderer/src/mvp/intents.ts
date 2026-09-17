import type { FormatId } from '../../../shared/converters';
import type { Locale } from '../../../shared/i18n';
import type { McpServer, Scope, Transport } from '../../../shared/schema';

export type DraftField = 'name' | 'description' | 'scope' | 'command' | 'url';

export type RowCollection = 'args' | 'env' | 'headers';

type RowPart = 'key' | 'value';

export type TabChannel = 'transport' | 'format';

export type LocalIntent =
  | { readonly scope: 'local'; readonly type: 'row/activated' }
  | { readonly scope: 'local'; readonly type: 'action/edit' }
  | { readonly scope: 'local'; readonly type: 'action/remove' }
  | { readonly scope: 'local'; readonly type: 'action/create' }
  | { readonly scope: 'local'; readonly type: 'tab/selected'; readonly value: string }
  | {
      readonly scope: 'local';
      readonly type: 'field/changed';
      readonly field: DraftField;
      readonly value: string;
    }
  | { readonly scope: 'local'; readonly type: 'rows/appended' }
  | { readonly scope: 'local'; readonly type: 'rows/removed'; readonly rowId: string }
  | {
      readonly scope: 'local';
      readonly type: 'rows/edited';
      readonly rowId: string;
      readonly part: RowPart;
      readonly value: string;
    }
  | { readonly scope: 'local'; readonly type: 'form/submitted' }
  | { readonly scope: 'local'; readonly type: 'form/cancelled' }
  | { readonly scope: 'local'; readonly type: 'clipboard/requested' }
  | { readonly scope: 'local'; readonly type: 'dialog/accepted' }
  | { readonly scope: 'local'; readonly type: 'dialog/dismissed' }
  | { readonly scope: 'local'; readonly type: 'locale/selected'; readonly value: string };

export type DomainIntent =
  | { readonly scope: 'domain'; readonly type: 'boot/requested' }
  | {
      readonly scope: 'domain';
      readonly type: 'store/listed';
      readonly servers: readonly McpServer[];
    }
  | { readonly scope: 'domain'; readonly type: 'store/path-resolved'; readonly path: string }
  | { readonly scope: 'domain'; readonly type: 'store/failed'; readonly message: string }
  | { readonly scope: 'domain'; readonly type: 'server/selected'; readonly serverId: string }
  | { readonly scope: 'domain'; readonly type: 'compose/create-requested' }
  | { readonly scope: 'domain'; readonly type: 'compose/edit-requested'; readonly serverId: string }
  | { readonly scope: 'domain'; readonly type: 'compose/cancelled' }
  | {
      readonly scope: 'domain';
      readonly type: 'draft/transport-selected';
      readonly transport: Transport;
    }
  | {
      readonly scope: 'domain';
      readonly type: 'draft/field-changed';
      readonly field: DraftField;
      readonly value: string;
    }
  | {
      readonly scope: 'domain';
      readonly type: 'draft/row-appended';
      readonly collection: RowCollection;
    }
  | {
      readonly scope: 'domain';
      readonly type: 'draft/row-removed';
      readonly collection: RowCollection;
      readonly rowId: string;
    }
  | {
      readonly scope: 'domain';
      readonly type: 'draft/row-edited';
      readonly collection: RowCollection;
      readonly rowId: string;
      readonly part: RowPart;
      readonly value: string;
    }
  | { readonly scope: 'domain'; readonly type: 'submit/requested' }
  | {
      readonly scope: 'domain';
      readonly type: 'submit/succeeded';
      readonly server: McpServer;
      readonly ticket: number;
      readonly created: boolean;
    }
  | {
      readonly scope: 'domain';
      readonly type: 'submit/failed';
      readonly message: string;
      readonly ticket: number;
    }
  | { readonly scope: 'domain'; readonly type: 'removal/requested'; readonly serverId: string }
  | { readonly scope: 'domain'; readonly type: 'removal/confirmed' }
  | { readonly scope: 'domain'; readonly type: 'removal/cancelled' }
  | { readonly scope: 'domain'; readonly type: 'removal/succeeded' }
  | { readonly scope: 'domain'; readonly type: 'removal/failed'; readonly message: string }
  | { readonly scope: 'domain'; readonly type: 'format/selected'; readonly formatId: FormatId }
  | { readonly scope: 'domain'; readonly type: 'clipboard/requested'; readonly text: string }
  | { readonly scope: 'domain'; readonly type: 'clipboard/succeeded' }
  | { readonly scope: 'domain'; readonly type: 'clipboard/failed'; readonly message: string }
  | { readonly scope: 'domain'; readonly type: 'clipboard/expired' }
  | { readonly scope: 'domain'; readonly type: 'locale/changed'; readonly locale: Locale }
  | { readonly scope: 'domain'; readonly type: 'toast/expired'; readonly token: number };

export type UiIntent = LocalIntent | DomainIntent;

export function isScope(value: string): value is Scope {
  return value === 'local' || value === 'project' || value === 'user';
}

export function isTransport(value: string): value is Transport {
  return value === 'stdio' || value === 'http' || value === 'sse';
}
