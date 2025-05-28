import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add logo as background plane
let logoPlane;
const textureLoader = new THREE.TextureLoader();
textureLoader.load('logo.png', (texture) => {
    const aspect = texture.image.width / texture.image.height;
    const planeHeight = 2.5;
    const planeWidth = planeHeight * aspect;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    logoPlane = new THREE.Mesh(geometry, material);
    logoPlane.position.set(0, 2, -2.5); // Place behind the safe
    scene.add(logoPlane);
});

// Enhanced Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

// Main directional light (sun-like)
const mainLight = new THREE.DirectionalLight(0xffffff, 20);
mainLight.position.set(5, 5, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 50;
scene.add(mainLight);

// Additional fill lights
const fillLight1 = new THREE.DirectionalLight(0xffffff, 2);
fillLight1.position.set(-5, 3, -5);
scene.add(fillLight1);

const fillLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
fillLight2.position.set(0, -5, 0);
scene.add(fillLight2);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Camera position
camera.position.z = 5;

// Load 3D model
const loader = new GLTFLoader();
let model;
let mixer;
let action;
let isAnimating = false;
let isOpen = false;

// Rotation and movement variables
let rotationSpeedY = 0.2; // Degrees per frame
let rotationSpeedX = 0.05; // Degrees per frame
let movementSpeed = 0.5;
let bounds = {
    x: { min: -2, max: 2 },
    y: { min: -1, max: 1 }
};
let direction = { x: 1, y: 1 };

// --- Safe switching logic ---
let currentSafe = 'Money_case.glb';
function loadSafe(safeFile) {
    // Remove current model
    if (model) {
        scene.remove(model);
        model.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        model = null;
        mixer = null;
        action = null;
    }
    // Load new model
    loader.load(
        safeFile,
        (gltf) => {
            model = gltf.scene;
            scene.add(model);
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            // Scale the model if needed
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.multiplyScalar(scale);
            // Setup animation mixer
            if (gltf.animations && gltf.animations.length) {
                mixer = new THREE.AnimationMixer(model);
                action = mixer.clipAction(gltf.animations[0]);
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
            }
        },
        undefined,
        (error) => {
            console.error('An error happened while loading the model:', error);
        }
    );
}

// Control Panel Setup
const settingsButton = document.getElementById('settingsButton');
const settingsPanel = document.getElementById('settingsPanel');
const toggleButton = document.getElementById('toggleAnimation');
let animationSpeed = 1;

// Toggle settings panel
settingsButton.addEventListener('click', () => {
    settingsPanel.classList.toggle('active');
});

// Close settings panel when clicking outside
document.addEventListener('click', (event) => {
    if (!settingsPanel.contains(event.target) && !settingsButton.contains(event.target)) {
        settingsPanel.classList.remove('active');
    }
});

// Background color control
document.getElementById('backgroundColor').addEventListener('input', (e) => {
    const color = new THREE.Color(e.target.value);
    scene.background = color;
    document.body.style.background = e.target.value;
});

// Set initial background color
document.body.style.background = '#000000';

// Lighting controls
document.getElementById('ambientLight').addEventListener('input', (e) => {
    ambientLight.intensity = parseFloat(e.target.value);
});

document.getElementById('mainLight').addEventListener('input', (e) => {
    mainLight.intensity = parseFloat(e.target.value);
});

document.getElementById('fillLight1').addEventListener('input', (e) => {
    fillLight1.intensity = parseFloat(e.target.value);
});

document.getElementById('fillLight2').addEventListener('input', (e) => {
    fillLight2.intensity = parseFloat(e.target.value);
});

// Camera controls
document.getElementById('cameraDistance').addEventListener('input', (e) => {
    const distance = parseFloat(e.target.value);
    camera.position.z = distance;
});

// Animation speed control
document.getElementById('animationSpeed').addEventListener('input', (e) => {
    animationSpeed = parseFloat(e.target.value);
    if (action) {
        action.timeScale = isOpen ? -animationSpeed : animationSpeed;
    }
});

function playAnimation() {
    if (isAnimating || !model || !mixer || !action) return;
    
    isAnimating = true;
    isOpen = !isOpen;
    
    // Stop current animation
    mixer.stopAllAction();
    
    // Reset and configure the animation
    action.reset();
    action.timeScale = isOpen ? animationSpeed : -animationSpeed;
    
    // Set the correct start and end points
    if (isOpen) {
        action.paused = false;
        action.play();
    } else {
        action.paused = false;
        action.play();
    }
    
    // Set isAnimating to false when animation completes
    action.getMixer().addEventListener('finished', () => {
        isAnimating = false;
    });
}

// Toggle animation direction
toggleButton.addEventListener('click', playAnimation);

// Click event handler
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (isAnimating || !model || !mixer) return;

    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObject(model, true);

    if (intersects.length > 0) {
        playAnimation();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update bounds based on new window size
    const aspectRatio = window.innerWidth / window.innerHeight;
    bounds.x.max = 2 * aspectRatio;
    bounds.x.min = -bounds.x.max;
});

// Animation loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    
    // Update animation mixer
    if (mixer) {
        mixer.update(clock.getDelta());
    }
    
    // Update model rotation and position
    if (model) {
        // Rotate the model
        model.rotation.y += THREE.MathUtils.degToRad(rotationSpeedY);
        model.rotation.x += THREE.MathUtils.degToRad(rotationSpeedX);
        
        // Move the model
        model.position.x += movementSpeed * direction.x * clock.getDelta();
        model.position.y += movementSpeed * direction.y * clock.getDelta();
        
        // Check bounds and reverse direction if needed
        if (model.position.x > bounds.x.max || model.position.x < bounds.x.min) {
            direction.x *= -1;
        }
        if (model.position.y > bounds.y.max || model.position.y < bounds.y.min) {
            direction.y *= -1;
        }
    }
    
    controls.update();
    renderer.render(scene, camera);
}

animate();

// --- Grattis overlay and confetti logic ---
window.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('overlay');
    const grattisBtn = document.getElementById('grattisBtn');
    const mainCanvas = document.getElementById('canvas');
    const controlPanel = document.querySelector('.control-panel');

    // Hide everything except overlay at start
    overlay.style.display = 'flex';

    mainCanvas.style.display = 'none';
    controlPanel.style.display = 'none';

    grattisBtn.addEventListener('click', () => {
        // Show everything
        overlay.style.display = 'none';
        mainCanvas.style.display = 'block';
        controlPanel.style.display = 'block';

        // Hide confetti after 3.5s

    });

    // Safe switch buttons
    document.querySelectorAll('.safe-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const safeFile = btn.getAttribute('data-safe');
            if (safeFile && safeFile !== currentSafe) {
                currentSafe = safeFile;
                loadSafe(safeFile);
            }
        });
    });
});

// On first load, load the default safe
loadSafe(currentSafe); 