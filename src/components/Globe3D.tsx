"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import type { CityWithDistance } from "@/lib/geo";
import { virtualPosition } from "@/lib/geo";

interface Props {
  distanceKm: number;
  startLat?: number;
  startLon?: number;
  cities?: CityWithDistance[];
}

function latLonToVec3(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export default function Globe3D({
  distanceKm,
  startLat = 24.89,
  startLon = 91.87,
  cities = [],
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth || 300;
    const h = mount.clientHeight || 300;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Stars background
    const starPositions = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500 * 3; i++) starPositions[i] = (Math.random() - 0.5) * 80;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 })));

    // Ocean sphere
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x0a3a5c, emissive: 0x051828, specular: 0x1a6fa8, shininess: 40 })
    );
    scene.add(globe);

    // Atmosphere glow
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x2255bb, transparent: true, opacity: 0.1, side: THREE.FrontSide })
      )
    );

    // Continent land patches (simplified blobs)
    const landMat = new THREE.MeshPhongMaterial({ color: 0x1a4a2e, emissive: 0x0a2010, shininess: 5 });
    const continents = [
      { lat: 54, lon: 25, sx: 0.38, sy: 0.22 },
      { lat: 20, lon: 22, sx: 0.30, sy: 0.42 },
      { lat: 35, lon: 90, sx: 0.50, sy: 0.35 },
      { lat: 48, lon: -100, sx: 0.35, sy: 0.28 },
      { lat: -15, lon: -55, sx: 0.24, sy: 0.32 },
      { lat: -25, lon: 133, sx: 0.26, sy: 0.22 },
    ];
    continents.forEach(({ lat, lon, sx, sy }) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), landMat);
      const v = latLonToVec3(lat, lon, 1.002);
      mesh.position.set(v.x, v.y, v.z);
      mesh.scale.set(sx, sy * 1.2, sx * 0.9);
      globe.add(mesh);
    });

    // Latitude/longitude grid lines
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1a3a5c, transparent: true, opacity: 0.3 });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts: THREE.Vector3[] = [];
      for (let lon2 = -180; lon2 <= 180; lon2 += 5) pts.push(latLonToVec3(lat, lon2, 1.002));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon2 = -180; lon2 < 180; lon2 += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lat2 = -90; lat2 <= 90; lat2 += 5) pts.push(latLonToVec3(lat2, lon2, 1.002));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Starting location (orange dot)
    const startVec = latLonToVec3(startLat, startLon, 1.015);
    const startDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff9f0a })
    );
    startDot.position.copy(startVec);
    scene.add(startDot);

    // Pulsing ring around start
    const pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.028, 0.038, 32),
      new THREE.MeshBasicMaterial({ color: 0xff9f0a, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    pulseRing.position.copy(startVec);
    pulseRing.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(pulseRing);

    // Draw path and runner position if there's distance
    if (distanceKm > 0) {
      const [runLat, runLon] = virtualPosition(startLat, startLon, distanceKm);
      const runVec = latLonToVec3(runLat, runLon, 1.015);

      // Traveled path
      const pathPts: THREE.Vector3[] = [];
      const steps = Math.max(60, Math.floor(distanceKm / 5));
      for (let i = 0; i <= steps; i++) {
        const [pLat, pLon] = virtualPosition(startLat, startLon, distanceKm * (i / steps));
        pathPts.push(latLonToVec3(pLat, pLon, 1.012));
      }
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pathPts),
          new THREE.LineBasicMaterial({ color: 0x30d158 })
        )
      );

      // Runner dot
      const runnerDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x30d158 })
      );
      runnerDot.position.copy(runVec);
      scene.add(runnerDot);

      // Runner pulse ring
      const runnerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.032, 0.044, 32),
        new THREE.MeshBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      runnerRing.position.copy(runVec);
      runnerRing.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(runnerRing);

      // City dots on globe
      const passedMat = new THREE.MeshBasicMaterial({ color: 0x30d158 });
      const upcomingMat = new THREE.MeshBasicMaterial({ color: 0x556677 });
      const landmarkMat = new THREE.MeshBasicMaterial({ color: 0xffd60a });

      const visibleCities = [
        ...cities.filter((c) => c.distance <= distanceKm),
        ...cities.filter((c) => c.distance > distanceKm).slice(0, 8),
      ].slice(0, 30);

      visibleCities.forEach((city) => {
        const v = latLonToVec3(city.lat, city.lon, 1.015);
        const passed = city.distance <= distanceKm;
        const mat = city.type === "landmark" ? landmarkMat : passed ? passedMat : upcomingMat;
        const sz = city.type === "capital" || city.type === "metro" ? 0.014 : 0.009;
        const dot = new THREE.Mesh(new THREE.SphereGeometry(sz, 8, 8), mat);
        dot.position.copy(v);
        scene.add(dot);
      });

      // Rotate globe to show runner
      const angle = Math.atan2(runVec.z, runVec.x);
      globe.rotation.y = -angle + Math.PI / 4;
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Drag to rotate
    let dragging = false;
    let lastClientX = 0;
    let autoRotate = true;

    const onPointerDown = (e: PointerEvent) => { dragging = true; lastClientX = e.clientX; autoRotate = false; };
    const onPointerUp = () => { dragging = false; };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      globe.rotation.y += (e.clientX - lastClientX) * 0.006;
      lastClientX = e.clientX;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);

    let animId: number;
    let tick = 0;
    function animate() {
      animId = requestAnimationFrame(animate);
      tick += 0.03;
      if (autoRotate) globe.rotation.y += 0.004;
      pulseRing.scale.setScalar(1 + 0.2 * Math.sin(tick));
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [distanceKm, startLat, startLon, cities]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />;
}
