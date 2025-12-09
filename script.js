/** CONFIGURACIÓN INICIAL */
const canvas = document.getElementById('lienzo');
const ctx = canvas.getContext('2d');

// --- VARIABLES DE LÓGICA (INTACTAS) ---
let cameraOffset = { x: 0, y: 0 };
let cameraZoom = 1;
let isPanning = false; let panStart = { x: 0, y: 0 };
let juegoActivo = false; 

let herramientaActual = 'cursor';
let nodoOrigenConexion = null;
let isDraggingNode = false; let draggedNode = null;

const CONFIG_OLEADAS = [5, 8, 12, 18, 30]; 
let oleadaActual = 0;
let tiempoParaHorda = 90;
let intervaloJuego = null;
let recursos = { hojas: 20, agua: 20 };

const juego = { camaras: [], hormigas: [], depredadores: [] };
let animacionesPiedra = [];

const ajustarCanvas = () => { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    // Para pixel art nítido
    ctx.imageSmoothingEnabled = false; 
};
ajustarCanvas(); window.addEventListener('resize', ajustarCanvas);

const distancia = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
const angulo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
function screenToWorld(x, y) { return { x: (x - cameraOffset.x) / cameraZoom, y: (y - cameraOffset.y) / cameraZoom }; }

/** --- ARTE PIXEL (NUEVO SISTEMA VISUAL) --- */

// Helper para dibujar matrices de pixeles
function dibujarSprite(ctx, x, y, spriteMap, color, scale = 4, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    
    const rows = spriteMap.length;
    const cols = spriteMap[0].length;
    const w = cols * scale;
    const h = rows * scale;
    
    // Centrar el dibujo
    const offX = -w / 2;
    const offY = -h / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (spriteMap[r][c] === 1) {
                ctx.fillRect(offX + c * scale, offY + r * scale, scale, scale);
            }
        }
    }
    ctx.restore();
}

// DEFINICIÓN DE SPRITES (1 = Pixel pintado, 0 = Transparente)
const SPRITE_HORMIGA = [
    [0,1,0,1,0], // Antenas
    [0,0,1,0,0], // Cabeza
    [1,0,1,0,1], // Patas
    [0,1,1,1,0], // Cuerpo
    [1,0,1,0,1], // Patas
    [0,1,1,1,0], // Abdomen
    [0,0,1,0,0]
];

const SPRITE_SOLDADO = [
    [1,0,0,0,1], // Mandíbulas grandes
    [0,1,1,1,0], // Cabeza ancha
    [1,0,1,0,1], 
    [0,1,1,1,0], // Cuerpo robusto
    [1,0,1,0,1],
    [0,1,1,1,0],
    [0,0,1,0,0]
];

const SPRITE_ARAÑA = [
    [1,0,0,0,0,0,1], // Patas largas
    [0,1,0,0,0,1,0],
    [0,0,1,1,1,0,0], // Cuerpo
    [1,1,1,1,1,1,1], // Abdomen ancho
    [0,1,1,1,1,1,0],
    [1,0,1,0,1,0,1], // Patas traseras
    [1,0,0,0,0,0,1]
];

const SPRITE_LARVA = [
    [0,0,1,1,0],
    [0,1,1,1,1],
    [0,0,1,1,0]
];

/** --- CLASES --- */

class Camara {
    constructor(x, y, tipo = 'normal') {
        this.id = Date.now() + Math.random();
        this.x = x; this.y = y; this.tipo = tipo; 
        this.conexiones = []; 
        this.radio = (tipo === 'reina') ? 40 : (tipo === 'pasillo') ? 22 : 28;
        if (this.tipo === 'reina') { this.vidaMax = 2000; this.vida = this.vidaMax; }
    }

    dibujarTuneles() {
        // Túneles Pixelados: Líneas gruesas sin suavizado
        ctx.strokeStyle = '#3e2723'; 
        ctx.lineWidth = 12; // Túnel exterior
        this.conexiones.forEach(nodo => { 
            if(nodo) { 
                // Dibujamos lineas rectangulares
                ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(nodo.x, nodo.y); ctx.stroke(); 
            }
        });
        
        ctx.strokeStyle = '#1a100c'; 
        ctx.lineWidth = 6; // Túnel interior
        this.conexiones.forEach(nodo => { 
            if(nodo) { 
                ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(nodo.x, nodo.y); ctx.stroke(); 
            }
        });
    }

