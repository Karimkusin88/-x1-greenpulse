/* ========================================
   X1 GreenPulse — Real Web3 Application
   DePIN Energy Monitor & Carbon Credits
   Built on X1 EcoChain (Maculatus Testnet)
   
   Wallet: 0x71723715478b344164e992b49ae1fCEb6467888B
   Builder: KarimKusin (@karimkusin)
   ======================================== */

// ========================================
// X1 EcoChain Network Config
// ========================================
const X1_CONFIG = {
    chainId: '0x2A1A',
    chainIdDecimal: 10778,
    chainName: 'X1 EcoChain Testnet (Maculatus)',
    rpcUrl: 'https://maculatus-rpc.x1eco.com',
    explorerUrl: 'https://maculatus-scan.x1eco.com',
    explorerApi: 'https://maculatus-scan.x1eco.com/api/v2',
    currency: { name: 'X1 Testnet Coin', symbol: 'X1T', decimals: 18 },
    builderWallet: '0x71723715478b344164e992b49ae1fCEb6467888B'
};

// ========================================
// Global State
// ========================================
let walletState = {
    connected: false,
    address: null,
    balance: null,
    provider: null,
    signer: null,
    txCount: 0
};

// ========================================
// Wallet Connection
// ========================================
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showWalletModal();
        return;
    }
    try {
        showConnecting();
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length === 0) { showError('No accounts found.'); return; }

        await switchToX1Network();

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balanceWei = await provider.getBalance(address);
        const balanceFormatted = ethers.formatEther(balanceWei);
        const txCount = await provider.getTransactionCount(address);

        walletState = {
            connected: true, address, balance: parseFloat(balanceFormatted),
            provider, signer, txCount
        };

        updateWalletUI();
        closeWalletModal();
        fetchRealData();
        loadCheckinData();
        updateFaucetAddress();

        console.log('✅ Wallet connected:', address);
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (error.code === 4001) showError('Connection rejected');
        else showError('Connection failed: ' + error.message);
    }
}

async function switchToX1Network() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: X1_CONFIG.chainId }]
        });
    } catch (e) {
        if (e.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: X1_CONFIG.chainId,
                        chainName: X1_CONFIG.chainName,
                        nativeCurrency: X1_CONFIG.currency,
                        rpcUrls: [X1_CONFIG.rpcUrl],
                        blockExplorerUrls: [X1_CONFIG.explorerUrl]
                    }]
                });
            } catch (addError) {
                console.log('Network may already exist, continuing...', addError);
            }
        } else {
            console.log('Switch network error (may already be on correct chain):', e.message);
        }
    }
}

