/**
 * One-time script to seed the Pinecone "codes" index with 75 FSC group vectors.
 *
 * Each group is embedded as: "Group {prefix}: {name}. Related: {keywords}"
 * using OpenAI text-embedding-3-small (1536 dimensions).
 *
 * Usage: pnpm tsx scripts/seed-pinecone.ts
 *
 * Requires PINECONE_API_KEY and OPENAI_API_KEY in .env.local
 */

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const PINECONE_HOST = "https://codes-xxf6i2m.svc.aped-4627-b74a.pinecone.io";

// Inline FSC_GROUPS to avoid @/ alias issues with tsx
const FSC_GROUPS: Record<string, { name: string; keywords: string[] }> = {
  "10": { name: "Weapons", keywords: ["weapons", "guns", "firearms", "armament", "ordnance", "military", "defense", "munitions"] },
  "12": { name: "Fire Control Equipment", keywords: ["fire control", "targeting", "aiming", "weapons systems", "ballistic", "gun sights"] },
  "14": { name: "Guided Missiles", keywords: ["missiles", "guided missile", "rocket", "warhead", "guidance systems", "defense", "munitions"] },
  "15": { name: "Aircraft & Airframe Components", keywords: ["aircraft", "airframe", "aviation", "airplane", "fuselage", "wing"] },
  "16": { name: "Aircraft Components & Accessories", keywords: ["aircraft", "aviation", "helicopter", "landing gear", "propeller", "rotor", "aerospace"] },
  "17": { name: "Aircraft Launch & Recovery Equipment", keywords: ["aircraft", "carrier", "catapult", "arresting", "ground support", "airfield"] },
  "18": { name: "Space Vehicles", keywords: ["spacecraft", "satellite", "space", "aerospace", "orbital", "rocket", "space launch"] },
  "20": { name: "Ship & Marine Equipment", keywords: ["marine", "ship", "boat", "vessel", "naval", "maritime", "nautical", "sea"] },
  "22": { name: "Railway Equipment", keywords: ["railroad", "railway", "train", "locomotive", "rail", "rolling stock", "track"] },
  "23": { name: "Motor Vehicles", keywords: ["vehicles", "trucks", "cars", "automotive", "motor vehicle", "transportation"] },
  "24": { name: "Tractors", keywords: ["tractors", "farm equipment", "agricultural", "earthmoving", "crawler"] },
  "25": { name: "Vehicle Components", keywords: ["vehicle parts", "automotive", "brakes", "transmission", "chassis", "drivetrain"] },
  "26": { name: "Tires & Tubes", keywords: ["tires", "tubes", "pneumatic", "aircraft tires"] },
  "28": { name: "Engines & Turbines", keywords: ["engines", "turbines", "diesel", "gas turbine", "jet engine", "propulsion", "power plants"] },
  "29": { name: "Engine Accessories", keywords: ["engine", "fuel systems", "ignition", "cooling", "filters", "turbocharger"] },
  "30": { name: "Mechanical Power Transmission", keywords: ["gears", "bearings", "transmission", "belts", "pulleys", "couplings", "drivetrain"] },
  "31": { name: "Bearings", keywords: ["bearings", "ball bearings", "roller bearings", "bushings", "pillow blocks"] },
  "32": { name: "Woodworking Machinery", keywords: ["woodworking", "sawmill", "lumber", "timber", "wood", "carpentry"] },
  "34": { name: "Metalworking Machinery", keywords: ["metalworking", "machining", "CNC", "welding", "lathe", "milling", "fabrication", "machine tools"] },
  "35": { name: "Service & Trade Equipment", keywords: ["laundry", "sewing", "packaging", "vending", "commercial equipment"] },
  "36": { name: "Special Industry Machinery", keywords: ["food processing", "printing", "plastics", "pharmaceutical", "semiconductor", "manufacturing", "foundry"] },
  "37": { name: "Agricultural Machinery", keywords: ["agricultural", "farming", "harvesting", "gardening", "livestock", "crop", "soil"] },
  "38": { name: "Construction & Mining Equipment", keywords: ["construction", "mining", "excavation", "crane", "earthmoving", "heavy equipment", "petroleum"] },
  "39": { name: "Materials Handling Equipment", keywords: ["material handling", "conveyor", "forklift", "warehouse", "hoist", "winch", "elevator"] },
  "40": { name: "Rope, Cable, Chain & Fittings", keywords: ["rope", "cable", "chain", "wire rope", "cordage", "rigging"] },
  "41": { name: "Refrigeration & Air Conditioning", keywords: ["refrigeration", "HVAC", "air conditioning", "cooling", "freezer", "ventilation"] },
  "42": { name: "Fire Fighting & Safety Equipment", keywords: ["firefighting", "safety", "rescue", "diving", "decontamination", "hazmat", "recycling"] },
  "43": { name: "Pumps & Compressors", keywords: ["pumps", "compressors", "vacuum", "hydraulic", "pneumatic"] },
  "44": { name: "Furnaces & Boilers", keywords: ["boilers", "furnaces", "heat exchangers", "dryers", "ovens", "kilns", "steam"] },
  "45": { name: "Plumbing & Heating Equipment", keywords: ["plumbing", "heating", "sanitation", "water heater", "fixtures"] },
  "46": { name: "Water Purification & Sewage", keywords: ["water purification", "water treatment", "sewage", "wastewater", "filtration", "desalination"] },
  "47": { name: "Pipe & Tubing", keywords: ["pipe", "tubing", "hose", "fittings", "conduit", "plumbing"] },
  "48": { name: "Valves", keywords: ["valves", "ball valves", "gate valves", "check valves", "control valves", "actuators"] },
  "49": { name: "Maintenance & Repair Shop Equipment", keywords: ["maintenance", "repair", "shop equipment", "MRO", "servicing", "overhaul"] },
  "51": { name: "Hand Tools", keywords: ["hand tools", "wrenches", "hammers", "power tools", "drills", "saws", "cutting"] },
  "52": { name: "Measuring Tools", keywords: ["measuring", "gauges", "calipers", "precision", "inspection", "calibration"] },
  "53": { name: "Hardware & Abrasives", keywords: ["fasteners", "screws", "bolts", "nuts", "rivets", "gaskets", "springs", "hardware", "abrasives"] },
  "54": { name: "Prefabricated Structures", keywords: ["prefabricated", "modular", "shelters", "bridges", "tanks", "scaffolding", "towers"] },
  "55": { name: "Lumber & Wood Products", keywords: ["lumber", "wood", "timber", "plywood", "millwork"] },
  "56": { name: "Construction Materials", keywords: ["construction materials", "building materials", "roofing", "insulation", "brick", "concrete", "fencing"] },
  "58": { name: "Communication Equipment", keywords: ["communication", "radio", "telecommunications", "encryption", "radar", "sonar", "antenna", "electronic warfare"] },
  "59": { name: "Electrical & Electronic Components", keywords: ["electrical", "electronic", "resistors", "capacitors", "connectors", "circuit boards", "semiconductors", "PCB"] },
  "60": { name: "Fiber Optic Components", keywords: ["fiber optic", "optical", "photonic", "fiber cable", "optical connectors"] },
  "61": { name: "Electric Power Generation & Distribution", keywords: ["generators", "motors", "batteries", "solar", "power", "transformers", "electrical power", "wire", "cable"] },
  "62": { name: "Lighting Equipment", keywords: ["lighting", "lamps", "bulbs", "LED", "fixtures", "flashlights"] },
  "63": { name: "Alarm & Signal Systems", keywords: ["alarms", "signals", "security", "traffic signals", "warning systems", "detection"] },
  "65": { name: "Medical & Dental Equipment", keywords: ["medical", "surgical", "dental", "pharmaceutical", "hospital", "healthcare", "diagnostic", "X-ray"] },
  "66": { name: "Instruments & Lab Equipment", keywords: ["instruments", "laboratory", "test equipment", "measurement", "gauges", "sensors", "analytical"] },
  "67": { name: "Photographic Equipment", keywords: ["cameras", "photography", "film", "projectors", "photo", "imaging"] },
  "68": { name: "Chemicals", keywords: ["chemicals", "reagents", "dyes", "gases", "pesticides", "industrial chemicals"] },
  "69": { name: "Training Aids & Devices", keywords: ["training", "simulators", "education", "training devices"] },
  "70": { name: "ADP Equipment & Software", keywords: ["computers", "software", "IT", "data processing", "servers", "networking", "hardware", "ADP"] },
  "71": { name: "Furniture", keywords: ["furniture", "office furniture", "desks", "chairs", "cabinets", "shelving"] },
  "72": { name: "Furnishings & Household Equipment", keywords: ["furnishings", "carpet", "draperies", "household", "floor coverings"] },
  "73": { name: "Food Preparation Equipment", keywords: ["kitchen", "cooking", "food service", "cutlery", "tableware", "baking"] },
  "74": { name: "Office Machines", keywords: ["office machines", "typewriters", "copiers", "calculators", "filing"] },
  "75": { name: "Office Supplies", keywords: ["office supplies", "stationery", "paper", "forms", "pens"] },
  "76": { name: "Books & Maps", keywords: ["books", "publications", "maps", "charts", "manuals", "drawings", "specifications"] },
  "77": { name: "Musical Instruments & Entertainment", keywords: ["musical instruments", "music", "TV", "radio", "entertainment", "records"] },
  "78": { name: "Recreation & Athletic Equipment", keywords: ["sports", "recreation", "gym", "fitness", "athletic", "games", "toys"] },
  "79": { name: "Cleaning Equipment & Supplies", keywords: ["cleaning", "janitorial", "vacuums", "brooms", "polishing", "detergents"] },
  "80": { name: "Paints & Adhesives", keywords: ["paints", "coatings", "varnish", "adhesives", "sealants", "primers"] },
  "81": { name: "Containers & Packaging", keywords: ["containers", "packaging", "boxes", "bottles", "drums", "shipping"] },
  "83": { name: "Textiles & Leather", keywords: ["textiles", "fabric", "leather", "yarn", "canvas", "tents", "flags"] },
  "84": { name: "Clothing & Footwear", keywords: ["clothing", "apparel", "footwear", "boots", "uniforms", "body armor", "protective clothing"] },
  "85": { name: "Toiletries", keywords: ["toiletries", "soap", "cosmetics", "personal care", "hygiene"] },
  "87": { name: "Agricultural Supplies", keywords: ["fertilizers", "seeds", "feed", "agricultural", "animal feed", "nursery"] },
  "88": { name: "Live Animals & Food", keywords: ["livestock", "animals", "food", "meat", "dairy", "produce", "beverages", "rations"] },
  "89": { name: "Food Products", keywords: ["food", "meat", "dairy", "produce", "bakery", "beverages", "coffee", "rations", "MRE"] },
  "91": { name: "Fuels & Lubricants", keywords: ["fuel", "petroleum", "diesel", "lubricants", "oil", "grease", "jet fuel"] },
  "93": { name: "Nonmetallic Fabricated Materials", keywords: ["paper", "rubber", "plastics", "glass", "ceramics", "composite", "refractories"] },
  "94": { name: "Nonmetallic Crude Materials", keywords: ["fibers", "raw materials", "plant materials", "animal products", "scrap"] },
  "95": { name: "Metal Bars, Sheets & Shapes", keywords: ["steel", "aluminum", "metal", "sheet metal", "structural steel", "copper", "wire"] },
  "96": { name: "Ores & Metals", keywords: ["ores", "minerals", "metals", "steel", "iron", "copper", "aluminum", "precious metals", "gold", "silver"] },
  "99": { name: "Miscellaneous", keywords: ["signs", "jewelry", "collectibles", "religious", "miscellaneous"] },
};
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1024;

