const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 140;

// === DISEÑOS PIXEL ART (Matrices 7x7) ===
// 0:Transparente, 1:Color Equipo, 2:Negro (Patas/Ojos), 3:Blanco (Brillo), 4:Gris
const SPRITES = {
    worker: [ // Hormiga pequeña
        [0,0,0,0,0,0,0],
        [0,0,2,0,2,0,0],
        [0,0,1,1,1,0,0],
        [2,0,1,1,1,0,2],
        [0,2,1,1,1,2,0],
        [0,0,1,1,1,0,0],
        [0,2,0,0,0,2,0]
    ],
    soldier: [ // Mandíbulas grandes
        [0,2,0,0,0,2,0],
        [0,2,2,0,2,2,0],
        [2,1,1,1,1,1,2],
        [0,2,1,1,1,2,0],
        [2,1,1,1,1,1,2],
        [0,1,1,1,1,1,0],
        [2,0,0,0,0,0,2]
    ],
    tank: [ // Grande y blindada
        [0,0,2,0,2,0,0],
        [0,2,1,1,1,2,0],
        [2,1,4,4,4,1,2],
        [2,1,4,4,4,1,2],
        [2,1,4,4,4,1,2],
        [0,1,1,1,1,1,0],
        [0,2,0,0,0,2,0]
    ],
    medic: [ // Cruz blanca
        [0,0,2,0,2,0,0],
        [0,2,1,1,1,2,0],
        [0,1,1,3,1,1,0],
        [2,1,3,3,3,1,2],
        [0,1,1,3,1,1,0],
        [0,1,1,1,1,1,0],
        [2,0,0,0,0,0,2]
    ],
    queen: [ // Corona
        [0,1,0,1,0,1,0],
        [0,1,1,1,1,1,0],
        [2,1,3,1,3,1,2],
        [2,1,1,1,1,1,2],
        [0,1,1,1,1,1,0],
        [0,1,1,1,1,1,0],
        [2,0,0,0,0,0,2]
    ],
    // EDIFICIOS
    farm: [[0,3,0],[3,1,3],[0,3,0]], 
    source: [[0,3,3],[3,1,3],[3,3,1]],
    fungi: [[3,3,3],[3,1,3],[0,1,0]],
    barracks: [[1,0,1],[1,1,1],[1,0,1]],
    chamber: [[1,1,1],[1,0,1],[1,1,1]]
};

// --- CONFIGURACIÓN ---
const TEAMS = {
    fire: { c: '#e74c3c' },
    earth: { c: '#2ecc71' },
    water: { c: '#3498db' },
    cpu1: { c: '#e67e22' }, // Naranja
    cpu2: { c: '#9b59b6' }, // Violeta
    cpu3: { c: '#1abc9c' }  // Turquesa
};

const COSTS = {
    worker: {l:3, w:3, f:0}, soldier: {l:5, w:5, f:0},
    tank: {l:8, w:8, f:2}, medic: {l:4, w:4, f:6},
    chamber: {l:1, w:1, f:0}, connect: {l:1, w:1, f:0},
    farm: {l:0, w:10, f:0}, source: {l:10, w:10, f:0},
    fungi: {l:10, w:10, f:0}, barracks: {l:20, w:20, f:0}
};

const STATS = {
    worker: { hp:40, dmg:2, spd:1.5 },
    soldier: { hp:100, dmg:8, spd:1.2 },
    tank: { hp:300, dmg:5, spd:0.8 },
    medic: { hp:60, dmg:0, spd:1.3 }
};

