// api/criar-checkout.js — Vercel Serverless Function
// Proxy para o backend Railway contornando o Host allowlist

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Metodo nao permitido' });
  }

  try {
    var Stripe = require('stripe');
    var stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    var data   = req.body;

    if (!data || !data.plano || !data.email) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    var PRICE_IDS = {
      preservador: process.env.STRIPE_PRICE_PRESERVADOR,
      guardiao:    process.env.STRIPE_PRICE_GUARDIAO,
      patrono:     process.env.STRIPE_PRICE_PATRONO
    };

    var priceId = PRICE_IDS[data.plano];

    if (!priceId) {
      var LINKS = {
        preservador: 'https://buy.stripe.com/test_5kQ00c4Ehd7ObJN29f6J201',
        guardiao:    'https://buy.stripe.com/test_8x25kw3AdebS8xBg056J202',
        patrono:     'https://buy.stripe.com/test_9B68wIdaN7Nu3dh7tz6J203'
      };
      return res.json({ url: LINKS[data.plano] || LINKS.preservador });
    }

    var refId = Buffer.from(JSON.stringify(data), 'utf-8').toString('base64');

    var session = await stripe.checkout.sessions.create({
      mode:                'payment',
      customer_email:      data.email,
      client_reference_id: refId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://greendiamont.com/?sucesso=1',
      cancel_url:  'https://greendiamont.com/#pricing',
      metadata: {
        plano:  data.plano,
        nome:   data.nome    || data.empresa || '',
        email:  data.email,
        cpf:    data.cpf     || data.cnpj   || ''
      }
    });

    console.log('[Vercel] Checkout criado: ' + session.id + ' | ' + data.plano);
    return res.json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error('[Vercel] Erro:', err.message);
    return res.status(500).json({ erro: err.message });
  }
}
