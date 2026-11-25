import { createHash } from "node:crypto";

export const version = "0.2.0";
export const wheelName = `jbcc-${version}-py3-none-any.whl`;
const url = `https://files.pythonhosted.org/packages/ee/66/149dbb014554e0366b1763bd0873f66a21473c188e03861c8c2c717d29ce/${wheelName}`;
const sha256 = "b7dc3b31727eefebd6f4ebd420d8b4fb0906b290c8efd7f59099b5e324fe70ea";

export async function downloadWheel() {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download ${wheelName} from PyPI (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== sha256) throw new Error(`SHA-256 mismatch for ${wheelName}`);
  return bytes;
}
