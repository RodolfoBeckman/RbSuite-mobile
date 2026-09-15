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
- Navegación por pestañas inferiores (Dashboard/Pos/Caja/Ventas, +
  Inventario si el rol aplica) en vez de botones sueltos — más natural en
  cuanto hay más de 2-3 pantallas.
- Soporte web de Expo activado (`npx expo start --web`) solo como atajo de
  desarrollo para previsualizar sin emulador — el objetivo real es
  iOS/Android. Nota: `Alert.alert` (usado para confirmar acciones
  destructivas, ej. cancelar venta) no funciona en esa vista web; sí
  funciona en iOS/Android reales.

## Cómo correrlo

1. `npm install`
2. Copia `.env.example` a `.env` y completa `EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mismos valores que el `.env` de la web,
   son la URL y la llave pública/publishable del proyecto).
3. `npm run start` (Expo Go en tu celular) o `npm run web` para previsualizar
   en el navegador.

## Siguiente paso

Probarlo en un dispositivo/emulador real (hasta ahora solo se probó en la
vista web de Expo). Pendiente de una etapa futura: Configuración en móvil
(marca, sucursales, equipo, etiquetas).
