const form = document.getElementById("commandForm");
const input = document.getElementById("commandInput");
const output = document.getElementById("output");
const prompt = document.getElementById("prompt");
const typedText = document.getElementById("typedText");
const cursor = document.getElementById("cursor");
const terminal = document.getElementById("terminal");
const matrixCanvas = document.getElementById("matrixCanvas");
const matrixContext = matrixCanvas.getContext("2d");
const windowLayer = document.getElementById("window-layer");
const arcynBackdoor = document.getElementById("arcynBackdoor");
const closeArcynBtn = document.getElementById("closeArcyn");

let audioCtx; 

const state = {
  busy: false,
  shutdown: false,
  aiMode: false,
  currentPath: "~",
  history: [],
  historyIndex: 0,
  matrixActive: false,
  matrixTimer: null,
  randomLogTimer: null,
  // Added PROTOCOL_21.EXE to the default inventory array
  inventory: ["ROOT_ACCESS_KEY", "DECRYPT_TOKEN_8492", "PROTOCOL_21.EXE"],
  extractGameActive: false,
  extractQuestion: null,
};

const fileSystem = {
  "~": { folders: ["logs", "system", "encrypted"], files: ["readme.txt"] },
  "~/logs": { folders: [], files: ["access.log", "trace.log"] },
  "~/system": { folders: [], files: ["kernel.sys", "identity.txt"] },
  "~/encrypted": { folders: [], files: ["secrets.dat", "vault.key"] },
};

const files = {
  "~/readme.txt": ["GhostTerminal training shell", "All operations are simulated."],
  "~/logs/access.log": ["[02:11:08] root session opened", "[02:15:19] anomaly: duplicate operator signature"],
  "~/logs/trace.log": ["route: ghost-node-7 > relay-02 > null-gate", "trace confidence: 91.7%"],
  "~/system/kernel.sys": ["GHOST_KERNEL=simulated", "STEALTH_LAYER=enabled"],
  "~/system/identity.txt": ["codename: SPECTER-13", "access: root/sandbox", "DECRYPTION_PIN: 8492"],
  "~/encrypted/secrets.dat": ["--- TOP SECRET PAYLOAD ---", "PROJECT ARCYN IS ONLINE."],
  "~/encrypted/vault.key": ["GHOST-7A9X-NULL-404"],
};

const commands = {
  help: showHelp,
  scan: runScan,
  decrypt: runDecrypt,
  access: runAccess,
  clear: clearTerminal,
  whoami: showIdentity,
  ip: showIp,
  ls: listDirectory,
  cd: changeDirectory,
  cat: readFile,
  hack: runHack,
  matrix: toggleMatrix,
  socials: showSocials,
  ai: toggleAiMode,
  exit: shutdownTerminal,
  map: showMapWindow, 
  connect: runConnect, 
  inventory: showInventoryWindow,
  stash: showInventoryWindow,
  "view schema": show3DWireframeWindow,
  extract: startExtractMinigame,
  "deploy arcyn": triggerHiddenBackdoor
};

const randomLogs = ["Background packet observed", "Ghost daemon heartbeat acknowledged", "Passive trace scrubbed"];

// --- EVENT LISTENERS ---

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.extractGameActive) return; 
  await handleInput(input.value);
});

input.addEventListener("input", () => {
  typedText.textContent = input.value;
  initAudio();
  maybeClick(); 
});

input.addEventListener("keydown", (event) => {
  initAudio(); 

  if (state.extractGameActive && event.key === "Enter") {
    event.preventDefault();
    const answer = input.value;
    clearInput();
    handleExtractClick(answer);
    return;
  }

  if (event.key === "ArrowUp") { event.preventDefault(); recallHistory(-1); }
  if (event.key === "ArrowDown") { event.preventDefault(); recallHistory(1); }
});

document.addEventListener("click", focusInput);
window.addEventListener("resize", resizeMatrix);

closeArcynBtn.addEventListener("click", () => {
  arcynBackdoor.classList.remove("active");
  terminal.style.display = "flex";
  focusInput();
});

window.addEventListener("load", async () => {
  focusInput();
  startCursor();
  startRandomGlitches();
  await runBootSequence();
  scheduleRandomLog();
});

