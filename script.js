const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

const buffer = document.createElement('canvas');
const bCtx = buffer.getContext('2d');

let width, height, centerX, centerY;
let beads = [];
let gravity = { x: 0, y: 0 };

const SLICES = 6; 
const SLICE_ANGLE = (Math.PI * 2) / SLICES;
const BOUNDS = 400; // The size of our "virtual box"

class Bead {
    constructor() {
        this.reset();
    }

    reset() {
        this.radius = Math.random() * 12 + 6;
        this.color = `hsla(${Math.random() * 360}, 85%, 60%, 0.85)`;
        this.x = (Math.random() - 0.5) * BOUNDS;
        this.y = (Math.random() - 0.5) * BOUNDS;
        this.vx = 0;
        this.vy = 0;
        this.shape = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)];
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.1;
    }

    update() {
        // 1. Apply Gravity
        this.vx += gravity.x;
        this.vy += gravity.y;

        // 2. High Friction (Viscosity) - This prevents the "zoom" effect
        this.vx *= 0.90;
        this.vy *= 0.90;
        
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.spin;

        // 3. SEAMLESS WRAP-AROUND (The Fix)
        // If a bead goes off the edge of the 400px box, it appears on the opposite side
        if (this.x > BOUNDS) this.x = -BOUNDS;
        if (this.x < -BOUNDS) this.x = BOUNDS;
        if (this.y > BOUNDS) this.y = -BOUNDS;
        if (this.y < -BOUNDS) this.y = BOUNDS;
    }

    draw(c) {
        c.save();
        // Draw relative to the buffer center (500, 500)
        c.translate(this.x + 500, this.y + 500);
        c.rotate(this.angle);
        c.fillStyle = this.color;
        
        c.beginPath();
        if (this.shape === 'circle') {
            c.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else if (this.shape === 'square') {
            c.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
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
    buffer.width = 1000;
    buffer.height = 1000;
}

function animate() {
    bCtx.clearRect(0, 0, 1000, 1000);
    beads.forEach(b => {
        b.update();
        b.draw(bCtx);
    });

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);

    for (let i = 0; i < SLICES; i++) {
        ctx.save();
        ctx.rotate(i * SLICE_ANGLE);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, Math.max(width, height), 0, SLICE_ANGLE + 0.01);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.clip();

        // Draw original
        ctx.drawImage(buffer, -500, -500);

        // Draw mirrored reflection
        ctx.rotate(SLICE_ANGLE);
        ctx.scale(1, -1);
        ctx.drawImage(buffer, -500, -500);
        
        ctx.restore();
    }
    ctx.restore();
    requestAnimationFrame(animate);
}

function handleOrientation(event) {
    // Android Tilt Normalization
    let x = event.gamma || 0; 
    let y = event.beta || 0;

    // Use a "clamped" force so it never exceeds a certain speed
    let fx = Math.max(-1, Math.min(1, x / 30));
    let fy = Math.max(-1, Math.min(1, (y - 45) / 30));

    // Low strength (0.4) combined with high friction (0.90) 
    // makes the beads drift smoothly like they have weight.
    gravity.x = fx * 0.4;
    gravity.y = fy * 0.4;
}

window.addEventListener('mousemove', (e) => {
    if (overlay.style.display === 'none') {
        gravity.x = (e.clientX - centerX) * 0.002;
        gravity.y = (e.clientY - centerY) * 0.002;
    }
});

startBtn.addEventListener('click', async () => {
    resize();
    beads = Array.from({ length: 100 }, () => new Bead());
    
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const res = await DeviceOrientationEvent.requestPermission();
            if (res === 'granted') window.addEventListener('deviceorientation', handleOrientation);
        } catch (e) { console.error(e); }
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }

    animate();
    overlay.style.display = 'none';
});

window.addEventListener('resize', resize);