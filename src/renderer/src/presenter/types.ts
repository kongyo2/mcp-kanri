import type { DraftField } from '../mvp/intents';

interface TabItemViewModel {
  readonly value: string;
  readonly label: string;
  readonly active: boolean;
}

export interface TabsViewModel {
  readonly className: string;
  readonly ariaLabelledBy: string | null;
  readonly items: readonly TabItemViewModel[];
}

export interface TextFieldViewModel {
  readonly id: string;
  readonly field: DraftField;
  readonly label: string;
  readonly hint: string | null;
  readonly value: string;
  readonly placeholder: string;
  readonly inputType: 'text' | 'url';
  readonly required: boolean;
  readonly disabled: boolean;
  readonly modifier: string | null;
}

export interface TextAreaFieldViewModel {
  readonly id: string;
  readonly field: DraftField;
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly disabled: boolean;
}

interface SelectOptionViewModel {
  readonly value: string;
  readonly label: string;
}

export interface SelectFieldViewModel {
  readonly id: string;
  readonly field: DraftField;
  readonly label: string;
  readonly hint: string | null;
  readonly value: string;
  readonly options: readonly SelectOptionViewModel[];
  readonly disabled: boolean;
  readonly modifier: string | null;
}

interface ArgRowViewModel {
  readonly id: string;
  readonly value: string;
  readonly placeholder: string;
  readonly ariaLabel: string;
}

export interface ArgListViewModel {
  readonly labelId: string;
  readonly label: string;
  readonly hint: string | null;
  readonly addLabel: string;
  readonly removeLabel: string;
  readonly disabled: boolean;
  readonly rows: readonly ArgRowViewModel[];
}

interface KeyValueRowViewModel {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly keyLabel: string;
  readonly valueLabel: string;
}

export interface KeyValueListViewModel {
  readonly labelId: string;
  readonly label: string;
  readonly hint: string | null;
  readonly addLabel: string;
  readonly removeLabel: string;
  readonly keyPlaceholder: string;
  readonly valuePlaceholder: string;
  readonly disabled: boolean;
  readonly rows: readonly KeyValueRowViewModel[];
}

export interface EditorFormViewModel {
  readonly transport: {
    readonly labelId: string;
    readonly label: string;
    readonly hint: string;
    readonly tabs: TabsViewModel;
  };
  readonly name: TextFieldViewModel;
  readonly scope: SelectFieldViewModel;
  readonly description: TextAreaFieldViewModel;
  readonly stdio: {
    readonly command: TextFieldViewModel;
    readonly args: ArgListViewModel;
    readonly env: KeyValueListViewModel;
  } | null;
  readonly remote: {
    readonly url: TextFieldViewModel;
    readonly headers: KeyValueListViewModel;
  } | null;
  readonly errorMessage: string | null;
  readonly validationMessage: string | null;
  readonly submitLabel: string;
  readonly cancelLabel: string;
  readonly submitDisabled: boolean;
  readonly cancelDisabled: boolean;
}

export interface MetaItemViewModel {
  readonly id: string;
  readonly label: string;
  readonly code: string | null;
}

export interface DetailViewModel {
  readonly serverId: string;
  readonly name: string;
  readonly transport: string;
  readonly transportTagClass: string;
  readonly scopeLabel: string;
  readonly meta: readonly MetaItemViewModel[];
  readonly description: string | null;
  readonly editLabel: string;
  readonly removeLabel: string;
  readonly tabs: TabsViewModel;
  readonly subtitle: string | null;
  readonly code: {
    readonly text: string;
    readonly copyLabel: string;
    readonly copied: boolean;
  };
}

export interface ServerItemViewModel {
  readonly id: string;
  readonly name: string;
  readonly transport: string;
  readonly transportTagClass: string;
  readonly meta: string;
  readonly selected: boolean;
}

interface LanguageOptionViewModel {
  readonly value: string;
  readonly label: string;
  readonly active: boolean;
}

export interface SidebarViewModel {
  readonly title: string;
  readonly newServerLabel: string;
  readonly emptyLines: readonly string[] | null;
  readonly items: readonly ServerItemViewModel[];
  readonly languageLabel: string;
  readonly languageOptions: readonly LanguageOptionViewModel[];
  readonly storeLabel: string;
  readonly storePath: string;
}

export type MainViewModel =
  | { readonly kind: 'empty'; readonly icon: string; readonly title: string; readonly body: string }
  | { readonly kind: 'compose'; readonly heading: string; readonly form: EditorFormViewModel }
  | { readonly kind: 'detail'; readonly detail: DetailViewModel };

export interface ToastViewModel {
  readonly message: string;
  readonly className: string;
}

export interface ConfirmDialogViewModel {
  readonly title: string;
  readonly message: string;
  readonly acceptLabel: string;
  readonly cancelLabel: string;
  readonly busy: boolean;
}

export interface RootViewModel {
  readonly sidebar: SidebarViewModel;
  readonly main: MainViewModel;
  readonly toast: ToastViewModel | null;
  readonly dialog: ConfirmDialogViewModel | null;
  readonly contentHidden: boolean;
}