// --- AUDIO LOGIC ---

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, type, duration, vol=0.015) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function maybeClick() { playTone(150 + Math.random() * 80, 'square', 0.04); }
function playSuccess() { playTone(600, 'sine', 0.1, 0.03); setTimeout(() => playTone(900, 'sine', 0.15, 0.03), 100); }
function playError() { playTone(120, 'sawtooth', 0.3, 0.03); }

// --- CORE LOGIC ---

async function handleInput(rawCommand) {
  if (state.busy || state.shutdown) return;
  const commandText = rawCommand.trim();
  clearInput();
  if (!commandText) return;

  state.history.push(commandText);
  state.historyIndex = state.history.length;

  renderLine(`${getPrompt()} ${commandText}`, "command-line", false);
  await randomPause(120, 360);

  if (state.aiMode && commandText.toLowerCase() !== "ai") {
    await respondAsAi(commandText);
    return;
  }

  const lowerCmd = commandText.toLowerCase();
  let executed = false;
  
  for (const key in commands) {
    if (lowerCmd.startsWith(key)) {
      const argsStr = commandText.substring(key.length).trim();
      const args = argsStr ? argsStr.split(/\s+/) : [];
      await commands[key](args, commandText);
      executed = true;
      break;
    }
  }

  if (!executed) await commandNotFound([], commandText);
}

// --- DRAGGABLE WINDOW MANAGER ---
let zIndexCounter = 100;

function createDraggableWindow(title, contentElement, width = 400, height = "auto") {
  const win = document.createElement("div");
  win.className = "drag-window";
  win.style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== "auto") win.style.height = `${height}px`;
  
  win.style.top = `${Math.floor(Math.random() * 20) + 10}%`;
  win.style.left = `${Math.floor(Math.random() * 30) + 10}%`;
  win.style.zIndex = zIndexCounter++;

  const header = document.createElement("div");
  header.className = "window-header";
  header.innerHTML = `<span>${title}</span> <button class="window-close">X</button>`;

  const content = document.createElement("div");
  content.className = "window-content";
  content.appendChild(contentElement);

  win.appendChild(header);
  win.appendChild(content);
  windowLayer.appendChild(win);

  header.querySelector(".window-close").onclick = () => win.remove();
  win.onmousedown = () => win.style.zIndex = zIndexCounter++;

  let isDragging = false, startX, startY, initialX, initialY;

  header.onmousedown = (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = win.offsetLeft;
    initialY = win.offsetTop;
    document.onmousemove = onMouseMove;
    document.onmouseup = onMouseUp;
  };

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    win.style.left = `${initialX + dx}px`;
    win.style.top = `${initialY + dy}px`;
  }

  function onMouseUp() {
    isDragging = false;
    document.onmousemove = null;
    document.onmouseup = null;
  }
}

// --- UPGRADE 1: THREAT INTEL MAP ---

async function showMapWindow() {
  setBusy(true);
  await typeLine("Initializing interactive map widget...", "dim");
  await randomPause(400, 800);
  
  const mapContainer = document.createElement("div");
  mapContainer.className = "interactive-map-container";
  
  const targets = [
    { id: "NYC", top: "32%", left: "28%", city: "New York" },
    { id: "LON", top: "26%", left: "48%", city: "London" },
    { id: "SVO", top: "23%", left: "62%", city: "Moscow" },
    { id: "DEL", top: "42%", left: "70%", city: "New Delhi" },
    { id: "TYO", top: "35%", left: "86%", city: "Tokyo" }
  ];

  targets.forEach(target => {
    const node = document.createElement("div");
    node.className = "map-node";
    node.style.top = target.top;
    node.style.left = target.left;
    node.setAttribute("data-city", target.city);
    node.onclick = () => { if (!state.busy) handleInput(`connect ${target.id}`); };
    mapContainer.appendChild(node);
  });

  createDraggableWindow("GLOBAL_RADAR_UPLINK", mapContainer, 500);
  playSuccess(); 
  await typeLine("Map widget spawned. Drag header to move.", "success");
  setBusy(false);
}