    dibujarNodo() {
        // DIBUJO DE SALAS (Estilo Pixel Box)
        const size = this.radio * 2;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Borde sala
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-this.radio - 4, -this.radio - 4, size + 8, size + 8);
        
        // Interior sala (Suelo)
        let colorSuelo = '#5d4037'; // Pasillo
        if (this.tipo === 'comida') colorSuelo = '#2e7d32'; // Verde oscuro
        if (this.tipo === 'agua') colorSuelo = '#1565c0'; // Azul oscuro
        if (this.tipo === 'reina') colorSuelo = '#4a148c'; // Morado oscuro

        ctx.fillStyle = colorSuelo;
        ctx.fillRect(-this.radio, -this.radio, size, size);

        // Icono Central
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        if (this.tipo === 'reina') {
             // Corona Pixel simple
             dibujarSprite(ctx, 0, 0, [[1,0,1,0,1],[1,1,1,1,1]], '#ffd700', 6);
             // Barra vida Reina
             const p = Math.max(0, this.vida / this.vidaMax);
             ctx.fillStyle = '#000'; ctx.fillRect(-20, -40, 40, 6);
             ctx.fillStyle = '#f00'; ctx.fillRect(-19, -39, 38 * p, 4);
        } else if (this.tipo === 'comida') {
             dibujarSprite(ctx, 0, 0, [[0,1,0],[1,1,1],[0,1,0]], '#81c784', 5);
        } else if (this.tipo === 'agua') {
             dibujarSprite(ctx, 0, 0, [[0,1,0],[1,1,1],[1,1,1]], '#64b5f6', 5);
        }

        // Selección
        if (this === nodoOrigenConexion) {
            ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 4;
            ctx.strokeRect(-this.radio, -this.radio, size, size);
        }
        
        ctx.restore();
    }
}

class Hormiga {
    constructor(nodoInicio, tipo = 'obrera', tipoFuturo = 'obrera') {
        this.tipoFuturo = tipoFuturo;
        this.inicializar(nodoInicio, tipo);
        this.cooldownAtaque = 0;
        // Animación simple (caminar)
        this.wiggle = 0; 
    }
    
    inicializar(nodoInicio, tipo) {
        if(!nodoInicio) return;
        this.x = this.x || nodoInicio.x; this.y = this.y || nodoInicio.y;
        this.nodoActual = nodoInicio; this.destino = null; 
        this.tipo = tipo; this.viva = true; this.carga = null; this.angulo = 0;

        if (this.tipo === 'luchadora') {
            this.velocidad = 1.4; this.vida = 100; this.daño = 30; this.velocidadAtaque = 40;
            this.color = '#e53935'; // Rojo vivo
        } else if (this.tipo === 'larva') {
            this.velocidad = 0; this.vida = 10; this.color = '#fff9c4'; this.tiempoCrecimiento = 300;
        } else { 
            this.velocidad = 1.8; this.vida = 40; this.daño = 0; 
            this.color = '#8d6e63'; // Marrón claro
        }
    }

    actualizar(depredadores) {
        if (!this.viva || !this.nodoActual) { this.viva = false; return; }
        if (this.cooldownAtaque > 0) this.cooldownAtaque--;

        // Animación caminar
        if (this.destino) this.wiggle = Math.sin(Date.now() / 50) * 0.2;
        else this.wiggle = 0;

        // Lógica idéntica al original...
        if (this.tipo === 'larva') {
            this.tiempoCrecimiento--;
            if (this.tiempoCrecimiento <= 0) this.inicializar(this.nodoActual, this.tipoFuturo);
            return;
        }
        if (this.tipo === 'luchadora') {
            let enemigo = null;
            for (let d of depredadores) { if (d.vida > 0 && distancia(this.x, this.y, d.x, d.y) < 120) { enemigo = d; break; } }
            if (enemigo) {
                this.destino = { x: enemigo.x, y: enemigo.y, esEnemigo: true };
                if (distancia(this.x, this.y, enemigo.x, enemigo.y) < 30) {
                    if (this.cooldownAtaque <= 0) {
                        enemigo.recibirDaño(this.daño);
                        this.cooldownAtaque = this.velocidadAtaque;
                        // Efecto golpe pixel
                        ctx.fillStyle = '#fff'; ctx.fillRect(enemigo.x-5, enemigo.y-5, 10, 10);
                    }
                }
            } else if (this.destino && this.destino.esEnemigo) this.destino = null;
        }
        if (this.tipo === 'obrera' && !this.destino) {
            if (this.carga) {
                if (this.nodoActual.tipo === 'reina') {
                    if(this.carga === 'hoja') recursos.hojas++; if(this.carga === 'agua') recursos.agua++;
                    this.carga = null;
                }
            } else {
                if (this.nodoActual.tipo === 'comida') this.carga = 'hoja';
                else if (this.nodoActual.tipo === 'agua') this.carga = 'agua';
            }
        }
        if (!this.destino && this.nodoActual.conexiones.length > 0) {
            if (Math.random() < 0.03) {
                const indice = Math.floor(Math.random() * this.nodoActual.conexiones.length);
                this.destino = this.nodoActual.conexiones[indice];
            }
        }
        this.mover();
    }

