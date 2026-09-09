const FIELDS = 'product_name,product_name_fr,nutriments,brands';

async function lookup(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TatankaNutrition/1.0 (https://tatakanutrition.vercel.app)',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (data && data.status === 1 && data.product) return data;
  return null;
}

// Variantes de code-barres à essayer : le scanner peut lire un code en
// UPC-A (12 chiffres) alors qu'OpenFoodFacts l'indexe presque toujours en
// EAN-13 (13 chiffres, avec un zéro ajouté devant) — et inversement pour
// certains anciens produits EAN-13 enregistrés sans le zéro. C'est la cause
// la plus fréquente de "produit non trouvé" alors qu'il existe bien dans la base.
function barcodeVariants(code) {
  const variants = [code];
  if (code.length === 12) variants.push('0' + code);
  if (code.length === 13 && code[0] === '0') variants.push(code.slice(1));
  return [...new Set(variants)];
}

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing barcode' });

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    for (const variant of barcodeVariants(String(code))) {
      const data = await lookup(variant);
      if (data) return res.status(200).json(data);
    }
    // Aucune variante trouvée
    res.status(200).json({ status: 0, product: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
