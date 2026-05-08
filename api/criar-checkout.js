// api/criar-checkout.js — Vercel Serverless Function
// CORRIGIDO: client_reference_id comprimido para max 200 chars

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Metodo nao permitido' });

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

    // Comprimir dados para caber em 200 chars
    // Usar formato compacto em vez de JSON completo
    var compact = {
      p:  data.plano,
      e:  data.email,
      n:  (data.nome     || data.empresa || '').substring(0, 40),
      c:  (data.cpf      || data.cnpj    || '').substring(0, 20),
      en: (data.endereco || '').substring(0, 30),
      ci: (data.cidade   || '').substring(0, 20),
      m:  data.modalidade || 'individual',
      ns: data.nomes ? data.nomes.map(function(n){ return (n||'').substring(0,20); }) : []
    };

    var refId = Buffer.from(JSON.stringify(compact), 'utf-8').toString('base64');

    // Se ainda passar de 500 chars, truncar nomes
    if (refId.length > 500) {
      compact.ns = compact.ns.slice(0, 3);
      refId = Buffer.from(JSON.stringify(compact), 'utf-8').toString('base64');
    }

    var session = await stripe.checkout.sessions.create({
      mode:                'payment',
      customer_email:      data.email,
      client_reference_id: refId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://greendiamont.com/?sucesso=1',
      cancel_url:  'https://greendiamont.com/#pricing',
      metadata: {
        plano:      data.plano,
        nome:       (data.nome || data.empresa || '').substring(0, 40),
        email:      data.email.substring(0, 40),
        cpf:        (data.cpf || data.cnpj || '').substring(0, 20),
        modalidade: data.modalidade || 'individual',
        endereco:   (data.endereco || '').substring(0, 40),
        cidade:     (data.cidade   || '').substring(0, 40)
      }
    });

    console.log('[Vercel] Checkout: ' + session.id + ' | ' + data.plano + ' | refId: ' + refId.length + ' chars');
    return res.json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error('[Vercel] Erro:', err.message);
    return res.status(500).json({ erro: err.message });
  }
}
