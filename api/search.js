module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.status(400).json({ products: [] });

  const SUPABASE_URL = 'https://ogkrgsnnoebsvbgsngvm.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_KvM3k3gwBAArOFyUEd1a7A_oY0RTIom';

  try {
    const url = `${SUPABASE_URL}/rest/v1/aliments?name_fr=ilike.*${encodeURIComponent(q)}*&limit=10&select=name_fr,kcal,prot,carbs,fat`;
    const r = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!r.ok) throw new Error('Supabase error ' + r.status);
    const data = await r.json();

    // Formater comme OFF pour que l'app ne change pas
    const products = data.map((a, i) => ({
      product_name_fr: a.name_fr,
      nutriments: {
        'energy-kcal_100g': a.kcal,
        proteins_100g: a.prot,
        carbohydrates_100g: a.carbs,
        fat_100g: a.fat
      }
    }));

    return res.status(200).json({ products });
  } catch(e) {
    return res.status(502).json({ products: [] });
  }
};
