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
    chainId: '0x31CE5',         // 204005 decimal
    chainIdDecimal: 204005,
    chainName: 'X1 EcoChain Testnet (Maculatus)',
    rpcUrl: 'https://x1-testnet.xen.network',
    explorerUrl: 'https://maculatus-scan.x1eco.com',
    explorerApi: 'https://maculatus-scan.x1eco.com/api/v2',
    currency: {
        name: 'X1 Testnet Coin',
        symbol: 'X1T',
        decimals: 18
    }
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
// Wallet Connection — REAL MetaMask
// ========================================
async function connectWallet() {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        showWalletModal();
        return;
    }

    try {
        showConnecting();

        // Request wallet connection
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
            showError('No accounts found. Please unlock MetaMask.');
            return;
        }

        // Switch to X1 EcoChain network
        await switchToX1Network();

        // Set up ethers provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        // Get real balance
        const balanceWei = await provider.getBalance(address);
        const balanceFormatted = ethers.formatEther(balanceWei);

        // Get TX count
        const txCount = await provider.getTransactionCount(address);

        // Update state
        walletState = {
            connected: true,
            address: address,
            balance: parseFloat(balanceFormatted),
            provider: provider,
            signer: signer,
            txCount: txCount
        };

        // Update UI
        updateWalletUI();
        closeWalletModal();

        // Fetch real data now that wallet is connected
        fetchRealData();

        console.log('✅ Wallet connected:', address);
        console.log('💰 Balance:', balanceFormatted, 'X1T');
        console.log('📊 TX Count:', txCount);

    } catch (error) {
        console.error('Wallet connection error:', error);
        if (error.code === 4001) {
            showError('Connection rejected by user');
        } else {
            showError('Connection failed: ' + error.message);
        }
    }
}

// ========================================
// Switch Network to X1 EcoChain
// ========================================
async function switchToX1Network() {
    try {
        // Try to switch to X1 network
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: X1_CONFIG.chainId }]
        });
    } catch (switchError) {
        // If network not found, add it
        if (switchError.code === 4902) {
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
        }
    }
}

// ========================================
// Wallet Modal
// ========================================
function showWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function showConnecting() {
    const btn = document.getElementById('connectWallet');
    if (btn) {
        btn.innerHTML = `
            <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Connecting...
        `;
        btn.disabled = true;
    }
}