async function runConnect(args) {
  setBusy(true);
  const target = args[0];
  if (!target) {
    await typeLine("connect: missing target node", "warning");
    setBusy(false); return;
  }

  const threatIntel = {
    NYC: ["NODE: New York", "THREAT PROFILE: Financial DDoS (2012)", "TACTIC: High-volume botnet swarming", "LEARN: Botnets use infected IoT devices to overload critical infrastructure servers."],
    LON: ["NODE: London", "THREAT PROFILE: WannaCry Ransomware (2017)", "TACTIC: SMB vulnerability exploit (EternalBlue)", "LEARN: Ransomware encrypts hard drives and demands cryptocurrency. Always patch your SMB ports!"],
    SVO: ["NODE: Moscow", "THREAT PROFILE: SolarWinds Supply Chain (2020)", "TACTIC: Malicious software update injection", "LEARN: Supply chain attacks compromise trusted vendors to hit the actual targets."],
    DEL: ["NODE: New Delhi", "THREAT PROFILE: Operation Hangover (2013)", "TACTIC: Spear-phishing and cyber espionage", "LEARN: Phishing targets the weakest link in any security network: human psychology."],
    TYO: ["NODE: Tokyo", "THREAT PROFILE: Operation Dust Storm (2018)", "TACTIC: Customized infrastructure malware", "LEARN: SCADA/ICS industrial networks require physical air-gaps for true security."]
  };

  await typeLines([
    withTimestamp(`Initiating direct routing to node [${target}]...`),
    withTimestamp("Bypassing regional firewalls..."),
  ], "dim", 200, 500);

  await animateProgress("Uplink", 20, 20, 60);

  if (threatIntel[target]) {
    playSuccess();
    await typeLine(`CONNECTION ESTABLISHED. Downloading Threat Intel...`, "success");
    await typeLine("--- CYBER ATTACK DOSSIER ---", "warning");
    await typeLines(threatIntel[target], "success", 300, 600);
  } else {
    playError();
    await typeLine(`CONNECTION REFUSED. Node [${target}] is highly monitored.`, "danger");
  }
  setBusy(false);
}

// --- PROTOCOL 21 INTEGRATION LAUNCHER ---
function launchProtocol21() {
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "550px"; 
    
    const iframe = document.createElement("iframe");
    iframe.src = "protocol21/game.html"; // The path to your game files
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    
    container.appendChild(iframe);
    
    // Mount the game inside a draggable window!
    createDraggableWindow("PROTOCOL_21.EXE", container, 800);
}


// --- UPGRADE 2: INSPECT MODE INVENTORY ---

async function showInventoryWindow() {
  setBusy(true);
  await typeLine("Mounting secure stash partition...", "dim");
  
  const layout = document.createElement("div");
  layout.className = "inventory-layout";

  const grid = document.createElement("div");
  grid.className = "inventory-grid";

  const inspectPanel = document.createElement("div");
  inspectPanel.className = "inventory-inspect";
  inspectPanel.innerHTML = "<b>[ INSPECT MODE ]</b><br><br>Select an item from the grid to examine its properties and lore.";

  const itemLore = {
    "ROOT_ACCESS_KEY": "ITEM: Root Access Key\nTYPE: System Credential\n\nGrants full administrative privileges to the GhostTerminal sandbox environment. Keep this secure.",
    "DECRYPT_TOKEN_8492": "ITEM: Decryption Cipher\nTYPE: Offline Key\n\nPIN Code: 8492. Use this in conjunction with the 'decrypt' command to unlock secrets.dat in the system vault.",
    // Added Lore for Protocol 21 executable
    "PROTOCOL_21.EXE": "ITEM: Executable Binary\nTYPE: Logic Trap\n\nAn encrypted game of node extraction. It tests operator psychological resilience.\nWARNING: System ICE will trigger if you lose."
  };

  for (let i = 0; i < 9; i++) {
    const slot = document.createElement("div");
    slot.className = "inventory-slot";
    
    if (state.inventory[i]) {
      const itemName = state.inventory[i];
      slot.textContent = itemName.replace(/_/g, " ");
      slot.onclick = () => { 
        playSuccess(); 
        const lore = itemLore[itemName] || `ITEM: ${itemName}\nTYPE: Extracted Token\n\nA unique data fragment pulled from a secure node. Save this for future platform integration.`;
        
        // If it's the game executable, add a launch button
        if (itemName === "PROTOCOL_21.EXE") {
            inspectPanel.innerHTML = `<b>[ EXAMINING ITEM ]</b><br><br><span style="color:#fff">${lore}</span><br><br><button id="launch-p21-btn" style="background:#0f0;color:#000;border:none;padding:8px 15px;margin-top:15px;cursor:pointer;font-family:inherit;font-weight:bold;">[ EXECUTE PROGRAM ]</button>`;
            
            // Add click event for the launch button
            document.getElementById("launch-p21-btn").onclick = () => {
                launchProtocol21();
                playSuccess();
            };
        } else {
            // Normal inspect for other items
            inspectPanel.innerHTML = `<b>[ EXAMINING ITEM ]</b><br><br><span style="color:#fff">${lore}</span>`;
        }
      };
    } else {
      slot.textContent = "EMPTY";
      slot.classList.add("empty");
    }
    grid.appendChild(slot);
  }

  layout.appendChild(grid);
  layout.appendChild(inspectPanel);

  createDraggableWindow("SECURE_STASH // DB_VIEWER", layout, 600);
  playSuccess();
  await typeLine("Inventory interface loaded.", "success");
  setBusy(false);
}

