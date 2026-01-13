const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

// Buffer to hold the "Master Beads" source
const buffer = document.createElement('canvas');
const bCtx = buffer.getContext('2d');

let width, height, centerX, centerY;
let beads = [];
let gravity = { x: 0, y: 0 };

const SLICES = 6; 
const SLICE_ANGLE = (Math.PI * 2) / SLICES;

class Bead {
    constructor() {
        this.reset();
    }

    reset() {
        this.radius = Math.random() * 14 + 6;
        // Vibrant colors with high visibility
        this.color = `hsla(${Math.random() * 360}, 85%, 60%, 0.85)`;
        
        // Spawn beads in a cluster near the center
        this.x = (Math.random() - 0.5) * 200;
        this.y = (Math.random() - 0.5) * 200;
        
        this.vx = 0;
        this.vy = 0;
        // Friction: 0.92 makes them feel like they are in a liquid/heavy environment
        this.friction = 0.92;
        this.shape = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)];
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.1;
    }

    update() {
        // Apply normalized gravity
        this.vx += gravity.x;
        this.vy += gravity.y;

        // Speed Limit to prevent "teleporting"
        const speedLimit = 12;
        this.vx = Math.max(-speedLimit, Math.min(speedLimit, this.vx));
        this.vy = Math.max(-speedLimit, Math.min(speedLimit, this.vy));
        
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.spin + (this.vx * 0.02);

        // Circular Container Boundary
        const dist = Math.sqrt(this.x * this.x + this.y * this.y);
        const limit = 400; // Matches half the buffer size
        if (dist > limit) {
            const angle = Math.atan2(this.y, this.x);
            this.x = Math.cos(angle) * limit;
            this.y = Math.sin(angle) * limit;
            // Dampen bounce to keep them from jittering
            this.vx *= -0.3;
            this.vy *= -0.3;
        }
    }

    draw(c) {
        c.save();
        // 500 is the center of our 1000px buffer
        c.translate(this.x + 500, this.y + 500);
        c.rotate(this.angle);
        c.fillStyle = this.color;
        
        // Add a subtle glow/edge
        c.shadowBlur = 5;
        c.shadowColor = 'rgba(0,0,0,0.5)';

        c.beginPath();
        if (this.shape === 'circle') {
            c.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else if (this.shape === 'square') {
            c.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Triangle
            c.moveTo(0, -this.radius);
            c.lineTo(this.radius, this.radius);
            c.lineTo(-this.radius, this.radius);
            c.closePath();
        }
        c.fill();
        c.restore();
    }
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    centerX = width / 2;
    centerY = height / 2;
    
    // Set buffer size
    buffer.width = 1000;
    buffer.height = 1000;
}

function animate() {
    // 1. Render all beads to the offscreen buffer once per frame
    bCtx.clearRect(0, 0, 1000, 1000);
    beads.forEach(b => {
        b.update();
        b.draw(bCtx);
    });

    // 2. Clear the main visible canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);

    for (let i = 0; i < SLICES; i++) {
        ctx.save();
        ctx.rotate(i * SLICE_ANGLE);

        // Clip to a 60-degree wedge with slight overlap to prevent gaps
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, Math.max(width, height), 0, SLICE_ANGLE + 0.01);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.clip();

        // DRAW 1: Original
        ctx.drawImage(buffer, -500, -500);

        // DRAW 2: Mirrored
        // Flip the image over the center line of the wedge
        ctx.rotate(SLICE_ANGLE);
        ctx.scale(1, -1);
        ctx.drawImage(buffer, -500, -500);
        
        ctx.restore();
    }
    ctx.restore();
    requestAnimationFrame(animate);
}

// Mobile Sensor Handling
function handleOrientation(event) {
    // Normalize Android/iOS tilt (-90 to 90)
    let rawX = event.gamma || 0; 
    let rawY = event.beta || 0;

    // Clamp and scale: We want a max gravity of about 0.8
    // Division by 45 means tilting the phone 45 degrees gives full force
    let normX = Math.max(-1, Math.min(1, rawX / 45));
    let normY = Math.max(-1, Math.min(1, (rawY - 45) / 45)); // Offset Y for natural holding angle

    // Deadzone to stop jittering when still
    if (Math.abs(normX) < 0.05) normX = 0;
    if (Math.abs(normY) < 0.05) normY = 0;

    gravity.x = normX * 0.8;
    gravity.y = normY * 0.8;
}

// Desktop Fallback
window.addEventListener('mousemove', (e) => {
    if (overlay.style.display === 'none') {
        gravity.x = (e.clientX - centerX) * 0.005;
        gravity.y = (e.clientY - centerY) * 0.005;
    }
});

startBtn.addEventListener('click', async () => {
    resize();
    beads = Array.from({ length: 80 }, () => new Bead());
    
    // Request Orientation Permission (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
            }
        } catch (err) { console.error(err); }
    } else {
        // Android or non-iOS
        window.addEventListener('deviceorientation', handleOrientation);
    }

    animate();
    overlay.style.display = 'none';
});

window.addEventListener('resize', resize);