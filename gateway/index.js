const express = require('express');
const axios = require('axios');
const logger = require('pino')();

const app = express();
app.use(express.json());

const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:6002';

app.post('/api/orders', async (req, res) => {
  logger.info({ sku: req.body?.sku }, 'gateway received order request');

  try {
    const response = await axios.post(`${ORDERS_URL}/orders`, req.body, {
      timeout: 5000,
      validateStatus: () => true, // pass 4xx/5xx through instead of throwing
    });

    logger.info({ status: response.status }, 'orders service responded');
    return res.status(response.status).json(response.data);
  } catch (err) {
    logger.error({ error: err.message }, 'orders service unreachable');
    return res.status(502).json({ success: false, message: 'Upstream service unavailable' });
  }
});

const PORT = process.env.PORT || 6001;
app.listen(PORT, () => logger.info({ port: PORT }, 'gateway listening'));