/** CONFIGURACIÓN */
const canvas = document.getElementById('lienzo');
const ctx = canvas.getContext('2d');

const ajustarCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};
ajustarCanvas();
window.addEventListener('resize', ajustarCanvas);

const distancia = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
const angulo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

/** GESTIÓN DE HERRAMIENTAS */
let herramientaActual = 'cursor'; // Por defecto no hace nada destructivo
let nodoOrigenConexion = null; // Para guardar el primer click al conectar

// Función llamada por los botones HTML
window.setHerramienta = function(nombre) {
    herramientaActual = nombre;
    nodoOrigenConexion = null; // Reiniciar conexiones a medias
    
    // Actualizar visualmente los botones
    document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('activo'));
    const btnID = 'btn-' + nombre.replace('nodo-', ''); // Truco para encontrar el ID
    const btn = document.getElementById(btnID) || document.getElementById('btn-' + nombre);
    if(btn) btn.classList.add('activo');

    console.log("Herramienta:", herramientaActual);
};

/** CLASES */
class Camara {
    constructor(x, y, tipo = 'normal') {
        this.id = Date.now() + Math.random();
        this.x = x;
        this.y = y;
        this.tipo = tipo; 
        this.conexiones = []; 
        
        // Radio según tipo
        if(tipo === 'reina') this.radio = 35;
        else if (tipo === 'comida' || tipo === 'agua') this.radio = 28;
        else this.radio = 22;
    }

    dibujarTuneles() {
        ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.strokeStyle = '#4E342E';
        this.conexiones.forEach(nodo => {
            if(nodo) { ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(nodo.x, nodo.y); ctx.stroke(); }
        });
        ctx.lineWidth = 10; ctx.strokeStyle = '#3E2723'; 
        this.conexiones.forEach(nodo => {
            if(nodo) { ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(nodo.x, nodo.y); ctx.stroke(); }
        });
    }

    dibujarNodo() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        
        // Colores
        switch(this.tipo) {
            case 'reina': ctx.fillStyle = '#9C27B0'; break;
            case 'comida': ctx.fillStyle = '#66BB6A'; break;
            case 'agua': ctx.fillStyle = '#29B6F6'; break;
            case 'desechos': ctx.fillStyle = '#78909C'; break;
            default: ctx.fillStyle = '#8D6E63';
        }
        
        // Resaltar si está seleccionado para conectar
        if(this === nodoOrigenConexion) {
            ctx.strokeStyle = '#FFEB3B'; ctx.lineWidth = 6;
        } else {
            ctx.strokeStyle = '#3E2723'; ctx.lineWidth = 4;
        }

        ctx.fill(); ctx.stroke();
        
        // Icono texto
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        let label = this.tipo.substring(0,3).toUpperCase();
        if(this.tipo === 'reina') label = '👑';
        ctx.fillText(label, this.x, this.y + 4);
    }
}

class Hormiga {
    constructor(nodoInicio, tipo = 'obrera') { this.inicializar(nodoInicio, tipo); }
    
    inicializar(nodoInicio, tipo) {
        if(!nodoInicio) return; // Seguridad
        this.x = this.x || nodoInicio.x;
        this.y = this.y || nodoInicio.y;
        this.nodoActual = nodoInicio;
        this.destino = null; 
        this.tipo = tipo;
        this.angulo = 0;
        this.viva = true;

        if (this.tipo === 'luchadora') {
            this.velocidad = 1.1; this.vida = 120; this.daño = 2; this.color = '#C62828'; this.radio = 6;
        } else if (this.tipo === 'larva') {
            this.velocidad = 0; this.vida = 20; this.daño = 0; this.color = '#FFF9C4'; this.radio = 4; this.tiempoCrecimiento = 300; 
        } else {
            this.velocidad = 1.8; this.vida = 60; this.daño = 0.5; this.color = '#212121'; this.radio = 4;
        }
    }

    actualizar(depredadores) {
        if (!this.viva) return;
        if (!this.nodoActual) { this.viva = false; return; } // Si borraron su nodo

        if (this.tipo === 'larva') {
            this.tiempoCrecimiento--;
            if (this.tiempoCrecimiento <= 0) {
                const nuevoTipo = Math.random() > 0.6 ? 'luchadora' : 'obrera';
                this.inicializar(this.nodoActual, nuevoTipo);
            }
            return; 
        }

        if (this.tipo === 'luchadora') {
            let enemigoCerca = null;
            for (let d of depredadores) {
                if (d.vida > 0 && distancia(this.x, this.y, d.x, d.y) < 150) {
                    enemigoCerca = d; break;
                }
            }
            if (enemigoCerca) {
                this.destino = { x: enemigoCerca.x, y: enemigoCerca.y, esEnemigo: true };
                if (distancia(this.x, this.y, enemigoCerca.x, enemigoCerca.y) < 20) enemigoCerca.recibirDaño(this.daño);
            } else if (this.destino && this.destino.esEnemigo) this.destino = null; 
        }

        // Moverse solo si el nodo actual tiene conexiones validas
        if (!this.destino && this.nodoActual.conexiones.length > 0) {
             const indice = Math.floor(Math.random() * this.nodoActual.conexiones.length);
             this.destino = this.nodoActual.conexiones[indice];
        } else if (!this.destino && this.nodoActual.conexiones.length === 0) {
            // Atrapada
        }

        this.mover();
    }

