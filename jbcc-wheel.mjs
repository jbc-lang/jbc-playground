import { createHash } from "node:crypto";

export const version = "0.4.0";
export const wheelName = `jbcc-${version}-py3-none-any.whl`;
const url = `https://files.pythonhosted.org/packages/f1/33/17fda5f1d27c9587935341b7f9b4eed52b1ca82e36dd322837353b0cbe3d/${wheelName}`;
const sha256 = "8266e49b34c60a27ff21efeb387952ee78ad84c4b09f7f565f218b365becdc77";

export async function downloadWheel() {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download ${wheelName} from PyPI (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== sha256) throw new Error(`SHA-256 mismatch for ${wheelName}`);
  return bytes;
}