// --- ESTADO DEL JUEGO ---
const game = {
    nodes: [], ants: [], fx: [],
    res: { player:{l:50, w:50, f:20}, cpu1:{l:20,w:20,f:0}, cpu2:{l:20,w:20,f:0}, cpu3:{l:20,w:20,f:0} },
    playerCiv: 'earth',
    lvl: 1,
    cam: { x:0, y:0, zoom:1, drag:false, lx:0, ly:0 },
    tool: null, attackMode: false, attackTarget: null, connectSrc: null,
    
    // --- DIBUJO DE PIXELS ---
    drawSprite: function(ctx, key, color, x, y, size) {
        let grid = SPRITES[key] || SPRITES.chamber;
        let dim = grid.length; // 7x7 o 3x3
        let pSize = size / dim;
        let startX = x - size/2;
        let startY = y - size/2;

        for(let r=0; r<dim; r++) {
            for(let c=0; c<dim; c++) {
                let v = grid[r][c];
                if(v !== 0) {
                    // 1=Color Equipo, 2=Negro, 3=Blanco, 4=Gris
                    if(v===1) ctx.fillStyle = color;
                    else if(v===2) ctx.fillStyle = '#000';
                    else if(v===3) ctx.fillStyle = '#fff';
                    else ctx.fillStyle = '#888';
                    
                    ctx.fillRect(startX + c*pSize, startY + r*pSize, pSize, pSize);
                }
            }
        }
    },

    // --- INICIALIZACIÓN ---
    init: function(civ) {
        if(civ) this.playerCiv = civ;
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        
        // Reiniciar
        this.nodes = []; this.ants = []; this.fx = [];
        this.res.player = {l:50, w:50, f:20}; // Recursos iniciales generosos para probar
        
        // Generar bases
        this.spawnBase(0, 0, 'player'); // Tú
        this.spawnBase(1000, 0, 'cpu1');
        this.spawnBase(-800, 600, 'cpu2');
        this.spawnBase(-800, -600, 'cpu3');
        
        this.loop();
    },

    spawnBase: function(x, y, team) {
        let col = (team==='player') ? TEAMS[this.playerCiv].c : TEAMS[team].c;
        let q = new Node(x, y, 'queen', team, col);
        let f = new Node(x+100, y, 'farm', team, col);
        q.connect(f);
        this.nodes.push(q, f);
        // Hormigas iniciales
        this.ants.push(new Ant('worker', q, team));
        this.ants.push(new Ant('soldier', q, team));
        
        // Recursos para CPU
        if(team !== 'player') this.res[team] = {l:20, w:20, f:0};
    },

    // --- BUCLE PRINCIPAL ---
    loop: function() {
        game.update();
        game.draw();
        requestAnimationFrame(game.loop);
    },

    update: function() {
        if(Math.random()<0.05) this.updateAI();

        // Nodos
        this.nodes.forEach(n => n.update());

        // Hormigas
        for(let i=this.ants.length-1; i>=0; i--) {
            let a = this.ants[i];
            if(!this.nodes.includes(a.node)) a.hp = 0; // Matar si el suelo desaparece
            else a.update();

            if(a.hp <= 0) {
                this.fx.push({x:a.x, y:a.y, t:15, type:'dead'});
                this.ants.splice(i, 1);
            }
        }
        
        // Panel lateral
        let barracks = this.nodes.some(n => n.team === 'player' && n.type === 'barracks');
        let panel = document.getElementById('barracks-panel');
        if(barracks && panel.classList.contains('hidden')) panel.classList.remove('hidden');
        else if(!barracks && !panel.classList.contains('hidden')) panel.classList.add('hidden');

        // FX
        this.fx = this.fx.filter(f => --f.t > 0);
    },

    draw: function() {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.scale(this.cam.zoom, this.cam.zoom);
        ctx.translate(-this.cam.x, -this.cam.y);

        // Tuneles
        ctx.strokeStyle = '#443322'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        this.nodes.forEach(n => {
            n.conns.forEach(c => {
                ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(c.x, c.y); ctx.stroke();
            });
        });

        // Linea ataque
        if(this.attackTarget) {
            let q = this.getQueen('player');
            if(q) {
                ctx.strokeStyle = 'rgba(255,0,0,0.5)'; ctx.lineWidth=4; ctx.setLineDash([10,10]);
                ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(this.attackTarget.x, this.attackTarget.y); ctx.stroke(); ctx.setLineDash([]);
            }
        }

        this.nodes.forEach(n => n.draw());
        this.ants.forEach(a => a.draw());
        
        this.fx.forEach(f => {
            ctx.fillStyle = f.type==='dead'?'#fff':'orange';
            ctx.fillRect(f.x-f.t/2, f.y-f.t/2, f.t, f.t);
        });

        ctx.restore();

        // UI Update
        document.getElementById('ui-l').innerText = Math.floor(this.res.player.l);
        document.getElementById('ui-w').innerText = Math.floor(this.res.player.w);
        document.getElementById('ui-f').innerText = Math.floor(this.res.player.f);
        this.drawMinimap();
    },

    // --- ACCIONES ---
    setTool: function(t) {
        this.tool = t; this.attackMode = false; this.connectSrc = null;
        document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        this.msg("Modo: " + (t?t.toUpperCase():"LISTO"));
    },

    toggleAttack: function() {
        this.setTool(null); this.attackMode = true;
        document.getElementById('btn-attack').classList.add('active');
        this.msg("CLICK CAMARA RIVAL CONECTADA");
    },

    click: function(wx, wy) {
        let hit = this.nodes.find(n => Math.hypot(n.x-wx, n.y-wy) < 40);

        if(this.attackMode) {
            if(hit && hit.team !== 'player') {
                if(this.ants.filter(a => a.team==='player' && a.type!=='worker').length < 1) return this.msg("¡Sin ejercito!");
                if(hit.conns.some(c => c.team==='player')) {
                    this.attackTarget = hit; this.setTool(null); this.msg("¡AL ATAQUE!");
                } else this.msg("Error: Sin conexión");
            }
            return;
        }

        if(this.tool === 'demolish') {
            if(hit && hit.team === 'player' && hit.type !== 'queen') {
                hit.disconnect();
                this.nodes = this.nodes.filter(n => n !== hit);
                this.fx.push({x:hit.x, y:hit.y, t:20, type:'boom'});
                this.setTool(null);
            }
            return;
        }

        if(this.tool === 'connect') {
            if(!hit) return;
            if(!this.connectSrc) {
                if(hit.team==='player') { this.connectSrc = hit; this.msg("Destino..."); }
            } else if(hit !== this.connectSrc && Math.hypot(hit.x-this.connectSrc.x, hit.y-this.connectSrc.y) < 350) {
                if(this.pay(COSTS.connect)) {
                    this.connectSrc.connect(hit); this.setTool(null);
                }
            }
            return;
        }

        if(this.tool && COSTS[this.tool]) {
            if(this.pay(COSTS[this.tool])) {
                let near = this.nodes.find(n => n.team==='player' && Math.hypot(n.x-wx, n.y-wy) < 250);
                if(near && Math.hypot(near.x-wx, near.y-wy) > 60) {
                    let col = TEAMS[this.playerCiv].c;
                    let n = new Node(wx, wy, this.tool, 'player', col);
                    this.nodes.push(n); n.connect(near);
                    this.fx.push({x:wx, y:wy, t:20, type:'build'});
                    this.setTool(null);
                } else this.msg("Posición inválida");
            }
        }
    },

    pay: function(c) {
        let r = this.res.player;
        if(r.l>=c.l && r.w>=c.w && r.f>=c.f) {
            r.l-=c.l; r.w-=c.w; r.f-=c.f; return true;
        }
        this.msg("Faltan recursos"); return false;
    },

    buyUnit: function(type) {
        let building = type==='worker' ? 'queen' : 'barracks';
        let spawner = this.nodes.find(n => n.team==='player' && n.type===building && n.queue.length<5);
        
        if(!spawner) return this.msg("Necesitas "+ (type==='worker'?"Reina":"Cuartel"));
        
        if(this.pay(COSTS[type])) {
            spawner.queue.push({type:type, ready:Date.now()+3000});
            this.msg("Entrenando "+type);
        }
    },

    upgrade: function() {
        if(this.lvl >= 3) return this.msg("Max Nivel");
        let cost = 100 * this.lvl;
        if(this.res.player.l >= cost) {
            this.res.player.l -= cost; this.lvl++;
            document.getElementById('ui-lvl').innerText = this.lvl;
            document.getElementById('ui-up-cost').innerText = (this.lvl*100)+"L";
            this.msg("NIVEL "+this.lvl+"!");
        } else this.msg("Faltan hojas");
    },

    getQueen: function(t) { return this.nodes.find(n => n.team===t && n.type==='queen'); },
    msg: function(t) { document.getElementById('msg-box').innerText = t; },

    // --- IA BASICA ---
    updateAI: function() {
        ['cpu1','cpu2','cpu3'].forEach(team => {
            let r = this.res[team]; if(!r) return;
            let nodes = this.nodes.filter(n => n.team===team);
            if(nodes.length===0) return;

            r.l += 0.3; r.w += 0.3; r.f += 0.1;

            if(r.l > 60) {
                let q = this.getQueen('player');
                if(q) {
                    let closest = nodes[0], min=9999;
                    nodes.forEach(n => { let d = Math.hypot(n.x-q.x, n.y-q.y); if(d<min){min=d; closest=n;} });
                    if(closest.conns.length < 3) {
                        let ang = Math.atan2(q.y-closest.y, q.x-closest.x);
                        let nx = closest.x+Math.cos(ang)*100, ny = closest.y+Math.sin(ang)*100;
                        let types=['farm','source','barracks'];
                        let type = types[Math.floor(Math.random()*3)];
                        if(r.l >= COSTS[type].l) {
                            r.l-=COSTS[type].l;
                            let n = new Node(nx, ny, type, team, TEAMS[team].c);
                            this.nodes.push(n); n.connect(closest);
                            let e = this.nodes.find(x => x.team!==team && Math.hypot(x.x-nx, x.y-ny)<150);
                            if(e) n.connect(e);
                        }
                    }
                }
            }
            if(r.l >= 10 && r.w >= 10) {
                let b = nodes.find(n => n.type==='barracks' && n.queue.length<3);
                if(b) {
                    r.l-=5; r.w-=5;
                    let unit = (r.f>6 && Math.random()>0.7) ? 'medic' : ((r.f>2 && Math.random()>0.5)?'tank':'soldier');
                    b.queue.push({type:unit, ready:Date.now()+5000});
                }
            }
        });
    },

    drawMinimap: function() {
        let m = document.getElementById('minimap').getContext('2d');
        m.fillStyle='#000'; m.fillRect(0,0,120,120);
        let s=120/5000, off=2500;
        this.nodes.forEach(n => {
            m.fillStyle = n.col; m.fillRect((n.x+off)*s, (n.y+off)*s, 3, 3);
        });
    },
    
    previewCiv: function(elementId, color) {
        let canvas = document.getElementById(elementId);
        
        if(canvas) {
            let ctx = canvas.getContext('2d');
            // Limpiar fondo (Gris oscuro para que contraste)
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Lista de unidades a mostrar
            const units = ['worker', 'soldier', 'tank', 'medic', 'queen'];
            
            // Dibujarlas en fila
            let startX = 25;
            let gap = 40; // Espacio entre hormigas

            units.forEach((u, i) => {
                // Dibujamos cada una desplazada en X
                this.drawSprite(ctx, u, color, startX + (i * gap), 25, 20); 
            });
        }
    }
};