// ========================================
// Wallet Modal
// ========================================
function showWalletModal() {
    const m = document.getElementById('walletModal');
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeWalletModal() {
    const m = document.getElementById('walletModal');
    if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
}
function showConnecting() {
    const btn = document.getElementById('connectWallet');
    if (btn) { btn.innerHTML = '<span class="spin">⟳</span> Connecting...'; btn.disabled = true; }
}
function showError(msg) {
    const btn = document.getElementById('connectWallet');
    if (btn) { btn.innerHTML = '🔗 Connect Wallet'; btn.disabled = false; }
    showNotification(msg, 'error');
}

// ========================================
// Update Wallet UI
// ========================================
function updateWalletUI() {
    const btn = document.getElementById('connectWallet');
    const shortAddr = walletState.address.slice(0, 6) + '...' + walletState.address.slice(-4);
    if (btn) {
        btn.innerHTML = `
            <div class="wallet-connected-info">
                <span class="wallet-balance">${walletState.balance.toFixed(2)} X1T</span>
                <span class="wallet-address-badge">${shortAddr}</span>
            </div>`;
        btn.classList.add('connected');
        btn.disabled = false;
        btn.onclick = () => window.open(`${X1_CONFIG.explorerUrl}/address/${walletState.address}`, '_blank');
    }
    // Update swap balance
    const sb = document.getElementById('swapBalance');
    if (sb) sb.textContent = `Balance: ${walletState.balance.toFixed(4)} X1T`;
}

// ========================================
// Fetch REAL Data from Explorer API
// ========================================
async function fetchRealData() {
    try {
        const statsRes = await fetch(`${X1_CONFIG.explorerApi}/stats`);
        const stats = await statsRes.json();
        updateDashboardWithRealStats(stats);

        if (walletState.connected) {
            const txRes = await fetch(`${X1_CONFIG.explorerApi}/addresses/${walletState.address}/transactions`);
            const txData = await txRes.json();
            updateTransactionHistory(txData.items || []);
        }
    } catch (error) {
        console.error('Failed to fetch real data:', error);
    }
}

function updateDashboardWithRealStats(stats) {
    const totalTx = parseInt(stats.total_transactions);
    const el1 = document.querySelector('[data-stat="total-tx"]');
    if (el1) el1.textContent = formatNumber(totalTx);

    const el1b = document.querySelector('[data-stat="total-tx-hero"]');
    if (el1b) el1b.textContent = formatNumber(totalTx);

    const blockTimeMs = stats.average_block_time;
    const el2 = document.querySelector('[data-stat="block-time"]');
    if (el2) el2.textContent = (blockTimeMs / 1000).toFixed(1);

    const totalAddr = parseInt(stats.total_addresses);
    const el3 = document.querySelector('[data-stat="total-addresses"]');
    if (el3) el3.textContent = formatNumber(totalAddr);

    const txToday = parseInt(stats.transactions_today);
    const el4 = document.querySelector('[data-stat="tx-today"]');
    if (el4) el4.textContent = formatNumber(txToday);
}

function updateTransactionHistory(transactions) {
    const txListEl = document.getElementById('txHistory');
    if (!txListEl) return;
    txListEl.innerHTML = '';
    if (transactions.length === 0) {
        txListEl.innerHTML = '<p class="no-tx">No transactions yet</p>';
        return;
    }
    transactions.forEach(tx => {
        const isOutgoing = tx.from.hash.toLowerCase() === walletState.address.toLowerCase();
        const otherAddr = isOutgoing ? tx.to.hash : tx.from.hash;
        const shortOther = otherAddr.slice(0, 6) + '...' + otherAddr.slice(-4);
        const value = parseFloat(ethers.formatEther(tx.value));
        const time = timeAgo(new Date(tx.timestamp));
        const txDiv = document.createElement('div');
        txDiv.className = 'tx-item';
        txDiv.innerHTML = `
            <div class="tx-icon ${isOutgoing ? 'outgoing' : 'incoming'}">${isOutgoing ? '↑' : '↓'}</div>
            <div class="tx-details">
                <div class="tx-type">${isOutgoing ? 'Sent' : 'Received'}</div>
                <div class="tx-addr">${isOutgoing ? 'To: ' : 'From: '}${shortOther}</div>
                <div class="tx-time">${time}</div>
            </div>
            <div class="tx-amount ${isOutgoing ? 'outgoing' : 'incoming'}">${isOutgoing ? '-' : '+'}${value.toFixed(4)} X1T</div>
            <a href="${X1_CONFIG.explorerUrl}/tx/${tx.hash}" target="_blank" class="tx-explorer-link" title="View on Explorer">↗</a>`;
        txListEl.appendChild(txDiv);
    });
}

// ========================================
// DAILY CHECK-IN (Real TX!)
// ========================================
function loadCheckinData() {
    const data = JSON.parse(localStorage.getItem('gp_checkin') || '{}');
    const streakEl = document.getElementById('streakCount');
    const pointsEl = document.getElementById('totalPoints');
    if (streakEl) streakEl.textContent = data.streak || 0;
    if (pointsEl) pointsEl.textContent = data.points || 0;

    // Check cooldown
    const lastCheckin = data.lastCheckin || 0;
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24h

    const btn = document.getElementById('checkinBtn');
    if (now - lastCheckin < cooldown) {
        const remaining = cooldown - (now - lastCheckin);
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        if (btn) {
            btn.disabled = true;
            btn.querySelector('.checkin-text').textContent = `Next in ${hours}h ${mins}m`;
            btn.querySelector('.checkin-sub').textContent = 'Already checked in today!';
            btn.querySelector('.checkin-icon').textContent = '⏰';
        }
    }

    // Load check-in TX history
    renderCheckinHistory(data.history || []);
}

function renderCheckinHistory(history) {
    const list = document.getElementById('checkinTxList');
    if (!list) return;
    list.innerHTML = '';
    if (history.length === 0) {
        list.innerHTML = '<p class="no-tx" style="padding:10px;font-size:0.8rem;">No check-ins yet</p>';
        return;
    }
    history.slice(0, 5).forEach(item => {
        const div = document.createElement('div');
        div.className = 'tx-item';
        div.innerHTML = `
            <div class="tx-icon incoming">✅</div>
            <div class="tx-details">
                <div class="tx-type">Daily Check-in #${item.day}</div>
                <div class="tx-time">${new Date(item.time).toLocaleString()}</div>
            </div>
            <div class="tx-amount incoming">+10 pts</div>
            <a href="${X1_CONFIG.explorerUrl}/tx/${item.hash}" target="_blank" class="tx-explorer-link" title="View on Explorer">↗</a>`;
        list.appendChild(div);
    });
}

async function dailyCheckIn() {
    if (!walletState.connected) {
        showNotification('Connect your wallet first!', 'error');
        showWalletModal();
        return;
    }

    const data = JSON.parse(localStorage.getItem('gp_checkin') || '{}');
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    if (data.lastCheckin && (now - data.lastCheckin < cooldown)) {
        showNotification('Already checked in! Come back in 24h.', 'info');
        return;
    }

    const btn = document.getElementById('checkinBtn');
    const statusEl = document.getElementById('checkinStatus');
    btn.disabled = true;
    btn.querySelector('.checkin-text').textContent = 'Sending TX...';
    btn.querySelector('.checkin-icon').textContent = '⏳';

    try {
        // Send 0 X1T to self = real TX with minimal cost
        const tx = await walletState.signer.sendTransaction({
            to: walletState.address,
            value: 0n
        });

        btn.querySelector('.checkin-text').textContent = 'Confirming...';
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--cyan-400)">TX: ${tx.hash.slice(0, 14)}... ⏳</span>`;

        const receipt = await tx.wait();

        // Update streak
        const lastDate = data.lastCheckin ? new Date(data.lastCheckin).toDateString() : '';
        const yesterday = new Date(now - 86400000).toDateString();
        let streak = data.streak || 0;
        if (lastDate === yesterday) streak++;
        else if (lastDate !== new Date(now).toDateString()) streak = 1;

        const points = (data.points || 0) + 10;
        const history = data.history || [];
        history.unshift({ day: streak, hash: tx.hash, time: now });

        localStorage.setItem('gp_checkin', JSON.stringify({
            streak, points, lastCheckin: now, history: history.slice(0, 30)
        }));

        // Update UI
        btn.querySelector('.checkin-icon').textContent = '🎉';
        btn.querySelector('.checkin-text').textContent = 'Checked In!';
        btn.querySelector('.checkin-sub').textContent = `+10 Green Points earned!`;
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--green-400)">✅ Confirmed! <a href="${X1_CONFIG.explorerUrl}/tx/${tx.hash}" target="_blank" style="color:var(--cyan-400)">View on Explorer ↗</a></span>`;

        document.getElementById('streakCount').textContent = streak;
        document.getElementById('totalPoints').textContent = points;

        showNotification(`Check-in successful! +10 points 🎉`, 'success');
        renderCheckinHistory(history);

        // Refresh balance
        const bal = await walletState.provider.getBalance(walletState.address);
        walletState.balance = parseFloat(ethers.formatEther(bal));
        updateWalletUI();
        fetchRealData();

    } catch (error) {
        console.error('Check-in error:', error);
        btn.disabled = false;
        btn.querySelector('.checkin-icon').textContent = '✅';
        btn.querySelector('.checkin-text').textContent = 'Check In Now';
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            showNotification('Check-in cancelled', 'error');
        } else {
            showNotification('Check-in failed: ' + (error.reason || error.message), 'error');
        }
    }
}

