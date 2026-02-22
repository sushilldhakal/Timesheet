/**
 * Browser-only wrapper for @vladmandic/human
 * Uses local .mjs copy to avoid webpack parsing issues
 */

// @ts-ignore - .mjs file
export { default } from './human.esm.mjs';
// @ts-ignore - .mjs file
export * from './human.esm.mjs';
