// Textos de UI personalizables por negocio (businesses.settings.labels),
// mismo modelo que la web. Un negocio sin settings configurados ve
// exactamente estos textos.
export interface Labels {
  navDashboard: string
  navPos: string
  navCaja: string
  navVentas: string
  posTitle: string
}

export const DEFAULT_LABELS: Labels = {
  navDashboard: 'Dashboard',
  navPos: 'Punto de venta',
  navCaja: 'Caja',
  navVentas: 'Ventas',
  posTitle: 'Punto de venta',
}
