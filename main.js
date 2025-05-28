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
let cameraDistance = 5;
let cameraHeight = 0.5;

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
                action.setLoop(THREE.LoopRepeat);
                action.clampWhenFinished = false;
                action.timeScale = 0.5; // Slower animation
                action.play();
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
    cameraDistance = distance;
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

        // --- Camera follows the front of the safe ---
        // Calculate camera position in a circle around the model
        const angle = model.rotation.y;
        const target = model.position;
        camera.position.x = target.x + Math.sin(angle) * cameraDistance;
        camera.position.z = target.z + Math.cos(angle) * cameraDistance;
        camera.position.y = target.y + cameraHeight;
        camera.lookAt(target.x, target.y, target.z);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

animate();

// --- Grattis overlay and confetti logic ---
window.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('overlay');
    const grattisBtn = document.getElementById('grattisBtn');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const mainCanvas = document.getElementById('canvas');
    const controlPanel = document.querySelector('.control-panel');

    // Hide everything except overlay at start
    overlay.style.display = 'flex';
    confettiCanvas.style.display = 'none';
    mainCanvas.style.display = 'none';
    controlPanel.style.display = 'none';

    grattisBtn.addEventListener('click', () => {
        // Show everything
        overlay.style.display = 'none';
        mainCanvas.style.display = 'block';
        controlPanel.style.display = 'block';
        confettiCanvas.style.display = 'block';
        startConfetti();
        // Hide confetti after 3.5s
        setTimeout(() => {
            confettiCanvas.style.display = 'none';
        }, 3500);
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

// --- Confetti effect ---
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#e57373', '#f06292', '#ba68c8', '#64b5f6', '#4db6ac', '#81c784', '#ffd54f', '#ffb74d', '#a1887f', '#90a4ae'];
    const confettiCount = 180;
    const confetti = [];
    for (let i = 0; i < confettiCount; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            r: 6 + Math.random() * 8,
            d: 8 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 10,
            tiltAngle: 0,
            tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
            speed: 2 + Math.random() * 3
        });
    }
    let angle = 0;
    let animationFrame;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        angle += 0.01;
        for (let i = 0; i < confetti.length; i++) {
            let c = confetti[i];
            c.y += (Math.cos(angle + c.d) + 1 + c.speed) * 0.7;
            c.x += Math.sin(angle);
            c.tiltAngle += c.tiltAngleIncremental;
            c.tilt = Math.sin(c.tiltAngle) * 15;
            ctx.beginPath();
            ctx.lineWidth = c.r;
            ctx.strokeStyle = c.color;
            ctx.moveTo(c.x + c.tilt + c.r / 3, c.y);
            ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r);
            ctx.stroke();
        }
        animationFrame = requestAnimationFrame(draw);
    }
    draw();
    setTimeout(() => {
        cancelAnimationFrame(animationFrame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 3400);
}

// On first load, load the default safe
loadSafe(currentSafe); 