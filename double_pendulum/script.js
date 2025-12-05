const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// UI Controls
const m1Input = document.getElementById('m1');
const m2Input = document.getElementById('m2');
const l1Input = document.getElementById('l1');
const l2Input = document.getElementById('l2');
const gInput = document.getElementById('g');
const dInput = document.getElementById('d');
const resetBtn = document.getElementById('resetBtn');
const showTrailCheckbox = document.getElementById('showTrail');

// Display values
const m1Val = document.getElementById('m1-val');
const m2Val = document.getElementById('m2-val');
const l1Val = document.getElementById('l1-val');
const l2Val = document.getElementById('l2-val');
const gVal = document.getElementById('g-val');
const dVal = document.getElementById('d-val');

// State
let m1 = parseFloat(m1Input.value);
let m2 = parseFloat(m2Input.value);
let l1 = parseFloat(l1Input.value);
let l2 = parseFloat(l2Input.value);
let g = parseFloat(gInput.value);
let d = parseFloat(dInput.value);

// Initial state: theta1, omega1, theta2, omega2
let state = {
    t1: Math.PI / 2,
    w1: 0,
    t2: Math.PI / 2,
    w2: 0
};

let trail = [];
const MAX_TRAIL = 500;

// Canvas setup
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Physics Equations
function derivatives(s) {
    const { t1, w1, t2, w2 } = s;

    const num1 = -g * (2 * m1 + m2) * Math.sin(t1);
    const num2 = -m2 * g * Math.sin(t1 - 2 * t2);
    const num3 = -2 * Math.sin(t1 - t2) * m2;
    const num4 = w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(t1 - t2);
    const den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));

    const dw1 = (num1 + num2 + num3 * num4) / den;

    const num5 = 2 * Math.sin(t1 - t2);
    const num6 = w1 * w1 * l1 * (m1 + m2);
    const num7 = g * (m1 + m2) * Math.cos(t1);
    const num8 = w2 * w2 * l2 * m2 * Math.cos(t1 - t2);
    const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));

    const dw2 = (num5 * (num6 + num7 + num8)) / den2;

    return {
        dt1: w1,
        dw1: dw1 - d * w1,
        dt2: w2,
        dw2: dw2 - d * w2
    };
}

// RK4 Integrator
function rk4(s, dt) {
    const k1 = derivatives(s);

    const s2 = {
        t1: s.t1 + k1.dt1 * dt * 0.5,
        w1: s.w1 + k1.dw1 * dt * 0.5,
        t2: s.t2 + k1.dt2 * dt * 0.5,
        w2: s.w2 + k1.dw2 * dt * 0.5
    };
    const k2 = derivatives(s2);

    const s3 = {
        t1: s.t1 + k2.dt1 * dt * 0.5,
        w1: s.w1 + k2.dw1 * dt * 0.5,
        t2: s.t2 + k2.dt2 * dt * 0.5,
        w2: s.w2 + k2.dw2 * dt * 0.5
    };
    const k3 = derivatives(s3);

    const s4 = {
        t1: s.t1 + k3.dt1 * dt,
        w1: s.w1 + k3.dw1 * dt,
        t2: s.t2 + k3.dt2 * dt,
        w2: s.w2 + k3.dw2 * dt
    };
    const k4 = derivatives(s4);

    return {
        t1: s.t1 + (k1.dt1 + 2 * k2.dt1 + 2 * k3.dt1 + k4.dt1) * dt / 6,
        w1: s.w1 + (k1.dw1 + 2 * k2.dw1 + 2 * k3.dw1 + k4.dw1) * dt / 6,
        t2: s.t2 + (k1.dt2 + 2 * k2.dt2 + 2 * k3.dt2 + k4.dt2) * dt / 6,
        w2: s.w2 + (k1.dw2 + 2 * k2.dw2 + 2 * k3.dw2 + k4.dw2) * dt / 6
    };
}

function update() {
    // Multiple steps per frame for stability
    const steps = 10;
    const dt = 0.1 / steps;

    for (let i = 0; i < steps; i++) {
        state = rk4(state, dt);
    }
}

function draw() {
    ctx.fillStyle = '#0f172a'; // Match bg color to clear
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 3;

    // Calculate positions
    const x1 = cx + l1 * Math.sin(state.t1);
    const y1 = cy + l1 * Math.cos(state.t1);

    const x2 = x1 + l2 * Math.sin(state.t2);
    const y2 = y1 + l2 * Math.cos(state.t2);

    // Update trail
    if (showTrailCheckbox.checked) {
        trail.push({ x: x2, y: y2 });
        if (trail.length > MAX_TRAIL) {
            trail.shift();
        }

        // Draw trail
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < trail.length - 1; i++) {
            ctx.moveTo(trail[i].x, trail[i].y);
            ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
        }
        ctx.stroke();
    } else {
        trail = [];
    }

    // Draw arms
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.moveTo(cx, cy);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw masses
    ctx.beginPath();
    ctx.fillStyle = '#38bdf8';
    ctx.arc(x1, y1, m1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#38bdf8';
    ctx.arc(x2, y2, m2, 0, Math.PI * 2);
    ctx.fill();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Event Listeners
function updateParams() {
    m1 = parseFloat(m1Input.value);
    m2 = parseFloat(m2Input.value);
    l1 = parseFloat(l1Input.value);
    l2 = parseFloat(l2Input.value);
    g = parseFloat(gInput.value);
    d = parseFloat(dInput.value);

    m1Val.textContent = m1;
    m2Val.textContent = m2;
    l1Val.textContent = l1;
    l2Val.textContent = l2;
    gVal.textContent = g;
    dVal.textContent = d;
}

[m1Input, m2Input, l1Input, l2Input, gInput, dInput].forEach(input => {
    input.addEventListener('input', updateParams);
});

resetBtn.addEventListener('click', () => {
    state = {
        t1: Math.PI / 2,
        w1: 0,
        t2: Math.PI / 2,
        w2: 0
    };
    trail = [];
});

// Start
loop();
