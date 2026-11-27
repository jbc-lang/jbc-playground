import { createHash } from "node:crypto";

export const version = "0.6.0";
export const wheelName = `jbcc-${version}-py3-none-any.whl`;
const url = `https://files.pythonhosted.org/packages/39/7d/5236a90793c2a3670ec8b085f95b1f117a0826d31a83f99ed9c59e92cd4a/${wheelName}`;
const sha256 = "219b80015d5472dfb276d1ca538a3b07279e27f605ed1aaae86aa48b212e8cdd";

export async function downloadWheel() {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download ${wheelName} from PyPI (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== sha256) throw new Error(`SHA-256 mismatch for ${wheelName}`);
  return bytes;
}
