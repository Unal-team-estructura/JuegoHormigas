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

/** CLASES */

class Camara {
    constructor(x, y, tipo = 'normal') {
        this.id = Date.now() + Math.random();
        this.x = x;
        this.y = y;
        this.radio = tipo === 'reina' ? 35 : 25;
        this.tipo = tipo; 
        this.conexiones = []; 
    }

    dibujarTuneles() {
        ctx.lineWidth = 14; // Túneles un poco más gruesos
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#4E342E'; // Color tierra oscuro base
        
        this.conexiones.forEach(nodo => {
            if(nodo) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(nodo.x, nodo.y);
                ctx.stroke();
            }
        });

        // Detalle interior del túnel
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#3E2723'; 
        this.conexiones.forEach(nodo => {
            if(nodo) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(nodo.x, nodo.y);
                ctx.stroke();
            }
        });
    }

    dibujarNodo() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        
        switch(this.tipo) {
            case 'reina': ctx.fillStyle = '#9C27B0'; break;
            case 'comida': ctx.fillStyle = '#4CAF50'; break;
            case 'agua': ctx.fillStyle = '#03A9F4'; break;
            case 'desechos': ctx.fillStyle = '#607D8B'; break;
            default: ctx.fillStyle = '#795548';
        }
        
        ctx.fill();
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Icono o texto
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.tipo.toUpperCase(), this.x, this.y + 4);
    }
}

class Hormiga {
    constructor(nodoInicio, tipo = 'obrera') {
        this.inicializar(nodoInicio, tipo);
    }

    inicializar(nodoInicio, tipo) {
        this.x = this.x || nodoInicio.x;
        this.y = this.y || nodoInicio.y;
        this.nodoActual = nodoInicio;
        this.destino = null; 
        this.tipo = tipo;
        this.angulo = 0;
        this.viva = true;

        if (this.tipo === 'luchadora') {
            this.velocidad = 1.2; // Un poco más rápidas que antes
            this.vida = 120;
            this.daño = 2.5; // Más daño
            this.color = '#C62828';
            this.radio = 6;
        } else if (this.tipo === 'larva') {
            this.velocidad = 0;
            this.vida = 20;
            this.daño = 0;
            this.color = '#FFF9C4';
            this.radio = 4;
            this.tiempoCrecimiento = 300; 
        } else {
            this.velocidad = 1.8;
            this.vida = 60;
            this.daño = 0.5;
            this.color = '#212121';
            this.radio = 4;
        }
    }

    actualizar(depredadores) {
        if (!this.viva) return;

        // Larva
        if (this.tipo === 'larva') {
            this.tiempoCrecimiento--;
            if (this.tiempoCrecimiento <= 0) {
                const nuevoTipo = Math.random() > 0.6 ? 'luchadora' : 'obrera'; // 40% chance de soldado
                this.inicializar(this.nodoActual, nuevoTipo);
            }
            return; 
        }

        // Combate
        if (this.tipo === 'luchadora') {
            let enemigoCerca = null;
            for (let d of depredadores) {
                if (d.vida > 0 && distancia(this.x, this.y, d.x, d.y) < 180) { // Rango de visión
                    enemigoCerca = d;
                    break;
                }
            }

            if (enemigoCerca) {
                this.destino = { x: enemigoCerca.x, y: enemigoCerca.y, esEnemigo: true };
                if (distancia(this.x, this.y, enemigoCerca.x, enemigoCerca.y) < 20) {
                    enemigoCerca.recibirDaño(this.daño);
                }
            } else if (this.destino && this.destino.esEnemigo) {
                this.destino = null; 
            }
        }

        // Movimiento Grafo
        if (!this.destino && this.nodoActual && this.nodoActual.conexiones && this.nodoActual.conexiones.length > 0) {
             const indice = Math.floor(Math.random() * this.nodoActual.conexiones.length);
             this.destino = this.nodoActual.conexiones[indice];
        }

        this.mover();
    }

    mover() {
        if (this.destino) {
            const d = distancia(this.x, this.y, this.destino.x, this.destino.y);

            if (d < 5) {
                if (this.destino instanceof Camara) {
                    this.nodoActual = this.destino;
                }
                this.destino = null;
                return;
            }

            if (d > 0) {
                this.angulo = angulo(this.x, this.y, this.destino.x, this.destino.y);
                this.x += Math.cos(this.angulo) * this.velocidad;
                this.y += Math.sin(this.angulo) * this.velocidad;
            }
        }
    }

