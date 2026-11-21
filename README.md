# Sistema de afiliados — Next.js + NestJS

Cuando alguien entra con `tusitio.com/?ref=CODIGO`, se guarda el código en una cookie durante 30 días. Si esa persona compra y el pago se confirma, el dueño del código recibe un % del subtotal.

## Cómo funciona

```
Visitante entra con ?ref=abc123
        │
        ▼
Next.js proxy.ts ──► POST /affiliates/clicks   (registra el clic y valida el código)
        │
        ├─ guarda cookie httpOnly  aff_ref=abc123  (30 días)
        └─ redirige a la misma URL sin ?ref=
        
El visitante compra
        │
        ▼
Server action createOrder ──► POST /orders { items, affiliateCode }   (el pedido queda atribuido)
        
Tu pasarela confirma el pago (webhook)
        │
        ▼
OrdersService.markAsPaid() ──► crea la comisión  (estado: pending)
        │
        ├─ pasan 30 días sin reembolso ─► approved   (cron cada hora)
        ├─ hay reembolso ───────────────► rejected
        └─ le pagas al afiliado ────────► paid       (CommissionsService.markPaidOut)
```

## Backend (NestJS)

```
backend/src/
├── affiliates/
│   ├── entities/          Affiliate, AffiliateClick, Commission
│   ├── dto/               TrackClickDto
│   ├── affiliates.service.ts    alta, clics, atribución, estadísticas
│   ├── commissions.service.ts   crear / anular / aprobar / pagar comisiones
│   ├── affiliates.controller.ts
│   └── affiliates.module.ts
├── orders/                 Order, Product, OrdersService (create, markAsPaid, refund)
├── auth/                   ⚠️ marcadores: sustitúyelos por tu auth
├── app.module.ts
└── main.ts
```

1. `npm install` y copia `.env.example` a `.env`.
2. Si ya tienes un proyecto Nest, copia `affiliates/` y `orders/` e importa `AffiliatesModule`, `OrdersModule` y `ScheduleModule.forRoot()` en tu `AppModule`. Si ya tienes entidades de pedidos y productos, usa las tuyas: solo necesitas añadir la columna `affiliateId` al pedido y llamar a `affiliates.resolveForOrder()` al crearlo.
3. Sustituye `auth/jwt-auth.guard.ts` por tu guard real (p. ej. `AuthGuard('jwt')`). Solo se necesita que `request.user.id` tenga el id del usuario.
4. Conecta el webhook de tu pasarela de pago. Ejemplo con Stripe (crea la sesión de pago con `metadata.orderId`):

```ts
@Post('webhooks/stripe')
async stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
  const event = this.stripe.webhooks.constructEvent(req.rawBody!, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  if (event.type === 'checkout.session.completed') {
    await this.orders.markAsPaid(event.data.object.metadata!.orderId);
  }
}
```

Endpoints:

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/affiliates/clicks` | pública | Registra un clic; responde `{ valid }` |
| POST | `/affiliates/me` | sí | El usuario se une y recibe su código |
| GET | `/affiliates/me` | sí | Estadísticas (404 si no es afiliado) |
| POST | `/orders` | sí | Crea el pedido con `affiliateCode` opcional |

## Frontend (Next.js 16, App Router)

```
frontend/
├── proxy.ts                       captura ?ref=, guarda la cookie y limpia la URL
├── lib/affiliate.ts               configuración (cookie, duración, last/first-click)
├── lib/auth.ts                    ⚠️ marcador: adapta a tu login
└── app/
    ├── checkout/actions.ts        createOrder(): envía el código al backend
    └── afiliados/                 panel del afiliado (enlace, clics, ventas, ganancias)
```

- Copia los archivos a tu proyecto y añade las variables de `.env.example`.
- Llama a `createOrder(items)` desde tu botón de pagar.
- **Next.js 15 o anterior:** renombra `proxy.ts` a `middleware.ts` y la función `proxy` a `middleware`.
- Si ya tienes un `proxy.ts`, une las dos lógicas en un solo archivo (Next.js solo admite uno).

## Reglas que ya están implementadas

- La comisión se crea **solo cuando el pago se confirma**, no al crear el pedido.
- Periodo de espera (por defecto 30 días) antes de aprobarla, para cubrir devoluciones; un reembolso la anula.
- Un afiliado no gana comisión comprando con su propio enlace.
- Los precios salen siempre de la base de datos, nunca del navegador.
- Webhooks repetidos no duplican comisiones (restricción única por pedido + bloqueo de fila).
- El dinero se guarda en céntimos (enteros) y el % en basis points (`1000` = 10 %), sin errores de redondeo con decimales.
- La tasa se copia en cada comisión: si cambias el % de un afiliado, el histórico no cambia.
- Las IPs de los clics se guardan con hash.

## Antes de producción

- Cambia `synchronize` por migraciones de TypeORM.
- Añade límite de peticiones (`@nestjs/throttler`) a `POST /affiliates/clicks`.
- Crea un panel de admin para cambiar el % por afiliado, suspender cuentas y marcar pagos (`CommissionsService.markPaidOut`).
- Menciona el programa de afiliados y la cookie en tu política de privacidad.
