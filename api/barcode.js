export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing barcode' });

  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_fr,nutriments,brands`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TatankaNutrition/1.0 (https://tatakanutrition.vercel.app)',
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
