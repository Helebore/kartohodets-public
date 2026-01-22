
import * as THREE from 'three/webgpu';
import {
    step, normalWorldGeometry, output, texture, vec3, vec4, normalize,
    positionWorld, bumpMap, cameraPosition, color, mix, uv, max
} from 'three/tsl';

let camera, scene, renderer, globe, clock;
let mouseDelta = 0;
const ROT_SPEED = 0.02;

init();

function init() {
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 2);
    camera.lookAt(1.2, 0, 0);

    scene = new THREE.Scene();

    const tilt = THREE.MathUtils.degToRad(23.5);
    const sun = new THREE.DirectionalLight('#ffffff', 2);
    sun.position.set(Math.cos(tilt), Math.sin(tilt), 0).normalize().multiplyScalar(10);
    scene.add(sun);

    const textureLoader = new THREE.TextureLoader();

    const dayTexture = textureLoader.load('../../res/img/earth_day.jpg');
    dayTexture.colorSpace = THREE.SRGBColorSpace;
    dayTexture.anisotropy = 8;

    const nightTexture = textureLoader.load('../../res/img/earth_night.jpg');
    nightTexture.colorSpace = THREE.SRGBColorSpace;
    nightTexture.anisotropy = 8;

    const bumpRoughnessCloudsTexture = textureLoader.load('../../res/img/earth_bump.jpg');
    bumpRoughnessCloudsTexture.anisotropy = 8;

    const viewDirection = positionWorld.sub(cameraPosition).normalize();
    const fresnel = viewDirection.dot(normalWorldGeometry).abs().oneMinus().toVar();
    const sunOrientation = normalWorldGeometry.dot(normalize(sun.position)).toVar();

    const atmosphereColor = mix(color('#bc490b'), color('#4db2ff'), sunOrientation.smoothstep(-0.25, 0.75));
    const globeMaterial = new THREE.MeshStandardNodeMaterial();

    const cloudsStrength = texture(bumpRoughnessCloudsTexture, uv()).b.smoothstep(0.2, 1);
    globeMaterial.colorNode = mix(texture(dayTexture), vec3(1), cloudsStrength.mul(2));

    const roughness = max(
        texture(bumpRoughnessCloudsTexture).g,
        step(0.01, cloudsStrength)
    ).remap(0, 1, 0.25, 0.35);
    globeMaterial.roughnessNode = roughness;

    const night = texture(nightTexture);
    const dayStrength = sunOrientation.smoothstep(-0.25, 0.5);

    const atmosphereDayStrength = sunOrientation.smoothstep(-0.5, 1);
    const atmosphereMix = atmosphereDayStrength.mul(fresnel.pow(2)).clamp(0, 1);

    let finalOutput = mix(night.rgb, output.rgb, dayStrength);
    finalOutput = mix(finalOutput, atmosphereColor, atmosphereMix);
    globeMaterial.outputNode = vec4(finalOutput, output.a);

    const bumpElevation = max(texture(bumpRoughnessCloudsTexture).r, cloudsStrength);
    globeMaterial.normalNode = bumpMap(bumpElevation);

    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    globe = new THREE.Mesh(sphereGeometry, globeMaterial);
    globe.rotation.z = tilt;
    scene.add(globe);


    const atmosphereMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true });
    let alpha = fresnel.remap(0.73, 1, 1, 0).pow(3);
    alpha = alpha.mul(sunOrientation.smoothstep(-0.5, 1));
    atmosphereMaterial.outputNode = vec4(atmosphereColor, alpha);

    const atmosphere = new THREE.Mesh(sphereGeometry, atmosphereMaterial);
    atmosphere.scale.setScalar(1.04);
    scene.add(atmosphere);


    renderer = new THREE.WebGPURenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);


    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let prevMouse = { x: 0, y: 0 };
function onMouseMove(e) {
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;

    mouseDelta = mouseDelta + dx * 0.001;
}

function animate() {
    const delta = clock.getDelta();
    globe.rotation.y += delta * (ROT_SPEED + mouseDelta);
    mouseDelta *= 0.92; // плавное затухание
    renderer.render(scene, camera);
}
