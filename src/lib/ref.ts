import { randomInt } from "node:crypto";

/** Human-facing booking reference in the prototype's format: KH-482615. */
export function generateRef(): string {
  return `KH-${randomInt(100000, 1000000)}`;
}
