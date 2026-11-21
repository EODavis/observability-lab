# Observability Lab

Three small Node.js services wired for structured logging and distributed
tracing with OpenTelemetry, viewed in Jaeger. Project 18 in a sequential
backend engineering learning journey, and the first project focused on
being able to see inside a running system instead of building a new feature.

## Architecture

```
client -> gateway (6001) -> orders (6002) -> inventory (6003)
              |                  |                 |
              '------ spans (OTLP/HTTP) ----------'
                              |
                           Jaeger (UI on 16686)
```

A request through the gateway produces one trace spanning all three
services. Every log line written while handling it carries the same
`trace_id`, so logs and traces can be cross-referenced in either direction.

## Tech Stack
- Node.js, Express, axios
- pino (structured JSON logging)
- OpenTelemetry (`sdk-node`, auto-instrumentations, OTLP/HTTP exporter)
- Jaeger v2 (via Docker Compose)

## Getting Started

```bash
docker compose up -d          # starts Jaeger

# then, in three separate terminals:
cd inventory && npm install && npm start
cd orders && npm install && npm start
cd gateway && npm install && npm start
```

Jaeger UI: http://localhost:16686

Always start services with `npm start`. The tracing bootstrap is loaded
through `node --require ./tracing.js`, so running `node index.js` directly
skips tracing silently.

## Try It

```bash
curl -X POST http://localhost:6001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"sku":"mouse-1","quantity":2}'
```

| SKU | Behavior | What to look for in Jaeger |
|---|---|---|
| `mouse-1` | Happy path | Nested spans across all three services |
| `mouse-1` (qty 999) | 409 insufficient stock | A healthy trace that ends in a business rejection |
| `slow-item` | Inventory sleeps 1.5s | One conspicuously wide span, attributable to a service |
| `broken-item` | Inventory returns 500 | Error-flagged spans with a recorded exception |
| `nope` | 404 unknown SKU | Error propagating up the chain |

To go from a log line to its trace, copy the `trace_id` from any log line
and paste it into Jaeger's "Lookup by Trace ID" box.

## Design Notes
- **Load order matters.** Auto-instrumentation patches libraries when they
  are first loaded, so the tracing bootstrap must run before Express and
  pino. Starting it through `--require` guarantees that.
- **CommonJS only.** ES modules load through a different mechanism and need
  a different startup setup; this project stays on `require`.
- **Automatic vs manual spans.** Framework-level spans (inbound requests,
  outbound HTTP calls) are created automatically. The `check-stock` span in
  the orders service is manual, wrapping a step only application code knows
  is meaningful. It always ends in `finally`, because a span that never ends
  is never exported.
- **Context propagation** happens through the standard W3C `traceparent`
  header, added to outbound calls and read from inbound ones automatically.
- **Spans are exported in batches**, so a trace can take several seconds to
  appear in Jaeger.
- **Jaeger stores traces in memory** in this setup; restarting it clears them.
- **Sampling:** every request is traced here because traffic is tiny. At real
  volume, tracing everything is usually too expensive, so production systems
  sample, which means the trace for one specific user complaint may not exist.
- **Not covered:** metrics (the third pillar of observability), alerting,
  and trace-aware log storage. These are natural follow-ups.

## Project Structure
```
gateway/      - Entry point; starts the trace
orders/       - Business logic; manual check-stock span
inventory/    - Stock lookups; deliberately slow and failing SKUs
*/tracing.js  - OpenTelemetry bootstrap (identical in each service)
docker-compose.yml - Jaeger
```