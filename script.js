/**
 * CONFIGURACIÓN Y UTILIDADES
 */
const canvas = document.getElementById('lienzo');
const ctx = canvas.getContext('2d');

// Ajustar el canvas al tamaño de la ventana
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Función matemática para calcular distancia entre dos puntos
const distancia = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

/**
 * CLASES DEL JUEGO
 */

// Representa una Cámara (Nodo del Grafo)
class Camara {
    constructor(x, y, tipo = 'normal') {
        this.id = Date.now() + Math.random(); // ID único
        this.x = x;
        this.y = y;
        this.radio = 20;
        this.tipo = tipo; // 'comida', 'agua', 'huevos', 'desechos', 'normal'
        this.conexiones = []; // Lista de otros nodos conectados (aristas)
    }

    dibujar() {
        // Dibujar conexiones (Aristas)
        ctx.strokeStyle = '#D7CCC8';
        ctx.lineWidth = 3;
        this.conexiones.forEach(nodo => {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(nodo.x, nodo.y);
            ctx.stroke();
        });

        // Dibujar el nodo
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        
        // Color según tipo
        if(this.tipo === 'comida') ctx.fillStyle = '#4CAF50';
        else if(this.tipo === 'agua') ctx.fillStyle = '#2196F3';
        else if(this.tipo === 'huevos') ctx.fillStyle = '#FFEB3B';
        else ctx.fillStyle = '#8D6E63'; 
        
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// La protagonista
class Hormiga {
    constructor(nodoInicio) {
        this.x = nodoInicio.x;
        this.y = nodoInicio.y;
        this.nodoActual = nodoInicio;
        this.destino = null; 
        this.velocidad = 1.5;
        
        // Vida simulada (aprox 2 mins a 60fps)
        this.vidaMax = 7200; 
        this.vida = this.vidaMax;
        this.viva = true;
    }

    actualizar() {
        if (!this.viva) return;
        
        // Envejecimiento
        this.vida--;
        if (this.vida <= 0) {
            this.morir();
            return;
        }

        // IA Básica: Movimiento aleatorio
        if (!this.destino && this.nodoActual.conexiones.length > 0) {
            const indice = Math.floor(Math.random() * this.nodoActual.conexiones.length);
            this.destino = this.nodoActual.conexiones[indice];
        }

        // Moverse hacia el destino
        if (this.destino) {
            const dx = this.destino.x - this.x;
            const dy = this.destino.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < this.velocidad) {
                this.x = this.destino.x;
                this.y = this.destino.y;
                this.nodoActual = this.destino;
                this.destino = null;
            } else {
                this.x += (dx / dist) * this.velocidad;
                this.y += (dy / dist) * this.velocidad;
            }
        }
    }

    dibujar() {
        if (!this.viva) return;
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    morir() {
        this.viva = false;
        console.log("Una hormiga ha muerto de vieja.");
    }
}

class Depredador {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radio = 8;
        this.velocidad = 0.8;
    }

    actualizar(hormigas) {
        let masCercana = null;
        let distMin = 99999;

        // Buscar presa
        hormigas.forEach(h => {
            if (h.viva) {
                const d = distancia(this.x, this.y, h.x, h.y);
                if (d < distMin) {
                    distMin = d;
                    masCercana = h;
                }
            }
        });

        // Perseguir
        if (masCercana && distMin < 300) {
            const dx = masCercana.x - this.x;
            const dy = masCercana.y - this.y;
            this.x += (dx / distMin) * this.velocidad;
            this.y += (dy / distMin) * this.velocidad;

            // Atacar
            if (distMin < 10) {
                masCercana.viva = false;
            }
        }
    }

    dibujar() {
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 10);
        ctx.lineTo(this.x - 8, this.y + 8);
        ctx.lineTo(this.x + 8, this.y + 8);
        ctx.fill();
    }
}

/**
 * ESTADO DEL JUEGO
 */
const juego = {
    camaras: [],
    hormigas: [],
    depredadores: [],
    seleccionado: null
};

