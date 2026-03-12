/* ========================================
   X1 GreenPulse — Application Logic
   DePIN Energy Monitor & Carbon Credits
   ======================================== */

// ========================================
// Smooth Scroll Navigation
// ========================================
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// Active nav link tracking
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        const target = this.getAttribute('href').substring(1);
        scrollToSection(target);
    });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Update active nav link based on scroll position
    const sections = document.querySelectorAll('.section, .hero');
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
});

// ========================================
// Counter Animation
// ========================================
function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-count'));
        const duration = 2000;
        const start = 0;
        const startTime = performance.now();
        const isDecimal = target % 1 !== 0;
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutExpo = 1 - Math.pow(2, -10 * progress);
            const current = start + (target - start) * easeOutExpo;
            
            if (isDecimal) {
                counter.textContent = current.toFixed(1);
            } else {
                counter.textContent = Math.floor(current).toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }
        
        requestAnimationFrame(updateCounter);
    });
}

// ========================================
// Intersection Observer for Animations
// ========================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Trigger counter animation when hero stats come into view
            if (entry.target.querySelector('[data-count]') || entry.target.hasAttribute('data-count')) {
                animateCounters();
            }
        }
    });
}, observerOptions);

// Observe elements
document.querySelectorAll('.card, .validator-card, .nft-card, .insight-card, .leaderboard-row').forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
});

// Observe hero stats
const heroStats = document.querySelector('.hero-stats');
if (heroStats) observer.observe(heroStats);

// ========================================
// Energy Chart (Canvas)
// ========================================
function drawEnergyChart() {
    const canvas = document.getElementById('energyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(2, 2);
    
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Generate data
    const dataPoints = 24;
    const data = [];
    for (let i = 0; i < dataPoints; i++) {
        data.push(2.5 + Math.random() * 1.2 + Math.sin(i / 4) * 0.3);
    }
    
    const maxVal = Math.max(...data) * 1.2;
    const minVal = 0;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        // Y axis labels
        const val = (maxVal - (maxVal / 4 * i)).toFixed(1);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(val + ' Wh', padding.left - 8, y + 4);
    }
    
    // X axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    for (let i = 0; i < dataPoints; i += 4) {
        const x = padding.left + (chartWidth / (dataPoints - 1)) * i;
        ctx.fillText(i + ':00', x, height - 8);
    }
    
    // Draw area gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartWidth / (data.length - 1)) * i;
        const y = padding.top + chartHeight - ((data[i] - minVal) / (maxVal - minVal)) * chartHeight;
        
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            const prevX = padding.left + (chartWidth / (data.length - 1)) * (i - 1);
            const prevY = padding.top + chartHeight - ((data[i - 1] - minVal) / (maxVal - minVal)) * chartHeight;
            const cpX = (prevX + x) / 2;
            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
    }
    
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    const lineGradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
    lineGradient.addColorStop(0, '#22c55e');
    lineGradient.addColorStop(1, '#06b6d4');
    
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartWidth / (data.length - 1)) * i;
        const y = padding.top + chartHeight - ((data[i] - minVal) / (maxVal - minVal)) * chartHeight;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            const prevX = padding.left + (chartWidth / (data.length - 1)) * (i - 1);
            const prevY = padding.top + chartHeight - ((data[i - 1] - minVal) / (maxVal - minVal)) * chartHeight;
            const cpX = (prevX + x) / 2;
            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
    }
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Draw dots
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartWidth / (data.length - 1)) * i;
        const y = padding.top + chartHeight - ((data[i] - minVal) / (maxVal - minVal)) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        
        // Glow
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.fill();
    }
}

// Draw chart on load and resize
window.addEventListener('load', drawEnergyChart);
window.addEventListener('resize', drawEnergyChart);

