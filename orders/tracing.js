const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
    // The name this service shows up as in Jaeger. Defaults to the "name" in package.json
    serviceName: process.env.OTEL_SERVICE_NAME || require('./package.json').name,
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
    ],
});

sdk.start();

const shutdown = () => sdk.shutdown().finally(() => process.exit(0));

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);