    dibujar() {
        if (!this.viva) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.tipo !== 'larva') {
            ctx.rotate(this.angulo);
            ctx.fillStyle = this.color;
            // Cuerpo
            ctx.beginPath(); ctx.arc(-6, 0, this.radio, 0, Math.PI*2); ctx.fill(); // Abdomen
            ctx.beginPath(); ctx.arc(0, 0, this.radio * 0.8, 0, Math.PI*2); ctx.fill(); // Torax
            ctx.beginPath(); ctx.arc(5, 0, this.radio * 0.7, 0, Math.PI*2); ctx.fill(); // Cabeza
            // Patas
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-6, -8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(-6, 8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(6, -8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(6, 8); ctx.stroke();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#CCC'; ctx.stroke();
        }
        ctx.restore();
    }
    
    recibirDaño(cantidad) {
        this.vida -= cantidad;
        if(this.vida <= 0) this.viva = false;
    }
}

class Depredador {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vida = 80; // <--- VIDA REDUCIDA (Antes 200)
        this.vidaMax = 80;
        this.velocidad = 0.8; 
        this.daño = 50;
        this.radio = 15;
    }

    actualizar(hormigas) {
        if (this.vida <= 0) return;

        let masCercana = null;
        let distMin = 99999;

        hormigas.forEach(h => {
            if (h.viva && h.tipo !== 'larva') {
                const d = distancia(this.x, this.y, h.x, h.y);
                if (d < distMin) {
                    distMin = d;
                    masCercana = h;
                }
            }
        });

        // Persecución libre (sin túneles, "camina" por encima)
        if (masCercana && distMin < 300) {
            const ang = angulo(this.x, this.y, masCercana.x, masCercana.y);
            this.x += Math.cos(ang) * this.velocidad;
            this.y += Math.sin(ang) * this.velocidad;

            if (distMin < this.radio + 5) {
                masCercana.recibirDaño(this.daño);
            }
        }
    }

    recibirDaño(cantidad) {
        this.vida -= cantidad;
    }

    dibujar() {
        if (this.vida <= 0) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Cuerpo Araña
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath(); ctx.arc(0, 0, this.radio, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#B71C1C'; // Cabeza
        ctx.beginPath(); ctx.arc(8, 0, this.radio*0.6, 0, Math.PI*2); ctx.fill();

        // Patas Largas
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 2;
        for(let i=0; i<8; i++){
            let angle = (i / 4) * Math.PI; 
            ctx.beginPath();
            ctx.moveTo(0,0);
            // Patas que se mueven visualmente
            let largo = 25 + Math.sin(Date.now() * 0.01 + i) * 5; 
            ctx.lineTo(Math.cos(angle)*largo, Math.sin(angle)*largo);
            ctx.stroke();
        }
        
        // Barra de vida
        const porcentaje = Math.max(0, this.vida / this.vidaMax);
        ctx.fillStyle = 'red';
        ctx.fillRect(-15, -25, 30, 5);
        ctx.fillStyle = '#76FF03'; // Verde brillante
        ctx.fillRect(-15, -25, 30 * porcentaje, 5);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(-15, -25, 30, 5);
        
        ctx.restore();
    }
}

/** ESTADO DEL JUEGO */
const juego = {
    camaras: [],
    hormigas: [],
    depredadores: [],
    seleccionado: null
};

function iniciarHormiguero() {
    juego.camaras = [];
    juego.hormigas = [];
    juego.depredadores = [];
    juego.seleccionado = null;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const cReina = new Camara(cx, cy, 'reina');
    const cComida = new Camara(cx - 150, cy - 80, 'comida');
    const cAgua = new Camara(cx + 150, cy - 80, 'agua');
    const cDesechos = new Camara(cx, cy + 150, 'desechos');
    const cEntrada = new Camara(cx, cy - 200, 'normal');

    const conectar = (a, b) => { a.conexiones.push(b); b.conexiones.push(a); };
    conectar(cReina, cComida);
    conectar(cReina, cAgua);
    conectar(cReina, cDesechos);
    conectar(cComida, cEntrada);
    conectar(cAgua, cEntrada);

    juego.camaras.push(cReina, cComida, cAgua, cDesechos, cEntrada);

    for(let i=0; i<5; i++) juego.hormigas.push(new Hormiga(cReina, 'obrera'));
    for(let i=0; i<3; i++) juego.hormigas.push(new Hormiga(cReina, 'luchadora'));
    for(let i=0; i<3; i++) juego.hormigas.push(new Hormiga(cReina, 'larva'));
}

iniciarHormiguero();

/** BUCLE */
function loop() {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dibujar Túneles y Nodos
        juego.camaras.forEach(c => c.dibujarTuneles());
        juego.camaras.forEach(c => c.dibujarNodo());

        // Hormigas
        juego.hormigas = juego.hormigas.filter(h => h.viva);
        juego.hormigas.forEach(h => {
            try { h.actualizar(juego.depredadores); h.dibujar(); } 
            catch (e) { console.error(e); h.viva = false; }
        });

        // Depredadores
        juego.depredadores = juego.depredadores.filter(d => d.vida > 0);
        juego.depredadores.forEach(d => {
            d.actualizar(juego.hormigas);
            d.dibujar();
        });

        // UI Stats
        const obreras = juego.hormigas.filter(h => h.tipo === 'obrera').length;
        const soldados = juego.hormigas.filter(h => h.tipo === 'luchadora').length;
        const larvas = juego.hormigas.filter(h => h.tipo === 'larva').length;
        
        document.getElementById('stats').innerHTML = 
            `🐜 Obreras: ${obreras} | ⚔️ Soldados: ${soldados} | 🐛 Larvas: ${larvas} <br> 🕷️ Amenazas: ${juego.depredadores.length}`;

        requestAnimationFrame(loop);

    } catch (err) {
        console.error("Error fatal:", err);
    }
}
loop();

