# RB Suite Mobile — cimientos (Etapa 9)

App móvil de RB Suite (Expo + React Native + TypeScript), apuntando al
mismo proyecto de Supabase que la web
([RbSuite](https://github.com/RodolfoBeckman/RbSuite)). Esta primera
entrega es solo la base: todavía no tiene pantallas de negocio (POS,
Caja, Dashboard).

## Qué incluye

- Cliente de Supabase (`src/lib/supabase.ts`) con sesión persistida en
  `AsyncStorage` (recomendado por Supabase para React Native) y
  auto-refresh de token atado al ciclo de vida de la app (`AppState`).
- `AuthContext` (`src/auth/AuthContext.tsx`): mismo patrón que la web —
  resuelve negocio/sucursal/rol llamando a `get_my_membership()` en el
  servidor, nunca confía en datos del cliente.
- Pantalla de login (correo/contraseña) y una pantalla Home de prueba que
  confirma la membresía resuelta, con navegación (`@react-navigation`)
  entre ambas según haya sesión o no.
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

Construir las pantallas de negocio (probablemente empezando por POS, que
es lo más útil para un vendedor en piso de venta) reutilizando las mismas
RPCs de Supabase que ya usa la web (`create_sale`, etc.).
