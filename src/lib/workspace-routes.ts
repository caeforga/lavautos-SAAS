export const workspacePaths = {
  overview: '/',
  orders: '/ordenes',
  team: '/equipo',
  customers: '/mis-clientes',
  catalog: '/catalogo',
  cash: '/caja',
  reports: '/reportes',
  settings: '/configuracion',
  sync: '/sincronizacion',
  platform: '/plataforma',
  clients: '/clientes',
} as const;

export type WorkspaceView = keyof typeof workspacePaths;

export function viewFromPath(pathname: string): WorkspaceView {
  const entry = Object.entries(workspacePaths).find(([, path]) => path === pathname);
  return (entry?.[0] as WorkspaceView | undefined) ?? 'overview';
}

export const workspaceTitles: Record<WorkspaceView, string> = {
  overview: 'Todo en orden.',
  orders: 'Órdenes de servicio',
  team: 'El equipo que hace la diferencia',
  customers: 'Mis clientes',
  catalog: 'Servicios y productos',
  cash: 'Cada peso, en su lugar',
  reports: 'Los números de tu negocio',
  settings: 'Tu negocio, a tu manera',
  sync: 'Centro de sincronización',
  platform: 'Panel de plataforma',
  clients: 'Clientes',
};
