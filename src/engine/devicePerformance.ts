/** Ajustes conservadores para mantener una tasa de cuadros estable en móviles modestos. */
function deviceMemory(): number | null {
  const value = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function isConstrainedDevice(): boolean {
  const memory = deviceMemory();
  return (memory !== null && memory <= 4) || window.matchMedia('(pointer: coarse)').matches;
}

export function rendererResolution(max = 1.75): number {
  const limit = isConstrainedDevice() ? 1.25 : max;
  return Math.min(window.devicePixelRatio || 1, limit);
}

export function tickerFrameLimit(): number {
  return isConstrainedDevice() ? 40 : 60;
}
