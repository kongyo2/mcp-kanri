import type { MainViewModel } from '../presenter/types';
import { DetailView } from './DetailView';
import { EditorFormView } from './EditorFormView';
import { DetailNode, EditorNode } from './nodes';

interface Props {
  readonly vm: MainViewModel;
}

export function MainPanelView({ vm }: Props): JSX.Element {
  switch (vm.kind) {
    case 'compose':
      return (
        <>
          <h2 className="pane-heading">{vm.heading}</h2>
          <EditorNode>
            <EditorFormView vm={vm.form} />
          </EditorNode>
        </>
      );

    case 'detail':
      return (
        <DetailNode serverId={vm.detail.serverId} copyText={vm.detail.code.text}>
          <DetailView vm={vm.detail} />
        </DetailNode>
      );

    case 'empty':
      return (
        <div className="empty-state">
          <div className="empty-state-icon">{vm.icon}</div>
          <div className="empty-state-title">{vm.title}</div>
          <div>{vm.body}</div>
        </div>
      );
  }
}
