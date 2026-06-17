const asyncHandler = require('express-async-handler');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc  Predict stock ruptures
// @route GET /api/analytics/rupture-forecast
exports.ruptureForecast = asyncHandler(async (req, res) => {
  const { days = 15 } = req.query;
  const from = new Date(); from.setDate(from.getDate() - 30);

  // Average daily consumption per product
  const consumption = await Sale.aggregate([
    { $match: { createdAt: { $gte: from }, status: 'complété' } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', totalQty: { $sum: '$items.quantity' } } },
  ]);

  const forecasts = [];
  for (const c of consumption) {
    const product = await Product.findById(c._id).select('name activeIngredient stock minStock');
    if (!product) continue;
    const avgDaily = c.totalQty / 30;
    const daysLeft = avgDaily > 0 ? Math.floor(product.stock / avgDaily) : 999;
    const risk = daysLeft === 0 ? 'critique' : daysLeft <= 7 ? 'élevé' : daysLeft <= parseInt(days) ? 'moyen' : 'faible';

    if (risk !== 'faible') {
      forecasts.push({
        product: { _id: product._id, name: product.name, activeIngredient: product.activeIngredient },
        stock: product.stock, avgDailyConsumption: +avgDaily.toFixed(2),
        daysLeft, risk,
        suggestedOrder: Math.ceil(avgDaily * 30),
      });
    }
  }

  forecasts.sort((a, b) => a.daysLeft - b.daysLeft);
  res.json({ success: true, data: forecasts });
});

// @desc  AI: Claude suggestions
// @route POST /api/analytics/ai-suggest
exports.aiSuggest = asyncHandler(async (req, res) => {
  const { context, type } = req.body;

  if (!process.env.CLAUDE_API_KEY) {
    return res.json({ success: true, data: { suggestion: 'API Claude non configurée. Configurez CLAUDE_API_KEY dans .env' } });
  }

  let prompt = '';
  if (type === 'generic') {
    prompt = `En tant qu'assistant pharmaceutique expert, pour le médicament "${context.productName}" (DCI: ${context.dci}), 
    propose 3 alternatives génériques disponibles en Algérie avec leur DCI, dosage et économie estimée. 
    Réponds en JSON avec: [{name, dci, dosage, savings_percent, notes}]`;
  } else if (type === 'reorder') {
    prompt = `Analyse ces données de consommation pharmaceutique et génère un bon de commande optimisé:
    ${JSON.stringify(context)}
    Réponds en JSON avec: {analysis, recommendations: [{product, quantity, reason}], totalEstimated}`;
  } else if (type === 'anomaly') {
    prompt = `Détecte les anomalies dans ces données de vente pharmaceutique:
    ${JSON.stringify(context)}
    Réponds en JSON avec: {anomalies: [{type, description, severity, recommendation}]}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
    } catch { parsed = { raw: text }; }

    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur API Claude: ' + err.message });
  }
});

// @desc  Detect billing anomalies
// @route GET /api/analytics/anomalies
exports.detectAnomalies = asyncHandler(async (req, res) => {
  const from = new Date(); from.setDate(from.getDate() - 30);

  const sales = await Sale.find({ createdAt: { $gte: from }, status: 'complété' })
    .populate('items.product', 'retailPrice name');

  const anomalies = [];

  // Check price anomalies
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!item.product) continue;
      const expectedPrice = item.product.retailPrice;
      const actualPrice = item.unitPrice;
      const deviation = Math.abs((actualPrice - expectedPrice) / expectedPrice * 100);

      if (deviation > 20) {
        anomalies.push({
          type: 'anomalie_prix', severity: deviation > 50 ? 'critique' : 'urgent',
          saleNumber: sale.saleNumber,
          description: `${item.product.name}: Prix vendu ${actualPrice} CDF vs attendu ${expectedPrice} CDF (écart ${deviation.toFixed(1)}%)`,
          date: sale.createdAt,
        });
      }
    }
  }

  // Check duplicate sales (same client, same items, same day)
  const salesByClient = {};
  for (const sale of sales) {
    if (!sale.client) continue;
    const key = sale.client.toString();
    const dateKey = sale.createdAt.toISOString().split('T')[0];
    const fullKey = `${key}_${dateKey}`;
    if (!salesByClient[fullKey]) salesByClient[fullKey] = [];
    salesByClient[fullKey].push(sale);
  }

  for (const [, group] of Object.entries(salesByClient)) {
    if (group.length > 3) {
      anomalies.push({
        type: 'doublon_suspecté', severity: 'urgent',
        description: `Client avec ${group.length} ventes le même jour (${group[0].createdAt.toISOString().split('T')[0]})`,
        date: group[0].createdAt,
      });
    }
  }

  res.json({ success: true, data: anomalies });
});

// @desc  Consumption trends
// @route GET /api/analytics/trends
exports.getConsumptionTrends = asyncHandler(async (req, res) => {
  const { weeks = 8 } = req.query;
  const from = new Date(); from.setDate(from.getDate() - parseInt(weeks) * 7);

  const data = await Sale.aggregate([
    { $match: { createdAt: { $gte: from }, status: 'complété' } },
    { $unwind: '$items' },
    { $group: {
      _id: {
        week: { $isoWeek: '$createdAt' },
        year: { $isoWeekYear: '$createdAt' },
        product: '$items.product',
        name: '$items.name',
      },
      qty: { $sum: '$items.quantity' },
      revenue: { $sum: '$items.totalPrice' },
    }},
    { $sort: { '_id.year': 1, '_id.week': 1 } },
  ]);

  res.json({ success: true, data });
});
