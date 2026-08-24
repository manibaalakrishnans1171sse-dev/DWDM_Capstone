import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import api, { getErrorMessage } from "../api/axios";

const SIZE = 6;
const HALF = SIZE / 2;

const AXIS_COLORS = {
  department: "#2653A6", // X axis face
  time: "#0D9488", // Y axis face
  treatment_category: "#F59E0B", // Z axis face
};

const X_LABELS = ["Cardiology", "Orthopedics", "Neurology", "Radiology", "Emergency", "Pathology"];
const Y_LABELS = ["Q1-2026", "Q2-2026", "Q3-2026", "Q4-2026"];
const Z_LABELS = ["Surgery", "Lab Test", "Consultation", "Emergency", "Pharmacy", "Procedure"];

function buildMarkers() {
  const markers = [];

  // X axis (department) — bottom-front edge, varying x
  X_LABELS.forEach((label, i) => {
    const t = X_LABELS.length === 1 ? 0.5 : i / (X_LABELS.length - 1);
    markers.push({
      dimension: "department",
      value: label,
      color: AXIS_COLORS.department,
      position: new THREE.Vector3(-HALF + t * SIZE, -HALF, HALF),
    });
  });

  // Y axis (time) — left-front edge, varying y
  Y_LABELS.forEach((label, i) => {
    const t = Y_LABELS.length === 1 ? 0.5 : i / (Y_LABELS.length - 1);
    markers.push({
      dimension: "time",
      value: label,
      color: AXIS_COLORS.time,
      position: new THREE.Vector3(-HALF, -HALF + t * SIZE, HALF),
    });
  });

  // Z axis (treatment category) — bottom-left edge, varying z
  Z_LABELS.forEach((label, i) => {
    const t = Z_LABELS.length === 1 ? 0.5 : i / (Z_LABELS.length - 1);
    markers.push({
      dimension: "treatment_category",
      value: label,
      color: AXIS_COLORS.treatment_category,
      position: new THREE.Vector3(-HALF, -HALF, -HALF + t * SIZE),
    });
  });

  return markers;
}

export default function OlapCube3D() {
  const mountRef = useRef(null);
  const overlayRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const defaultCameraPos = useRef(new THREE.Vector3(9, 7, 9));

  const [tooltip, setTooltip] = useState(null); // { x, y, dimension, value }
  const [info, setInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");

  const handleLabelClick = useCallback((marker, screenX, screenY) => {
    setTooltip({ x: screenX, y: screenY, dimension: marker.dimension, value: marker.value });
    setInfo(null);
    setInfoError("");
    setInfoLoading(true);
    api
      .get("/olap/dimension-info", { params: { dimension: marker.dimension, value: marker.value } })
      .then((res) => setInfo(res.data))
      .catch((err) => setInfoError(getErrorMessage(err)))
      .finally(() => setInfoLoading(false));
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const overlay = overlayRef.current;
    if (!mount || !overlay) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8fafc");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.copy(defaultCameraPos.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.minDistance = 6;
    controls.maxDistance = 20;
    controlsRef.current = controls;

    // Wireframe cube outline
    const boxGeom = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
    const edges = new THREE.EdgesGeometry(boxGeom);
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: "#94a3b8" }));
    scene.add(wireframe);

    // Colored translucent faces: X (right) = navy, Y (top) = teal, Z (front) = gold
    const faceMaterial = (color) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide });

    const xFace = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), faceMaterial(AXIS_COLORS.department));
    xFace.position.set(HALF, 0, 0);
    xFace.rotation.y = Math.PI / 2;
    scene.add(xFace);

    const yFace = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), faceMaterial(AXIS_COLORS.time));
    yFace.position.set(0, HALF, 0);
    yFace.rotation.x = Math.PI / 2;
    scene.add(yFace);

    const zFace = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), faceMaterial(AXIS_COLORS.treatment_category));
    zFace.position.set(0, 0, HALF);
    scene.add(zFace);

    // Axis label markers: small spheres + HTML overlay labels
    const markers = buildMarkers();
    const sphereGeom = new THREE.SphereGeometry(0.12, 16, 16);
    markers.forEach((m) => {
      const sphere = new THREE.Mesh(sphereGeom, new THREE.MeshBasicMaterial({ color: m.color }));
      sphere.position.copy(m.position);
      scene.add(sphere);

      const el = document.createElement("button");
      el.textContent = m.value;
      el.style.position = "absolute";
      el.style.transform = "translate(-50%, -50%)";
      el.style.padding = "2px 8px";
      el.style.borderRadius = "999px";
      el.style.fontSize = "11px";
      el.style.fontWeight = "600";
      el.style.color = "#fff";
      el.style.background = m.color;
      el.style.border = "1.5px solid white";
      el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.25)";
      el.style.cursor = "pointer";
      el.style.whiteSpace = "nowrap";
      el.style.pointerEvents = "auto";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = overlay.getBoundingClientRect();
        handleLabelClick(m, parseFloat(el.style.left), parseFloat(el.style.top));
      });
      overlay.appendChild(el);
      m.el = el;
    });

    // Lighting (harmless for MeshBasicMaterial but useful if materials change later)
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    let frameId;
    const vector = new THREE.Vector3();

    function animate() {
      frameId = requestAnimationFrame(animate);
      controls.update();

      const w = mount.clientWidth;
      const h = mount.clientHeight;

      markers.forEach((m) => {
        vector.copy(m.position).project(camera);
        const x = (vector.x * 0.5 + 0.5) * w;
        const y = (-vector.y * 0.5 + 0.5) * h;
        m.el.style.left = `${x}px`;
        m.el.style.top = `${y}px`;
        m.el.style.display = vector.z < 1 ? "block" : "none";
      });

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      boxGeom.dispose();
      edges.dispose();
      sphereGeom.dispose();
      markers.forEach((m) => m.el.remove());
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [handleLabelClick]);

  function handleReset() {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.copy(defaultCameraPos.current);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }

  return (
    <div className="relative">
      <div ref={mountRef} className="w-full h-[500px] rounded-xl border border-slate-200 overflow-hidden" />
      <div ref={overlayRef} className="absolute inset-0 pointer-events-none" />

      <button
        onClick={handleReset}
        className="absolute top-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-md bg-white/90 border border-slate-300 shadow-sm hover:bg-white"
      >
        Reset View
      </button>

      {tooltip && (
        <div
          className="absolute z-20 w-[280px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
          style={{
            left: Math.min(Math.max(tooltip.x, 150), (mountRef.current?.clientWidth || 600) - 150),
            top: Math.min(tooltip.y + 16, (mountRef.current?.clientHeight || 500) - 160),
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-navy text-white px-4 py-2.5 flex items-center justify-between">
            <span className="font-semibold text-sm truncate">{tooltip.value}</span>
            <button onClick={() => setTooltip(null)} className="text-white/70 hover:text-white text-sm leading-none">
              ✕
            </button>
          </div>
          <div className="p-4 space-y-2">
            {infoLoading && (
              <>
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-3 w-full" />
              </>
            )}
            {infoError && <p className="text-xs text-coral">{infoError}</p>}
            {info && !infoLoading && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal">{info.dimension_type}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">Total Revenue</p>
                    <p className="font-semibold text-slate-800">₹{Number(info.total_revenue).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Visit Count</p>
                    <p className="font-semibold text-slate-800">{info.visit_count}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Top treatment: <span className="font-medium text-slate-700">{info.top_treatment}</span>
                </p>
                <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2">{info.description}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
