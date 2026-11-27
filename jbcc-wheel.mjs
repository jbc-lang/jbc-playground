import { createHash } from "node:crypto";

export const version = "0.8.1";
export const wheelName = `jbcc-${version}-py3-none-any.whl`;
const url = `https://files.pythonhosted.org/packages/ae/aa/cc796685fea9e442362c5d455f6f08c6c7deaaa26b504c24e6554fe350b8/${wheelName}`;
const sha256 = "5371f97c13adde54cc5c42b09a245aef861292effa7ae492d90edf7830bd6806";

export async function downloadWheel() {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download ${wheelName} from PyPI (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== sha256) throw new Error(`SHA-256 mismatch for ${wheelName}`);
  return bytes;
}