    mover() {
        if (this.destino) {
            const d = distancia(this.x, this.y, this.destino.x, this.destino.y);
            if (d < 5) {
                if (this.destino instanceof Camara) this.nodoActual = this.destino;
                this.destino = null;
            } else {
                this.angulo = angulo(this.x, this.y, this.destino.x, this.destino.y);
                this.x += Math.cos(this.angulo) * this.velocidad;
                this.y += Math.sin(this.angulo) * this.velocidad;
            }
        }
    }
    
    dibujar() {
        if (!this.viva) return;
        ctx.save(); ctx.translate(this.x, this.y);
        if (this.tipo !== 'larva') {
            ctx.rotate(this.angulo); ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(-6, 0, this.radio, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.arc(0, 0, this.radio*0.8, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.arc(5, 0, this.radio*0.7, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = this.color; ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
    recibirDaño(c) { this.vida -= c; if(this.vida <= 0) this.viva = false; }
}

class Depredador {
    constructor(x, y) {
        this.x = x; this.y = y; this.vida = 80; this.vidaMax = 80;
        this.velocidad = 0.8; this.daño = 50; this.radio = 15;
    }
    actualizar(hormigas) {
        if (this.vida <= 0) return;
        let masCercana = null, distMin = 99999;
        hormigas.forEach(h => {
            if (h.viva && h.tipo !== 'larva') {
                const d = distancia(this.x, this.y, h.x, h.y);
                if (d < distMin) { distMin = d; masCercana = h; }
            }
        });
        if (masCercana && distMin < 300) {
            const ang = angulo(this.x, this.y, masCercana.x, masCercana.y);
            this.x += Math.cos(ang) * this.velocidad;
            this.y += Math.sin(ang) * this.velocidad;
            if (distMin < this.radio + 5) masCercana.recibirDaño(this.daño);
        }
    }
    recibirDaño(c) { this.vida -= c; }
    dibujar() {
        if (this.vida <= 0) return;
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.fillStyle = '#D32F2F'; ctx.beginPath(); ctx.arc(0, 0, this.radio, 0, Math.PI*2); ctx.fill();
        // Barra vida
        const p = Math.max(0, this.vida / this.vidaMax);
        ctx.fillStyle = 'red'; ctx.fillRect(-15, -25, 30, 5);
        ctx.fillStyle = '#76FF03'; ctx.fillRect(-15, -25, 30 * p, 5);
        ctx.restore();
    }
}

/** ESTADO DEL JUEGO */
const juego = { camaras: [], hormigas: [], depredadores: [] };

function iniciarHormiguero() {
    juego.camaras = []; juego.hormigas = []; juego.depredadores = [];
    nodoOrigenConexion = null;
    
    // Un inicio simple: Solo la reina
    const cx = canvas.width/2, cy = canvas.height/2;
    juego.camaras.push(new Camara(cx, cy, 'reina'));
    for(let i=0; i<3; i++) juego.hormigas.push(new Hormiga(juego.camaras[0], 'larva'));
}
iniciarHormiguero();

/** BUCLE */
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dibujo
    juego.camaras.forEach(c => c.dibujarTuneles());
    juego.camaras.forEach(c => c.dibujarNodo());
    
    // Línea de conexión en progreso (feedback visual)
    if(herramientaActual === 'conectar' && nodoOrigenConexion) {
        // Necesitamos coordenadas del mouse, pero en loop no las tenemos directas
        // Simplificación: No dibujamos la línea elástica, solo el nodo resaltado (ya en dibujarNodo)
    }

    // Entidades
    juego.hormigas = juego.hormigas.filter(h => h.viva);
    juego.hormigas.forEach(h => { h.actualizar(juego.depredadores); h.dibujar(); });
    
    juego.depredadores = juego.depredadores.filter(d => d.vida > 0);
    juego.depredadores.forEach(d => { d.actualizar(juego.hormigas); d.dibujar(); });

    // UI
    document.getElementById('stats').innerHTML = 
        `🐜: ${juego.hormigas.length} | 🕷️: ${juego.depredadores.length} | 🏭: ${juego.camaras.length}`;
    requestAnimationFrame(loop);
}
loop();

/** * LÓGICA DE INTERACCIÓN PRINCIPAL 
 * Aquí es donde los botones cambian el comportamiento del click
 */
canvas.addEventListener('mousedown', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    // Detectar si clickeamos un nodo existente
    const nodoClickeado = juego.camaras.find(c => distancia(x, y, c.x, c.y) < c.radio);
    // Detectar si clickeamos un depredador
    const depClickeado = juego.depredadores.find(d => distancia(x, y, d.x, d.y) < d.radio + 5);

    switch (herramientaActual) {
        
        case 'cursor':
            // Herramienta segura: Solo info o nada
            if(nodoClickeado) console.log("Nodo info:", nodoClickeado);
            break;

        case 'conectar':
            if (nodoClickeado) {
                if (nodoOrigenConexion === null) {
                    // Primer click
                    nodoOrigenConexion = nodoClickeado;
                } else {
                    // Segundo click
                    if (nodoOrigenConexion !== nodoClickeado) {
                        // Crear conexión bidireccional si no existe
                        if(!nodoOrigenConexion.conexiones.includes(nodoClickeado)) {
                            nodoOrigenConexion.conexiones.push(nodoClickeado);
                            nodoClickeado.conexiones.push(nodoOrigenConexion);
                        }
                    }
                    nodoOrigenConexion = null; // Reiniciar
                }
            } else {
                // Click en vacío cancela la conexión
                nodoOrigenConexion = null;
            }
            break;

        case 'borrar':
            if (nodoClickeado) {
                // 1. Eliminar nodo del array
                juego.camaras = juego.camaras.filter(c => c !== nodoClickeado);
                // 2. Eliminar conexiones en OTROS nodos hacia este
                juego.camaras.forEach(c => {
                    c.conexiones = c.conexiones.filter(con => con !== nodoClickeado);
                });
                // 3. Matar hormigas que estuvieran en ese nodo
                juego.hormigas.forEach(h => {
                    if(h.nodoActual === nodoClickeado) h.viva = false;
                });
            }
            if (depClickeado) {
                depClickeado.vida = 0; // Matar depredador
            }
            break;

        case 'crear-normal':
        case 'crear-comida':
        case 'crear-agua':
        case 'crear-huevos':
            // Solo crear si NO clicamos sobre otro nodo (evitar superposición)
            if (!nodoClickeado) {
                const tipo = herramientaActual.replace('crear-', ''); // 'crear-comida' -> 'comida'
                // Caso especial huevos -> reina
                const tipoFinal = (tipo === 'huevos') ? 'reina' : (tipo === 'normal' ? 'pasillo' : tipo);
                juego.camaras.push(new Camara(x, y, tipoFinal));
            }
            break;
    }
});

// Botones UI globales
window.agregarHormiga = () => {
    const nido = juego.camaras.find(c => c.tipo === 'reina') || juego.camaras[0];
    if(nido) juego.hormigas.push(new Hormiga(nido, 'larva'));
    else alert("¡Necesitas una cámara de Reina para crear hormigas!");
};
window.agregarDepredador = () => juego.depredadores.push(new Depredador(Math.random()*canvas.width, Math.random()*canvas.height));
window.reiniciarJuego = () => { if(confirm("¿Borrar todo?")) iniciarHormiguero(); };

// Guardar y Cargar (Lógica simplificada para brevedad, misma que anterior)
window.guardarPartida = function() {
    const datos = {
        camaras: juego.camaras.map(c => ({ id: c.id, x: c.x, y: c.y, tipo: c.tipo, conexiones: c.conexiones.map(con => con.id) })),
        hormigas: juego.hormigas.map(h => ({ x: h.x, y: h.y, tipo: h.tipo, vida: h.vida, nodoId: h.nodoActual ? h.nodoActual.id : null })),
        depredadores: juego.depredadores.map(d => ({ x: d.x, y: d.y, vida: d.vida }))
    };
    localStorage.setItem('hormigueroV4', JSON.stringify(datos));
    alert("Guardado.");
};

window.cargarPartida = function() {
    const raw = localStorage.getItem('hormigueroV4');
    if(!raw) return alert("No hay datos");
    const datos = JSON.parse(raw);
    juego.camaras = datos.camaras.map(d => { const c = new Camara(d.x, d.y, d.tipo); c.id = d.id; return c; });
    datos.camaras.forEach((d, i) => {
        d.conexiones.forEach(idCon => {
            const vecino = juego.camaras.find(c => c.id === idCon);
            if(vecino) juego.camaras[i].conexiones.push(vecino);
        });
    });
    juego.hormigas = datos.hormigas.map(d => {
        const nodo = juego.camaras.find(c => c.id === d.nodoId);
        if(!nodo) return null; // Saltar hormigas corruptas
        const h = new Hormiga(nodo, d.tipo); h.x = d.x; h.y = d.y; h.vida = d.vida; return h;
    }).filter(h => h !== null);
    juego.depredadores = datos.depredadores.map(d => { const dep = new Depredador(d.x, d.y); dep.vida = d.vida; return dep; });
};