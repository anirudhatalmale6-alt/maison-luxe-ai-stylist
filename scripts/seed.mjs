import { readFileSync } from "fs";
import { ChromaClient } from "chromadb";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// ── 1. Manually load .env.local ──
const envPath = new URL("../.env.local", import.meta.url).pathname
  .replace(/^\/([A-Z]:)/, "$1");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

const CHROMADB_URL = process.env.CHROMADB_URL || "http://127.0.0.1:8000";
const COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || "shopping-catalog";
const TITAN_MODEL = process.env.TITAN_EMBEDDING_MODEL || "amazon.titan-embed-text-v2:0";

// ── 2. Products (must match mock-database exports) ──
const products = [
  // Women's Ready-to-Wear (8)
  { id: "w_silk_off_shoulder", name: "Ivory Off-Shoulder Silk Dress", price: 890, category: "women", description: "A fluid off-shoulder dress cut from sand-washed silk with a softly gathered bodice. Effortless for summer weddings and resort evenings.", tags: ["dress","silk","ivory","wedding","summer","evening","occasion","elegant","feminine"], stockCount: 24 },
  { id: "w_scarlet_gown", name: "Scarlet Draped Evening Gown", price: 2450, category: "women", description: "A floor-sweeping column gown in scarlet crepe with a bias-cut skirt that moves beautifully. A true red-carpet statement.", tags: ["gown","evening","red","scarlet","black tie","gala","formal","occasion","floor length","statement"], stockCount: 8 },
  { id: "w_pinstripe_trousers", name: "Tailored Pinstripe Wide-Leg Trousers", price: 620, category: "women", description: "High-waisted wide-leg trousers in Italian pinstripe wool. Sharp tailoring for the office or dressed down with a knit.", tags: ["trousers","tailoring","pinstripe","wide leg","office","workwear","wool","business","power dressing"], stockCount: 30 },
  { id: "w_graphic_tee", name: "Cotton Graphic Tee", price: 180, category: "women", description: "An easy boyfriend-fit tee in heavyweight organic cotton with a hand-drawn graphic. Elevated everyday essential.", tags: ["t-shirt","tee","cotton","casual","everyday","graphic","streetwear","relaxed"], stockCount: 120 },
  { id: "w_high_rise_jeans", name: "High-Rise Selvedge Jeans", price: 320, category: "women", description: "A high-rise straight-leg jean in Japanese selvedge denim with a light wash and clean finish. Ages beautifully with wear.", tags: ["jeans","denim","selvedge","high rise","casual","everyday","straight leg","light wash"], stockCount: 85 },
  { id: "w_silk_cargo", name: "Blush Silk Cargo Trousers", price: 540, category: "women", description: "Utility reimagined in liquid blush silk. Cuffed cargo trousers with a soft drape — a modern take on off-duty dressing.", tags: ["trousers","cargo","silk","blush","pink","casual","utility","modern","off-duty"], stockCount: 40 },
  { id: "w_cashmere_poncho", name: "Hand-Knit Cashmere Poncho", price: 760, category: "women", description: "A featherweight cashmere poncho with fringed hem, hand-loomed in a natural undyed cream. Wraps like a warm heirloom.", tags: ["knitwear","poncho","cashmere","cream","cozy","layering","autumn","winter","wrap"], stockCount: 22 },
  { id: "w_broderie_dress", name: "Broderie Anglaise Summer Dress", price: 480, category: "women", description: "A breezy midi in cotton broderie anglaise with delicate eyelet detailing. Romantic and endlessly wearable through the season.", tags: ["dress","broderie","cotton","summer","white","midi","day dress","romantic","eyelet"], stockCount: 36 },
  // Men's Ready-to-Wear (4)
  { id: "m_pima_tee", name: "Pima Cotton Essential Tee", price: 150, category: "men", description: "The perfect white tee in long-staple Peruvian pima cotton with a clean crew neck and considered weight. Buy it in threes.", tags: ["t-shirt","tee","white","cotton","essential","everyday","crew neck","basics","menswear"], stockCount: 200 },
  { id: "m_merino_crew", name: "Garment-Dyed Merino Crewneck", price: 290, category: "men", description: "A fine-gauge merino crewneck, garment-dyed for depth of colour. Lightweight enough to layer year round.", tags: ["knitwear","sweater","merino","crewneck","layering","menswear","smart casual","wool"], stockCount: 90 },
  { id: "m_oxford_shirt", name: "Italian Cotton Oxford Shirt", price: 320, category: "men", description: "A button-down oxford woven in Italy from soft-brushed cotton. A tailored wardrobe cornerstone that dresses up or down.", tags: ["shirt","oxford","cotton","office","workwear","menswear","button down","tailored","business"], stockCount: 110 },
  { id: "m_tapered_jeans", name: "Slim Tapered Jeans", price: 290, category: "men", description: "A slim tapered jean in mid-grey stretch denim with a comfortable rise. Pairs effortlessly with a tee and boots.", tags: ["jeans","denim","grey","slim","tapered","casual","everyday","menswear"], stockCount: 95 },
  // Coats & Outerwear (6)
  { id: "o_burgundy_coat", name: "Burgundy Wool Wrap Coat", price: 1290, category: "outerwear", description: "A double-faced wool wrap coat in deep burgundy with a tie belt and shawl collar. Rich, warm and quietly commanding.", tags: ["coat","wool","burgundy","wrap","winter","outerwear","belted","tailored","warm"], stockCount: 18 },
  { id: "o_cerulean_trench", name: "Cerulean Belted Trench Coat", price: 1450, category: "outerwear", description: "A modern trench in water-resistant cerulean cotton gabardine with storm flaps and a cinched waist. City-ready for any forecast.", tags: ["coat","trench","blue","cerulean","rain","outerwear","belted","spring","classic"], stockCount: 15 },
  { id: "o_black_ruffle_coat", name: "Black Ruffle-Front Wool Coat", price: 1180, category: "outerwear", description: "A dramatic single-breasted coat in black melton wool with a cascading ruffle placket. Architectural and elegant.", tags: ["coat","wool","black","ruffle","winter","outerwear","statement","elegant","dramatic"], stockCount: 12 },
  { id: "o_leather_biker", name: "Cognac Leather Biker Jacket", price: 1650, category: "outerwear", description: "A supple lambskin biker jacket in cognac with asymmetric zip and quilted shoulders. Softens and improves with every wear.", tags: ["jacket","leather","biker","cognac","brown","outerwear","moto","menswear","womenswear","edgy"], stockCount: 20 },
  { id: "o_rose_overcoat", name: "Rose Double-Breasted Overcoat", price: 1350, category: "outerwear", description: "A tailored double-breasted overcoat in dusty rose wool-cashmere. Polished layering with a soft, feminine palette.", tags: ["coat","overcoat","rose","pink","wool","cashmere","outerwear","tailored","double breasted","winter"], stockCount: 16 },
  { id: "o_utility_jacket", name: "Olive Cotton Utility Jacket", price: 690, category: "outerwear", description: "A relaxed field jacket in washed olive cotton with oversized patch pockets. Rugged in spirit, refined in cut.", tags: ["jacket","utility","field","olive","green","cotton","outerwear","casual","everyday","layering"], stockCount: 45 },
  // Shoes (4)
  { id: "s_floral_heels", name: "Floral-Print Stiletto Pumps", price: 720, category: "shoes", description: "Pointed stiletto pumps in a painterly floral jacquard with a 90mm heel. A conversation-starting finish to any look.", tags: ["shoes","heels","pumps","stiletto","floral","occasion","evening","statement","womenswear"], stockCount: 28 },
  { id: "s_navy_pumps", name: "Navy Suede Point-Toe Pumps", price: 650, category: "shoes", description: "Elegant point-toe pumps in soft navy suede with a slender 75mm heel. The versatile heel that finishes tailoring and dresses alike.", tags: ["shoes","heels","pumps","navy","suede","office","occasion","classic","womenswear"], stockCount: 34 },
  { id: "s_leather_derby", name: "Hand-Welted Leather Derby", price: 780, category: "shoes", description: "A Goodyear-welted derby in burnished tan calf leather. Built to be resoled and worn for a lifetime.", tags: ["shoes","derby","leather","tan","brown","menswear","formal","office","classic","handmade"], stockCount: 22 },
  { id: "s_runner_sneakers", name: "Runner Colourblock Sneakers", price: 590, category: "shoes", description: "Low-top runners in premium colourblock leather and suede on a lightweight sole. Luxury comfort for off-duty days.", tags: ["shoes","sneakers","trainers","runner","colourblock","casual","everyday","unisex","streetwear"], stockCount: 60 },
  // Handbags (3)
  { id: "b_red_top_handle", name: "Structured Top-Handle Bag in Scarlet", price: 1980, category: "bags", description: "A structured top-handle bag in scarlet box calf with polished hardware and a detachable strap. An instant heirloom.", tags: ["bag","handbag","top handle","red","scarlet","leather","structured","occasion","statement"], stockCount: 14 },
  { id: "b_floral_top_handle", name: "Floral-Print Top-Handle Bag", price: 1750, category: "bags", description: "A romantic top-handle bag in hand-illustrated floral canvas trimmed with blush leather. Garden-party polish.", tags: ["bag","handbag","top handle","floral","print","blush","occasion","spring","statement"], stockCount: 11 },
  { id: "b_teal_satchel", name: "Teal Leather Mini Satchel", price: 1420, category: "bags", description: "A compact structured satchel in jewel-toned teal leather with gold clasp. Just enough room for the essentials.", tags: ["bag","handbag","satchel","mini","teal","green","leather","crossbody","everyday"], stockCount: 17 },
  // Accessories & Jewellery (6)
  { id: "a_pearl_necklace", name: "Freshwater Pearl Strand Necklace", price: 980, category: "accessories", description: "A hand-knotted strand of lustrous freshwater pearls finished with an 18k gold clasp. Timeless, refined, forever relevant.", tags: ["jewellery","necklace","pearl","gold","occasion","evening","classic","gift","elegant"], stockCount: 20 },
  { id: "a_gold_pendant", name: "18K Gold Pendant Necklace", price: 640, category: "accessories", description: "A delicate solid-gold pendant on a fine chain — the kind of quiet everyday piece you never take off.", tags: ["jewellery","necklace","pendant","gold","everyday","minimal","delicate","gift","layering"], stockCount: 45 },
  { id: "a_round_sunglasses", name: "Round Metal Sunglasses", price: 380, category: "accessories", description: "Slim round sunglasses in gold-tone metal with gradient green lenses and full UV protection. An instant polish to any outfit.", tags: ["accessories","sunglasses","eyewear","round","gold","summer","unisex","gift","everyday"], stockCount: 70 },
  { id: "a_leather_watch", name: "Minimalist Leather-Strap Watch", price: 520, category: "accessories", description: "A pared-back automatic watch with a clean white dial and supple tan leather strap. Understated horology done right.", tags: ["accessories","watch","leather","minimalist","tan","menswear","unisex","gift","everyday"], stockCount: 38 },
  { id: "a_cashmere_scarf", name: "Ribbed Cashmere Scarf & Beanie Set", price: 340, category: "accessories", description: "A cosy ribbed cashmere scarf and beanie set in heathered grey. The finishing touch for cold-weather layering.", tags: ["accessories","scarf","beanie","cashmere","grey","winter","warm","gift","layering","cosy"], stockCount: 55 },
  { id: "a_check_scarf", name: "Check Wool Scarf", price: 290, category: "accessories", description: "An oversized brushed-wool scarf in a heritage check. Wraps twice and instantly warms up tailoring and outerwear.", tags: ["accessories","scarf","wool","check","plaid","winter","heritage","gift","menswear","layering"], stockCount: 48 },
];

