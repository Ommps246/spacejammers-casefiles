// terra.glb references two textures as external Windows paths (..\Terra.fbm\*.tga) that were never
// shipped, so they 404 and three.js can't read TGA anyway. This writes a copy with those references
// removed and plain PBR fallbacks on the two affected materials. The original file is not modified.
//
//   node scripts/fix-terra-materials.mjs <in.glb> <out.glb>
import { readFileSync, writeFileSync } from "node:fs";

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

// Colours are sRGB hex; glTF baseColorFactor is linear.
const FALLBACKS = {
  "Main Solar Panels": { hex: "#1b2a4a", metallic: 0.6, roughness: 0.35 }, // solar cells
  "Side Panels": { hex: "#c9a24a", metallic: 0.9, roughness: 0.3 }, // gold insulation foil
};

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/fix-terra-materials.mjs <in.glb> <out.glb>");
  process.exit(1);
}

const { json, bin } = readGlb(readFileSync(input));
const fixed = withFallbackMaterials(json);
writeFileSync(output, writeGlb(fixed, bin));
console.log(`fix-terra-materials: ${Object.keys(FALLBACKS).join(" + ")} -> plain PBR, textures removed`);

function withFallbackMaterials(gltf) {
  const names = new Set(gltf.materials.map((m) => m.name));
  const missing = Object.keys(FALLBACKS).filter((n) => !names.has(n));
  if (missing.length) throw new Error(`terra.glb has no material named ${missing.join(", ")}`);
  const external = (gltf.images ?? []).filter((img) => typeof img.uri === "string");
  if (external.length !== (gltf.images ?? []).length) {
    throw new Error("terra.glb has embedded images; this fix only handles the missing external ones");
  }

  const materials = gltf.materials.map((m) => {
    const fallback = FALLBACKS[m.name];
    if (!fallback) return m;
    return {
      ...m,
      pbrMetallicRoughness: {
        ...omit(m.pbrMetallicRoughness ?? {}, ["baseColorTexture"]),
        baseColorFactor: [...hexToLinear(fallback.hex), 1],
        metallicFactor: fallback.metallic,
        roughnessFactor: fallback.roughness,
      },
    };
  });
  const stillTextured = materials.filter((m) => JSON.stringify(m).includes("Texture"));
  if (stillTextured.length) {
    throw new Error(`materials still reference textures: ${stillTextured.map((m) => m.name).join(", ")}`);
  }

  return { ...omit(gltf, ["images", "textures", "samplers"]), materials };
}

function omit(obj, keys) {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));
}

function hexToLinear(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}

function readGlb(buf) {
  if (buf.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${input} is not a binary glTF (.glb)`);
  const jsonLength = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== CHUNK_JSON) throw new Error("first GLB chunk is not JSON");
  const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8"));
  const binStart = 20 + jsonLength;
  const bin =
    binStart < buf.length && buf.readUInt32LE(binStart + 4) === CHUNK_BIN
      ? buf.subarray(binStart + 8, binStart + 8 + buf.readUInt32LE(binStart))
      : null;
  return { json, bin };
}

function writeGlb(gltf, bin) {
  const pad = (b, fill) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, fill)]);
  const jsonChunk = pad(Buffer.from(JSON.stringify(gltf), "utf8"), 0x20);
  const binChunk = bin ? pad(bin, 0) : null;
  const header = (length, type) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(length, 0);
    h.writeUInt32LE(type, 4);
    return h;
  };
  const parts = [header(jsonChunk.length, CHUNK_JSON), jsonChunk];
  if (binChunk) parts.push(header(binChunk.length, CHUNK_BIN), binChunk);
  const body = Buffer.concat(parts);
  const fileHeader = Buffer.alloc(12);
  fileHeader.writeUInt32LE(GLB_MAGIC, 0);
  fileHeader.writeUInt32LE(2, 4);
  fileHeader.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([fileHeader, body]);
}
