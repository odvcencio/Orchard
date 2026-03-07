'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

type AmbientGraphVariant = 'hero' | 'showcase' | 'feature';

type Velocity = [number, number, number];

type SceneConfig = {
  cameraFov: number;
  cameraZ: number;
  depth: number;
  edgeDistance: number;
  edgeOpacityDark: number;
  edgeOpacityLight: number;
  fogDensity: number;
  height: number;
  maxEdges: number;
  networkNodes: number;
  nodeSizeDark: number;
  nodeSizeLight: number;
  nodeSpeed: number;
  particleCount: number;
  particleOpacityDark: number;
  particleOpacityLight: number;
  particleSizeDark: number;
  particleSizeLight: number;
  particleSpeed: number;
  pointOpacityDark: number;
  pointOpacityLight: number;
  pointerRotation: number;
  rootRotationX: number;
  rootRotationY: number;
  sparkOpacityDark: number;
  sparkOpacityLight: number;
  sparkSizeDark: number;
  sparkSizeLight: number;
  sparkSpeed: number;
  targetFps: number;
  width: number;
};

type AmbientGraphProps = {
  className?: string;
  variant?: AmbientGraphVariant;
};

const SCENE_CONFIG: Record<AmbientGraphVariant, SceneConfig> = {
  hero: {
    cameraFov: 48,
    cameraZ: 22,
    depth: 5.8,
    edgeDistance: 3.4,
    edgeOpacityDark: 0.24,
    edgeOpacityLight: 0.28,
    fogDensity: 0.027,
    height: 6.3,
    maxEdges: 240,
    networkNodes: 84,
    nodeSizeDark: 0.16,
    nodeSizeLight: 0.21,
    nodeSpeed: 0.017,
    particleCount: 360,
    particleOpacityDark: 0.52,
    particleOpacityLight: 0.42,
    particleSizeDark: 0.075,
    particleSizeLight: 0.1,
    particleSpeed: 0.008,
    pointOpacityDark: 0.78,
    pointOpacityLight: 0.95,
    pointerRotation: 0.12,
    rootRotationX: 0.12,
    rootRotationY: 0.2,
    sparkOpacityDark: 0.9,
    sparkOpacityLight: 0.72,
    sparkSizeDark: 0.24,
    sparkSizeLight: 0.32,
    sparkSpeed: 0.0045,
    targetFps: 50,
    width: 10.8,
  },
  showcase: {
    cameraFov: 42,
    cameraZ: 18.5,
    depth: 4.8,
    edgeDistance: 3.1,
    edgeOpacityDark: 0.18,
    edgeOpacityLight: 0.18,
    fogDensity: 0.036,
    height: 4.1,
    maxEdges: 120,
    networkNodes: 52,
    nodeSizeDark: 0.12,
    nodeSizeLight: 0.16,
    nodeSpeed: 0.014,
    particleCount: 200,
    particleOpacityDark: 0.42,
    particleOpacityLight: 0.28,
    particleSizeDark: 0.055,
    particleSizeLight: 0.075,
    particleSpeed: 0.0064,
    pointOpacityDark: 0.66,
    pointOpacityLight: 0.82,
    pointerRotation: 0.085,
    rootRotationX: 0.09,
    rootRotationY: 0.14,
    sparkOpacityDark: 0.72,
    sparkOpacityLight: 0.54,
    sparkSizeDark: 0.19,
    sparkSizeLight: 0.24,
    sparkSpeed: 0.0038,
    targetFps: 42,
    width: 8.2,
  },
  feature: {
    cameraFov: 44,
    cameraZ: 19.2,
    depth: 4.6,
    edgeDistance: 2.95,
    edgeOpacityDark: 0.16,
    edgeOpacityLight: 0.14,
    fogDensity: 0.04,
    height: 3.8,
    maxEdges: 96,
    networkNodes: 44,
    nodeSizeDark: 0.11,
    nodeSizeLight: 0.15,
    nodeSpeed: 0.013,
    particleCount: 180,
    particleOpacityDark: 0.38,
    particleOpacityLight: 0.24,
    particleSizeDark: 0.05,
    particleSizeLight: 0.07,
    particleSpeed: 0.0058,
    pointOpacityDark: 0.6,
    pointOpacityLight: 0.72,
    pointerRotation: 0.07,
    rootRotationX: 0.08,
    rootRotationY: 0.12,
    sparkOpacityDark: 0.64,
    sparkOpacityLight: 0.46,
    sparkSizeDark: 0.17,
    sparkSizeLight: 0.22,
    sparkSpeed: 0.0034,
    targetFps: 40,
    width: 8.9,
  },
};

