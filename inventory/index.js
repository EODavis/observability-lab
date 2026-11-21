const express = require('express');
const logger = require('pino')();

const app = express();

const STOCK = { 'mouse-1': 40, 'keyboard-1': 12, 'slow-item': 5, 'broken-item': 5 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.get('/stock/:sku', async (req, res) => {
  const { sku } = req.params;
  logger.info({ sku }, 'stock lookup requested');

  if (sku === 'slow-item') {
    await sleep(1500); // simulates a slow database query
  }

  if (sku === 'broken-item') {
    logger.error({ sku }, 'inventory database unavailable');
    return res.status(500).json({ success: false, message: 'Inventory backend failure' });
  }

  if (!(sku in STOCK)) {
    logger.warn({ sku }, 'unknown sku');
    return res.status(404).json({ success: false, message: 'Unknown SKU' });
  }

  res.json({ success: true, data: { sku, stock: STOCK[sku] } });
});

const PORT = process.env.PORT || 6003;
app.listen(PORT, () => logger.info({ port: PORT }, 'inventory listening'));