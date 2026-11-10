import path from 'node:path';
import {fileURLToPath} from 'node:url';
/** Pinned 81d5a485 reference checkout. Override its location, never its contents. */
export const BASELINE_ROOT = path.resolve(process.env.WEAPON_V6_BASELINE || fileURLToPath(new URL('../../../character_adapt_baseline/', import.meta.url)));