// --- UPGRADE 3: EDUCATIONAL EXTRACT LOGIC PUZZLE ---

const extractQuestions = [
  { q: "What is the standard port number for Secure Shell (SSH)?", a: "22" },
  { q: "What is the standard port number for secure web traffic (HTTPS)?", a: "443" },
  { q: "What is the standard port number for unencrypted web traffic (HTTP)?", a: "80" },
  { q: "What is the standard port number for File Transfer Protocol (FTP)?", a: "21" },
  { q: "What is the standard port number for the Domain Name System (DNS)?", a: "53" }
];

async function startExtractMinigame() {
  setBusy(true);
  await typeLines([
    withTimestamp("Initializing extraction protocol..."),
    "WARNING: Intrusion countermeasures active.",
    "To bypass the firewall, you must solve the networking protocol challenge."
  ], "warning", 300, 600);
  
  const qObj = extractQuestions[randomNumber(0, extractQuestions.length - 1)];
  state.extractQuestion = qObj;
  
  await typeLine(" ", "dim");
  await typeLine(`CHALLENGE: ${qObj.q}`, "success");
  await typeLine("Type the correct port number and press ENTER to bypass.", "dim");
  
  state.extractGameActive = true;
  setBusy(false); 
}

async function handleExtractClick(answer) {
  setBusy(true);
  state.extractGameActive = false;
  
  renderLine(`root@ghost:~$ ${answer}`, "command-line", false);
  await randomPause(400, 800);

  if (answer.trim() === state.extractQuestion.a) {
    terminal.classList.add("glitch");
    setTimeout(() => terminal.classList.remove("glitch"), 200);
    const tokenName = "ARCYN_TOKEN_" + randomNumber(100, 999);
    state.inventory.push(tokenName);
    playSuccess();
    await typeLine("BYPASS SUCCESSFUL. Extracting data fragment...", "success");
    await typeLine(`[+] Added ${tokenName} to stash. Type 'inventory' to examine it.`, "warning");
  } else {
    playError();
    await typeLine(`INCORRECT PORT. The correct protocol port was ${state.extractQuestion.a}.`, "danger");
    await typeLine("ALARM TRIGGERED. You have been forcibly disconnected.", "danger");
  }
  setBusy(false);
}

// --- REMAINING FEATURES (3D, BACKDOOR, HELP) ---

async function show3DWireframeWindow() {
  setBusy(true);
  if (!window.THREE) {
    playError();
    await typeLine("ERR: 3D Render Engine offline. Cannot mount canvas.", "danger");
    setBusy(false);
    return;
  }

  await typeLine("Booting 3D WebGL schema renderer...", "dim");
  
  const container = document.createElement("div");
  container.className = "three-canvas-container";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(400, 300);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.IcosahedronGeometry(2, 1);
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff9f });
  const mesh = new THREE.LineSegments(edges, material);
  scene.add(mesh);
  camera.position.z = 5;

  function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.005;
    mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  animate();

  createDraggableWindow("SCHEMA_VIEWER_BETA", container, 400);
  playSuccess();
  await typeLine("Schema online. You can drag the window.", "success");
  setBusy(false);
}

