import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import getStarfield from "./src/getStarfield.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(18, w / h, 0.1, 10000); // Increased far plane for larger distance view
camera.position.set(-300, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);
new OrbitControls(camera, renderer.domElement);
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(63.71, 16);
const material = new THREE.MeshPhongMaterial({
    map: loader.load("./textures/00_earthmap1k.png"),
    specularMap: loader.load("./textures/02_earthspec1k.png"),
    bumpMap: loader.load("./textures/bathymetry_bump.png"),
    bumpScale: 5,
    emissive: new THREE.Color(0xD0FAFF),
    emissiveIntensity: 0.05, // Increase emissive intensity for brighter lights
});
const earthMesh = new THREE.Mesh(geometry, material);
earthMesh.receiveShadow = true;
earthMesh.castShadow = true;
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
    map: loader.load("./textures/03_earthlights1k.png"),
    blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
    map: loader.load("./textures/clouds.png"),
    transparent: true,
    opacity: 0.99,
    blending: THREE.AdditiveBlending,
    bumpMap: loader.load('./textures/clouds.png'),
    bumpScale: 1,
    displacementMap: loader.load('./textures/clouds.png'),
    displacementScale: 0.05,
    alphaMap: loader.load('./textures/clouds.png'),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.006);
cloudsMesh.castShadow = true;
cloudsMesh.receiveShadow = false;
earthGroup.add(cloudsMesh);
earthGroup.position.set(0, 0, 0);

const stars = getStarfield({ numStars: 2000 });
scene.add(stars);

// Sun (DirectionalLight with lens flare)
const sunLight = new THREE.DirectionalLight(0xffffff, 8);
sunLight.position.set(500, 0, 0); // Increase distance of the sun
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 1000; // Increased far plane for larger distance view
sunLight.shadow.camera.left = -100; // Adjust to fit the earth size
sunLight.shadow.camera.right = 100; // Adjust to fit the earth size
sunLight.shadow.camera.top = 100; // Adjust to fit the earth size
sunLight.shadow.camera.bottom = -100; // Adjust to fit the earth size
sunLight.shadow.bias = -0.0005; // Adjust shadow bias to reduce artifacts
scene.add(sunLight);

const textureLoader = new THREE.TextureLoader();
const lensflare = new Lensflare();
const textureFlare0 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
const textureFlare3 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare3.png');

lensflare.addElement(new LensflareElement(textureFlare0, 1400, 0, sunLight.color)); // Increase size of the sun
lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.6));
lensflare.addElement(new LensflareElement(textureFlare3, 140, 0.7));
lensflare.addElement(new LensflareElement(textureFlare3, 240, 0.9));
lensflare.addElement(new LensflareElement(textureFlare3, 140, 1));
sunLight.add(lensflare);

// Load and animate the satellite
const satelliteLoader = new GLTFLoader();
let satellite;
satelliteLoader.load('./satellite/scene.gltf', function (gltf) {
    satellite = gltf.scene;
    satellite.scale.set(2, 2, 2); // Adjust the scale as necessary
    scene.add(satellite);
}, undefined, function (error) {
    console.error('Error loading satellite model:', error);
});

// Create atmospheric effect
const atmosphereShader = {
    uniforms: {
        'c': { type: 'f', value: 0.8 },
        'p': { type: 'f', value: 4.0 },
        glowColor: { type: 'c', value: new THREE.Color(0xAFECFF) },
        viewVector: { type: 'v3', value: camera.position },
        lightDirection: { type: 'v3', value: sunLight.position.clone().normalize() } // Add light direction
    },
    vertexShader: `
        uniform vec3 viewVector;
        uniform vec3 lightDirection;
        uniform float c;
        uniform float p;
        varying float intensity;
        void main() {
            vec3 vNormal = normalize( normalMatrix * normal );
            vec3 vNormel = normalize( normalMatrix * viewVector );
            vec3 lightDir = normalize(lightDirection);
            float lightIntensity = max(dot(vNormal, lightDir), 0.0);
            intensity = pow( c - dot(vNormal, vNormel), p ) * lightIntensity;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
            vec3 glow = glowColor * intensity;
            gl_FragColor = vec4( glow, 1.0 );
        }
    `
};

const atmosphereGeometry = new THREE.SphereGeometry(63.71 * 1.03, 32, 32);
const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: atmosphereShader.uniforms,
    vertexShader: atmosphereShader.vertexShader,
    fragmentShader: atmosphereShader.fragmentShader,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
});

const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
earthGroup.add(atmosphereMesh);

// Add fog effect
scene.fog = new THREE.FogExp2(0xffffff, 0.00025);

// Variable to control the camera rotation
let cameraAngle = 0;
let followSatellite = false; // Flag to indicate whether to follow the satellite

function animate() {
    requestAnimationFrame(animate);

    earthMesh.rotation.y += 0.0005;
    lightsMesh.rotation.y += 0.0005;
    cloudsMesh.rotation.y += 0.0008;
    stars.rotation.y -= 0.0000727;

    // Animate the satellite around the Earth
    if (satellite) {
        const time = Date.now() * 0.0001; // Slower revolution
        satellite.position.x = 100 * Math.cos(time);
        satellite.position.z = 100 * Math.sin(time);
        satellite.position.y = 5 * Math.sin(time); // Optional: add some variation in the y-axis

        // Calculate the direction vector from the satellite to the Earth
        const toEarth = new THREE.Vector3().subVectors(earthGroup.position, satellite.position).normalize();

        // Align the satellite's y-axis with the direction vector
        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), toEarth);
        satellite.quaternion.slerp(targetQuaternion, 1); // Smoothly rotate to the target orientation

        // Make the camera follow the satellite
        if (followSatellite) {
            camera.position.lerp(new THREE.Vector3(satellite.position.x + 25*Math.cos(time), satellite.position.y , satellite.position.z +  25*Math.sin(time)), 0.5);
            camera.lookAt(earthGroup.position);
        }
    }

    // Update camera position to rotate around the Earth
    if (!followSatellite) {
        cameraAngle += 0.0002; // Control the speed of rotation
        camera.position.x = -300 * Math.cos(cameraAngle);
        camera.position.z = 300 * Math.sin(cameraAngle);
        camera.lookAt(earthGroup.position);
    }

    renderer.render(scene, camera);
}

animate();

function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);

// Smooth camera transition
let targetPosition = new THREE.Vector3(0, 0, 100); // Initial camera position
let initialPosition = new THREE.Vector3(); // Initial position for transition

document.getElementById('contact-button').addEventListener('click', () => {
    if (satellite) {
        followSatellite = true;
        document.getElementById('header').classList.add('hidden'); // Hide header
        document.getElementById('main-buttons').classList.add('hidden'); // Hide main buttons
        document.getElementById('contact-buttons').classList.remove('hidden'); // Show contact buttons
        document.getElementById('contact-buttons').style.display = 'flex';
    }
});

document.getElementById('email-button').addEventListener('click', () => {
    window.location.href = 'mailto:sankaranarayan.work@gmail.com';
});

document.getElementById('linkedin-button').addEventListener('click', () => {
    window.location.href = 'https://www.linkedin.com/in/sankara-narayan-varadaraj';
});

document.getElementById('contact-link').addEventListener('click', () => {
    followSatellite = false;
    document.getElementById('header').classList.remove('hidden'); // Show header
    document.getElementById('main-buttons').classList.remove('hidden'); // Show main buttons
    document.getElementById('contact-buttons').classList.add('hidden'); 
    document.getElementById('contact-buttons').style.display = 'none';// Hide contact buttons
});
