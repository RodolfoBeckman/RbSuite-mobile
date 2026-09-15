# RB Suite Mobile (Etapa 9)

App móvil de RB Suite (Expo + React Native + TypeScript), apuntando al
mismo proyecto de Supabase que la web
([RbSuite](https://github.com/RodolfoBeckman/RbSuite)) y reutilizando sus
mismas RPCs/hooks para no duplicar reglas de negocio entre clientes.

## Qué incluye

- Cliente de Supabase (`src/lib/supabase.ts`) con sesión persistida en
  `AsyncStorage` (recomendado por Supabase para React Native) y
  auto-refresh de token atado al ciclo de vida de la app (`AppState`).
- `AuthContext` (`src/auth/AuthContext.tsx`): mismo patrón que la web —
  resuelve negocio/sucursal/rol/`activeBranchId` llamando a
  `get_my_membership()` en el servidor, nunca confía en datos del cliente.
- Login (correo/contraseña) y Dashboard (administrador/gerente con
  gráficas de tendencia y métodos de pago, venta por sucursal, más
  vendidos y stock bajo; vendedor con vista mínima) como pantalla inicial
  tras iniciar sesión.
- Punto de venta: selector de sucursal, catálogo con búsqueda, carrito en
  bottom sheet y cobro real vía `create_sale`.
- Caja: abrir/cerrar sesión, movimientos manuales (entrada/retiro) y
  bitácora de movimientos, vía `open_cash_session` / `close_cash_session` /
  `register_cash_movement`.
- Ventas: historial de los últimos 7 días y cancelar venta (solo
  administrador/gerente), vía `cancel_sale`.
- Inventario (solo administrador/gerente), con paridad de funciones con la
  web: tabla de productos como tarjetas (búsqueda, paginación, edición
  inline de categoría/precios/stock mínimo/activo), ajuste de stock,
  catálogos de marca/unidad/familia (globales) y categoría (por negocio)
  con selector buscar-o-crear (`ComboCreateSelect`, como picker de
  pantalla completa en vez del dropdown flotante de la web), reutilización
  de un producto ya existente en el catálogo compartido al dar de alta, y
  gestión de servicios.
- Configuración (solo administrador), con pestañas internas Marca /
  Sucursales / Equipo / Etiquetas / Auditoría:
  - Marca: logo elegido desde la galería del celular (`expo-image-picker`,
    subido al mismo storage que la web) y color de marca vía paleta de
    swatches + campo hex (no hay `<input type="color">` nativo en RN).
  - Sucursales: alta/edición (nombre, dirección, zona horaria, activa).
  - Equipo: invitar (correo/rol/sucursal, vía la Edge Function
    `invite-team-member`; el link de invitación siempre manda al flujo de
    "define tu contraseña" de la web, no tiene sentido duplicarlo en la
    app), editar rol/sucursal, quitar acceso.
  - Etiquetas: los mismos textos personalizables de la web, ahora también
    aplicados a los títulos/labels de las pestañas y del POS en la app
    (antes de esta etapa la app no los leía).
  - Auditoría: bitácora de acciones sensibles con filtros de fecha y
    acción.
- Navegación por pestañas inferiores (Dashboard/Pos/Caja/Ventas +
  Inventario/Configuración según el rol) en vez de botones sueltos — más
  natural en cuanto hay más de 2-3 pantallas.
- Soporte web de Expo activado (`npx expo start --web`) solo como atajo de
  desarrollo para previsualizar sin emulador — el objetivo real es
  iOS/Android. Nota: `Alert.alert` (usado para confirmar acciones
  destructivas, ej. cancelar venta o quitar a alguien del equipo) no
  funciona en esa vista web; sí funciona en iOS/Android reales.

## Cómo correrlo

1. `npm install`
2. Copia `.env.example` a `.env` y completa `EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mismos valores que el `.env` de la web,
   son la URL y la llave pública/publishable del proyecto).
3. `npm run start` (Expo Go en tu celular) o `npm run web` para previsualizar
   en el navegador.

## Siguiente paso

Probarlo en un dispositivo/emulador real (hasta ahora solo se probó en la
vista web de Expo) — es la única pantalla del roadmap original que falta
verificar. Con Dashboard, POS, Caja, Ventas, Inventario y Configuración
ya construidos, la app móvil tiene paridad funcional completa con la web.