const CANVAS_CLASSES: Record<AmbientGraphVariant, string> = {
  hero:
    'pointer-events-none absolute inset-0 -z-20 h-full w-full opacity-95 mix-blend-multiply [mask-image:radial-gradient(circle_at_50%_38%,black_8%,black_58%,transparent_94%)] dark:opacity-85 dark:mix-blend-normal',
  showcase:
    'pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-80 [mask-image:radial-gradient(circle_at_50%_48%,black_12%,black_62%,transparent_94%)] dark:opacity-75',
  feature:
    'pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-70 [mask-image:radial-gradient(circle_at_50%_44%,black_10%,black_60%,transparent_94%)] dark:opacity-72',
};

function normalizeThreeColor(value: string) {
  const color = value.trim();
  if (!color) return color;
  if (color.startsWith('#') || color.startsWith('rgb')) return color;

  const hslMatch = color.match(/^hsla?\((.*)\)$/i);
  if (hslMatch) {
    const [channelsPart, alphaPart] = hslMatch[1].split('/').map((part) => part.trim());
    const channels = channelsPart.split(/\s*,\s*|\s+/).filter(Boolean);
    if (alphaPart) {
      return `hsla(${channels.join(', ')}, ${alphaPart})`;
    }
    return `hsl(${channels.join(', ')})`;
  }

  return `hsl(${color.split(/\s+/).filter(Boolean).join(', ')})`;
}

