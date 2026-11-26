import { createHash } from "node:crypto";

export const version = "0.3.0";
export const wheelName = `jbcc-${version}-py3-none-any.whl`;
const url = `https://files.pythonhosted.org/packages/c3/27/2164e5fcfe05defe4ef44d35464e30cf7d332b4a5af871f86918f43b4b00/${wheelName}`;
const sha256 = "df00e54fab345163f4a40b45b49acda810e8e8160c5bd37a6b0bef77f0efc8fc";

export async function downloadWheel() {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download ${wheelName} from PyPI (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== sha256) throw new Error(`SHA-256 mismatch for ${wheelName}`);
  return bytes;
}