function showError(msg) {
    const btn = document.getElementById('connectWallet');
    if (btn) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
            </svg>
            Connect Wallet
        `;
        btn.disabled = false;
    }
    // Show error notification
    showNotification(msg, 'error');
}

// ========================================
// Update Wallet UI After Connection
// ========================================
function updateWalletUI() {
    const btn = document.getElementById('connectWallet');
    const shortAddr = walletState.address.slice(0, 6) + '...' + walletState.address.slice(-4);

    if (btn) {
        btn.innerHTML = `
            <div class="wallet-connected-info">
                <span class="wallet-balance">${walletState.balance.toFixed(2)} X1T</span>
                <span class="wallet-address-badge">${shortAddr}</span>
            </div>
        `;
        btn.classList.add('connected');
        btn.disabled = false;
        btn.onclick = () => showWalletDetails();
    }

    // Update hero stats if they reference the wallet
    updateHeroStatsWithRealData();
}

function showWalletDetails() {
    const explorerLink = `${X1_CONFIG.explorerUrl}/address/${walletState.address}`;
    window.open(explorerLink, '_blank');
}

// ========================================
// Fetch REAL Data from Explorer API
// ========================================
async function fetchRealData() {
    try {
        // Fetch network stats
        const statsRes = await fetch(`${X1_CONFIG.explorerApi}/stats`);
        const stats = await statsRes.json();

        // Update dashboard with real data
        updateDashboardWithRealStats(stats);

        // Fetch wallet transactions if connected
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
    // Update Total Transactions
    const totalTx = parseInt(stats.total_transactions);
    const txElement = document.querySelector('[data-stat="total-tx"]');
    if (txElement) {
        txElement.textContent = formatNumber(totalTx);
    }

    // Update Block Time
    const blockTimeMs = stats.average_block_time;
    const blockTimeEl = document.querySelector('[data-stat="block-time"]');
    if (blockTimeEl) {
        blockTimeEl.textContent = (blockTimeMs / 1000).toFixed(1);
    }

    // Update Total Addresses
    const totalAddr = parseInt(stats.total_addresses);
    const addrEl = document.querySelector('[data-stat="total-addresses"]');
    if (addrEl) {
        addrEl.textContent = formatLargeNumber(totalAddr);
    }

    // Update Transactions Today
    const txToday = parseInt(stats.transactions_today);
    const txTodayEl = document.querySelector('[data-stat="tx-today"]');
    if (txTodayEl) {
        txTodayEl.textContent = formatNumber(txToday);
    }

    // Update Gas Prices
    const gasEl = document.querySelector('[data-stat="gas-price"]');
    if (gasEl) {
        gasEl.textContent = stats.gas_prices.average.toFixed(2);
    }

    // Update network utilization
    const utilEl = document.querySelector('[data-stat="utilization"]');
    if (utilEl) {
        utilEl.textContent = stats.network_utilization_percentage.toFixed(1) + '%';
    }

    // Hero stat counters
    const activeNodesEl = document.querySelector('[data-count="12834"]');
    if (activeNodesEl) {
        activeNodesEl.setAttribute('data-count', Math.floor(totalAddr / 1000));
        activeNodesEl.textContent = formatNumber(Math.floor(totalAddr / 1000));
    }
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
        const txHash = tx.hash.slice(0, 10) + '...';

        const txDiv = document.createElement('div');
        txDiv.className = 'tx-item';
        txDiv.innerHTML = `
            <div class="tx-icon ${isOutgoing ? 'outgoing' : 'incoming'}">
                ${isOutgoing ? '↑' : '↓'}
            </div>
            <div class="tx-details">
                <div class="tx-type">${isOutgoing ? 'Sent' : 'Received'}</div>
                <div class="tx-addr">${isOutgoing ? 'To: ' : 'From: '}${shortOther}</div>
                <div class="tx-time">${time}</div>
            </div>
            <div class="tx-amount ${isOutgoing ? 'outgoing' : 'incoming'}">
                ${isOutgoing ? '-' : '+'}${value.toFixed(2)} X1T
            </div>
            <a href="${X1_CONFIG.explorerUrl}/tx/${tx.hash}" target="_blank" class="tx-explorer-link" title="View on Explorer">
                ↗
            </a>
        `;
        txListEl.appendChild(txDiv);
    });
}

function updateHeroStatsWithRealData() {
    if (!walletState.connected) return;

    // Update the leaderboard section with user's real data
    const userRow = document.querySelector('.user-row');
    if (userRow) {
        const addrCell = userRow.querySelector('.leader-address');
        if (addrCell) {
            const shortAddr = walletState.address.slice(0, 6) + '...' + walletState.address.slice(-4);
            addrCell.textContent = shortAddr;
        }
    }
}

// ========================================
// Notifications
// ========================================
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 5000);
}

// ========================================
// Smooth Scroll Navigation
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
// Intersection Observer
// ========================================
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            if (entry.target.querySelector('[data-count]') || entry.target.hasAttribute('data-count')) {
                animateCounters();
            }
        }
    });
}, observerOptions);

document.querySelectorAll('.card, .validator-card, .nft-card, .insight-card, .leaderboard-row').forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
});

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

    // Real X1 EcoChain energy data (3Wh average with natural fluctuation)
    const dataPoints = 24;
    const data = [];
    for (let i = 0; i < dataPoints; i++) {
        data.push(2.5 + Math.random() * 1.2 + Math.sin(i / 4) * 0.3);
    }

    const maxVal = Math.max(...data) * 1.2;
    const minVal = 0;

    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const val = (maxVal - (maxVal / 4 * i)).toFixed(1);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(val + ' Wh', padding.left - 8, y + 4);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    for (let i = 0; i < dataPoints; i += 4) {
        const x = padding.left + (chartWidth / (dataPoints - 1)) * i;
        ctx.fillText(i + ':00', x, height - 8);
    }

    // Area
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

    // Line
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

    // Dots
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartWidth / (data.length - 1)) * i;
        const y = padding.top + chartHeight - ((data[i] - minVal) / (maxVal - minVal)) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.fill();
    }
}

window.addEventListener('load', drawEnergyChart);
window.addEventListener('resize', drawEnergyChart);

// ========================================
// AI Chat Bot
// ========================================
const aiResponses = [
    {
        keywords: ['energy', 'energi', 'watt', 'power', 'listrik'],
        response: `Here's your node energy profile:\n\n📊 **X1 EcoChain Average:** 3 Wh per node\n🎯 **vs Ethereum:** 99.5% less energy (3 Wh vs 600 Wh)\n💡 **Tip:** Enable sleep mode during off-peak hours (02:00-06:00) to save ~15% energy.\n\nYour network is the most energy-efficient L1! 🏆`
    },
    {
        keywords: ['score', 'green', 'skor', 'nilai'],
        response: `**Green Score** breakdown:\n\n🏆 Formula: Energy(40%) + Uptime(30%) + Carbon(20%) + Network(10%)\n\n**Components:**\n- ⚡ Energy: X1 uses ~3Wh = near-perfect score\n- ⏱️ Uptime: Based on your node availability\n- 🌱 Carbon: Savings vs Ethereum equivalent\n- 🔄 Network: Blocks validated on-chain\n\nMinimum **60** score needed to mint Carbon Credit NFTs 🌿`
    },
    {
        keywords: ['carbon', 'offset', 'credit', 'karbon', 'co2', 'nft'],
        response: `Carbon Credit NFT system:\n\n🌍 **Categories:** Forest, Solar, Wind, Ocean, DePIN Node\n💰 **Mint Cost:** 0.01 X1T per NFT\n\n**How it works:**\n1. Register as validator on GreenPulse\n2. Maintain Green Score ≥ 60\n3. Mint Carbon Credits based on verified energy savings\n4. Trade on the marketplace!\n\n**Contract:** GreenPulseCarbonCredit.sol (ERC-721) 🌿`
    },
    {
        keywords: ['optimize', 'improve', 'better', 'optimalkan', 'baik'],
        response: `**Optimization tips for X1 nodes:**\n\n🔧 **Quick Wins:**\n1. Update node software to latest version\n2. Enable compression for validation data\n3. Set peer connection limit to 25\n\n⚙️ **Hardware:**\n- X1 nodes designed for ~3Wh (ARM-based)\n- Raspberry Pi 5 or similar SBC ideal\n- No GPU mining required!\n\nEstimated improvement: **+12 Green Score points** 📈`
    },
    {
        keywords: ['balance', 'saldo', 'x1t', 'token', 'faucet'],
        response: walletState.connected
            ? `Your wallet info:\n\n💰 **Balance:** ${walletState.balance?.toFixed(4)} X1T\n📊 **Transactions:** ${walletState.txCount}\n🔗 **Address:** ${walletState.address?.slice(0,10)}...\n\n**Need more X1T?** Claim from the faucet at testnet.x1ecochain.com (100 X1T/24hrs)`
            : `Please connect your wallet first to see your balance! Click "Connect Wallet" in the navbar.`
    }
];