// ========================================
// AI Chat Bot
// ========================================
const aiResponses = [
    {
        keywords: ['energy', 'energi', 'watt', 'power', 'listrik'],
        response: `Great question! Here's a breakdown of your node's energy profile:

📊 **Current Usage:** 3.1 Wh (average over 7 days)
🎯 **Target:** Under 3.0 Wh for maximum Green Score
💡 **Tip:** Enable sleep mode during low-traffic hours (02:00-06:00) to save approximately 15% energy.

Your node is performing well! Just a few tweaks and you'll hit the **elite tier** 🏆`
    },
    {
        keywords: ['score', 'green', 'skor', 'nilai'],
        response: `Your **Green Score** analysis:

🏆 **Current Score:** 78/100
📈 **Trend:** Improving (+5 points this week!)

**Breakdown:**
- ⚡ Energy Efficiency: 82/100
- ⏱️ Uptime: 95/100
- 🌱 Carbon Footprint: 72/100
- 🔄 Network Contribution: 63/100

**To improve:** Focus on reducing peak-hour energy spikes and increase your transaction validation rate. Target score of **90+** to qualify for bonus rewards! 🚀`
    },
    {
        keywords: ['carbon', 'offset', 'credit', 'karbon', 'co2'],
        response: `Carbon Credit insights for your node:

🌍 **Your Offset So Far:** 2.3 tCO₂ (lifetime)
💰 **Credits Available to Mint:** 1 NFT (valued at ~180 X1)

**How it works:**
1. Your node's energy efficiency generates carbon savings
2. Savings are verified on-chain every 30 days
3. Verified savings become mintable Carbon Credit NFTs
4. Trade them on the GreenPulse Marketplace!

Ready to mint your first Carbon Credit NFT? 🌿`
    },
    {
        keywords: ['optimize', 'improve', 'better', 'optimalkan', 'baik'],
        response: `Here are your **personalized optimization recommendations:**

🔧 **Quick Wins (do today):**
1. Update node software to v2.4.1 (saves ~8% energy)
2. Enable compression for validation data
3. Set peer connection limit to 25

📅 **This Week:**
- Schedule heavy sync during off-peak (02:00-06:00)
- Enable metrics dashboard for real-time monitoring

⚙️ **Hardware:**
- Your current setup is good! If upgrading, consider ARM-based SBC for even lower power draw (2.1 Wh possible)

Estimated improvement: **+12 Green Score points** 📈`
    },
    {
        keywords: ['reward', 'earn', 'hadiah', 'bonus'],
        response: `💰 **Reward Structure on GreenPulse:**

**Monthly Rewards (based on Green Score):**
- 🥇 Score 95-100: **2,500 X1** + Exclusive NFT Badge
- 🥈 Score 85-94: **1,800 X1**
- 🥉 Score 75-84: **1,200 X1**
- Score 60-74: **600 X1**

**Bonus Rewards:**
- 🌿 Carbon Credit NFT minting (trade value: 100-1,200 X1)
- 🎯 Achievement NFTs for milestones
- 👥 Referral bonus: 10% of referred validator's first month rewards

Your current projected monthly reward: **~1,200 X1** 🎉`
    }
];

const defaultResponse = `I'd be happy to help! Here are some topics I can assist with:

🔋 **"energy usage"** — Analyze your node's power consumption
🏆 **"green score"** — Check and improve your Green Score
🌍 **"carbon credits"** — Learn about carbon offset NFTs
⚙️ **"optimize"** — Get personalized efficiency recommendations
💰 **"rewards"** — Understand the reward structure

Just ask me anything about green blockchain operations! 🌿`;

function getAIResponse(input) {
    const lower = input.toLowerCase();
    for (const item of aiResponses) {
        if (item.keywords.some(kw => lower.includes(kw))) {
            return item.response;
        }
    }
    return defaultResponse;
}

function addChatMessage(content, isUser = false) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${isUser ? 'user' : 'bot'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = isUser ? '👤' : '🤖';
    
    const msgContent = document.createElement('div');
    msgContent.className = 'msg-content';
    msgContent.innerHTML = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(msgContent);
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Chat event listeners
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

if (chatSend) {
    chatSend.addEventListener('click', () => {
        const input = chatInput.value.trim();
        if (!input) return;
        
        addChatMessage(input, true);
        chatInput.value = '';
        
        // Simulate typing delay
        setTimeout(() => {
            const response = getAIResponse(input);
            addChatMessage(response, false);
        }, 800 + Math.random() * 600);
    });
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            chatSend.click();
        }
    });
}

// ========================================
// Wallet Connect Simulation
// ========================================
const connectBtn = document.getElementById('connectWallet');
if (connectBtn) {
    connectBtn.addEventListener('click', () => {
        connectBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
            </svg>
            0x7172...888B
        `;
        connectBtn.style.background = 'rgba(34, 197, 94, 0.15)';
        connectBtn.style.color = '#4ade80';
        connectBtn.style.border = '1px solid rgba(34, 197, 94, 0.3)';
    });
}

// ========================================
// Mint NFT Button Interactions
// ========================================
document.querySelectorAll('.btn-mint').forEach(btn => {
    btn.addEventListener('click', function() {
        const original = this.textContent;
        this.textContent = 'Minting...';
        this.style.opacity = '0.7';
        this.disabled = true;
        
        setTimeout(() => {
            this.textContent = '✓ Minted!';
            this.style.background = 'rgba(34, 197, 94, 0.2)';
            this.style.color = '#22c55e';
            this.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            this.style.opacity = '1';
            
            setTimeout(() => {
                this.textContent = original;
                this.style.background = '';
                this.style.color = '';
                this.style.border = '';
                this.disabled = false;
            }, 2000);
        }, 1500);
    });
});

// ========================================
// Filter Buttons
// ========================================
document.querySelectorAll('.chart-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        drawEnergyChart(); // Redraw with "new" data
    });
});

// ========================================
// Initialize animations on load
// ========================================
window.addEventListener('load', () => {
    // Trigger initial counter animation for visible elements
    setTimeout(animateCounters, 500);
    
    // Add energy bar animations
    document.querySelectorAll('.bar-fill').forEach((bar, i) => {
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = bar.style.getPropertyValue('--width');
        }, 300 + i * 200);
    });
});

// ========================================
// Smooth reveal on load
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});