// --- CLASES ---
class Node {
    constructor(x, y, type, team, col) {
        this.x=x; this.y=y; this.type=type; this.team=team; this.col=col;
        this.conns=[]; this.res={l:0,w:0,f:0};
        this.size=type==='queen'?60:40; this.maxHp=type==='queen'?1500:400; this.hp=this.maxHp;
        this.queue=[]; this.lastTick=Date.now();
    }
    connect(n) { if(n && !this.conns.includes(n)) { this.conns.push(n); n.conns.push(this); } }
    disconnect() { this.conns.forEach(n => n.conns = n.conns.filter(c => c!==this)); this.conns=[]; }
    update() {
        if(Date.now()-this.lastTick > 5000) {
            this.lastTick=Date.now();
            let add = (k,v) => this.res[k] = Math.min(this.res[k]+v, 20 + game.lvl*10);
            if(this.type==='farm') add('l',3);
            if(this.type==='source') add('w',3);
            if(this.type==='fungi') add('f',1);
            if(this.type==='queen') add('w',1);
        }
        let now = Date.now();
        for(let i=this.queue.length-1; i>=0; i--) {
            if(now > this.queue[i].ready) {
                game.ants.push(new Ant(this.queue[i].type, this, this.team));
                this.queue.splice(i,1);
            }
        }
    }
    draw() {
        game.drawSprite(ctx, this.type, this.col, this.x, this.y, this.size);
        if(this.hp<this.maxHp) {
            ctx.fillStyle='red'; ctx.fillRect(this.x-15, this.y-this.size/2-8, 30, 4);
            ctx.fillStyle='#0f0'; ctx.fillRect(this.x-15, this.y-this.size/2-8, 30*(this.hp/this.maxHp), 4);
        }
        if(game.attackTarget===this) {
            ctx.strokeStyle='red'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, 7); ctx.stroke();
        }
    }
}

