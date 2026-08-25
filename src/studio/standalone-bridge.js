/**
 * Standalone Bridge (Facade Re-export)
 * Preserves backward compatibility while redirecting to adapters/host-bridge.js
 */

export * from './adapters/host-bridge';
export { default } from './adapters/host-bridge';
