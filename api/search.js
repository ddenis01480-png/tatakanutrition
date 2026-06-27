export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const q = req.query.q;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&page_size=12&fields=product_name,product_name_fr,nutriments&sort_by=unique_scans_n&cc=fr&lc=fr`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('OFF error ' + response.status);
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    // Fallback cgi
    try {
      const url2 = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&lc=fr&fields=product_name,product_name_fr,nutriments`;
      const r2 = await fetch(url2);
      const d2 = await r2.json();
      res.status(200).json(d2);
    } catch (e2) {
      res.status(502).json({ products: [], error: 'Unavailable' });
    }
  }
}