    mover() {
        if (this.destino) {
            let destX = this.destino.x; let destY = this.destino.y;
            if (distancia(this.x, this.y, destX, destY) < 5) {
                if (this.destino instanceof Camara) this.nodoActual = this.destino;
                if (!this.destino.esEnemigo) this.destino = null;
            } else {
                this.angulo = angulo(this.x, this.y, destX, destY);
                this.x += Math.cos(this.angulo) * this.velocidad;
                this.y += Math.sin(this.angulo) * this.velocidad;
            }
        } else if(this.nodoActual && distancia(this.x, this.y, this.nodoActual.x, this.nodoActual.y) > 10) {
            this.x += (this.nodoActual.x - this.x) * 0.1;
            this.y += (this.nodoActual.y - this.y) * 0.1;
        }
    }

    dibujar() {
        if (!this.viva) return;

        // Dibujar Carga (Pixel cuadrado)
        if(this.carga) {
            ctx.fillStyle = (this.carga === 'hoja') ? '#4CAF50' : '#2196F3';
            ctx.fillRect(this.x - 4, this.y - 15, 8, 8);
        }

        if (this.tipo === 'larva') {
            dibujarSprite(ctx, this.x, this.y, SPRITE_LARVA, this.color, 3);
        } else {
            // Rotar el sprite + efecto caminar (wiggle)
            let sprite = (this.tipo === 'luchadora') ? SPRITE_SOLDADO : SPRITE_HORMIGA;
            // Soldados un poco más grandes
            let scale = (this.tipo === 'luchadora') ? 3 : 2.5;
            // Rotar 90 grados para alinear con el movimiento si es necesario, 
            // el sprite mira hacia "arriba" por defecto en el array, ajustamos rotación + PI/2
            dibujarSprite(ctx, this.x, this.y, sprite, this.color, scale, this.angulo + Math.PI/2 + this.wiggle);
        }
    }
}

class Depredador {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vidaMax = 450; this.vida = this.vidaMax;
        this.velocidad = 0.9; this.daño = 50; 
        this.cooldownAtaque = 0; this.radio = 30; 
        this.animFrame = 0;
    }
    
    actualizar(hormigas) {
        if (this.vida <= 0) return;
        if (this.cooldownAtaque > 0) this.cooldownAtaque--;
        
        // Animación simple
        this.animFrame += 0.2;

        const soldados = hormigas.filter(h => h.viva && h.tipo === 'luchadora');
        const reina = juego.camaras.find(c => c.tipo === 'reina');
        
        let objetivo = null; let distObj = 99999;
        soldados.forEach(s => { const d = distancia(this.x, this.y, s.x, s.y); if (d < 300 && d < distObj) { distObj = d; objetivo = s; } });
        if (!objetivo && reina) { objetivo = reina; distObj = distancia(this.x, this.y, reina.x, reina.y); }

        if (objetivo) {
            if (distObj > 20) {
                const ang = angulo(this.x, this.y, objetivo.x, objetivo.y);
                this.x += Math.cos(ang) * this.velocidad;
                this.y += Math.sin(ang) * this.velocidad;
            }
            if (distObj < this.radio + 15) {
                if (this.cooldownAtaque <= 0) {
                    if (objetivo instanceof Hormiga) { objetivo.vida -= this.daño; if(objetivo.vida <= 0) objetivo.viva = false; } 
                    else if (objetivo instanceof Camara) { objetivo.vida -= this.daño; }
                    this.cooldownAtaque = 60;
                }
            }
        }
    }
    
    recibirDaño(c) { this.vida -= c; }
    
    dibujar() {
        if (this.vida <= 0) return;
        
        // Efecto patas moviéndose
        let wiggle = Math.sin(this.animFrame) * 0.1;
        
        // Cuerpo negro, ojos rojos
        dibujarSprite(ctx, this.x, this.y, SPRITE_ARAÑA, '#000', 5, 0 + wiggle);
        // Ojos rojos brillantes
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x - 5, this.y - 5, 4, 4);
        ctx.fillRect(this.x + 1, this.y - 5, 4, 4);

        // Barra de vida estilo retro
        const p = Math.max(0, this.vida / this.vidaMax);
        ctx.fillStyle = '#000'; ctx.fillRect(this.x - 20, this.y - 30, 40, 6);
        ctx.fillStyle = '#76ff03'; ctx.fillRect(this.x - 18, this.y - 28, 36 * p, 2);
    }
}