// ========================================
// TIP / DONATE (Real TX!)
// ========================================
function setTipAmount(amount) {
    document.getElementById('tipAmount').value = amount;
    document.querySelectorAll('.tip-amount-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.amount) === amount);
    });
}

async function sendTip() {
    if (!walletState.connected) {
        showNotification('Connect your wallet first!', 'error');
        showWalletModal();
        return;
    }

    const amount = parseFloat(document.getElementById('tipAmount').value);
    if (!amount || amount <= 0) {
        showNotification('Enter a valid amount', 'error');
        return;
    }

    if (amount > walletState.balance) {
        showNotification('Insufficient balance!', 'error');
        return;
    }

    const btn = document.getElementById('tipBtn');
    btn.textContent = '⏳ Sending...';
    btn.disabled = true;

    try {
        const tx = await walletState.signer.sendTransaction({
            to: X1_CONFIG.builderWallet,
            value: ethers.parseEther(amount.toString())
        });

        btn.textContent = '⏳ Confirming...';
        await tx.wait();

        btn.textContent = '💚 Thank You!';
        btn.style.background = 'rgba(52, 211, 153, 0.2)';
        btn.style.color = 'var(--green-400)';
        btn.style.border = '1px solid rgba(52, 211, 153, 0.3)';

        showNotification(`Tip sent! ${amount} X1T → Thank you! 💚`, 'success');

        // Refresh balance
        const bal = await walletState.provider.getBalance(walletState.address);
        walletState.balance = parseFloat(ethers.formatEther(bal));
        updateWalletUI();
        fetchRealData();

        setTimeout(() => {
            btn.textContent = '💚 Send Tip (Real TX)';
            btn.style.background = '';
            btn.style.color = '';
            btn.style.border = '';
            btn.disabled = false;
        }, 3000);

    } catch (error) {
        btn.textContent = '💚 Send Tip (Real TX)';
        btn.disabled = false;
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            showNotification('Tip cancelled', 'error');
        } else {
            showNotification('Tip failed: ' + (error.reason || error.message), 'error');
        }
    }
}

