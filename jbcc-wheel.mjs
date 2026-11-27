import { createHash } from "node:crypto";

export const version = "0.5.0";
export const wheelName = `jbcc-${version}-py3-none-any.whl`;
const url = `https://files.pythonhosted.org/packages/93/52/5202da1d1fc75b55c1a7d70e98019a3704eba1ba1389676b91ef10d86832/${wheelName}`;
const sha256 = "1ef07927eb333402331fc6e86ff6411d8b24295baf8b9b7b10889f24d42f0368";

export async function downloadWheel() {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download ${wheelName} from PyPI (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== sha256) throw new Error(`SHA-256 mismatch for ${wheelName}`);
  return bytes;
}