async function triggerHiddenBackdoor() {
  setBusy(true);
  terminal.classList.add("glitch");
  await typeLines([
    "WARNING: OVERRIDE COMMAND DETECTED",
    "BYPASSING TERMINAL SHELL...",
    "INITIALIZING PROJECT ARCYN..."
  ], "danger", 100, 200);
  
  if (audioCtx) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
  }

  await randomPause(800, 1000);
  terminal.style.display = "none";
  arcynBackdoor.classList.add("active");
  terminal.classList.remove("glitch");
  setBusy(false);
}

async function runBootSequence() {
  setBusy(true);
  const bootLines = ["Initializing GhostTerminal...", "Loading modules...", "System ready."];
  for (const line of bootLines) {
    await randomPause(200, 500);
    await typeLine(withTimestamp(line), line === "System ready." ? "success" : "");
  }
  await typeLine("Type 'help' for commands. Try 'map', 'inventory', or 'socials'.", "dim");
  setBusy(false);
}

async function showHelp() {
  setBusy(true);
  const lines = [
    "Available commands:",
    "  help          list available commands",
    "  whoami        show simulated operator identity",
    "  ip            show fake network endpoint",
    "  ls            list directories and files",
    "  cd <folder>   move through directories",
    "  cat <file>    read a file",
    "  scan          run a network scan simulation",
    "  decrypt       decrypt payload (requires parameters)",
    "  access        attempt access sequence",
    "  hack          dramatic randomized hack routine",
    "  matrix        toggle falling code animation",
    "  ai            toggle fake AI terminal mode",
    "  map           spawn interactive radar widget",
    "  inventory     open holographic stash grid",
    "  view schema   render 3D wireframe object",
    "  extract       play port decryption mini-game",
    "  socials       decrypt operator public profiles",
    "  clear         clear the terminal output",
    "  exit          simulate shutdown"
  ];
  await typeLines(lines);
  setBusy(false);
}

async function showSocials() {
  setBusy(true);
  await typeLines(["Pinging networks...", "Decrypting profiles..."], "dim", 200, 400);
  const line = document.createElement("p");
  line.className = "line";
  line.innerHTML = `
    <span class="success">UPLINKS FOUND:</span><br>
    [+] <a href="https://github.com/sundar-codes" target="_blank" class="terminal-link">GITHUB</a><br>
    [+] <a href="https://www.instagram.com/sundar__07_?igsh=MXZhemJibWc5bzI0eQ%3D%3D" target="_blank" class="terminal-link">INSTAGRAM</a>
  `;
  output.appendChild(line);
  scrollToBottom();
  setBusy(false);
}

async function toggleAiMode() {
  setBusy(true);
  state.aiMode = !state.aiMode;
  if (state.aiMode) playSuccess();
  await typeLine(state.aiMode ? "AI online. Type anything." : "AI offline.", state.aiMode ? "success" : "dim");
  setBusy(false);
}

async function respondAsAi(message) {
  setBusy(true);
  const msg = message.toLowerCase();
  let response = "";

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    response = "Greetings, operator. The grid is listening.";
  } 
  else if (msg.includes("sudo")) {
    response = "Nice try. My clearance level supersedes yours.";
  } 
  else if (msg.includes("who are you") || msg.includes("name")) {
    response = "I am the Ghost Protocol. I live in the space between the code.";
  }
  else if (msg.includes("arcyn")) {
    response = "PROJECT ARCYN recognized. The gaming grid is standing by for deployment.";
  }
  else if (msg.includes("hack") || msg.includes("bypass")) {
    response = "Brute force is loud. I prefer slipping through the cracks.";
  }
  else {
    const fallbacks = [
      "I parsed that through the anomaly filter. Results are inconclusive.",
      "Are you sure you meant to type that?",
      "The terminal thinks this is either brilliance or a very stylish typo.",
      "Data logged. I will analyze your intent in the background."
    ];
    response = fallbacks[randomNumber(0, fallbacks.length - 1)];
  }

  await typeLine(`AI: ${response}`, "success");
  setBusy(false);
}