// ── 3. Embedding via Amazon Titan ──
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function embed(text) {
  const command = new InvokeModelCommand({
    modelId: TITAN_MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      inputText: text,
      dimensions: 1024,
      normalize: true,
    }),
  });
  const response = await bedrockClient.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding;
}

// ── 4. Main seed flow ──
async function main() {
  console.log("Connecting to ChromaDB at", CHROMADB_URL);
  const chroma = new ChromaClient({ path: CHROMADB_URL });

  const collection = await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { description: "Maison Luxe fashion catalog embeddings" },
  });

  const total = products.length;
  console.log(`\nIngesting ${total} products...\n`);

  const ids = [];
  const documents = [];
  const embeddings = [];
  const metadatas = [];

  for (let i = 0; i < total; i++) {
    const p = products[i];
    const doc = `${p.name}. ${p.description}. Category: ${p.category}. Price: $${p.price}. Tags: ${p.tags.join(", ")}`;
    const emb = await embed(doc);

    ids.push(p.id);
    documents.push(doc);
    embeddings.push(emb);
    metadatas.push({
      id: p.id,
      title: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      stockCount: p.stockCount,
      features: p.tags.join(", "),
      type: p.category,
    });

    console.log(`  [${i + 1}/${total}] ${p.name} (${p.category})`);
  }

  await collection.upsert({ ids, documents, embeddings, metadatas });
  console.log(`\nDone. Upserted ${total} products into "${COLLECTION_NAME}".`);

  // ── 5. Verification query ──
  console.log('\nVerifying with query: "a dress for a summer wedding"');
  const qEmb = await embed("a dress for a summer wedding");
  const results = await collection.query({
    queryEmbeddings: [qEmb],
    nResults: 3,
    include: ["metadatas", "documents", "distances"],
  });

  const titles = results.metadatas?.[0]?.map((m) => m.title) ?? [];
  console.log("Top 3 results:", titles);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