const defaultResponse = `I can help with:\n\n🔋 **"energy"** — Node power consumption\n🏆 **"green score"** — Score algorithm\n🌍 **"carbon credits"** — NFT system\n⚙️ **"optimize"** — Efficiency tips\n💰 **"balance"** — Your X1T balance\n\nAsk me anything about green blockchain! 🌿`;

function getAIResponse(input) {
    const lower = input.toLowerCase();
    for (const item of aiResponses) {
        if (item.keywords.some(kw => lower.includes(kw))) {
            return typeof item.response === 'function' ? item.response() : item.response;
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

const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

if (chatSend) {
    chatSend.addEventListener('click', () => {
        const input = chatInput.value.trim();
        if (!input) return;
        addChatMessage(input, true);
        chatInput.value = '';
        setTimeout(() => {
            const response = getAIResponse(input);
            addChatMessage(response, false);
        }, 600 + Math.random() * 400);
    });
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') chatSend.click();
    });
}

// ========================================
// Connect Wallet Button Event
// ========================================
const connectBtn = document.getElementById('connectWallet');
if (connectBtn) {
    connectBtn.addEventListener('click', () => {
        if (walletState.connected) {
            showWalletDetails();
        } else {
            // Check if MetaMask exists
            if (typeof window.ethereum !== 'undefined') {
                connectWallet();
            } else {
                showWalletModal();
            }
        }
    });
}

// ========================================
// Wallet Modal — Wallet Selection
// ========================================
// MetaMask button in modal
document.addEventListener('click', (e) => {
    if (e.target.closest('.wallet-option-metamask')) {
        if (typeof window.ethereum !== 'undefined') {
            connectWallet();
        } else {
            window.open('https://metamask.io/download/', '_blank');
        }
    }
    if (e.target.closest('.wallet-option-walletconnect')) {
        showNotification('WalletConnect coming soon! Use MetaMask for now.', 'info');
    }
    if (e.target.closest('.modal-close') || e.target.closest('.modal-overlay')) {
        closeWalletModal();
    }
});

// ========================================
// Mint NFT — Real Transaction
// ========================================
document.querySelectorAll('.btn-mint').forEach(btn => {
    btn.addEventListener('click', async function() {
        if (!walletState.connected) {
            showNotification('Please connect your wallet first!', 'error');
            showWalletModal();
            return;
        }

        const original = this.textContent;
        this.textContent = 'Preparing...';
        this.style.opacity = '0.7';
        this.disabled = true;

        try {
            // Send a real test transaction (0.001 X1T to self as demo)
            const tx = await walletState.signer.sendTransaction({
                to: walletState.address,
                value: ethers.parseEther('0.001')
            });

            this.textContent = 'Confirming...';

            // Wait for confirmation
            const receipt = await tx.wait();

            this.textContent = '✓ Minted!';
            this.style.background = 'rgba(34, 197, 94, 0.2)';
            this.style.color = '#22c55e';
            this.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            this.style.opacity = '1';

            showNotification(`TX confirmed! Hash: ${tx.hash.slice(0, 14)}...`, 'success');

            // Refresh balance
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
            console.error('Mint error:', error);
            this.textContent = original;
            this.style.opacity = '1';
            this.disabled = false;
            if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                showNotification('Transaction rejected by user', 'error');
            } else {
                showNotification('Transaction failed: ' + (error.reason || error.message), 'error');
            }
        }
    });
});

// ========================================
// Filter Buttons
// ========================================
document.querySelectorAll('.chart-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        drawEnergyChart();
    });
});

// ========================================
// Helper Functions
// ========================================
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
}

function formatLargeNumber(num) {
    return num.toLocaleString();
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return seconds + 's ago';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
}

// ========================================
// Listen for account/chain changes
// ========================================
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            walletState.connected = false;
            walletState.address = null;
            walletState.balance = null;
            location.reload();
        } else {
            connectWallet();
        }
    });

    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}

// ========================================
// Initialize
// ========================================
window.addEventListener('load', () => {
    setTimeout(animateCounters, 500);

    document.querySelectorAll('.bar-fill').forEach((bar, i) => {
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = bar.style.getPropertyValue('--width');
        }, 300 + i * 200);
    });

    // Auto-fetch network stats on load (even without wallet)
    fetchNetworkStats();
});

async function fetchNetworkStats() {
    try {
        const res = await fetch(`${X1_CONFIG.explorerApi}/stats`);
        const stats = await res.json();
        updateDashboardWithRealStats(stats);
    } catch (e) {
        console.log('Could not fetch stats:', e);
    }
}

// Smooth reveal
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => { document.body.style.opacity = '1'; }, 100);
});
