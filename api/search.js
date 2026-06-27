module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const q = req.query.q;
  if (!q || q.length < 2) return res.status(400).json({ products: [] });

  // Tentative 1 : Open Food Facts v2
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&page_size=12&fields=product_name,product_name_fr,nutriments&sort_by=unique_scans_n`,
      { headers: { 'User-Agent': 'TatakaNutrition/1.0' }, signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const data = await r.json();
      if ((data.products || []).length > 0) return res.status(200).json(data);
    }
  } catch(e) {}

  // Tentative 2 : Open Food Facts cgi
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,product_name_fr,nutriments`,
      { headers: { 'User-Agent': 'TatakaNutrition/1.0' }, signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const data = await r.json();
      if ((data.products || []).length > 0) return res.status(200).json(data);
    }
  } catch(e) {}

  // Tentative 3 : Open Food Facts France
  try {
    const r = await fetch(
      `https://fr.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,product_name_fr,nutriments`,
      { headers: { 'User-Agent': 'TatakaNutrition/1.0' }, signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const data = await r.json();
      return res.status(200).json(data);
    }
  } catch(e) {}

  return res.status(502).json({ products: [] });
};
