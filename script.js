const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

// ** Buffer to hold the "Master Beads" **
const buffer = document.createElement('canvas');
const bCtx = buffer.getContext('2d');

let width, height, centerX, centerY;
let beads = [];
let gravity = { x: 0, y: 0.15 };

const SLICES = 6; 
const SLICE_ANGLE = (Math.PI * 2) / SLICES;

class Bead {
    constructor() {
        this.reset();
    }
    reset() {
        this.radius = Math.random() * 14 + 6;
        this.color = `hsla(${Math.random() * 360}, 85%, 60%, 0.85)`;
        
        // Spawn beads in a "physical" zone that covers the wedge
        this.x = (Math.random() - 0.5) * 400;
        this.y = (Math.random() - 0.5) * 400;
        
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.friction = 0.98;
        this.shape = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)];
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.1;
    }
    update() {
        // Apply gravity
        this.vx += gravity.x;
        this.vy += gravity.y;
        
        // HIGHER FRICTION: Acts like the beads are in thick oil/water
        // Change from 0.98 to 0.92
        this.vx *= 0.92;
        this.vy *= 0.92;
        
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.spin + (this.vx * 0.02);

        // BOUNDARY CHECK: Ensure they stay within the 450px buffer zone
        const dist = Math.sqrt(this.x * this.x + this.y * this.y);
        const limit = 400; 
        if (dist > limit) {
            const angle = Math.atan2(this.y, this.x);
            // Push bead back inside the limit
            this.x = Math.cos(angle) * limit;
            this.y = Math.sin(angle) * limit;
            // Dampen the bounce significantly
            this.vx *= -0.2;
            this.vy *= -0.2;
        }
    }
    draw(c) {
        c.save();
        c.translate(this.x + 500, this.y + 500);
        c.rotate(this.angle);
        c.fillStyle = this.color;
        c.beginPath();
        if (this.shape === 'circle') c.arc(0, 0, this.radius, 0, Math.PI * 2);
        else if (this.shape === 'square') c.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        else {
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
    // 1. Draw beads to buffer
    bCtx.clearRect(0, 0, 1000, 1000);
    beads.forEach(b => {
        b.update();
        b.draw(bCtx);
    });

    // 2. Clear main
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);

    for (let i = 0; i < SLICES; i++) {
        ctx.save();
        ctx.rotate(i * SLICE_ANGLE);

        // CREATE THE WEDGE CLIP
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, Math.max(width, height), 0, SLICE_ANGLE + 0.01);
        ctx.lineTo(0, 0);
        ctx.clip();

        // DRAW 1: The original beads
        ctx.drawImage(buffer, -500, -500);

        // DRAW 2: The Mirrored beads
        // We move to the end of the slice, and flip backwards
        ctx.rotate(SLICE_ANGLE);
        ctx.scale(1, -1);
        ctx.drawImage(buffer, -500, -500);
        
        ctx.restore();
    }
    ctx.restore();
    requestAnimationFrame(animate);
}

window.addEventListener('mousemove', (e) => {
    if (overlay.style.display === 'none') {
        gravity.x = (e.clientX - centerX) * 0.005;
        gravity.y = (e.clientY - centerY) * 0.005;
    }
});

startBtn.addEventListener('click', () => {
    resize();
    beads = Array.from({ length: 80 }, () => new Bead());
    animate();
    overlay.style.display = 'none';

    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => {
            if (res === 'granted') {
                window.addEventListener('deviceorientation', (e) => {
                gravity.x = (e.gamma || 0) * 0.005; 
				gravity.y = (e.beta || 0) * 0.005;
                });
            }
        });
    } else {
        window.addEventListener('deviceorientation', (e) => {
            gravity.x = (e.gamma || 0) * 0.1;
            gravity.y = (e.beta || 0) * 0.1;
        });
    }
});

window.addEventListener('resize', resize);