class Ant {
    constructor(type, node, team) {
        this.type=type; this.node=node; this.team=team;
        this.x=node.x; this.y=node.y; this.target=null;
        let s = STATS[type];
        this.hp=s.hp; this.maxHp=s.hp; this.dmg=s.dmg; this.spd=s.spd;
        this.cd=0; this.carry=null;
    }
    update() {
        if(this.cd>0) this.cd--;
        let force = (this.team==='player' && game.attackTarget && this.type!=='worker');
        
        if(force && this.node !== game.attackTarget) {
            if(!this.target || (this.target && this.target!==game.attackTarget && !this.target.conns)) {
                this.findPath(game.attackTarget);
            }
        } else if(this.type==='worker') {
            this.doWork();
        } else if(!this.target && Math.random()<0.02) {
            if(this.node.conns.length) this.target=this.node.conns[Math.floor(Math.random()*this.node.conns.length)];
        }

        // Combate
        let enemy = game.ants.find(e => e.team!==this.team && Math.hypot(e.x-this.x, e.y-this.y)<30);
        if(enemy) {
            if(this.cd<=0) { enemy.hp-=this.dmg; this.cd=30; game.fx.push({x:enemy.x, y:enemy.y, t:10, type:'hit'}); }
            return;
        }
        // Atacar edificio
        if(this.node.team!==this.team && this.node.team!=='neutral' && this.dmg>0) {
            if(this.cd<=0) {
                this.node.hp-=this.dmg; this.cd=30; game.fx.push({x:this.node.x, y:this.node.y, t:10, type:'hit'});
                if(this.node.hp<=0) this.conquer();
            }
            return;
        }

        if(this.target) {
            if(!game.nodes.includes(this.target)) { this.target=null; return; }
            let dx=this.target.x-this.x, dy=this.target.y-this.y, d=Math.hypot(dx,dy);
            if(d<5) { this.node=this.target; this.target=null; }
            else { this.x+=dx/d*this.spd; this.y+=dy/d*this.spd; }
        }
    }
    doWork() {
        if(this.carry) {
            let q=game.getQueen(this.team);
            if(this.node===q) { game.res[this.team][this.carry]++; this.carry=null; }
            else if(q) this.findPath(q);
        } else {
            if(this.node.res.l>0) { this.node.res.l--; this.carry='l'; }
            else if(this.node.res.w>0) { this.node.res.w--; this.carry='w'; }
            else if(this.node.res.f>0) { this.node.res.f--; this.carry='f'; }
            else {
                let r = this.node.conns.find(n=>n.res.l>0||n.res.w>0||n.res.f>0);
                if(r) this.target=r;
                else if(Math.random()<0.05 && this.node.conns.length) this.target=this.node.conns[Math.floor(Math.random()*this.node.conns.length)];
            }
        }
    }
    findPath(dest) {
        let best=null, min=9999;
        this.node.conns.forEach(n => {
            if(!game.nodes.includes(n)) return;
            let d = Math.hypot(n.x-dest.x, n.y-dest.y);
            if(d<min) { min=d; best=n; }
        });
        if(best) this.target=best;
    }
    conquer() {
        let old = this.node.team;
        this.node.team = this.team; this.node.hp = this.node.maxHp;
        this.node.col = (this.team==='player') ? TEAMS[game.playerCiv].c : TEAMS[this.team].c;
        
        if(this.node.type==='queen') {
            game.nodes.forEach(n => { if(n.team===old) { n.team=this.team; n.col=this.node.col; } });
            game.ants.forEach(a => { if(a.team===old) a.team=this.team; });
            if(!game.nodes.some(n => n.type==='queen' && n.team!=='player')) {
                document.getElementById('win-screen').classList.remove('hidden');
            }
        }
        if(game.attackTarget===this.node) game.attackTarget=null;
    }
    draw() {
        let col = (this.team==='player') ? TEAMS[game.playerCiv].c : TEAMS[this.team].c;
        game.drawSprite(ctx, this.type, col, this.x, this.y, this.type==='worker'?10:15);
        if(this.hp<this.maxHp) {
            ctx.fillStyle='red'; ctx.fillRect(this.x-5, this.y-10, 10, 2);
            ctx.fillStyle='#0f0'; ctx.fillRect(this.x-5, this.y-10, 10*(this.hp/this.maxHp), 2);
        }
    }
}

