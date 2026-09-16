import { useMemo } from 'react';
import type { RowCollection, TabChannel } from '../mvp/intents';
import {
  detailPaneLink,
  dialogLink,
  editorPaneLink,
  modalGuardLink,
  rowsLink,
  serverRowLink,
  sidebarLink,
  tabsLink,
} from '../mvp/links';
import { ChainNode } from '../mvp/react';

interface NodeProps {
  readonly children: React.ReactNode;
}

export function SidebarNode({ children }: NodeProps): JSX.Element {
  const link = useMemo(() => sidebarLink(), []);
  return <ChainNode link={link}>{children}</ChainNode>;
}

export function ServerRowNode({
  serverId,
  children,
}: NodeProps & { readonly serverId: string }): JSX.Element {
  const link = useMemo(() => serverRowLink(serverId), [serverId]);
  return <ChainNode link={link}>{children}</ChainNode>;
}

export function DetailNode({
  serverId,
  copyText,
  children,
}: NodeProps & { readonly serverId: string; readonly copyText: string }): JSX.Element {
  const link = useMemo(() => detailPaneLink(serverId, copyText), [serverId, copyText]);
  return <ChainNode link={link}>{children}</ChainNode>;
}

export function EditorNode({ children }: NodeProps): JSX.Element {
  const link = useMemo(() => editorPaneLink(), []);
  return <ChainNode link={link}>{children}</ChainNode>;
}

export function TabsNode({
  channel,
  children,
}: NodeProps & { readonly channel: TabChannel }): JSX.Element {
  const link = useMemo(() => tabsLink(channel), [channel]);
  return <ChainNode link={link}>{children}</ChainNode>;
}

export function RowsNode({
  collection,
  children,
}: NodeProps & { readonly collection: RowCollection }): JSX.Element {
  const link = useMemo(() => rowsLink(collection), [collection]);
  return <ChainNode link={link}>{children}</ChainNode>;
}

export function DialogNode({ children }: NodeProps): JSX.Element {
  const link = useMemo(() => dialogLink(), []);
  return <ChainNode link={link}>{children}</ChainNode>;
}

export function ModalGuardNode({ children }: NodeProps): JSX.Element {
  const link = useMemo(() => modalGuardLink(), []);
  return <ChainNode link={link}>{children}</ChainNode>;
}
