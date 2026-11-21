const express = require('express');
const axios = require('axios');
const logger = require('pino')();
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const app = express();
app.use(express.json());

const INVENTORY_URL = process.env.INVENTORY_URL || 'http://localhost:6003';
const tracer = trace.getTracer('orders');

app.post('/orders', async (req, res) => {
  const { sku, quantity } = req.body;

  if (!sku || !Number.isInteger(quantity) || quantity <= 0) {
    logger.warn({ sku, quantity }, 'rejected invalid order');
    return res.status(400).json({ success: false, message: 'sku and a positive integer quantity are required' });
  }

  logger.info({ sku, quantity }, 'order received');

  // A manual span around our own business step
  return tracer.startActiveSpan('check-stock', async (span) => {
    span.setAttribute('order.sku', sku);
    span.setAttribute('order.quantity', quantity);

    try {
      const { data } = await axios.get(`${INVENTORY_URL}/stock/${sku}`, { timeout: 3000 });
      const available = data.data.stock;
      span.setAttribute('inventory.available', available);

      if (available < quantity) {
        logger.warn({ sku, quantity, available }, 'insufficient stock');
        return res.status(409).json({ success: false, message: 'Insufficient stock' });
      }

      const order = { id: `ord-${Date.now()}`, sku, quantity };
      logger.info({ orderId: order.id }, 'order accepted');
      return res.status(201).json({ success: true, data: order });
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });

      if (err.response && err.response.status === 404) {
        logger.warn({ sku }, 'order for unknown sku');
        return res.status(404).json({ success: false, message: 'Unknown SKU' });
      }

      logger.error({ error: err.message, sku }, 'inventory call failed');
      return res.status(502).json({ success: false, message: 'Inventory service unavailable' });
    } finally {
      span.end();
    }
  });
});

const PORT = process.env.PORT || 6002;
app.listen(PORT, () => logger.info({ port: PORT }, 'orders listening'));