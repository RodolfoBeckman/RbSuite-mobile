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
- Soporte web de Expo activado (`npx expo start --web`) solo como atajo de
  desarrollo para previsualizar sin emulador — el objetivo real es
  iOS/Android.

## Cómo correrlo

1. `npm install`
2. Copia `.env.example` a `.env` y completa `EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mismos valores que el `.env` de la web,
   son la URL y la llave pública/publishable del proyecto).
3. `npm run start` (Expo Go en tu celular) o `npm run web` para previsualizar
   en el navegador.

## Siguiente paso

Probarlo en un dispositivo/emulador real (hasta ahora solo se probó en la
vista web de Expo). Pendiente de una etapa futura: Ventas (historial +
cancelar), Inventario y Configuración en móvil.