// Input
canvas.addEventListener('mousedown', e => {
    let wx=(e.clientX-canvas.width/2)/game.cam.zoom + game.cam.x;
    let wy=(e.clientY-canvas.height/2)/game.cam.zoom + game.cam.y;
    if(game.tool || game.attackMode) game.click(wx, wy);
    else { game.cam.drag=true; game.cam.lx=e.clientX; game.cam.ly=e.clientY; }
});
window.addEventListener('mousemove', e => {
    if(game.cam.drag) {
        game.cam.x -= (e.clientX-game.cam.lx)/game.cam.zoom;
        game.cam.y -= (e.clientY-game.cam.ly)/game.cam.zoom;
        game.cam.lx=e.clientX; game.cam.ly=e.clientY;
    }
});
window.addEventListener('mouseup', () => game.cam.drag=false);
canvas.addEventListener('wheel', e => game.cam.zoom = Math.min(Math.max(0.4, game.cam.zoom - e.deltaY*0.001), 2));
window.addEventListener('resize', () => { canvas.width=window.innerWidth; canvas.height=window.innerHeight - 140; });

// Previsualización en Menú
window.onload = function() {
    game.previewCiv('p-fire', TEAMS.fire.c);
    game.previewCiv('p-earth', TEAMS.earth.c);
    game.previewCiv('p-water', TEAMS.water.c);
}
