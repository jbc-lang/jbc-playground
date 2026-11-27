import { createHash } from "node:crypto";

export const version = "0.7.0";
export const wheelName = `jbcc-${version}-py3-none-any.whl`;
const url = `https://files.pythonhosted.org/packages/cf/98/c1038e2e3d75abb4b4a3e47501464bf4ef844669e65b231eb824f4c91844/${wheelName}`;
const sha256 = "33d9bdc6901e962ead708c5fc3446324a3373dbbeaea1f3e5b0d10c066f3fcb1";

export async function downloadWheel() {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download ${wheelName} from PyPI (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== sha256) throw new Error(`SHA-256 mismatch for ${wheelName}`);
  return bytes;
}