/** --- SISTEMA PRINCIPAL --- */

window.iniciarJuegoUI = () => {
    document.getElementById('game-overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    juegoActivo = true;
    iniciarHormiguero();
};

function iniciarHormiguero() {
    juego.camaras = []; juego.hormigas = []; juego.depredadores = [];
    nodoOrigenConexion = null; recursos = { hojas: 20, agua: 20 };
    juego.camaras.push(new Camara(0, 0, 'reina'));
    cameraOffset = { x: canvas.width/2, y: canvas.height/2 }; cameraZoom = 1;
    oleadaActual = 0; tiempoParaHorda = 90; 
    if (intervaloJuego) clearInterval(intervaloJuego);
    intervaloJuego = setInterval(logicaSegundo, 1000);
    actualizarUI();
}

function logicaSegundo() {
    if (!juegoActivo) return;
    if (oleadaActual >= CONFIG_OLEADAS.length && juego.depredadores.length === 0) { finDelJuego(true); return; }
    tiempoParaHorda--;
    if (tiempoParaHorda <= 0) { lanzarHorda(); tiempoParaHorda = 60; }
    actualizarUI();
}

function lanzarHorda() {
    const cantidad = CONFIG_OLEADAS[oleadaActual];
    for (let i = 0; i < cantidad; i++) {
        const ang = Math.random() * Math.PI * 2; const dist = 1000 + Math.random() * 200;
        juego.depredadores.push(new Depredador(Math.cos(ang)*dist, Math.sin(ang)*dist));
    }
    oleadaActual++; actualizarUI();
}

function finDelJuego(victoria) {
    juegoActivo = false; clearInterval(intervaloJuego);
    const overlay = document.getElementById('game-overlay');
    const menu = document.getElementById('menu-content');
    const win = document.getElementById('victory-content');
    const lose = document.getElementById('game-over-content');
    const ui = document.getElementById('game-ui');
    ui.classList.add('hidden'); overlay.classList.remove('hidden'); menu.classList.add('hidden');
    if (victoria) { win.classList.remove('hidden'); lose.classList.add('hidden'); } else { win.classList.add('hidden'); lose.classList.remove('hidden'); }
}

function loop() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fondo general (tierra oscura)
    ctx.fillStyle = '#1a100c'; ctx.fillRect(0,0, canvas.width, canvas.height);

    if (!juegoActivo) { requestAnimationFrame(loop); return; }

    ctx.translate(cameraOffset.x, cameraOffset.y);
    ctx.scale(cameraZoom, cameraZoom);

    // Dibujar Mundo
    juego.camaras.forEach(c => c.dibujarTuneles());
    juego.camaras.forEach(c => c.dibujarNodo());
    juego.hormigas = juego.hormigas.filter(h => h.viva);
    juego.hormigas.forEach(h => { h.actualizar(juego.depredadores); h.dibujar(); });
    juego.depredadores = juego.depredadores.filter(d => d.vida > 0);
    juego.depredadores.forEach(d => { d.actualizar(juego.hormigas); d.dibujar(); });

    // Verificar Reina
    const reina = juego.camaras.find(c => c.tipo === 'reina');
    if (!reina || reina.vida <= 0) { finDelJuego(false); }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    document.getElementById('stats').innerHTML = `ANTS: ${juego.hormigas.length} | SPIDERS: ${juego.depredadores.length}`;
    document.getElementById('recursos-display').innerHTML = `🍃 ${recursos.hojas} | 💧 ${recursos.agua}`;
    
    requestAnimationFrame(loop);
}
loop();