/** INTERACCIÓN */
canvas.addEventListener('mousedown', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    const clickEnCamara = juego.camaras.find(c => distancia(x, y, c.x, c.y) < c.radio);

    if (clickEnCamara) {
        if (juego.seleccionado) {
            if (juego.seleccionado !== clickEnCamara && !juego.seleccionado.conexiones.includes(clickEnCamara)) {
                juego.seleccionado.conexiones.push(clickEnCamara);
                clickEnCamara.conexiones.push(juego.seleccionado);
            }
            juego.seleccionado = null;
        } else {
            juego.seleccionado = clickEnCamara;
        }
    } else {
        juego.camaras.push(new Camara(x, y, 'normal'));
    }
});

// Botones
window.agregarHormiga = function() {
    const nido = juego.camaras.find(c => c.tipo === 'reina') || juego.camaras[0];
    if (nido) juego.hormigas.push(new Hormiga(nido, 'larva'));
};

window.agregarDepredador = function() {
    // Aparece lejos del centro para no matar a la reina al instante
    let x, y;
    if(Math.random() > 0.5) { x = Math.random() * canvas.width; y = 0; }
    else { x = 0; y = Math.random() * canvas.height; }
    
    juego.depredadores.push(new Depredador(x, y));
};

window.reiniciarJuego = function() {
    if(confirm("¿Reiniciar colonia?")) iniciarHormiguero();
};

window.guardarPartida = function() {
    const datos = {
        camaras: juego.camaras.map(c => ({ id: c.id, x: c.x, y: c.y, tipo: c.tipo, conexiones: c.conexiones.map(con => con.id) })),
        hormigas: juego.hormigas.map(h => ({ x: h.x, y: h.y, tipo: h.tipo, vida: h.vida, nodoId: h.nodoActual.id })),
        depredadores: juego.depredadores.map(d => ({ x: d.x, y: d.y, vida: d.vida }))
    };
    localStorage.setItem('hormigueroV3', JSON.stringify(datos));
    alert("Partida guardada ✅");
};

window.cargarPartida = function() {
    const raw = localStorage.getItem('hormigueroV3');
    if(!raw) return alert("No hay datos guardados");
    const datos = JSON.parse(raw);
    
    // Reconstruir
    juego.camaras = datos.camaras.map(d => { const c = new Camara(d.x, d.y, d.tipo); c.id = d.id; return c; });
    // Reconectar
    datos.camaras.forEach((d, i) => {
        d.conexiones.forEach(idCon => {
            const vecino = juego.camaras.find(c => c.id === idCon);
            if(vecino) juego.camaras[i].conexiones.push(vecino);
        });
    });

    juego.hormigas = datos.hormigas.map(d => {
        const nodo = juego.camaras.find(c => c.id === d.nodoId) || juego.camaras[0];
        const h = new Hormiga(nodo, d.tipo);
        h.x = d.x; h.y = d.y; h.vida = d.vida;
        return h;
    });

    juego.depredadores = datos.depredadores.map(d => {
        const dep = new Depredador(d.x, d.y);
        dep.vida = d.vida;
        return dep;
    });
};