function themeColor(variableName: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return normalizeThreeColor(value || fallback);
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function wrap(value: number, min: number, max: number) {
  const range = max - min;
  if (value < min) return max - ((min - value) % range);
  if (value > max) return min + ((value - max) % range);
  return value;
}

function paintGradient(
  target: Float32Array,
  mixes: Float32Array,
  from: THREE.Color,
  to: THREE.Color,
) {
  const color = new THREE.Color();

  for (let i = 0; i < mixes.length; i += 1) {
    color.copy(from).lerp(to, mixes[i]);
    const offset = i * 3;
    target[offset] = color.r;
    target[offset + 1] = color.g;
    target[offset + 2] = color.b;
  }
}

function paintParticleGradient(
  target: Float32Array,
  mixes: Float32Array,
  shadow: THREE.Color,
  base: THREE.Color,
  highlight: THREE.Color,
) {
  const color = new THREE.Color();

  for (let i = 0; i < mixes.length; i += 1) {
    const mix = mixes[i];
    color.copy(shadow).lerp(base, 0.35 + mix * 0.5).lerp(highlight, mix * 0.4);
    const offset = i * 3;
    target[offset] = color.r;
    target[offset + 1] = color.g;
    target[offset + 2] = color.b;
  }
}

export function AmbientGraph({ className, variant = 'hero' }: AmbientGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const config = SCENE_CONFIG[variant];

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        alpha: true,
        antialias: true,
        powerPreference: variant === 'hero' ? 'high-performance' : 'low-power',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, variant === 'hero' ? 1.35 : 1.15));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      themeColor('--hero-fade', 'hsl(210 35% 92%)'),
      config.fogDensity,
    );

    const camera = new THREE.PerspectiveCamera(config.cameraFov, 1, 0.1, 100);
    camera.position.set(0, 0, config.cameraZ);

    const rootGroup = new THREE.Group();
    const particleGroup = new THREE.Group();
    const networkGroup = new THREE.Group();
    const sparkGroup = new THREE.Group();
    rootGroup.add(particleGroup);
    rootGroup.add(networkGroup);
    rootGroup.add(sparkGroup);
    scene.add(rootGroup);

    const nodePositions = new Float32Array(config.networkNodes * 3);
    const nodeColors = new Float32Array(config.networkNodes * 3);
    const nodeMixes = new Float32Array(config.networkNodes);
    const nodeVelocities: Velocity[] = [];

    for (let i = 0; i < config.networkNodes; i += 1) {
      nodePositions[i * 3] = randomInRange(-config.width, config.width);
      nodePositions[i * 3 + 1] = randomInRange(-config.height, config.height);
      nodePositions[i * 3 + 2] = randomInRange(-config.depth, config.depth);
      nodeMixes[i] = Math.random();
      nodeVelocities.push([
        randomInRange(-config.nodeSpeed, config.nodeSpeed),
        randomInRange(-config.nodeSpeed * 0.7, config.nodeSpeed * 0.7),
        randomInRange(-config.nodeSpeed * 0.38, config.nodeSpeed * 0.38),
      ]);
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      size: config.nodeSizeLight,
      sizeAttenuation: true,
      transparent: true,
      opacity: config.pointOpacityLight,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    networkGroup.add(points);

    const edgePositions = new Float32Array(config.maxEdges * 2 * 3);
    const edgesGeometry = new THREE.BufferGeometry();
    edgesGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgesGeometry.setDrawRange(0, 0);
    const edgesMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: config.edgeOpacityLight,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    networkGroup.add(edges);

    const particleExtentX = config.width * 1.35;
    const particleExtentY = config.height * 1.4;
    const particleExtentZ = config.depth * 1.85;
    const particlePositions = new Float32Array(config.particleCount * 3);
    const particleColors = new Float32Array(config.particleCount * 3);
    const particleMixes = new Float32Array(config.particleCount);
    const particleVelocities: Velocity[] = [];

    for (let i = 0; i < config.particleCount; i += 1) {
      particlePositions[i * 3] = randomInRange(-particleExtentX, particleExtentX);
      particlePositions[i * 3 + 1] = randomInRange(-particleExtentY, particleExtentY);
      particlePositions[i * 3 + 2] = randomInRange(-particleExtentZ, particleExtentZ);
      particleMixes[i] = Math.random();
      particleVelocities.push([
        randomInRange(-config.particleSpeed, config.particleSpeed),
        randomInRange(-config.particleSpeed * 0.9, config.particleSpeed * 0.9),
        randomInRange(-config.particleSpeed * 0.45, config.particleSpeed * 0.45),
      ]);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: config.particleSizeLight,
      sizeAttenuation: true,
      transparent: true,
      opacity: config.particleOpacityLight,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particleGroup.add(particles);

    const sparkCount = Math.max(18, Math.round(config.particleCount * 0.18));
    const sparkExtentX = config.width * 1.1;
    const sparkExtentY = config.height * 1.15;
    const sparkExtentZ = config.depth * 1.2;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkColors = new Float32Array(sparkCount * 3);
    const sparkMixes = new Float32Array(sparkCount);
    const sparkVelocities: Velocity[] = [];

    for (let i = 0; i < sparkCount; i += 1) {
      sparkPositions[i * 3] = randomInRange(-sparkExtentX, sparkExtentX);
      sparkPositions[i * 3 + 1] = randomInRange(-sparkExtentY, sparkExtentY);
      sparkPositions[i * 3 + 2] = randomInRange(-sparkExtentZ, sparkExtentZ);
      sparkMixes[i] = Math.random();
      sparkVelocities.push([
        randomInRange(-config.sparkSpeed, config.sparkSpeed),
        randomInRange(-config.sparkSpeed * 0.75, config.sparkSpeed * 0.75),
        randomInRange(-config.sparkSpeed * 0.5, config.sparkSpeed * 0.5),
      ]);
    }

    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
    const sparkMaterial = new THREE.PointsMaterial({
      size: config.sparkSizeLight,
      sizeAttenuation: true,
      transparent: true,
      opacity: config.sparkOpacityLight,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
    sparkGroup.add(sparks);

    const refreshColors = () => {
      const dark = document.documentElement.classList.contains('dark');
      const nodeColor = new THREE.Color(
        themeColor('--hero-graph-node', dark ? 'hsl(196 95% 55%)' : 'hsl(205 92% 34%)'),
      );
      const edgeColor = new THREE.Color(
        themeColor('--hero-graph-edge', dark ? 'hsl(186 60% 50%)' : 'hsl(194 82% 33%)'),
      );
      const accentColor = new THREE.Color(
        themeColor('--hero-accent', dark ? 'hsl(212 88% 62%)' : 'hsl(209 88% 54%)'),
      );
      const particleShadow = new THREE.Color(
        themeColor('--hero-particle-shadow', dark ? 'hsl(186 60% 44%)' : 'hsl(214 34% 72%)'),
      );
      const particleBase = new THREE.Color(
        themeColor('--hero-particle-base', dark ? 'hsl(196 90% 62%)' : 'hsl(205 84% 44%)'),
      );
      const particleHighlight = new THREE.Color(
        themeColor('--hero-particle-highlight', dark ? 'hsl(212 98% 76%)' : 'hsl(191 78% 54%)'),
      );
      const sparkColor = new THREE.Color(
        themeColor('--hero-particle-spark', dark ? 'hsl(205 100% 82%)' : 'hsl(209 92% 64%)'),
      );
      const fogColor = new THREE.Color(
        themeColor('--hero-fade', dark ? 'hsl(214 45% 12%)' : 'hsl(210 35% 92%)'),
      );

      paintGradient(nodeColors, nodeMixes, nodeColor, accentColor);
      paintParticleGradient(
        particleColors,
        particleMixes,
        particleShadow,
        particleBase,
        particleHighlight,
      );
      paintGradient(sparkColors, sparkMixes, particleBase, sparkColor);

      pointsGeometry.attributes.color.needsUpdate = true;
      particleGeometry.attributes.color.needsUpdate = true;
      sparkGeometry.attributes.color.needsUpdate = true;

      if (scene.fog) {
        scene.fog.color.copy(fogColor);
      }

      pointsMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      pointsMaterial.opacity = dark ? config.pointOpacityDark : config.pointOpacityLight;
      pointsMaterial.size = dark ? config.nodeSizeDark : config.nodeSizeLight;
      pointsMaterial.needsUpdate = true;

      edgesMaterial.color.copy(edgeColor);
      edgesMaterial.opacity = dark ? config.edgeOpacityDark : config.edgeOpacityLight;
      edgesMaterial.needsUpdate = true;

      particleMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      particleMaterial.opacity = dark ? config.particleOpacityDark : config.particleOpacityLight;
      particleMaterial.size = dark ? config.particleSizeDark : config.particleSizeLight;
      particleMaterial.needsUpdate = true;

      sparkMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      sparkMaterial.opacity = dark ? config.sparkOpacityDark : config.sparkOpacityLight;
      sparkMaterial.size = dark ? config.sparkSizeDark : config.sparkSizeLight;
      sparkMaterial.needsUpdate = true;
    };
    refreshColors();

    const themeObserver = new MutationObserver(refreshColors);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    const parent = canvasRef.current.parentElement;
    if (!parent) {
      renderer.dispose();
      return;
    }

    const resize = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    resize();

    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerX = 0;
    let pointerY = 0;

    const onPointerMove = (event: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerTargetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerTargetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const onPointerLeave = () => {
      pointerTargetX = 0;
      pointerTargetY = 0;
    };

    parent.addEventListener('pointermove', onPointerMove);
    parent.addEventListener('pointerleave', onPointerLeave);

    const edgeDistanceSq = config.edgeDistance * config.edgeDistance;
    let raf = 0;
    let time = 0;
    let lastFrameTs = 0;
    let running = true;
    const minFrameMs = 1000 / config.targetFps;

    const animate = (ts: number) => {
      if (!running) return;
      if (lastFrameTs && ts - lastFrameTs < minFrameMs) {
        raf = window.requestAnimationFrame(animate);
        return;
      }
      lastFrameTs = ts;
      time += 0.0085;
      pointerX += (pointerTargetX - pointerX) * 0.045;
      pointerY += (pointerTargetY - pointerY) * 0.045;

      rootGroup.rotation.y = Math.sin(time * 0.16) * config.rootRotationY + pointerX * config.pointerRotation;
      rootGroup.rotation.x =
        Math.cos(time * 0.11) * config.rootRotationX - pointerY * config.pointerRotation * 0.82;
      particleGroup.rotation.z = time * 0.02;
      sparkGroup.rotation.z = -time * 0.028;
      sparkGroup.position.z = Math.sin(time * 0.75) * 0.25;

      camera.position.x = Math.sin(time * 0.22) * 0.18 + pointerX * 0.55;
      camera.position.y = Math.cos(time * 0.18) * 0.14 - pointerY * 0.34;
      camera.lookAt(0, 0, 0);

      for (let i = 0; i < config.networkNodes; i += 1) {
        const px = i * 3;
        const py = px + 1;
        const pz = px + 2;
        const [vx, vy, vz] = nodeVelocities[i];

        nodePositions[px] += vx;
        nodePositions[py] += vy;
        nodePositions[pz] += vz + Math.sin(time * 1.15 + i * 0.18) * 0.0012;

        if (Math.abs(nodePositions[px]) > config.width) {
          nodeVelocities[i][0] *= -1;
          nodePositions[px] = THREE.MathUtils.clamp(nodePositions[px], -config.width, config.width);
        }
        if (Math.abs(nodePositions[py]) > config.height) {
          nodeVelocities[i][1] *= -1;
          nodePositions[py] = THREE.MathUtils.clamp(nodePositions[py], -config.height, config.height);
        }
        if (Math.abs(nodePositions[pz]) > config.depth) {
          nodeVelocities[i][2] *= -1;
          nodePositions[pz] = THREE.MathUtils.clamp(nodePositions[pz], -config.depth, config.depth);
        }
      }

      for (let i = 0; i < config.particleCount; i += 1) {
        const px = i * 3;
        const py = px + 1;
        const pz = px + 2;
        const phase = particleMixes[i] * Math.PI * 2;
        const [vx, vy, vz] = particleVelocities[i];

        particlePositions[px] = wrap(
          particlePositions[px] + vx + Math.sin(time * 0.85 + phase) * 0.0008,
          -particleExtentX,
          particleExtentX,
        );
        particlePositions[py] = wrap(
          particlePositions[py] + vy + Math.cos(time * 0.7 + phase) * 0.0006,
          -particleExtentY,
          particleExtentY,
        );
        particlePositions[pz] = wrap(
          particlePositions[pz] + vz + Math.sin(time * 0.55 + phase) * 0.0011,
          -particleExtentZ,
          particleExtentZ,
        );
      }

      for (let i = 0; i < sparkCount; i += 1) {
        const px = i * 3;
        const py = px + 1;
        const pz = px + 2;
        const phase = sparkMixes[i] * Math.PI * 2;
        const [vx, vy, vz] = sparkVelocities[i];

        sparkPositions[px] = wrap(
          sparkPositions[px] + vx + Math.cos(time * 0.62 + phase) * 0.0009,
          -sparkExtentX,
          sparkExtentX,
        );
        sparkPositions[py] = wrap(
          sparkPositions[py] + vy + Math.sin(time * 0.57 + phase) * 0.0008,
          -sparkExtentY,
          sparkExtentY,
        );
        sparkPositions[pz] = wrap(
          sparkPositions[pz] + vz + Math.sin(time * 0.78 + phase) * 0.0014,
          -sparkExtentZ,
          sparkExtentZ,
        );
      }

      let edgeCount = 0;
      outer: for (let i = 0; i < config.networkNodes; i += 1) {
        const i3 = i * 3;
        for (let j = i + 1; j < config.networkNodes; j += 1) {
          if (edgeCount >= config.maxEdges) break outer;

          const j3 = j * 3;
          const dx = nodePositions[i3] - nodePositions[j3];
          const dy = nodePositions[i3 + 1] - nodePositions[j3 + 1];
          const dz = nodePositions[i3 + 2] - nodePositions[j3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq <= edgeDistanceSq) {
            const offset = edgeCount * 6;
            edgePositions[offset] = nodePositions[i3];
            edgePositions[offset + 1] = nodePositions[i3 + 1];
            edgePositions[offset + 2] = nodePositions[i3 + 2];
            edgePositions[offset + 3] = nodePositions[j3];
            edgePositions[offset + 4] = nodePositions[j3 + 1];
            edgePositions[offset + 5] = nodePositions[j3 + 2];
            edgeCount += 1;
          }
        }
      }

      pointsGeometry.attributes.position.needsUpdate = true;
      particleGeometry.attributes.position.needsUpdate = true;
      sparkGeometry.attributes.position.needsUpdate = true;
      edgesGeometry.attributes.position.needsUpdate = true;
      edgesGeometry.setDrawRange(0, edgeCount * 2);

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    const onVisibilityChange = () => {
      if (!running) return;
      if (document.hidden) {
        if (raf !== 0) {
          window.cancelAnimationFrame(raf);
          raf = 0;
        }
        return;
      }
      if (raf === 0) {
        lastFrameTs = 0;
        raf = window.requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    raf = window.requestAnimationFrame(animate);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      raf = 0;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      parent.removeEventListener('pointermove', onPointerMove);
      parent.removeEventListener('pointerleave', onPointerLeave);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      pointsGeometry.dispose();
      particleGeometry.dispose();
      sparkGeometry.dispose();
      edgesGeometry.dispose();
      pointsMaterial.dispose();
      particleMaterial.dispose();
      sparkMaterial.dispose();
      edgesMaterial.dispose();
      renderer.dispose();
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(CANVAS_CLASSES[variant], className)}
      aria-hidden="true"
    />
  );
}