/** INPUTS & UI */
function actualizarUI() {
    const div = document.getElementById('wave-info');
    if(oleadaActual >= CONFIG_OLEADAS.length) div.innerHTML = "⚠️ LAST WAVE!";
    else div.innerHTML = `WAVE: ${oleadaActual + 1}/5 <br> TIME: ${tiempoParaHorda}s`;
}

window.setHerramienta = (n) => {
    herramientaActual = n; nodoOrigenConexion = null;
    document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('activo'));
    const b = document.getElementById('btn-' + n.replace('crear-', 'crear-').replace('nodo-', ''));
    if(b) b.classList.add('activo');
};

canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); cameraZoom += (e.deltaY < 0 ? 0.1 : -0.1);
    cameraZoom = Math.min(Math.max(0.4, cameraZoom), 3);
});

canvas.addEventListener('mousedown', (e) => {
    if(!juegoActivo) return;
    const wp = screenToWorld(e.clientX, e.clientY);
    // Hitbox rectangular para nodos pixel art
    const nodo = juego.camaras.find(c => Math.abs(wp.x - c.x) < c.radio && Math.abs(wp.y - c.y) < c.radio);

    if (e.button === 1 || (herramientaActual === 'cursor' && !nodo)) {
        isPanning = true; panStart = { x: e.clientX - cameraOffset.x, y: e.clientY - cameraOffset.y }; return;
    }
    
    if (herramientaActual === 'cursor' && nodo) { isDraggingNode = true; draggedNode = nodo; return; }

    if (herramientaActual === 'conectar' && nodo) {
        if (!nodoOrigenConexion) nodoOrigenConexion = nodo;
        else {
            if (nodoOrigenConexion !== nodo && !nodoOrigenConexion.conexiones.includes(nodo)) {
                nodoOrigenConexion.conexiones.push(nodo); nodo.conexiones.push(nodoOrigenConexion);
            }
            nodoOrigenConexion = null;
        }
    } 
    else if (herramientaActual === 'borrar' && nodo) {
        if(nodo.tipo !== 'reina') {
            juego.camaras = juego.camaras.filter(c => c !== nodo);
            juego.camaras.forEach(c => c.conexiones = c.conexiones.filter(n => n !== nodo));
        }
    }
    else if (herramientaActual.startsWith('crear-') && !nodo) {
        const tipo = herramientaActual.replace('crear-', '');
        const nuevaCamara = new Camara(wp.x, wp.y, (tipo === 'huevos' ? 'reina' : tipo === 'normal' ? 'pasillo' : tipo));
        let masCercano = null; let distMin = Infinity;
        juego.camaras.forEach(c => { const d = distancia(wp.x, wp.y, c.x, c.y); if (d < distMin) { distMin = d; masCercano = c; } });
        if (masCercano && distMin < 250) { nuevaCamara.conexiones.push(masCercano); masCercano.conexiones.push(nuevaCamara); }
        juego.camaras.push(nuevaCamara);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isPanning) { cameraOffset.x = e.clientX - panStart.x; cameraOffset.y = e.clientY - panStart.y; }
    if (isDraggingNode && draggedNode) { const wp = screenToWorld(e.clientX, e.clientY); draggedNode.x = wp.x; draggedNode.y = wp.y; }
});
canvas.addEventListener('mouseup', () => { isPanning = false; isDraggingNode = false; draggedNode = null; });

window.agregarHormiga = (tipo) => {
    if (recursos.hojas < 3 || recursos.agua < 3) return alert("NEED: 3 LEAF / 3 WATER");
    const reina = juego.camaras.find(c => c.tipo === 'reina');
    if(reina) { recursos.hojas-=3; recursos.agua-=3; juego.hormigas.push(new Hormiga(reina, 'larva', tipo)); }
};

window.guardarPartida = () => { localStorage.setItem('savePixel', JSON.stringify({camaras: juego.camaras.map(c=>({...c, conexiones: c.conexiones.map(cx=>cx.id)})), hormigas: juego.hormigas, depredadores: juego.depredadores, recursos, oleadaActual})); alert("GAME SAVED"); };
window.cargarPartida = () => { alert("Load feature unavailable in strict mode."); };