async function runScan() { setBusy(true); playSuccess(); await typeLine("Scan complete", "success"); setBusy(false); }
async function runDecrypt() { setBusy(true); playError(); await typeLine("Access denied.", "danger"); setBusy(false); }
async function runAccess() { setBusy(true); playSuccess(); await typeLine("ACCESS GRANTED", "success"); setBusy(false); }
async function showIdentity() { setBusy(true); await typeLine("codename: SPECTER-13"); setBusy(false); }
async function showIp() { setBusy(true); await typeLine("ip: 10.44.19.203"); setBusy(false); }
async function listDirectory() { setBusy(true); await typeLine(fileSystem[state.currentPath].files.join("   ")); setBusy(false); }
async function changeDirectory(args) { setBusy(true); state.currentPath = args[0] || "~"; updatePrompt(); setBusy(false); }
async function readFile(args) { setBusy(true); await typeLine(files[`~/${args[0]}`] ? "Reading file..." : "File not found.", "warning"); setBusy(false); }
async function runHack() { setBusy(true); await animateProgress("Exploit", 30, 20, 50); playSuccess(); await typeLine("HACK COMPLETE", "success"); setBusy(false); }

async function toggleMatrix() {
  setBusy(true);
  state.matrixActive ? stopMatrix() : startMatrix();
  setBusy(false);
}

function startMatrix() { state.matrixActive = true; matrixCanvas.classList.add("active"); resizeMatrix(); }
function stopMatrix() { state.matrixActive = false; matrixCanvas.classList.remove("active"); }
function resizeMatrix() { matrixCanvas.width = window.innerWidth; matrixCanvas.height = window.innerHeight; }

async function shutdownTerminal() {
  setBusy(true);
  await typeLine("System halted.");
  state.shutdown = true;
  document.body.classList.add("shutdown");
  input.disabled = true;
}

function clearTerminal() { output.innerHTML = ""; }
async function commandNotFound(args, cmd) { setBusy(true); playError(); await typeLine(`${cmd}: command not found`, "warning"); setBusy(false); }

function renderLine(text = "", className = "", rand = true) {
  const line = document.createElement("p");
  line.className = className ? `line ${className}` : "line";
  line.textContent = text;
  if (rand) line.style.setProperty("--brightness", Math.random().toFixed(2) * 0.24 + 0.76);
  output.appendChild(line);
  scrollToBottom();
  return line;
}

async function typeLine(text, className = "") {
  const line = renderLine("", className);
  for (const character of text) {
    line.textContent += character;
    maybeClick(); 
    scrollToBottom();
    await randomPause(5, 20);
  }
  return line;
}

async function typeLines(lines, className = "", min = 100, max = 300) {
  for (const line of lines) { await randomPause(min, max); await typeLine(line, className); }
}

async function animateProgress(label, width, min, max) {
  const line = renderLine(`${label}: [${"-".repeat(width)}] 0%`, "progress-frame");
  for (let p = 0; p <= 100; p += randomNumber(5, 15)) {
    const sp = Math.min(p, 100);
    const filled = Math.round((sp / 100) * width);
    line.textContent = `${label}: [${"#".repeat(filled)}${"-".repeat(width - filled)}] ${sp}%`;
    scrollToBottom();
    await randomPause(min, max);
  }
}

function startCursor() { setInterval(() => cursor.classList.toggle("off"), 530); }
function setBusy(isBusy) { state.busy = isBusy; input.disabled = isBusy; if (!isBusy) focusInput(); }
function clearInput() { input.value = ""; typedText.textContent = ""; }
function focusInput() { if (!state.shutdown && !state.busy && !state.extractGameActive) input.focus(); }
function recallHistory(dir) {
  if (!state.history.length) return;
  state.historyIndex = Math.max(0, Math.min(state.history.length, state.historyIndex + dir));
  input.value = state.history[state.historyIndex] || "";
  typedText.textContent = input.value;
}
function updatePrompt() { prompt.textContent = `root@ghost:${state.currentPath}$`; }
function getPrompt() { return `root@ghost:${state.currentPath}$`; }
function resolvePath(t) { return t; }
function withTimestamp(text) { return `[${new Date().toLocaleTimeString("en-GB", { hour12: false })}] ${text}`; }
function scheduleRandomLog() {}
function startRandomGlitches() { setInterval(() => { if (Math.random() > 0.8) { terminal.classList.add("glitch"); setTimeout(() => terminal.classList.remove("glitch"), 140); } }, 4000); }

function randomPause(min, max) { return delay(randomNumber(min, max)); }
function delay(ms) { return new Promise((res) => setTimeout(res, ms)); }
function randomNumber(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function scrollToBottom() { output.scrollTop = output.scrollHeight; }