// Load env vars from .env.local (tsx doesn't do this automatically)
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const value = trimmed.slice(eqIdx + 1);
  process.env[key] = value;
}

function buildGroupText(prefix: string, group: { name: string; keywords: string[] }): string {
  return `Group ${prefix}: ${group.name}. Related: ${group.keywords.join(", ")}`;
}

async function main() {
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!pineconeApiKey) {
    console.error("PINECONE_API_KEY is not set");
    process.exit(1);
  }
  if (!openaiApiKey) {
    console.error("OPENAI_API_KEY is not set");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const pc = new Pinecone({ apiKey: pineconeApiKey });
  const index = pc.index("codes", PINECONE_HOST);

  const entries = Object.entries(FSC_GROUPS);
  console.log(`Embedding ${entries.length} FSC groups...`);

  // Build texts for all groups
  const texts = entries.map(([prefix, group]) => buildGroupText(prefix, group));

  // Batch embed all at once
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  // Build Pinecone vectors
  const vectors = entries.map(([prefix], i) => ({
    id: prefix,
    values: embeddingResponse.data[i].embedding,
    metadata: {
      name: FSC_GROUPS[prefix].name,
      keywords: FSC_GROUPS[prefix].keywords.join(", "),
    },
  }));

  // Upsert in batches of 100 (well within limits for 75 vectors)
  console.log(`Upserting ${vectors.length} vectors to Pinecone...`);
  await index.upsert({ records: vectors });

  console.log(`Done! Seeded ${vectors.length} group vectors into "codes" index.`);
}

main();
