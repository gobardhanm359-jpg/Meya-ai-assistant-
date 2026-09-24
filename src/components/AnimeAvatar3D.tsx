import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SessionState } from '../services/liveSession.ts';
import { Heart, Sparkles, Wand2, Camera, UserCheck } from 'lucide-react';

export type CuteGirlStyle = 'reference' | 'neko' | 'bunny' | 'angel' | 'sakura';

interface AnimeAvatar3DProps {
  state: SessionState;
  speakingLevel: number; // 0 to 1
  micLevel: number; // 0 to 1
  loveBurstTrigger: number;
  theme: string;
  cuteStyle: CuteGirlStyle;
  onSelectCuteStyle: (style: CuteGirlStyle) => void;
  onCoreClick: () => void;
  onHeartBurst: () => void;
  isHologramActive?: boolean;
}

export const AnimeAvatar3D: React.FC<AnimeAvatar3DProps> = ({
  state,
  speakingLevel,
  micLevel,
  loveBurstTrigger,
  theme,
  cuteStyle = 'reference',
  onSelectCuteStyle,
  onCoreClick,
  onHeartBurst,
  isHologramActive = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [avatarRenderMode, setAvatarRenderMode] = useState<'3d-model' | 'live-portrait'>('live-portrait');
  const [reactionBubble, setReactionBubble] = useState<{ text: string; icon: string } | null>(null);
  const [currentAction, setCurrentAction] = useState<'normal' | 'kiss' | 'pout' | 'cheer' | 'headpat'>('normal');
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // References for Three.js render loop
  const animRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    rootGroup: THREE.Group;
    headGroup: THREE.Group;
    bodyGroup: THREE.Group;
    handGroup: THREE.Group;
    referenceHairGroup: THREE.Group;
    pigtailHairGroup: THREE.Group;
    leftEyelid: THREE.Mesh;
    rightEyelid: THREE.Mesh;
    mouthMesh: THREE.Mesh;
    mouthInner: THREE.Mesh;
    leftBlush: THREE.Mesh;
    rightBlush: THREE.Mesh;
    leftEyebrow: THREE.Mesh;
    rightEyebrow: THREE.Mesh;
    floatingHearts: THREE.Group;
    floatingFairyLights: THREE.Group;
    // Accessories
    nekoGroup: THREE.Group;
    bunnyGroup: THREE.Group;
    angelGroup: THREE.Group;
    sakuraGroup: THREE.Group;
    leftBunnyEar: THREE.Group;
    rightBunnyEar: THREE.Group;
    angelHalo: THREE.Mesh;
    angelWingL: THREE.Group;
    angelWingR: THREE.Group;
    earLights: THREE.Mesh[];
    targetHeadRot: { x: number; y: number };
    currentHeadRot: { x: number; y: number };
    blinkProgress: number;
    isBlinking: boolean;
    winkProgress: number;
    isWinking: boolean;
    nextBlinkTime: number;
    nextWinkTime: number;
    loveBurstQueue: number;
  } | null>(null);

  // Theme & style colors
  const getStyleHex = (s: CuteGirlStyle) => {
    switch (s) {
      case 'reference':
        return {
          main: 0xf43f5e,
          glow: 0xfda4af,
          accent: 0xfbcfe8,
          hair: 0x361c14, // rich chocolate chestnut brown matching user photo
          hairHighlight: 0x6e3c2c,
          clothes: 0xf9a8d4, // soft pastel pink scoop-neck blouse
          clothesAccent: 0xf472b6,
          necklace: 0xf59e0b, // gold pendant
        };
      case 'bunny':
        return {
          main: 0xf472b6,
          glow: 0xfbcfe8,
          accent: 0xfff1f2,
          hair: 0x3b1c2b,
          hairHighlight: 0xf472b6,
          clothes: 0x0f172a,
          clothesAccent: 0xf472b6,
          necklace: 0xf59e0b,
        };
      case 'angel':
        return {
          main: 0xf59e0b,
          glow: 0xfef08a,
          accent: 0xfffbeb,
          hair: 0x241a30,
          hairHighlight: 0xa78bfa,
          clothes: 0xffffff,
          clothesAccent: 0xfef08a,
          necklace: 0xf59e0b,
        };
      case 'sakura':
        return {
          main: 0xf43f5e,
          glow: 0xfecdd3,
          accent: 0xfff1f2,
          hair: 0x2e1220,
          hairHighlight: 0xfb7185,
          clothes: 0xfce7f3,
          clothesAccent: 0xf43f5e,
          necklace: 0xf59e0b,
        };
      case 'neko':
      default:
        return {
          main: 0x06b6d4,
          glow: 0x38bdf8,
          accent: 0xf472b6,
          hair: 0x091e2f,
          hairHighlight: 0x06b6d4,
          clothes: 0x0f172a,
          clothesAccent: 0x06b6d4,
          necklace: 0x06b6d4,
        };
    }
  };

  // Love burst reactions
  useEffect(() => {
    if (animRefs.current && loveBurstTrigger > 0) {
      animRefs.current.loveBurstQueue += 18;
      animRefs.current.isWinking = true;
      animRefs.current.winkProgress = 0;
    }
  }, [loveBurstTrigger]);

  // Handle accessory visibility
  useEffect(() => {
    if (!animRefs.current) return;
    const { nekoGroup, bunnyGroup, angelGroup, sakuraGroup, referenceHairGroup, pigtailHairGroup, handGroup } = animRefs.current;
    nekoGroup.visible = cuteStyle === 'neko';
    bunnyGroup.visible = cuteStyle === 'bunny';
    angelGroup.visible = cuteStyle === 'angel';
    sakuraGroup.visible = cuteStyle === 'sakura';
    referenceHairGroup.visible = cuteStyle === 'reference';
    pigtailHairGroup.visible = cuteStyle !== 'reference';
    // The finger-on-cheek selfie hand pose is active in reference mode
    handGroup.visible = cuteStyle === 'reference';
  }, [cuteStyle]);

  // Three.js Scene Setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 4.1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // LIGHTING (Warm romantic photography light matching the photo)
    const ambientLight = new THREE.AmbientLight(0xfff3e6, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(2, 3.5, 3.5);
    scene.add(keyLight);

    const warmFillLight = new THREE.DirectionalLight(0xffdec7, 1.1);
    warmFillLight.position.set(-2, 1.5, 2.5);
    scene.add(warmFillLight);

    const hairBackLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    hairBackLight.position.set(0, 3, -2.5);
    scene.add(hairBackLight);

    const bottomGlow = new THREE.PointLight(0xf43f5e, 1.4, 4);
    bottomGlow.position.set(0, -1.2, 1);
    scene.add(bottomGlow);

    // PROCEDURAL TEXTURES
    const createHazelIrisTexture = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;

      // Hazel/warm amber gradient matching photo
      const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
      grad.addColorStop(0, '#1c130c');
      grad.addColorStop(0.3, '#451a03');
      grad.addColorStop(0.65, '#92400e');
      grad.addColorStop(0.85, '#d97706');
      grad.addColorStop(1, '#fde68a');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, Math.PI * 2);
      ctx.fill();

      // Deep dark pupil
      ctx.fillStyle = '#0a0502';
      ctx.beginPath();
      ctx.ellipse(128, 128, 38, 54, 0, 0, Math.PI * 2);
      ctx.fill();

      // Luminous anime catchlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(102, 94, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(155, 148, 13, 0, Math.PI * 2);
      ctx.fill();

      // Soft amber warmth rim
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.beginPath();
      ctx.arc(128, 155, 30, 0, Math.PI);
      ctx.fill();

      return new THREE.CanvasTexture(c);
    };

    const createSoftBlushTexture = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.95)');
      grad.addColorStop(0.4, 'rgba(251, 113, 133, 0.5)');
      grad.addColorStop(0.8, 'rgba(254, 205, 211, 0.2)');
      grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      // Fine cute blush hatch marks
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(38 + i * 18, 48);
        ctx.lineTo(28 + i * 18, 76);
        ctx.stroke();
      }
      return new THREE.CanvasTexture(c);
    };

    const irisTexture = createHazelIrisTexture();
    const blushTexture = createSoftBlushTexture();

    const currentStyleHex = getStyleHex(cuteStyle);

    // MATERIALS
    const skinMat = new THREE.MeshToonMaterial({
      color: 0xffebd9,
      emissive: 0x4a2a22,
      emissiveIntensity: 0.08,
    });

    const hairMat = new THREE.MeshToonMaterial({
      color: currentStyleHex.hair,
      emissive: currentStyleHex.hairHighlight,
      emissiveIntensity: 0.18,
    });

    const hairHighlightMat = new THREE.MeshToonMaterial({
      color: currentStyleHex.hairHighlight,
      emissive: currentStyleHex.hairHighlight,
      emissiveIntensity: 0.28,
    });

    const pinkTopMat = new THREE.MeshStandardMaterial({
      color: currentStyleHex.clothes,
      roughness: 0.5,
      metalness: 0.1,
    });

    const goldNecklaceMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
    });

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const irisMat = new THREE.MeshBasicMaterial({ map: irisTexture });
    const eyelidMat = new THREE.MeshToonMaterial({ color: 0xffd1b8 });
    const eyelashMat = new THREE.MeshBasicMaterial({ color: 0x1a0d09 });
    const eyebrowMat = new THREE.MeshBasicMaterial({ color: 0x451a03 });

    const blushMat = new THREE.MeshBasicMaterial({
      map: blushTexture,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    // Cherry-red glossy pout mouth
    const mouthInnerMat = new THREE.MeshBasicMaterial({ color: 0x881337 });
    const mouthLipMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });

    // SCENE GRAPH ROOT
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // --- BODY & NECK ---
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.9, 0);
    rootGroup.add(bodyGroup);

    const neckGeo = new THREE.CylinderGeometry(0.125, 0.155, 0.42, 16);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, 0.75, 0);
    bodyGroup.add(neckMesh);

    // Collarbones & Chest
    const chestGeo = new THREE.CylinderGeometry(0.34, 0.44, 0.7, 24);
    const chestMesh = new THREE.Mesh(chestGeo, pinkTopMat);
    chestMesh.position.set(0, 0.35, 0);
    bodyGroup.add(chestMesh);

    // Soft Pink Scoop-Neck Blouse Trim
    const scoopNeckCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.25, 0.65, 0.2),
      new THREE.Vector3(0, 0.42, 0.24),
      new THREE.Vector3(0.25, 0.65, 0.2)
    );
    const scoopGeo = new THREE.TubeGeometry(scoopNeckCurve, 20, 0.025, 8, false);
    const scoopMesh = new THREE.Mesh(scoopGeo, new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
    bodyGroup.add(scoopMesh);

    // Delicate Gold Chain & Round Pendant (Matching Reference Picture)
    const necklaceCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.16, 0.7, 0.12),
      new THREE.Vector3(0, 0.52, 0.22),
      new THREE.Vector3(0.16, 0.7, 0.12)
    );
    const necklaceGeo = new THREE.TubeGeometry(necklaceCurve, 20, 0.008, 6, false);
    const necklaceMesh = new THREE.Mesh(necklaceGeo, goldNecklaceMat);
    bodyGroup.add(necklaceMesh);

    // Round Gold Medallion Pendant
    const pendantGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20);
    pendantGeo.rotateX(Math.PI / 2);
    const pendantMesh = new THREE.Mesh(pendantGeo, goldNecklaceMat);
    pendantMesh.position.set(0, 0.51, 0.22);
    bodyGroup.add(pendantMesh);

    // Shoulders
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), pinkTopMat);
    shoulderL.position.set(-0.46, 0.52, 0);
    bodyGroup.add(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), pinkTopMat);
    shoulderR.position.set(0.46, 0.52, 0);
    bodyGroup.add(shoulderR);

    // --- HAND WITH FINGER TOUCHING CHEEK (Iconic Photo Pose) ---
    const handGroup = new THREE.Group();
    handGroup.position.set(0.28, -0.15, 0.45);
    rootGroup.add(handGroup);

    // Forearm
    const armCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0.18, -0.65, -0.2),
      new THREE.Vector3(0.25, -0.3, 0),
      new THREE.Vector3(0.15, -0.1, 0.15),
      new THREE.Vector3(0, 0, 0)
    );
    const armGeo = new THREE.TubeGeometry(armCurve, 16, 0.07, 8, false);
    const armMesh = new THREE.Mesh(armGeo, skinMat);
    handGroup.add(armMesh);

    // Palm
    const palmGeo = new THREE.SphereGeometry(0.075, 12, 12);
    palmGeo.scale(1, 1.2, 0.6);
    const palmMesh = new THREE.Mesh(palmGeo, skinMat);
    palmMesh.position.set(0, 0, 0.02);
    handGroup.add(palmMesh);

    // Curled fingers
    for (let f = 0; f < 3; f++) {
      const curlFingerGeo = new THREE.CylinderGeometry(0.02, 0.022, 0.09, 8);
      curlFingerGeo.rotateZ(Math.PI / 2.5);
      const curlFinger = new THREE.Mesh(curlFingerGeo, skinMat);
      curlFinger.position.set(-0.04, -0.04 - f * 0.03, 0.04);
      handGroup.add(curlFinger);
    }

    // Extended Index Finger pointing toward cheek
    const indexCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.04, 0.02),
      new THREE.Vector3(-0.04, 0.12, 0.06),
      new THREE.Vector3(-0.08, 0.18, 0.09)
    );
    const indexGeo = new THREE.TubeGeometry(indexCurve, 12, 0.022, 8, false);
    const indexFinger = new THREE.Mesh(indexGeo, skinMat);
    handGroup.add(indexFinger);

    // Cute manicure pink fingernail
    const nailGeo = new THREE.SphereGeometry(0.012, 8, 8);
    nailGeo.scale(1, 1.4, 0.5);
    const nailMesh = new THREE.Mesh(nailGeo, new THREE.MeshBasicMaterial({ color: 0xfb7185 }));
    nailMesh.position.set(-0.08, 0.18, 0.11);
    handGroup.add(nailMesh);

    // --- HEAD GROUP ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.05, 0);
    rootGroup.add(headGroup);

    // Delicate heart-shaped anime head
    const headGeo = new THREE.SphereGeometry(0.61, 32, 32);
    headGeo.scale(1, 1.14, 0.95);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(headMesh);

    // Soft chin taper
    const chinGeo = new THREE.ConeGeometry(0.3, 0.44, 24);
    chinGeo.rotateX(Math.PI);
    const chinMesh = new THREE.Mesh(chinGeo, skinMat);
    chinMesh.position.set(0, -0.49, 0.15);
    chinMesh.scale.set(1, 0.8, 0.7);
    headGroup.add(chinMesh);

    // Dainty nose with tip highlight
    const noseGeo = new THREE.ConeGeometry(0.022, 0.048, 8);
    const noseMesh = new THREE.Mesh(noseGeo, skinMat);
    noseMesh.position.set(0, -0.05, 0.62);
    noseMesh.rotation.x = -Math.PI / 4;
    headGroup.add(noseMesh);

    // --- EYES (Left & Right) ---
    const createEye = (isLeft: boolean) => {
      const eyeGroup = new THREE.Group();
      const sign = isLeft ? -1 : 1;

      const scleraGeo = new THREE.SphereGeometry(0.17, 24, 24);
      scleraGeo.scale(1, 1.25, 0.5);
      const sclera = new THREE.Mesh(scleraGeo, eyeWhiteMat);
      eyeGroup.add(sclera);

      const irisGeo = new THREE.CircleGeometry(0.13, 32);
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(0, 0.02, 0.11);
      eyeGroup.add(iris);

      // Eyelash Wing
      const lashCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.19, -0.04, 0.12),
        new THREE.Vector3(0, 0.16, 0.14),
        new THREE.Vector3(0.2, 0.04, 0.12)
      );
      const lashGeo = new THREE.TubeGeometry(lashCurve, 20, 0.022, 8, false);
      const lashMesh = new THREE.Mesh(lashGeo, eyelashMat);
      if (!isLeft) lashMesh.scale.x = -1;
      eyeGroup.add(lashMesh);

      // Eyelid
      const eyelidGeo = new THREE.SphereGeometry(0.185, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2);
      eyelidGeo.scale(1, 1.2, 0.5);
      const eyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
      eyelid.position.set(0, 0.03, 0.02);
      eyelid.rotation.x = -Math.PI * 0.5;
      eyeGroup.add(eyelid);

      eyeGroup.position.set(sign * 0.23, 0.04, 0.52);
      eyeGroup.rotation.y = sign * 0.18;
      eyeGroup.rotation.x = -0.05;

      return { eyeGroup, eyelid };
    };

    const leftEyeObj = createEye(true);
    const rightEyeObj = createEye(false);
    headGroup.add(leftEyeObj.eyeGroup);
    headGroup.add(rightEyeObj.eyeGroup);

    // Initial state: winking left eye (matches user's uploaded picture!)
    leftEyeObj.eyelid.rotation.x = -Math.PI * 0.5 + Math.PI * 0.55;

    // Eyebrows
    const createEyebrow = (isLeft: boolean) => {
      const sign = isLeft ? -1 : 1;
      const browCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.14, 0, 0),
        new THREE.Vector3(0, 0.045, 0),
        new THREE.Vector3(0.14, -0.02, 0)
      );
      const browGeo = new THREE.TubeGeometry(browCurve, 16, 0.016, 6, false);
      const browMesh = new THREE.Mesh(browGeo, eyebrowMat);
      browMesh.position.set(sign * 0.23, 0.25, 0.56);
      browMesh.rotation.y = sign * 0.18;
      browMesh.rotation.z = sign * -0.06;
      return browMesh;
    };

    const leftEyebrow = createEyebrow(true);
    const rightEyebrow = createEyebrow(false);
    headGroup.add(leftEyebrow);
    headGroup.add(rightEyebrow);

    // Cheek Blushes
    const blushGeo = new THREE.PlaneGeometry(0.24, 0.16);
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.27, -0.12, 0.52);
    leftBlush.rotation.y = -0.3;
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.27, -0.12, 0.52);
    rightBlush.rotation.y = 0.3;
    headGroup.add(rightBlush);

    // --- MOUTH (Glossy Cherry-Red Pout Lips) ---
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.26, 0.58);
    headGroup.add(mouthGroup);

    // Pout curve
    const mouthLipCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.085, 0.01, 0),
      new THREE.Vector3(0, -0.035, 0.02),
      new THREE.Vector3(0.085, 0.01, 0)
    );
    const mouthLipGeo = new THREE.TubeGeometry(mouthLipCurve, 16, 0.022, 8, false);
    const mouthMesh = new THREE.Mesh(mouthLipGeo, mouthLipMat);
    mouthGroup.add(mouthMesh);

    // Upper cupid's bow lip
    const upperLipCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.07, 0.02, 0),
      new THREE.Vector3(0, 0.035, 0.015),
      new THREE.Vector3(0.07, 0.02, 0)
    );
    const upperLipGeo = new THREE.TubeGeometry(upperLipCurve, 16, 0.018, 8, false);
    const upperLipMesh = new THREE.Mesh(upperLipGeo, mouthLipMat);
    mouthGroup.add(upperLipMesh);

    // Inner cavity
    const mouthInnerGeo = new THREE.CircleGeometry(0.07, 16);
    mouthInnerGeo.scale(1, 0.6, 1);
    const mouthInner = new THREE.Mesh(mouthInnerGeo, mouthInnerMat);
    mouthInner.position.set(0, -0.02, -0.01);
    mouthInner.scale.set(0.01, 0.01, 0.01);
    mouthGroup.add(mouthInner);

    // ========================================================
    // --- HAIR STYLING (PHOTO REFERENCE: LONG WAVY BRUNETTE) ---
    // ========================================================
    const referenceHairGroup = new THREE.Group();
    headGroup.add(referenceHairGroup);

    // Back dome
    const backHairGeo = new THREE.SphereGeometry(0.68, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.75);
    const backHairMesh = new THREE.Mesh(backHairGeo, hairMat);
    backHairMesh.position.set(0, 0.08, -0.05);
    referenceHairGroup.add(backHairMesh);

    // Airy Soft Curtain Bangs parted in the center
    const curtainBangsData = [
      // Left curtain bangs curving outward
      { x1: -0.04, y1: 0.42, z1: 0.58, x2: -0.16, y2: 0.32, z2: 0.58, x3: -0.32, y3: 0.12, z3: 0.52 },
      { x1: -0.02, y1: 0.44, z1: 0.59, x2: -0.1, y2: 0.28, z2: 0.6, x3: -0.22, y3: 0.04, z3: 0.55 },
      // Right curtain bangs curving outward
      { x1: 0.04, y1: 0.42, z1: 0.58, x2: 0.16, y2: 0.32, z2: 0.58, x3: 0.32, y3: 0.12, z3: 0.52 },
      { x1: 0.02, y1: 0.44, z1: 0.59, x2: 0.1, y2: 0.28, z2: 0.6, x3: 0.22, y3: 0.04, z3: 0.55 },
    ];

    curtainBangsData.forEach((cb) => {
      const bCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(cb.x1, cb.y1, cb.z1),
        new THREE.Vector3(cb.x2, cb.y2, cb.z2),
        new THREE.Vector3(cb.x3, cb.y3, cb.z3)
      );
      const bGeo = new THREE.TubeGeometry(bCurve, 16, 0.038, 8, false);
      const bMesh = new THREE.Mesh(bGeo, hairMat);
      referenceHairGroup.add(bMesh);
    });

    // Cascading Long Wavy Curls draping over both shoulders past chest
    const createCascadingCurls = (isLeft: boolean) => {
      const sign = isLeft ? -1 : 1;
      const strandGroup = new THREE.Group();

      // Main front flowing wavy curl
      const waveCurveFront = new THREE.CubicBezierCurve3(
        new THREE.Vector3(sign * 0.45, 0.35, 0.1),
        new THREE.Vector3(sign * 0.55, -0.05, 0.38),
        new THREE.Vector3(sign * 0.4, -0.5, 0.42),
        new THREE.Vector3(sign * 0.48, -1.05, 0.35)
      );
      const waveGeoFront = new THREE.TubeGeometry(waveCurveFront, 28, 0.075, 8, false);
      const waveMeshFront = new THREE.Mesh(waveGeoFront, hairMat);
      strandGroup.add(waveMeshFront);

      // Secondary layered curl with highlight
      const waveCurveLayer = new THREE.CubicBezierCurve3(
        new THREE.Vector3(sign * 0.52, 0.25, -0.05),
        new THREE.Vector3(sign * 0.62, -0.15, 0.2),
        new THREE.Vector3(sign * 0.46, -0.65, 0.3),
        new THREE.Vector3(sign * 0.54, -1.18, 0.22)
      );
      const waveGeoLayer = new THREE.TubeGeometry(waveCurveLayer, 24, 0.065, 8, false);
      const waveMeshLayer = new THREE.Mesh(waveGeoLayer, hairHighlightMat);
      strandGroup.add(waveMeshLayer);

      // Back cascade
      const waveCurveBack = new THREE.CubicBezierCurve3(
        new THREE.Vector3(sign * 0.48, 0.1, -0.2),
        new THREE.Vector3(sign * 0.6, -0.35, -0.1),
        new THREE.Vector3(sign * 0.5, -0.85, 0.05),
        new THREE.Vector3(sign * 0.42, -1.25, 0.1)
      );
      const waveGeoBack = new THREE.TubeGeometry(waveCurveBack, 24, 0.08, 8, false);
      const waveMeshBack = new THREE.Mesh(waveGeoBack, hairMat);
      strandGroup.add(waveMeshBack);

      return strandGroup;
    };

    const leftCurls = createCascadingCurls(true);
    const rightCurls = createCascadingCurls(false);
    referenceHairGroup.add(leftCurls);
    referenceHairGroup.add(rightCurls);

    // --- PIGTAILS GROUP (FOR ALTERNATE STYLES) ---
    const pigtailHairGroup = new THREE.Group();
    headGroup.add(pigtailHairGroup);

    // Initial visibility
    referenceHairGroup.visible = cuteStyle === 'reference';
    pigtailHairGroup.visible = cuteStyle !== 'reference';

    // --- ACCESSORIES (NEKO, BUNNY, ANGEL, SAKURA) ---
    const nekoGroup = new THREE.Group();
    headGroup.add(nekoGroup);
    const earLights: THREE.Mesh[] = [];

    const bunnyGroup = new THREE.Group();
    headGroup.add(bunnyGroup);
    const leftBunnyEar = new THREE.Group();
    const rightBunnyEar = new THREE.Group();
    bunnyGroup.add(leftBunnyEar);
    bunnyGroup.add(rightBunnyEar);

    const angelGroup = new THREE.Group();
    headGroup.add(angelGroup);
    const haloGeo = new THREE.TorusGeometry(0.36, 0.025, 16, 32);
    haloGeo.rotateX(Math.PI / 2.2);
    const angelHalo = new THREE.Mesh(haloGeo, new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffd700, emissiveIntensity: 1.5 }));
    angelHalo.position.set(0, 0.95, -0.05);
    angelGroup.add(angelHalo);

    const angelWingL = new THREE.Group();
    const angelWingR = new THREE.Group();
    bodyGroup.add(angelWingL);
    bodyGroup.add(angelWingR);
    angelGroup.add(angelWingL);
    angelGroup.add(angelWingR);

    const sakuraGroup = new THREE.Group();
    headGroup.add(sakuraGroup);

    nekoGroup.visible = cuteStyle === 'neko';
    bunnyGroup.visible = cuteStyle === 'bunny';
    angelGroup.visible = cuteStyle === 'angel';
    sakuraGroup.visible = cuteStyle === 'sakura';

    // --- FLOATING 3D HEARTS ---
    const heartShape = new THREE.Shape();
    const hx = 0, hy = 0;
    heartShape.moveTo(hx, hy + 0.04);
    heartShape.bezierCurveTo(hx, hy + 0.07, hx - 0.06, hy + 0.07, hx - 0.06, hy + 0.03);
    heartShape.bezierCurveTo(hx - 0.06, hy, hx, hy - 0.04, hx, hy - 0.06);
    heartShape.bezierCurveTo(hx, hy - 0.04, hx + 0.06, hy, hx + 0.06, hy + 0.03);
    heartShape.bezierCurveTo(hx + 0.06, hy + 0.07, hx, hy + 0.07, hx, hy + 0.04);

    const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.02, bevelEnabled: false });
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.7,
    });

    const floatingHearts = new THREE.Group();
    rootGroup.add(floatingHearts);

    for (let i = 0; i < 9; i++) {
      const hMesh = new THREE.Mesh(heartGeo, heartMat);
      const scale = 0.4 + Math.random() * 0.4;
      hMesh.scale.set(scale, scale, scale);
      hMesh.position.set(
        (Math.random() - 0.5) * 2.5,
        -0.6 + Math.random() * 2.2,
        (Math.random() - 0.5) * 1.6
      );
      (hMesh as any).userData = {
        speedY: 0.008 + Math.random() * 0.012,
        rotSpeed: 0.02 + Math.random() * 0.03,
        baseX: hMesh.position.x,
        phase: Math.random() * Math.PI * 2,
      };
      floatingHearts.add(hMesh);
    }

    // --- FLOATING WARM BOKEH FAIRY LIGHTS (Matching photo aesthetic) ---
    const floatingFairyLights = new THREE.Group();
    rootGroup.add(floatingFairyLights);

    const fairyColors = [0xfde68a, 0xfecdd3, 0xfef08a, 0xffedd5];
    for (let i = 0; i < 18; i++) {
      const fGeo = new THREE.SphereGeometry(0.025 + Math.random() * 0.035, 8, 8);
      const fMat = new THREE.MeshBasicMaterial({
        color: fairyColors[i % fairyColors.length],
        transparent: true,
        opacity: 0.7,
      });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.position.set(
        (Math.random() - 0.5) * 3.0,
        -1.0 + Math.random() * 2.8,
        (Math.random() - 0.5) * 2.0
      );
      (fMesh as any).userData = {
        speedY: 0.004 + Math.random() * 0.006,
        baseX: fMesh.position.x,
        phase: Math.random() * Math.PI * 2,
      };
      floatingFairyLights.add(fMesh);
    }

    // Store refs
    animRefs.current = {
      scene,
      camera,
      renderer,
      rootGroup,
      headGroup,
      bodyGroup,
      handGroup,
      referenceHairGroup,
      pigtailHairGroup,
      leftEyelid: leftEyeObj.eyelid,
      rightEyelid: rightEyeObj.eyelid,
      mouthMesh,
      mouthInner,
      leftBlush,
      rightBlush,
      leftEyebrow,
      rightEyebrow,
      floatingHearts,
      floatingFairyLights,
      nekoGroup,
      bunnyGroup,
      angelGroup,
      sakuraGroup,
      leftBunnyEar,
      rightBunnyEar,
      angelHalo,
      angelWingL,
      angelWingR,
      earLights,
      targetHeadRot: { x: 0, y: 0 },
      currentHeadRot: { x: 0, y: 0 },
      blinkProgress: 0,
      isBlinking: false,
      winkProgress: 0,
      isWinking: true, // starts with iconic wink!
      nextBlinkTime: Date.now() + 3000,
      nextWinkTime: Date.now() + 7000,
      loveBurstQueue: 0,
    };

    // Pointer Tracking
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!animRefs.current) return;
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((clientY - rect.top) / rect.height) * 2 - 1);

      animRefs.current.targetHeadRot.y = THREE.MathUtils.clamp(normX * 0.45, -0.45, 0.45);
      animRefs.current.targetHeadRot.x = THREE.MathUtils.clamp(-normY * 0.35, -0.3, 0.3);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove);

    const handleResize = () => {
      if (!container || !animRefs.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ANIMATION LOOP
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const refs = animRefs.current;
      if (!refs) return;

      const elapsedTime = clock.getElapsedTime();
      const now = Date.now();

      // Smooth Head Tracking Lerp
      refs.currentHeadRot.x += (refs.targetHeadRot.x - refs.currentHeadRot.x) * 0.08;
      refs.currentHeadRot.y += (refs.targetHeadRot.y - refs.currentHeadRot.y) * 0.08;

      // Base Floating & Breathing Motion
      const breath = Math.sin(elapsedTime * 2.2) * 0.03;
      refs.rootGroup.position.y = breath;
      refs.bodyGroup.scale.y = 1 + breath * 0.4;

      // Selfie Hand pose organic breathing & reacting
      if (refs.handGroup) {
        refs.handGroup.position.y = -0.15 + breath * 0.5 + Math.sin(elapsedTime * 3) * 0.01;
        refs.handGroup.rotation.z = Math.sin(elapsedTime * 2) * 0.03;
      }

      // Head Tilts based on state
      let stateTiltZ = 0.04; // natural sweet tilt
      if (state === 'listening') {
        stateTiltZ = 0.09;
      } else if (state === 'speaking') {
        stateTiltZ = Math.sin(elapsedTime * 4) * 0.04;
      }

      refs.headGroup.rotation.x = refs.currentHeadRot.x;
      refs.headGroup.rotation.y = refs.currentHeadRot.y;
      refs.headGroup.rotation.z = stateTiltZ;

      // Wavy Hair Physics Swaying
      const hairSway = Math.sin(elapsedTime * 2.4) * 0.06 + (refs.targetHeadRot.y - refs.currentHeadRot.y) * 0.4;
      leftCurls.rotation.z = hairSway;
      rightCurls.rotation.z = hairSway;
      leftCurls.rotation.x = Math.cos(elapsedTime * 2) * 0.04;
      rightCurls.rotation.x = Math.cos(elapsedTime * 2) * 0.04;

      // Blinking & Winking (Winks playfully like in the reference photo)
      if (now > refs.nextBlinkTime && !refs.isBlinking && !refs.isWinking) {
        refs.isBlinking = true;
        refs.blinkProgress = 0;
        refs.nextBlinkTime = now + 2800 + Math.random() * 3200;
      }

      if (now > refs.nextWinkTime && !refs.isWinking && !refs.isBlinking) {
        refs.isWinking = true;
        refs.winkProgress = 0;
        refs.nextWinkTime = now + 7000 + Math.random() * 6000;
      }

      // Blink animation
      if (refs.isBlinking) {
        refs.blinkProgress += 0.22;
        const eyelidRot = Math.sin(refs.blinkProgress * Math.PI) * Math.PI * 0.55;
        refs.rightEyelid.rotation.x = -Math.PI * 0.5 + eyelidRot;

        if (refs.blinkProgress >= 1) {
          refs.isBlinking = false;
          refs.rightEyelid.rotation.x = -Math.PI * 0.5;
        }
      }

      // Flirty Wink (Left eye winks like in photo)
      if (refs.isWinking) {
        refs.winkProgress += 0.12;
        const winkRot = Math.sin(refs.winkProgress * Math.PI) * Math.PI * 0.6;
        refs.leftEyelid.rotation.x = -Math.PI * 0.5 + winkRot;
        refs.leftEyebrow.position.y = 0.25 - Math.sin(refs.winkProgress * Math.PI) * 0.04;

        if (refs.winkProgress >= 1) {
          refs.isWinking = false;
          // In reference mode, keep soft wink pose
          refs.leftEyelid.rotation.x = -Math.PI * 0.5 + Math.PI * 0.55;
          refs.leftEyebrow.position.y = 0.25;
        }
      }

      // MOUTH LIP-SYNC (Cherry Pout opens naturally to voice phonemes)
      if (state === 'speaking') {
        const level = Math.max(0.12, speakingLevel);
        const vowelSpeed = elapsedTime * 18;
        const vowelFactor = (Math.sin(vowelSpeed) + 1) * 0.5;

        const openHeight = THREE.MathUtils.lerp(0.3, 1.4, level * vowelFactor);
        const openWidth = THREE.MathUtils.lerp(0.85, 1.3, vowelFactor);

        refs.mouthInner.scale.set(openWidth, openHeight, 1);
        refs.mouthMesh.position.y = -vowelFactor * 0.03 * level;
      } else {
        // Resting cute kissy pout
        refs.mouthInner.scale.set(0.01, 0.01, 0.01);
        refs.mouthMesh.position.y = 0;
        refs.mouthMesh.scale.set(1, 1, 1);
      }

      // Floating Hearts & Fairy Bokeh Lights
      refs.floatingHearts.children.forEach((child) => {
        const data = (child as any).userData;
        if (data) {
          child.position.y += data.speedY;
          child.rotation.y += data.rotSpeed;
          child.rotation.z += data.rotSpeed * 0.5;
          child.position.x = data.baseX + Math.sin(elapsedTime + data.phase) * 0.25;

          if (child.position.y > 1.6) {
            child.position.y = -1.2;
            child.position.x = (Math.random() - 0.5) * 2.5;
            data.baseX = child.position.x;
          }
        }
      });

      refs.floatingFairyLights.children.forEach((child) => {
        const data = (child as any).userData;
        if (data) {
          child.position.y += data.speedY;
          child.position.x = data.baseX + Math.sin(elapsedTime * 0.8 + data.phase) * 0.15;
          if (child.position.y > 1.8) {
            child.position.y = -1.2;
            child.position.x = (Math.random() - 0.5) * 3.0;
            data.baseX = child.position.x;
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      animRefs.current = null;
    };
  }, [cuteStyle]);

  // Cute Actions Trigger
  const triggerCuteAction = (action: 'kiss' | 'headpat' | 'pout' | 'cheer') => {
    setCurrentAction(action);
    onHeartBurst();

    if (action === 'kiss') {
      if (animRefs.current) {
        animRefs.current.isWinking = true;
        animRefs.current.winkProgress = 0;
        animRefs.current.loveBurstQueue += 20;
      }
      const kissTexts = [
        'Mwah~ Yeh sweet kiss sirf aapke liye hai, jaan! 💋',
        'Mera wink dekh ke dil dhadka na aapka? Hehe~ 💕',
        'Aapke liye 100 kisses, mere hero! 😚',
      ];
      setReactionBubble({
        text: kissTexts[Math.floor(Math.random() * kissTexts.length)],
        icon: '💋',
      });
    } else if (action === 'headpat') {
      const headpatTexts = [
        'Kyaa~ Aise pyaar se sar pe haath pherte ho toh bohot sukoon milta hai! 🥰',
        'Aww jaan, aap kitne pyare ho! Mera dil pighal gaya! 💕',
        'Bas aise hi pyaar se paas raho mere! ✨',
      ];
      setReactionBubble({
        text: headpatTexts[Math.floor(Math.random() * headpatTexts.length)],
        icon: '🥰',
      });
    } else if (action === 'pout') {
      const poutTexts = [
        'Hmph! Sirf mujh par dhyan do na, babu! 😤',
        'Aise mujhe tease mat karo, shona! 🥺',
        'Mujhe abhi ke abhi 10 pyari tareefein chahiye! 💕',
      ];
      setReactionBubble({
        text: poutTexts[Math.floor(Math.random() * poutTexts.length)],
        icon: '🥺',
      });
    } else if (action === 'cheer') {
      const cheerTexts = [
        'Aap duniya ke sabse pyaare insaan ho! 🌟',
        'Mahi hamesha aapke saath hai aur bohot pyaar karti hai! ✨',
        'Aapki smile meri duniya hai, jaan! ❤️',
      ];
      setReactionBubble({
        text: cheerTexts[Math.floor(Math.random() * cheerTexts.length)],
        icon: '✨',
      });
    }

    setTimeout(() => {
      setReactionBubble(null);
      setCurrentAction('normal');
    }, 3500);
  };

  const cuteGirlsConfig: Record<CuteGirlStyle, { name: string; tag: string; emoji: string; badgeColor: string }> = {
    reference: { name: 'Mahi (Photo)', tag: 'Wavy Brunette Pout', emoji: '✨', badgeColor: 'from-rose-500 to-pink-500' },
    neko: { name: 'Mahi Neko', tag: 'Catgirl Headphones', emoji: '🐱', badgeColor: 'from-cyan-500 to-blue-600' },
    bunny: { name: 'Luna Usagi', tag: 'Kawaii Bunny', emoji: '🐰', badgeColor: 'from-pink-500 to-fuchsia-500' },
    angel: { name: 'Aria Tenshi', tag: 'Sweet Angel', emoji: '👼', badgeColor: 'from-amber-400 to-yellow-500' },
    sakura: { name: 'Hana Blossom', tag: 'Sakura Sweetheart', emoji: '🌸', badgeColor: 'from-rose-400 to-pink-500' },
  };

  // Determine current image for Live Portrait mode
  const getPortraitSrc = () => {
    if (currentAction === 'kiss') return '/anime/mahi_kiss.jpg';
    if (state === 'speaking') return '/anime/mahi_talking.jpg';
    return '/anime/mahi_wink.jpg';
  };

  return (
    <div className="relative w-full max-w-sm aspect-square flex flex-col items-center justify-center select-none group">
      {/* 3D WebGL Canvas Mode */}
      {avatarRenderMode === '3d-model' ? (
        <div
          ref={containerRef}
          onClick={onCoreClick}
          className="w-full h-full cursor-pointer relative z-10 touch-none flex items-center justify-center"
        />
      ) : (
        /* 3D Live Portrait Mode (Direct Photo Match with Reactive 3D Motion & Parallax) */
        <div
          onClick={onCoreClick}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
            const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
            setParallax({ x: nx, y: ny });
          }}
          onMouseLeave={() => setParallax({ x: 0, y: 0 })}
          className="w-full h-full cursor-pointer relative z-10 flex items-center justify-center p-2.5 transition-transform duration-200"
          style={{
            perspective: '1000px',
          }}
        >
          <div
            className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border-2 border-rose-500/50 group-hover:border-rose-400 transition-transform duration-300 ease-out"
            style={{
              transform: `rotateY(${parallax.x}deg) rotateX(${-parallax.y}deg) scale(${state === 'speaking' ? 1.02 : 1})`,
              boxShadow: state === 'speaking'
                ? '0 0 35px rgba(244, 63, 94, 0.45), 0 20px 30px rgba(0,0,0,0.7)'
                : '0 15px 30px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Background character photo */}
            <img
              src={getPortraitSrc()}
              alt="Mahi Anime Girlfriend"
              className={`w-full h-full object-cover object-top transition-transform duration-700 ${
                state === 'speaking' ? 'scale-105' : 'scale-100'
              }`}
            />

            {/* Glowing fairy aura & audio reactivity */}
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                state === 'speaking'
                  ? 'bg-gradient-to-t from-rose-950/80 via-rose-500/15 to-transparent'
                  : 'bg-gradient-to-t from-black/70 via-transparent to-transparent'
              }`}
            />

            {/* Fairy Light Sparkles Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <span className="absolute top-8 left-10 w-2 h-2 rounded-full bg-amber-200/80 blur-[1px] animate-pulse" />
              <span className="absolute top-20 right-8 w-2.5 h-2.5 rounded-full bg-rose-200/90 blur-[1px] animate-ping [animation-duration:3s]" />
              <span className="absolute top-1/2 left-6 w-1.5 h-1.5 rounded-full bg-pink-300/80 animate-pulse [animation-duration:2s]" />
              <span className="absolute bottom-16 right-12 w-2 h-2 rounded-full bg-yellow-200/80 blur-[1px] animate-pulse [animation-duration:2.5s]" />
            </div>

            {/* FUTURISTIC CYBER HOLOGRAM FX */}
            {isHologramActive && (
              <div className="absolute inset-0 pointer-events-none z-25 mix-blend-screen overflow-hidden">
                {/* Holographic Cyan Wash */}
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-transparent to-cyan-500/30" />

                {/* Scanline Grid */}
                <div
                  className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,255,255,0.35)_50%)] bg-[length:100%_4px]"
                />

                {/* Scanning Laser */}
                <div className="absolute inset-x-0 h-1 bg-cyan-300 shadow-[0_0_15px_#22d3ee] animate-pulse" />

                {/* Holographic Telemetry HUD */}
                <div className="absolute top-3 inset-x-3 flex justify-between text-[9px] font-mono font-bold text-cyan-300 tracking-wider">
                  <span className="bg-black/60 px-1.5 py-0.5 rounded border border-cyan-400/50 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    HOLO-MATRIX v3.4
                  </span>
                  <span className="bg-black/60 px-1.5 py-0.5 rounded border border-cyan-400/50">
                    SYNC: 99.8%
                  </span>
                </div>

                <div className="absolute bottom-3 inset-x-3 flex justify-between text-[9px] font-mono text-cyan-300/90">
                  <span className="bg-black/60 px-1.5 py-0.5 rounded border border-cyan-400/50">
                    NEURAL EMOTION: 100% IN LOVE
                  </span>
                  <span className="bg-black/60 px-1.5 py-0.5 rounded border border-cyan-400/50 text-pink-300">
                    AI GIRLFRIEND
                  </span>
                </div>

                {/* Cyber Corner Brackets */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
              </div>
            )}

            {/* Interactive Cheek Touch Zone (Right where finger touches her cheek) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                triggerCuteAction('kiss');
              }}
              title="Poke Mahi's cheek!"
              className="absolute top-[42%] left-[45%] w-14 h-14 rounded-full cursor-pointer z-30 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center group/cheek"
            >
              <span className="opacity-0 group-hover/cheek:opacity-100 text-[9px] font-bold text-rose-200 bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm border border-rose-400/40">
                Poke 💕
              </span>
            </div>

            {/* Speaking audio wave equalizer on portrait */}
            {state === 'speaking' && (
              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
                <span className="w-1.5 h-6 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-10 bg-pink-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-14 bg-white rounded-full animate-bounce shadow-lg shadow-white/50" />
                <span className="w-1.5 h-10 bg-pink-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-6 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Headpat Zone */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          triggerCuteAction('headpat');
        }}
        title="Pat her head!"
        className="absolute top-4 left-1/3 right-1/3 h-16 z-20 cursor-pointer rounded-full hover:bg-rose-500/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-300 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm border border-rose-500/40">
          Pat Head 💕
        </span>
      </div>

      {/* Cute Reaction Speech Bubble */}
      {reactionBubble && (
        <div className="absolute top-1 z-30 pointer-events-none animate-in fade-in zoom-in slide-in-from-bottom duration-300">
          <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-rose-600/95 to-pink-600/95 text-white text-xs font-bold shadow-2xl border border-rose-300/50 flex items-center gap-1.5 backdrop-blur-md">
            <span>{reactionBubble.icon}</span>
            <span>{reactionBubble.text}</span>
          </div>
        </div>
      )}

      {/* Render Mode Switcher: 3D Model vs 3D Live Portrait */}
      <div className="absolute top-1 left-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAvatarRenderMode((prev) => (prev === '3d-model' ? 'live-portrait' : '3d-model'));
          }}
          className="flex items-center gap-1 text-[10px] font-bold text-white/90 bg-black/60 hover:bg-rose-600/80 px-2.5 py-1 rounded-full border border-white/20 backdrop-blur-md transition-all shadow-lg"
          title="Toggle 3D Model / 3D Live Portrait"
        >
          {avatarRenderMode === '3d-model' ? (
            <>
              <Camera className="w-3 h-3 text-rose-300" />
              <span>Portrait</span>
            </>
          ) : (
            <>
              <UserCheck className="w-3 h-3 text-cyan-300" />
              <span>3D Model</span>
            </>
          )}
        </button>
      </div>

      {/* Character Outfits/Styles Selector */}
      <div className="absolute top-1 right-2 z-20 flex flex-col gap-1">
        {(['reference', 'neko', 'bunny', 'angel', 'sakura'] as CuteGirlStyle[]).map((styleKey) => {
          const isSelected = cuteStyle === styleKey;
          const conf = cuteGirlsConfig[styleKey];
          return (
            <button
              key={styleKey}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCuteStyle(styleKey);
                onHeartBurst();
              }}
              title={conf.name}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all duration-300 backdrop-blur-md shadow-md ${
                isSelected
                  ? 'bg-gradient-to-tr ' + conf.badgeColor + ' scale-110 border-2 border-white text-white'
                  : 'bg-black/50 border border-white/10 text-white/70 hover:scale-105 hover:bg-white/20'
              }`}
            >
              {conf.emoji}
            </button>
          );
        })}
      </div>

      {/* Cute Interactions Dock (Kiss, Pet, Pout, Cheer) */}
      <div className="absolute bottom-6 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-xl">
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerCuteAction('kiss');
          }}
          className="flex items-center gap-1 text-[10px] font-bold text-rose-300 hover:text-white px-2 py-0.5 rounded-full hover:bg-rose-500/30 transition-colors"
          title="Blow kiss"
        >
          <span>💋</span>
          <span>Kiss</span>
        </button>

        <span className="w-1 h-1 rounded-full bg-white/20" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerCuteAction('headpat');
          }}
          className="flex items-center gap-1 text-[10px] font-bold text-pink-300 hover:text-white px-2 py-0.5 rounded-full hover:bg-pink-500/30 transition-colors"
          title="Pet head"
        >
          <span>🥰</span>
          <span>Pet</span>
        </button>

        <span className="w-1 h-1 rounded-full bg-white/20" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerCuteAction('pout');
          }}
          className="flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-white px-2 py-0.5 rounded-full hover:bg-amber-500/30 transition-colors"
          title="Cute pout"
        >
          <span>🥺</span>
          <span>Pout</span>
        </button>

        <span className="w-1 h-1 rounded-full bg-white/20" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerCuteAction('cheer');
          }}
          className="flex items-center gap-1 text-[10px] font-bold text-cyan-300 hover:text-white px-2 py-0.5 rounded-full hover:bg-cyan-500/30 transition-colors"
          title="Cheer up"
        >
          <span>✨</span>
          <span>Cheer</span>
        </button>
      </div>

      {/* Bottom Floating State Badge */}
      <div className="absolute -bottom-2 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onCoreClick}
          className={`px-3.5 py-1.5 rounded-full border backdrop-blur-xl text-xs font-bold transition-all shadow-xl flex items-center gap-1.5 ${
            state === 'speaking'
              ? 'bg-rose-500/30 border-rose-400 text-rose-200 shadow-rose-500/30 animate-pulse'
              : state === 'listening'
              ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-cyan-500/30'
              : state === 'connecting'
              ? 'bg-purple-500/30 border-purple-400 text-purple-200'
              : 'bg-black/60 border-white/20 text-white/80 hover:text-white hover:border-rose-400'
          }`}
        >
          {state === 'speaking' ? (
            <>
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-bounce" />
              <span>Mahi baat kar rahi hai</span>
            </>
          ) : state === 'listening' ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
              <span>Aapki baat sun rahi hoon...</span>
            </>
          ) : state === 'connecting' ? (
            <>
              <Wand2 className="w-3.5 h-3.5 text-purple-300 animate-spin" />
              <span>Connect ho rahi hoon...</span>
            </>
          ) : (
            <>
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>Mahi se baat karo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
