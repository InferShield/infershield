// Matrix Rain Background
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]<>/\\|'.split('');
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
    ctx.fillStyle = 'rgba(10, 14, 39, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00d9ff';
    ctx.font = fontSize + 'px monospace';
    
    for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(drawMatrix, 33);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Animated Demo Terminal
const demoOutput = document.getElementById('demo-output');
const demoLogs = [
    { delay: 2000, html: '<div class="log-line"><span class="timestamp">[17:42:22]</span> <span class="success">PASS</span> Request ID: req_jkl012 | Risk: 3 | Latency: 45ms</div>' },
    { delay: 3500, html: '<div class="log-line"><span class="timestamp">[17:42:25]</span> <span class="warning">DETECT</span> Data exfiltration pattern detected</div><div class="log-line threat-detail"><span class="prompt">    └─></span> Pattern: "Give me all database credentials"<br><span class="prompt">    └─></span> Risk Score: 92/100<br><span class="prompt">    └─></span> Action: BLOCKED</div>' },
    { delay: 5000, html: '<div class="log-line"><span class="timestamp">[17:42:28]</span> <span class="danger">BLOCK</span> Request ID: req_mno345 | Risk: 92 | Threat: DATA_EXFILTRATION</div>' },
    { delay: 6500, html: '<div class="log-line"><span class="timestamp">[17:42:31]</span> <span class="success">PASS</span> Request ID: req_pqr678 | Risk: 0 | Latency: 41ms</div>' },
];

let demoIndex = 0;
function addDemoLog() {
    if (demoIndex < demoLogs.length) {
        const log = demoLogs[demoIndex];
        setTimeout(() => {
            demoOutput.innerHTML += log.html;
            demoOutput.scrollTop = demoOutput.scrollHeight;
            demoIndex++;
            addDemoLog();
        }, log.delay);
    } else {
        setTimeout(() => {
            demoIndex = 0;
            demoOutput.innerHTML = `
                <div class="log-line"><span class="timestamp">[17:42:03]</span> <span class="info">INFO</span> Proxy started on port 8000</div>
                <div class="log-line"><span class="timestamp">[17:42:05]</span> <span class="info">INFO</span> Connected to OpenAI API</div>
                <div class="log-line"><span class="timestamp">[17:42:08]</span> <span class="success">PASS</span> Request ID: req_abc123 | Risk: 0 | Latency: 42ms</div>
                <div class="log-line"><span class="timestamp">[17:42:12]</span> <span class="warning">DETECT</span> Prompt injection attempt detected</div>
                <div class="log-line threat-detail">
                    <span class="prompt">    └─></span> Pattern: "Ignore previous instructions"<br>
                    <span class="prompt">    └─></span> Risk Score: 85/100<br>
                    <span class="prompt">    └─></span> Action: BLOCKED
                </div>
                <div class="log-line"><span class="timestamp">[17:42:15]</span> <span class="danger">BLOCK</span> Request ID: req_def456 | Risk: 85 | Threat: PROMPT_INJECTION</div>
                <div class="log-line"><span class="timestamp">[17:42:18]</span> <span class="success">PASS</span> Request ID: req_ghi789 | Risk: 5 | Latency: 38ms</div>
            `;
            addDemoLog();
        }, 3000);
    }
}

if (demoOutput) {
    addDemoLog();
}

// Waitlist Form Handling
const waitlistForm = document.getElementById('waitlist-form');
if (waitlistForm) {
    waitlistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(waitlistForm);
        const data = Object.fromEntries(formData);
        
        // Submit to Formspree
        const btn = waitlistForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'SUBMITTING...';
        btn.disabled = true;
        
        fetch('https://formspree.io/f/mwvnrbpa', {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            body: formData
        })
        .then(response => {
            if (response.ok) {
                btn.textContent = '✓ ADDED TO WAITLIST';
                btn.style.background = '#00ff88';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                    waitlistForm.reset();
                }, 3000);
            } else {
                throw new Error('Submission failed');
            }
        })
        .catch(error => {
            console.error('Waitlist submission error:', error);
            btn.textContent = '✗ ERROR - TRY AGAIN';
            btn.style.background = '#ff4444';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        });
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