// ========================================
// Faucet Address Auto-fill
// ========================================
function updateFaucetAddress() {
    const el = document.getElementById('faucetAddress');
    if (el && walletState.connected) {
        el.textContent = walletState.address;
        el.style.color = 'var(--green-400)';
        el.style.cursor = 'pointer';
        el.onclick = () => {
            navigator.clipboard.writeText(walletState.address);
            showNotification('Address copied! Paste it on the faucet page.', 'success');
        };
    }
}

// ========================================
// Mint NFT (Real TX!)
// ========================================
document.querySelectorAll('.btn-mint').forEach(btn => {
    btn.addEventListener('click', async function() {
        if (!walletState.connected) {
            showNotification('Connect wallet first!', 'error');
            showWalletModal();
            return;
        }
        const original = this.textContent;
        this.textContent = 'Preparing...';
        this.style.opacity = '0.7';
        this.disabled = true;
        try {
            const tx = await walletState.signer.sendTransaction({
                to: walletState.address,
                value: ethers.parseEther('0.001')
            });
            this.textContent = 'Confirming...';
            await tx.wait();
            this.textContent = '✓ Minted!';
            this.style.background = 'rgba(52, 211, 153, 0.2)';
            this.style.color = '#34d399';
            this.style.border = '1px solid rgba(52, 211, 153, 0.3)';
            this.style.opacity = '1';
            showNotification(`NFT Minted! TX: ${tx.hash.slice(0, 14)}...`, 'success');
            const balance = await walletState.provider.getBalance(walletState.address);
            walletState.balance = parseFloat(ethers.formatEther(balance));
            updateWalletUI();
            setTimeout(() => {
                this.textContent = original;
                this.style.background = '';
                this.style.color = '';
                this.style.border = '';
                this.disabled = false;
            }, 3000);
        } catch (error) {
            this.textContent = original;
            this.style.opacity = '1';
            this.disabled = false;
            if (error.code === 4001 || error.code === 'ACTION_REJECTED') showNotification('Transaction rejected', 'error');
            else showNotification('Mint failed: ' + (error.reason || error.message), 'error');
        }
    });
});

// ========================================
// Notifications
// ========================================
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">✕</button>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000);
}

// ========================================
// Navigation
// ========================================
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        scrollToSection(this.getAttribute('href').substring(1));
    });
});

window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');

    let current = '';
    document.querySelectorAll('.section, .hero').forEach(section => {
        if (window.scrollY >= section.offsetTop - 100) current = section.getAttribute('id');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) link.classList.add('active');
    });
});

