import React, { useEffect, useRef } from "react";
import * as THREE from "three";
export default function TopicGlyph({
  topic,
  theme,
  motion = true,
  motionMode = "always",
  level = 0,
}) {
  const host = useRef(null),
    energy = useRef(level);
  energy.current = level;
  useEffect(() => {
    const target = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: import.meta.env.DEV,
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    target.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      group = new THREE.Group();
    scene.add(group);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 0.2, 4.5);
    const color = theme === "amber" ? "#ffc578" : "#66e7ff";
    const material = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const add = (geometry, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };
    const droplets = [];
    if (["sun", "weather", "cloud", "rain", "snow"].includes(topic)) {
      if (topic === "sun") {
        add(new THREE.IcosahedronGeometry(0.47, 2));
        for (let index = 0; index < 12; index++) {
          const angle = (index * Math.PI) / 6;
          const ray = add(
            new THREE.BoxGeometry(0.04, 0.3, 0.04),
            Math.sin(angle) * 0.8,
            Math.cos(angle) * 0.8,
          );
          ray.rotation.z = -angle;
        }
      } else {
        for (const [x, y, radius] of [
          [-0.45, 0.15, 0.35],
          [0, 0.3, 0.47],
          [0.48, 0.12, 0.36],
        ])
          add(new THREE.SphereGeometry(radius, 12, 8), x, y);
        add(new THREE.BoxGeometry(1.4, 0.24, 0.4), 0, -0.04);
        if (topic === "rain" || topic === "snow")
          for (let index = 0; index < 16; index++) {
            const drop = add(
              topic === "snow"
                ? new THREE.IcosahedronGeometry(0.026, 0)
                : new THREE.CylinderGeometry(0.008, 0.008, 0.15, 3),
              ((index % 5) - 2) * 0.23,
              -0.35 - (index % 3) * 0.24,
              ((index % 3) - 1) * 0.15,
            );
            droplets.push(drop);
          }
      }
    } else if (topic === "activity") {
      add(new THREE.SphereGeometry(0.14, 12, 8), 0, 0.69);
      const body = add(new THREE.BoxGeometry(0.13, 0.6, 0.12), -0.03, 0.26);
      body.rotation.z = -0.2;
      for (const [x, y, angle] of [
        [-0.2, -0.22, -0.55],
        [0.22, -0.19, 0.7],
        [-0.3, 0.27, -0.8],
        [0.26, 0.37, 0.9],
      ]) {
        const limb = add(new THREE.BoxGeometry(0.09, 0.55, 0.1), x, y);
        limb.rotation.z = angle;
      }
    } else {
      const paper = add(new THREE.BoxGeometry(1.22, 1.5, 0.06));
      paper.rotation.y = -0.15;
      for (let index = 0; index < 5; index++) {
        if (topic === "tasks")
          add(
            new THREE.BoxGeometry(0.12, 0.12, 0.08),
            -0.42,
            0.45 - index * 0.23,
            0.09,
          );
        add(
          new THREE.BoxGeometry(topic === "tasks" ? 0.63 : 0.88, 0.015, 0.04),
          topic === "tasks" ? 0.07 : 0,
          0.45 - index * 0.23,
          0.1,
        );
      }
      if (topic === "news")
        add(new THREE.BoxGeometry(0.9, 0.19, 0.04), 0, 0.62, 0.09);
    }
    const ring = add(new THREE.TorusGeometry(1.13, 0.005, 3, 90));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.85;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let timer,
      disposed = false,
      visible = true;
    const resize = () => {
      const { width, height } = target.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(target);
    const draw = () => {
      clearTimeout(timer);
      if (disposed || document.hidden || !visible) return;
      const moving = motion && (motionMode === "always" || !media.matches);
      if (moving) {
        const t = performance.now() / 1000;
        group.rotation.y = Math.sin(t * 0.7) * 0.18;
        group.position.y = Math.sin(t * 1.2) * 0.025;
        group.scale.setScalar(1 + Math.min(1, energy.current) * 0.05);
        droplets.forEach((drop, index) => {
          drop.position.y = -0.23 - ((t * 0.8 + index * 0.18) % 0.78);
        });
      }
      renderer.render(scene, camera);
      renderer.domElement.dataset.frame = String(performance.now());
      if (moving) timer = setTimeout(draw, 50);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      draw();
    });
    intersection.observe(target);
    document.addEventListener("visibilitychange", draw);
    media.addEventListener("change", draw);
    resize();
    draw();
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", draw);
      media.removeEventListener("change", draw);
      group.traverse((node) => node.geometry?.dispose());
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [topic, theme, motion, motionMode]);
  return (
    <div
      className="topic-glyph"
      ref={host}
      role="img"
      aria-label={`Holograma tematico: ${topic}`}
    />
  );
}