// Crear hormiguero inicial
const entrada = new Camara(canvas.width/2, canvas.height/2, 'huevos');
juego.camaras.push(entrada);

/**
 * BUCLE PRINCIPAL (GAME LOOP)
 */
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar y actualizar cámaras
    juego.camaras.forEach(c => c.dibujar());

    // Dibujar y actualizar hormigas
    juego.hormigas.forEach(h => {
        h.actualizar();
        h.dibujar();
    });

    // Dibujar y actualizar depredadores
    juego.depredadores.forEach(d => {
        d.actualizar(juego.hormigas);
        d.dibujar();
    });

    // Actualizar UI
    document.getElementById('info').innerText = 
        `Población: ${juego.hormigas.filter(h=>h.viva).length} | Depredadores: ${juego.depredadores.length}`;

    requestAnimationFrame(loop);
}

// Iniciar el juego
loop();

/**
 * INTERACCIÓN (INPUTS)
 */
canvas.addEventListener('mousedown', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    const clickEnCamara = juego.camaras.find(c => distancia(x, y, c.x, c.y) < c.radio);

    if (clickEnCamara) {
        if (juego.seleccionado) {
            if (juego.seleccionado !== clickEnCamara) {
                // Crear conexión (Arista)
                if(!juego.seleccionado.conexiones.includes(clickEnCamara)){
                    juego.seleccionado.conexiones.push(clickEnCamara);
                    clickEnCamara.conexiones.push(juego.seleccionado);
                }
            }
            juego.seleccionado = null;
        } else {
            juego.seleccionado = clickEnCamara;
            alert(`Cámara seleccionada. Click en otra para conectar.`);
        }
    } else {
        const tipos = ['comida', 'agua', 'normal'];
        const tipo = tipos[Math.floor(Math.random() * tipos.length)];
        juego.camaras.push(new Camara(x, y, tipo));
    }
});

// Funciones globales para los botones HTML
window.agregarHormiga = function() {
    const nido = juego.camaras.find(c => c.tipo === 'huevos') || juego.camaras[0];
    if (nido) juego.hormigas.push(new Hormiga(nido));
};

window.agregarDepredador = function() {
    juego.depredadores.push(new Depredador(Math.random() * canvas.width, Math.random() * canvas.height));
};

window.guardarPartida = function() {
    const datosGuardar = {
        camaras: juego.camaras.map(c => ({
            id: c.id, x: c.x, y: c.y, tipo: c.tipo,
            conexionesIds: c.conexiones.map(con => con.id)
        })),
        hormigas: juego.hormigas.map(h => ({
            x: h.x, y: h.y, vida: h.vida, 
            nodoActualId: h.nodoActual.id 
        })),
        depredadores: juego.depredadores.map(d => ({ x: d.x, y: d.y }))
    };
    localStorage.setItem('hormigueroSave', JSON.stringify(datosGuardar));
    alert('Partida guardada.');
};

window.cargarPartida = function() {
    const jsonString = localStorage.getItem('hormigueroSave');
    if (!jsonString) return alert("No hay partida guardada");
    
    const datos = JSON.parse(jsonString);

    juego.camaras = datos.camaras.map(d => {
        const c = new Camara(d.x, d.y, d.tipo);
        c.id = d.id; 
        return c;
    });

    datos.camaras.forEach((d, index) => {
        const camaraReal = juego.camaras[index];
        d.conexionesIds.forEach(idConectado => {
            const nodoConectado = juego.camaras.find(c => c.id === idConectado);
            if(nodoConectado) camaraReal.conexiones.push(nodoConectado);
        });
    });

    juego.hormigas = datos.hormigas.map(d => {
        const nodo = juego.camaras.find(c => c.id === d.nodoActualId) || juego.camaras[0];
        const h = new Hormiga(nodo);
        h.x = d.x; h.y = d.y; h.vida = d.vida;
        return h;
    });

    juego.depredadores = datos.depredadores.map(d => new Depredador(d.x, d.y));
    alert('Partida cargada.');
};

// Ajustar canvas si se cambia el tamaño de la ventana
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});