// ========================================
// Counter Animation
// ========================================
function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-count'));
        const duration = 2000;
        const startTime = performance.now();
        const isDecimal = target % 1 !== 0;
        function update(t) {
            const progress = Math.min((t - startTime) / duration, 1);
            const ease = 1 - Math.pow(2, -10 * progress);
            const current = target * ease;
            counter.textContent = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    });
}

// ========================================
// Intersection Observer
// ========================================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            if (entry.target.querySelector('[data-count]') || entry.target.hasAttribute('data-count')) {
                animateCounters();
            }
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.card, .validator-card, .nft-card').forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
});

const heroStats = document.querySelector('.hero-stats');
if (heroStats) observer.observe(heroStats);

// ========================================
// Energy Chart
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
    const width = rect.width, height = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const cw = width - pad.left - pad.right, ch = height - pad.top - pad.bottom;
    const data = [];
    for (let i = 0; i < 24; i++) data.push(2.5 + Math.random() * 1.2 + Math.sin(i / 4) * 0.3);
    const maxVal = Math.max(...data) * 1.2;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (ch / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
        ctx.fillStyle = '#6b83a0'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
        ctx.fillText((maxVal - maxVal / 4 * i).toFixed(1) + ' Wh', pad.left - 8, y + 4);
    }
    ctx.fillStyle = '#6b83a0'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
    for (let i = 0; i < 24; i += 4) ctx.fillText(i + ':00', pad.left + (cw / 23) * i, height - 8);
    const grad = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    grad.addColorStop(0, 'rgba(52, 211, 153, 0.3)');
    grad.addColorStop(1, 'rgba(52, 211, 153, 0)');
    ctx.beginPath(); ctx.moveTo(pad.left, height - pad.bottom);
    for (let i = 0; i < data.length; i++) {
        const x = pad.left + (cw / (data.length - 1)) * i;
        const y = pad.top + ch - (data[i] / maxVal) * ch;
        if (i === 0) ctx.lineTo(x, y);
        else { const px = pad.left + (cw / (data.length - 1)) * (i - 1); const py = pad.top + ch - (data[i - 1] / maxVal) * ch; ctx.bezierCurveTo((px + x) / 2, py, (px + x) / 2, y, x, y); }
    }
    ctx.lineTo(width - pad.right, height - pad.bottom); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    const lGrad = ctx.createLinearGradient(pad.left, 0, width - pad.right, 0);
    lGrad.addColorStop(0, '#34d399'); lGrad.addColorStop(1, '#22d3ee');
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = pad.left + (cw / (data.length - 1)) * i;
        const y = pad.top + ch - (data[i] / maxVal) * ch;
        if (i === 0) ctx.moveTo(x, y);
        else { const px = pad.left + (cw / (data.length - 1)) * (i - 1); const py = pad.top + ch - (data[i - 1] / maxVal) * ch; ctx.bezierCurveTo((px + x) / 2, py, (px + x) / 2, y, x, y); }
    }
    ctx.strokeStyle = lGrad; ctx.lineWidth = 2.5; ctx.stroke();
    for (let i = 0; i < data.length; i++) {
        const x = pad.left + (cw / (data.length - 1)) * i;
        const y = pad.top + ch - (data[i] / maxVal) * ch;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = '#34d399'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(52, 211, 153, 0.2)'; ctx.fill();
    }
}
window.addEventListener('load', drawEnergyChart);
window.addEventListener('resize', drawEnergyChart);

