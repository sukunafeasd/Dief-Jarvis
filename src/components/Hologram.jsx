import React, { useEffect, useRef } from "react";
import * as THREE from "three";

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function buildCore(theme = "amber", economy = false) {
  const random = seeded(1021);
  const root = new THREE.Group();
  const color = new THREE.Color(theme === "amber" ? "#ffae4e" : "#5be8ff");
  const pale = new THREE.Color(theme === "amber" ? "#ffe6a8" : "#d0ffff");
  const shell = new THREE.Group();
  root.add(shell);
  const count = economy ? 1050 : 2400;
  const positions = [];
  const colors = [];
  const vectors = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = Math.PI * (3 - Math.sqrt(5)) * i;
    const r = 1.5 + (random() - 0.5) * 0.11;
    const point = new THREE.Vector3(
      Math.cos(angle) * radius * r,
      y * r,
      Math.sin(angle) * radius * r,
    );
    vectors.push(point);
    positions.push(...point.toArray());
    const tint = color.clone().lerp(pale, random() * 0.7);
    colors.push(tint.r, tint.g, tint.b);
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  pointsGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 32;
  const ctx = sprite.getContext("2d");
  const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.18, "rgba(255,255,255,.9)");
  glow.addColorStop(0.45, "rgba(255,255,255,.25)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(sprite);
  const points = new THREE.Points(
    pointsGeo,
    new THREE.PointsMaterial({
      size: 0.041,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  shell.add(points);
  const links = [];
  for (let i = 0; i < count; i++) {
    for (const gap of [1, 13]) {
      const next = (i + gap) % count;
      if (vectors[i].distanceTo(vectors[next]) < 0.48)
        links.push(...vectors[i].toArray(), ...vectors[next].toArray());
    }
  }
  const linksGeo = new THREE.BufferGeometry();
  linksGeo.setAttribute("position", new THREE.Float32BufferAttribute(links, 3));
  shell.add(
    new THREE.LineSegments(
      linksGeo,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  const meridians = [];
  for (let band = 0; band < 16; band++)
    for (let step = 0; step < 80; step++) {
      if (step % 7 === 0) continue;
      for (const part of [step, step + 1]) {
        const latitude = -Math.PI / 2 + (part / 80) * Math.PI;
        const longitude =
          (band / 16) * Math.PI * 2 + Math.sin(latitude * 12 + band) * 0.027;
        const r = 1.535;
        meridians.push(
          Math.cos(latitude) * Math.cos(longitude) * r,
          Math.sin(latitude) * r,
          Math.cos(latitude) * Math.sin(longitude) * r,
        );
      }
    }
  const circuitGeo = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(meridians, 3),
  );
  shell.add(
    new THREE.LineSegments(
      circuitGeo,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  const rings = new THREE.Group();
  root.add(rings);
  for (let ring = 0; ring < 5; ring++) {
    const geo = new THREE.BufferGeometry();
    const values = [];
    const radius = 0.38 + ring * 0.25;
    for (let i = 0; i <= 240; i++) {
      const a = (i / 240) * Math.PI * 2;
      values.push(
        Math.cos(a) * radius,
        Math.sin(a) * radius,
        Math.sin(a * 4 + ring) * 0.035,
      );
    }
    const line = new THREE.Line(
      geo.setAttribute("position", new THREE.Float32BufferAttribute(values, 3)),
      new THREE.LineBasicMaterial({
        color: ring < 2 ? pale : color,
        transparent: true,
        opacity: ring < 2 ? 0.7 : 0.33,
        blending: THREE.AdditiveBlending,
      }),
    );
    line.rotation.set(ring * 0.29, ring * 0.35, ring * 0.24);
    rings.add(line);
  }
  const detailGeo = new THREE.BufferGeometry();
  const detail = [];
  for (let i = 0; i < (economy ? 120 : 260); i++) {
    const a = random() * Math.PI * 2;
    const r = 0.13 + random() * 0.35;
    detail.push(Math.cos(a) * r, Math.sin(a) * r, (random() - 0.5) * 0.6);
  }
  detailGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(detail, 3),
  );
  const heart = new THREE.Points(
    detailGeo,
    new THREE.PointsMaterial({
      color: pale,
      size: 0.066,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  root.add(heart);
  const filaments = [];
  for (let strand = 0; strand < (economy ? 18 : 40); strand++) {
    const offset = random() * Math.PI * 2,
      tilt = random() * Math.PI;
    for (let step = 0; step < 45; step++)
      for (const part of [step, step + 1]) {
        const a = (part / 45) * Math.PI * 2 + offset,
          r = 0.26 + Math.sin(a * 3 + strand) * 0.085;
        const x = Math.cos(a) * r,
          y = Math.sin(a) * r;
        filaments.push(x, y * Math.cos(tilt), y * Math.sin(tilt));
      }
  }
  const filamentGeo = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(filaments, 3),
  );
  heart.add(
    new THREE.LineSegments(
      filamentGeo,
      new THREE.LineBasicMaterial({
        color: pale,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  const light = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color: pale,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  light.scale.set(0.8, 0.8, 1);
  heart.add(light);
  const scan = new THREE.Group();
  root.add(scan);
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 2;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 1.72, Math.sin(a) * 1.72, 0),
      new THREE.Vector3(
        Math.cos(a) * (i % 5 === 0 ? 1.82 : 1.76),
        Math.sin(a) * (i % 5 === 0 ? 1.82 : 1.76),
        0,
      ),
    ]);
    scan.add(
      new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: i % 5 === 0 ? 0.62 : 0.2,
        }),
      ),
    );
  }
  const orbit = new THREE.Group();
  root.add(orbit);
  for (let i = 0; i < 2; i++) {
    const curve = new THREE.EllipseCurve(
      0,
      0,
      1.95,
      1.58,
      0,
      Math.PI * 2,
      false,
      0,
    );
    const geo = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(220).map((p) => new THREE.Vector3(p.x, p.y, 0)),
    );
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2 }),
    );
    line.rotation.set(0.8 + i * 0.7, 0.35 + i * 0.8, i * 0.4);
    orbit.add(line);
  }
  return { root, shell, rings, heart, scan, orbit, points, texture };
}

