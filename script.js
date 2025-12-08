/** CONFIGURACIÓN */
const canvas = document.getElementById('lienzo');
const ctx = canvas.getContext('2d');

const imgSpider = new Image();
imgSpider.src = 'assets/spider.png';

// Fondo
const imgFondo = new Image();
imgFondo.src = "assets/fondo.png";

// Nodos
const imgPasillo = new Image();
imgPasillo.src = "assets/pasillo.png";

const imgComida = new Image();
imgComida.src = "assets/comida.png";

const imgAgua = new Image();
imgAgua.src = "assets/agua.png";

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
let animacionesPiedra = [];
let piedrasFinales = [];
let imagenPiedra = new Image();
imagenPiedra.src = 'assets/piedra.png';

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

class PiedraAnimada {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.alturaInicial = y - 150;   // La piedra "viene desde arriba"
        this.alturaActual = this.alturaInicial;

        this.escala = 2.0;              // Grande al inicio
        this.opacidad = 0.2;            // Transparente al inicio
        this.rotacion = Math.random() * Math.PI * 2;

        this.velocidad = 6;            // Velocidad de caída
    }

    actualizar() {
        // Movimiento hacia el nodo
        if (this.alturaActual < this.y) {
            this.alturaActual += this.velocidad;
            this.escala -= 0.02;
            this.opacidad += 0.05;
        } else {
            return true; // Señal de que la animación terminó
        }
        return false;
    }

    dibujar(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacidad;
        ctx.translate(this.x, this.alturaActual);
        ctx.rotate(this.rotacion);
        ctx.scale(this.escala, this.escala);
        ctx.drawImage(imagenPiedra, -32, -32, 64, 64);
        ctx.restore();
    }
}

class PiedraFinal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rotacion = Math.random() * Math.PI * 2;
    }

    dibujar(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotacion);
        ctx.drawImage(imagenPiedra, -32, -32, 64, 64);
        ctx.restore();
    }
}


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
        ctx.lineWidth = 10; ctx.strokeStyle = '#1c0f0a'; 
        this.conexiones.forEach(nodo => {
            if(nodo) { ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(nodo.x, nodo.y); ctx.stroke(); }
        });
    }

    dibujarNodo() {

    // --- NODOS con imagen: pasillo, comida, agua ---
    if (this.tipo === 'pasillo' || this.tipo === 'comida' || this.tipo === 'agua') {

        let img = null;

        if (this.tipo === 'pasillo') img = imgPasillo;
        if (this.tipo === 'comida')  img = imgComida;
        if (this.tipo === 'agua')    img = imgAgua;

        if (img) {
            const size = this.radio * 2;
            // RECORTE CIRCULAR
            ctx.save();                // Guardar estado del canvas
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();                // ← Aplica el recorte circular

            ctx.drawImage(img, this.x - this.radio, this.y - this.radio, size, size);

            ctx.restore();             // ← Restablece el canvas sin recorte
        }

        // borde si este nodo es origen de una conexión
        if (this === nodoOrigenConexion) {
            ctx.strokeStyle = '#FFEB3B';
            ctx.lineWidth = 6;
        } else {
            ctx.strokeStyle = '#1c0f0a';
            ctx.lineWidth = 4;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        ctx.stroke();

        return; 
    }



    // --- NODOS NORMALES (reina, desechos, etc) ---
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);

    // Colores
    switch (this.tipo) {
        case 'reina': ctx.fillStyle = '#9C27B0'; break;
        case 'desechos': ctx.fillStyle = '#78909C'; break;
        default: ctx.fillStyle = '#8D6E63'; // <- este no es el fondo, es el color de pasillo antiguo
    }

    // Borde de selección (conectar)
    if (this === nodoOrigenConexion) {
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 6;
    } else {
        ctx.strokeStyle = '#1c0f0a';
        ctx.lineWidth = 4;
    }

    ctx.fill();
    ctx.stroke();

    // Texto / icono
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';

    let label = this.tipo.substring(0, 3).toUpperCase();
    if (this.tipo === 'reina') label = '👑';

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
        this.x = x; 
        this.y = y;
        this.vida = 80; 
        this.vidaMax = 80;
        this.velocidad = 0.8; 
        this.daño = 50; 
        this.radio = 30;

        this.objetivo = null;  // para saber hacia quién gira
    }

    actualizar(hormigas) {
        if (this.vida <= 0) return;

        let masCercana = null, distMin = 99999;

        hormigas.forEach(h => {
            if (h.viva && h.tipo !== 'larva') {
                const d = distancia(this.x, this.y, h.x, h.y);
                if (d < distMin) {
                    distMin = d;
                    masCercana = h;
                }
            }
        });

        this.objetivo = masCercana; // GUARDAR objetivo para la rotación

        if (masCercana && distMin < 300) {
            const ang = angulo(this.x, this.y, masCercana.x, masCercana.y);
            this.x += Math.cos(ang) * this.velocidad;
            this.y += Math.sin(ang) * this.velocidad;

            if (distMin < this.radio + 5)
                masCercana.recibirDaño(this.daño);
        }
    }

    recibirDaño(c) { 
        this.vida -= c; 
    }

    dibujar() {
        if (this.vida <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // --- ROTACIÓN DEPENDIENDO DEL OBJETIVO ---
        let anguloRot = 0;
        if (this.objetivo) {
            const dx = this.objetivo.x - this.x;
            const dy = this.objetivo.y - this.y;
            anguloRot = Math.atan2(dy, dx) + Math.PI / 2;  
            // +90° porque tu sprite mira hacia abajo
        }
        ctx.rotate(anguloRot);

        // --- DIBUJAR SPRITE ---
        const size = this.radio * 2; 
        ctx.drawImage(imgSpider, -size / 2, -size / 2, size, size);

        ctx.restore();

        // --- BARRA DE VIDA ---
        const p = Math.max(0, this.vida / this.vidaMax);

        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 15, this.y - this.radio - 18, 30, 5);

        ctx.fillStyle = '#76FF03';
        ctx.fillRect(this.x - 15, this.y - this.radio - 18, 30 * p, 5);
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
    ctx.drawImage(imgFondo, 0, 0, canvas.width, canvas.height);
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
    
    // 🔥 ANIMACIÓN DE PIEDRAS AL BORRAR NODOS
    // Ejecutar animaciones activas
    animacionesPiedra = animacionesPiedra.filter(anim => {
        anim.dibujar(ctx);
        const terminada = anim.actualizar();
        if (terminada) {
            // Guardar piedra final en el suelo
            piedrasFinales.push(new PiedraFinal(anim.x, anim.y));
        }
        return !terminada;
    });

    // Dibujar piedras ya caídas
    piedrasFinales.forEach(p => p.dibujar(ctx));

    // 🔥 ELIMINAR NODOS AL FINAL DE LA ANIMACIÓN
    juego.camaras = juego.camaras.filter(c => {
        if (c.eliminarPendiente && !animacionesPiedra.some(a => a.x === c.x && a.y === c.y)) {
            // Eliminar conexiones hacia él
            juego.camaras.forEach(cam => {
                cam.conexiones = cam.conexiones.filter(n => n !== c);
            });
            return false; // Eliminar nodo
        }
        return true;
    });

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
            animacionesPiedra.push(new PiedraAnimada(nodoClickeado.x, nodoClickeado.y));
            let nodoAEliminar = nodoClickeado;
            nodoAEliminar.eliminarPendiente = true;
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