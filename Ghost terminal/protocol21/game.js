// --- Matrix Rain Background ---
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
    ctx.fillStyle = 'rgba(3, 3, 3, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';
    for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
    }
}
setInterval(drawMatrix, 33);

// --- Game Logic ---
class Protocol21 {
    constructor() {
        this.totalNodes = 21;
        this.nodesLeft = 21;
        this.playerTurn = true;
        
        this.textOutput = document.getElementById('text-output');
        this.nodeDisplay = document.getElementById('node-display');
        this.startBtn = document.getElementById('start-btn');
        this.gameBtns = document.getElementById('game-btns');
        this.numBtns = document.querySelectorAll('.num-btn');
        this.terminal = document.getElementById('terminal-container');
        
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        this.startBtn.addEventListener('click', () => this.startGame());
        this.numBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePlayerMove(parseInt(e.target.dataset.val)));
        });
        
        this.typeText("> PROTOCOL 21: There are 21 encrypted data cores.\n> We take turns extracting 1, 2, or 3 cores.\n> The one who extracts the LAST core triggers the ICE and is trapped.\n> You go first.", () => {
            this.startBtn.classList.remove('hidden');
        }, 30);
    }

    playBeep(freq = 800, type = 'square', dur = 0.03) {
        if(this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.02, this.audioCtx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + dur);
    }

    typeText(text, callback, speed = 40) {
        this.textOutput.innerHTML = "";
        let i = 0;
        const type = () => {
            if (i < text.length) {
                if (text.charAt(i) === '\n') {
                    this.textOutput.innerHTML += '<br>';
                } else {
                    this.textOutput.innerHTML += text.charAt(i);
                    if (text.charAt(i) !== ' ') this.playBeep(800 + Math.random() * 200);
                }
                i++;
                setTimeout(type, speed);
            } else if (callback) {
                callback();
            }
        };
        type();
    }

    renderNodes() {
        this.nodeDisplay.innerHTML = '';
        for (let i = 0; i < this.totalNodes; i++) {
            const node = document.createElement('div');
            node.className = 'node';
            if (i >= this.nodesLeft) node.classList.add('taken');
            this.nodeDisplay.appendChild(node);
        }
    }

    startGame() {
        this.startBtn.classList.add('hidden');
        this.nodeDisplay.classList.remove('hidden');
        this.nodesLeft = 21;
        this.renderNodes();
        this.promptPlayer();
    }

    promptPlayer() {
        this.playerTurn = true;
        this.updateButtons();
        this.gameBtns.classList.remove('hidden');
        this.typeText(`> Cores remaining: ${this.nodesLeft}. How many will you extract?`);
    }

    updateButtons() {
        this.numBtns.forEach(btn => {
            const val = parseInt(btn.dataset.val);
            btn.disabled = val > this.nodesLeft;
        });
    }

    handlePlayerMove(amount) {
        if (!this.playerTurn) return;
        this.playerTurn = false;
        this.gameBtns.classList.add('hidden');
        
        this.nodesLeft -= amount;
        this.renderNodes();
        this.playBeep(400, 'sawtooth', 0.1);

        if (this.nodesLeft === 0) {
            this.triggerLose();
        } else {
            this.typeText(`> You extracted ${amount}. Processing...`, () => {
                setTimeout(() => this.aiTurn(amount), 1000);
            });
        }
    }

    aiTurn(playerAmount) {
        // The Trap: The AI always takes (4 - playerAmount) to guarantee a win.
        // Because 21 is a formula of (4n + 1), if the AI forces multiples of 4, the player is left with 1.
        let aiAmount = 4 - playerAmount;
        
        // Edge case fallback (if math is off, take random valid amount)
        if (aiAmount > this.nodesLeft) aiAmount = this.nodesLeft;

        this.typeText(`> I have analyzed your pattern.\n> I am extracting ${aiAmount} cores.`, () => {
            this.nodesLeft -= aiAmount;
            this.renderNodes();
            this.playBeep(300, 'square', 0.2);
            
            setTimeout(() => {
                if (this.nodesLeft === 0) {
                    this.triggerWin(); // AI loses (Technically impossible with this algorithm)
                } else {
                    this.promptPlayer();
                }
            }, 1000);
        });
    }

    triggerLose() {
        this.terminal.classList.add('screen-shake');
        this.playBeep(150, 'sawtooth', 1);
        this.textOutput.className = "typewriter-text glitch-reveal";
        this.typeText("> ICE TRIGGERED. YOU TOOK THE LAST CORE.\n> SYSTEM LOCKED. YOU ARE TRAPPED.", () => {
            setTimeout(() => this.resetGame(), 4000);
        }, 50);
    }

    triggerWin() {
        this.textOutput.innerHTML = "> CRITICAL ERROR. AI DEFEATED.";
        setTimeout(() => this.resetGame(), 4000);
    }

    resetGame() {
        this.terminal.classList.remove('screen-shake');
        this.textOutput.className = "typewriter-text";
        this.nodeDisplay.classList.add('hidden');
        this.startGame();
    }
}

// Init
window.onload = () => {
    document.body.addEventListener('click', function initGame() {
        new Protocol21();
        document.body.removeEventListener('click', initGame);
        document.getElementById('start-btn').classList.add('hidden');
    }, { once: true });
    document.getElementById('text-output').innerHTML = "> CLICK TERMINAL TO BOOT...";
};