export default function Hologram({ theme, motion, quality, phase, onError }) {
  const host = useRef(null);
  const live = useRef({ phase, motion });
  const drag = useRef(null);
  useEffect(() => {
    live.current = { phase, motion };
  }, [phase, motion]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality !== "economy",
        alpha: true,
        powerPreference: "low-power",
        preserveDrawingBuffer: import.meta.env.DEV,
      });
    } catch {
      onError?.("O nucleo 3D nao pode ser exibido neste dispositivo.");
      return;
    }
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, quality === "economy" ? 1 : 1.5),
    );
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute(
      "aria-label",
      "Nucleo holografico tridimensional do Jarvis",
    );
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 30);
    camera.position.set(0, 0, 5.5);
    const core = buildCore(theme, quality === "economy");
    scene.add(core.root);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    let last = 0;
    let visible = true;
    let stopped = false;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      const visibleWidth = Math.min(
        width,
        element.parentElement.parentElement.clientWidth,
      );
      camera.position.z = Math.max(
        5.5,
        ((2.05 / Math.tan(THREE.MathUtils.degToRad(22))) * height) /
          visibleWidth,
      );
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      schedule();
    });
    intersection.observe(element);
    const render = (now) => {
      timer = 0;
      if (stopped) return;
      if (!document.hidden && visible) {
        const moving = live.current.motion && !media.matches;
        const dt = last ? Math.min((now - last) / 1000, 0.08) : 0;
        last = now;
        if (moving) {
          core.shell.rotation.y += dt * 0.12;
          core.shell.rotation.x = Math.sin(now * 0.0001) * 0.08;
          core.rings.rotation.z +=
            dt * (live.current.phase === "working" ? 0.32 : 0.09);
          core.heart.rotation.y += dt * 0.19;
          core.scan.rotation.z -= dt * 0.035;
          core.orbit.rotation.y += dt * 0.018;
          const active = ["working", "speaking", "listening"].includes(
            live.current.phase,
          );
          core.heart.scale.setScalar(
            active ? 1 + Math.sin(now * 0.006) * 0.13 : 1,
          );
        }
        renderer.render(scene, camera);
        renderer.domElement.dataset.frame = String(now);
      } else last = 0;
      schedule();
    };
    const schedule = () => {
      if (timer || stopped || document.hidden || !visible) return;
      if (!live.current.motion || media.matches) {
        renderer.render(scene, camera);
        return;
      }
      timer = window.setTimeout(
        () => render(performance.now()),
        quality === "economy" ? 1000 / 20 : 1000 / 30,
      );
    };
    const wake = () => {
      last = 0;
      clearTimeout(timer);
      timer = 0;
      schedule();
    };
    document.addEventListener("visibilitychange", wake);
    media.addEventListener("change", wake);
    const onDown = (event) => {
      if (!live.current.motion || media.matches) return;
      drag.current = { x: event.clientX, y: event.clientY };
      element.setPointerCapture(event.pointerId);
    };
    const onMove = (event) => {
      if (!drag.current) return;
      core.root.rotation.y += (event.clientX - drag.current.x) * 0.005;
      core.root.rotation.x = THREE.MathUtils.clamp(
        core.root.rotation.x + (event.clientY - drag.current.y) * 0.003,
        -0.45,
        0.45,
      );
      drag.current = { x: event.clientX, y: event.clientY };
      renderer.render(scene, camera);
    };
    const onUp = () => {
      drag.current = null;
    };
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
    const lost = (event) => {
      event.preventDefault();
      onError?.(
        "O renderizador 3D foi interrompido. As tarefas e mensagens continuam disponiveis.",
      );
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    resize();
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", wake);
      media.removeEventListener("change", wake);
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const materials = new Set();
      core.root.traverse((item) => {
        item.geometry?.dispose();
        if (item.material) materials.add(item.material);
      });
      materials.forEach((material) => material.dispose());
      core.texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [theme, quality, motion, onError]);
  return <div ref={host} className="hologram" data-testid="hologram" />;
}
