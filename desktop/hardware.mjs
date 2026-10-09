import os from "node:os";
export function hardwareStatus(system = os) {
  const total = system.totalmem(),
    free = system.freemem(),
    cpus = system.cpus();
  return {
    source: "Sistema operacional / Node os",
    measuredAt: new Date().toISOString(),
    platform: system.platform(),
    architecture: system.arch(),
    cpu: cpus[0]?.model || "Nao informado pelo sistema",
    logicalCores: cpus.length,
    memory: {
      totalBytes: total,
      freeBytes: free,
      usedBytes: total - free,
      usedPercent: Math.round(((total - free) / total) * 100),
    },
    uptimeSeconds: system.uptime(),
  };
}