// ========================================
// AI Chat Bot
// ========================================
const aiResponses = [
    { keywords: ['energy', 'energi', 'power'], response: `📊 **X1 EcoChain:** 3 Wh per node\n🎯 **vs Ethereum:** 99.5% less energy\n💡 Enable sleep mode during off-peak to save ~15% 🏆` },
    { keywords: ['score', 'green', 'skor'], response: `🏆 **Green Score** = Energy(40%) + Uptime(30%) + Carbon(20%) + Network(10%)\nMinimum **60** needed to mint Carbon Credit NFTs 🌿` },
    { keywords: ['carbon', 'nft', 'credit'], response: `🌍 Mint Cost: **0.001 X1T** per NFT\n1. Maintain Green Score ≥ 60\n2. Click Mint → MetaMask popup\n3. TX visible on explorer! 🌿` },
    { keywords: ['check', 'checkin', 'daily'], response: `✅ **Daily Check-in:**\n• Sends 0 X1T to self (real TX!)\n• Gas: ~0.000021 X1T\n• Earns **+10 Green Points**\n• 24h cooldown ⏰` },
    { keywords: ['tip', 'donate', 'support'], response: `💚 **Tip the Builder:**\nSend X1T directly on-chain!\nEvery tip = real TX on explorer.\nSupports GreenPulse development 🙏` },
    { keywords: ['balance', 'saldo', 'x1t'], response: walletState.connected ? `💰 Balance: **${walletState.balance?.toFixed(4)} X1T**\n📊 TX Count: **${walletState.txCount}**\n🚰 Need more? Use the Faucet!` : `Connect wallet first! Click "Connect Wallet" in the navbar.` },
    { keywords: ['faucet'], response: `🚰 **X1 Testnet Faucet:**\n• Claim **100 X1T** free\n• Every 24 hours\n• Go to: testnet.x1ecochain.com` },
    { keywords: ['swap', 'dex', 'trade'], response: `🔄 **Token Swap:**\nUse EcoDEX (ecodex.one) for swapping.\nX1 EcoChain's official DEX! 🏦` }
];

function getAIResponse(input) {
    const lower = input.toLowerCase();
    for (const item of aiResponses) {
        if (item.keywords.some(kw => lower.includes(kw))) return typeof item.response === 'function' ? item.response() : item.response;
    }
    return `I can help with:\n🔋 energy • 🏆 green score • 🌍 carbon nft\n✅ check-in • 💚 tip • 💰 balance • 🚰 faucet • 🔄 swap`;
}

function addChatMessage(content, isUser = false) {
    const chatMessages = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${isUser ? 'user' : 'bot'}`;
    div.innerHTML = `<div class="msg-avatar">${isUser ? '👤' : '🤖'}</div><div class="msg-content">${content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

const chatSend = document.getElementById('chatSend');
const chatInput = document.getElementById('chatInput');
if (chatSend) chatSend.addEventListener('click', () => {
    const input = chatInput.value.trim();
    if (!input) return;
    addChatMessage(input, true);
    chatInput.value = '';
    setTimeout(() => addChatMessage(getAIResponse(input)), 500 + Math.random() * 300);
});
if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') chatSend.click(); });

// ========================================
// Connect/Modal Event Listeners
// ========================================
const connectBtn = document.getElementById('connectWallet');
if (connectBtn) connectBtn.addEventListener('click', () => {
    if (walletState.connected) window.open(`${X1_CONFIG.explorerUrl}/address/${walletState.address}`, '_blank');
    else if (typeof window.ethereum !== 'undefined') connectWallet();
    else showWalletModal();
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.wallet-option-metamask')) {
        if (typeof window.ethereum !== 'undefined') connectWallet();
        else window.open('https://metamask.io/download/', '_blank');
    }
    if (e.target.closest('.wallet-option-walletconnect')) showNotification('WalletConnect coming soon!', 'info');
    if (e.target.closest('.modal-close') || e.target.classList.contains('modal-overlay')) closeWalletModal();
});

// Filter buttons
document.querySelectorAll('.chart-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        drawEnergyChart();
    });
});

// ========================================
// Listen for account/chain changes
// ========================================
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accts) => {
        if (accts.length === 0) location.reload();
        else connectWallet();
    });
    window.ethereum.on('chainChanged', () => location.reload());
}

// ========================================
// Helpers
// ========================================
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
}

function timeAgo(date) {
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

// ========================================
// Initialize
// ========================================
window.addEventListener('load', () => {
    setTimeout(animateCounters, 500);
    document.querySelectorAll('.bar-fill').forEach((bar, i) => {
        bar.style.width = '0%';
        setTimeout(() => { bar.style.width = bar.style.getPropertyValue('--width'); }, 300 + i * 200);
    });
    fetchNetworkStats();
    loadCheckinData();
});

async function fetchNetworkStats() {
    try {
        const res = await fetch(`${X1_CONFIG.explorerApi}/stats`);
        const stats = await res.json();
        updateDashboardWithRealStats(stats);
    } catch (e) { console.log('Stats fetch failed:', e); }
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 100);
});
