'use client';
import { SyncCenter } from '../sync-center';
import type { WorkspaceViewModel } from './types';

export function SyncView({ model }: { model: WorkspaceViewModel }) {
  const { w } = model;
  return <>
<SyncCenter w={w}/>
  </>;
}
