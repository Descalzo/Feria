
//const SERVER_URL = 'http://192.168.1.231:8080';
//const SERVER_URL = 'https://ba54-62-36-29-136.ngrok-free.app';
const SERVER_URL = 'https://feria-production.up.railway.app';


let users = [];
let transactions = [];
let chatMessages = []; // Se cargará desde el servidor
let navigationStack = [];
let chatInterval = null;
const API_KEY = '3917cc5365fb3b4a250d38d8fb234edc';
let currentUser = null; // Inicializamos currentUser como null


function mostrarMensaje(tipo, texto) {
  let contenedor = document.getElementById('notificaciones');

  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'notificaciones';
    contenedor.style.position = 'fixed';
    contenedor.style.top = '10%';
    contenedor.style.right = '50%';
    contenedor.style.zIndex = '9999';
    contenedor.style.maxWidth = '300px';
    document.body.appendChild(contenedor);
  }

  const estilos = {
    exito:   { bg: '#28a745', icono: '✔️' },
    error:   { bg: '#dc3545', icono: '❌' },
    info:    { bg: '#007bff', icono: 'ℹ️' },
    advertencia: { bg: '#fd7e14', icono: '⚠️' }
  };

  const { bg, icono } = estilos[tipo] || estilos.info;

  const div = document.createElement('div');
  div.className = `notificacion ${tipo} notificacion-animada`;
  div.innerHTML = `${icono} <strong>${texto}</strong>`;
  div.style.padding = '10px 15px';
  div.style.marginBottom = '10px';
  div.style.borderRadius = '8px';
  div.style.color = 'white';
  div.style.background = bg;
  div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  div.style.animation = 'none';
  div.offsetHeight; // fuerza reflow
  div.style.opacity = '0';
  div.style.transform = 'scale(0.8)';
  div.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    setTimeout(() => {
	  div.style.opacity = '1';
	  div.style.transform = 'scale(1.05)';
	}, 10);

	setTimeout(() => {
	  div.style.transform = 'scale(1)';
	}, 300);

	setTimeout(() => {
	  div.style.opacity = '0';
	  div.style.transform = 'scale(0.8)';
	}, 2500);

    contenedor.innerHTML = '';
  contenedor.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}



// Cargar mensajes desde el servidor
async function cargarMensajesDesdeServidor() {
  try {
    const res = await fetch(`${SERVER_URL}/mensajes`);
    if (!res.ok) throw new Error(`Error al cargar mensajes: ${res.status}`);
    chatMessages = await res.json();
    console.log("Mensajes cargados", chatMessages);
  } catch (err) {
    console.error("Error cargando mensajes:", err);
    chatMessages = [];
  }
}

// Guardar un nuevo mensaje en el servidor
async function guardarMensajeIndividual(mensaje) {
  try {
    // No incluimos el 'id' en el cuerpo, json-server lo generará automáticamente
    const mensajeSinId = { 
      sender: mensaje.sender, 
      message: mensaje.message, 
      date: mensaje.date 
    };
    const res = await fetch(`${SERVER_URL}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mensajeSinId)
    });

    if (!res.ok) throw new Error(`Error al guardar mensaje: ${res.status}`);
    console.log('✅ Mensaje guardado correctamente:', mensaje);
  } catch (err) {
    console.error('❌ Error al guardar mensaje:', err);
  }
}

async function registrarTransaccion(email, cantidad, tipo, extra = {}) {
  const nuevaTransaccion = {
    
    userEmail: email,
    amount: cantidad,
    date: new Date().toISOString(),
    type: tipo,
	alias: currentUser.alias,
    ...extra
  };
  transactions.push(nuevaTransaccion);
  await guardarTransaccionIndividual(nuevaTransaccion);
  await cargarTransaccionesDesdeServidor(); // Recargar transacciones desde el servidor después de guardar
  return nuevaTransaccion; // Opcional: devolver la transacción para usarla si es necesario
}



async function cargarUsuariosDesdeServidor() {
  try {
    const res = await fetch(`${SERVER_URL}/usuarios`);
    users = await res.json();
    console.log("Usuarios cargados", users);
    if (typeof currentUser !== 'undefined' && currentUser) {
      const updatedUser = users.find(u => u._id === currentUser.email);
      if (updatedUser) {
        currentUser = updatedUser;
        if (!currentUser.recargasVistas) currentUser.recargasVistas = [];
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
    }
  } catch (err) {
    console.error("Error cargando usuarios:", err);
    users = [];
  }
}


async function hayRecargasNuevas() {
  try {
    await cargarTransaccionesDesdeServidor();
    const recargas = transactions.filter(t => 
      (t.type === 'recarga' || t.type === 'ingreso') && 
      t.userEmail === currentUser.email
    );
    console.log('🔍 Recargas encontradas:', recargas);
    if (!currentUser.recargasVistas) currentUser.recargasVistas = [];
    console.log('👀 Recargas vistas:', currentUser.recargasVistas);
    const tieneNuevas = recargas.some(r => !currentUser.recargasVistas.includes(r._id));
    console.log('🆕 ¿Hay recargas nuevas?', tieneNuevas);
    return tieneNuevas;
  } catch (err) {
    console.error("Error verificando recargas nuevas:", err);
    return false;
  }
}


async function cargarTransaccionesDesdeServidor() {
  try {
    const res = await fetch(`${SERVER_URL}/transacciones`);
    transactions = await res.json();
    console.log("Transacciones cargadas", transactions);
  } catch (err) {
    console.error("Error cargando transacciones:", err);
    transactions = [];
  }
}



// Guardar una nueva transacción individual
async function guardarTransaccionIndividual(transaccion) {
  try {
    const res = await fetch(`${SERVER_URL}/transacciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaccion)
    });

    if (!res.ok) throw new Error(`Error al guardar transacción: ${res.status}`);
    const savedTransaction = await res.json(); // Obtener la transacción guardada con el ID del servidor
    console.log('✅ Transacción guardada correctamente:', savedTransaction);
    return savedTransaction; // Devolver la transacción con el ID real
  } catch (err) {
    console.error('❌ Error al guardar transacción:', err);
    throw err;
  }
}



// Login de usuario básico
document.getElementById('login-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const loginInput = document.getElementById('login-user').value;
  const password = document.getElementById('login-password').value;
  const user = users.find(u => (u.email === loginInput || u.alias === loginInput) && u.password === password);

  if (user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    console.log('Login correcto:', currentUser);
    // Aquí mostrarías el menú principal
  } else {
  
	
	mostrarMensaje("error", "Credenciales incorrectas.");
  }
});



// Ejemplo: añadir un nuevo usuario
async function registrarNuevoUsuario(email, alias, password, role, parentEmail) {
  const nuevoUsuario = {
   
    email,
    alias,
    password,
    role,
    balance: 0,
    parent: parentEmail || null
  };
  users.push(nuevoUsuario);
  await guardarUsuarioEnServidor(nuevoUsuario);
}



async function registrarCamarero() {
  const alias = document.getElementById('nuevoCamareroAlias').value;
  const email = document.getElementById('nuevoCamareroEmail').value;
  const password = document.getElementById('nuevoCamareroPassword').value;

  const nuevo = {
    alias,
    email,
    password,
    role: 'camarero',
    parent: currentUser.email
  };

  try {
    const res = await fetch(`${SERVER_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo)
    });

    if (res.ok) {
      mostrarMensaje("exito", "Camarero registrado correctamente.");
      // Establecer la pila de navegación para que "Atrás" funcione bien
      navigationStack = ['menu-container'];
      await cargarCamarerosAgregados();
      mostrarContenedor('gestionar-camareros-page', false); // evitar guardar en historial
      agregarBotonAtras('gestionar-camareros-page');
    } else {
      mostrarMensaje("error", "Error al registrar camarero.");
    }
  } catch (err) {
    console.error('Error:', err);
    mostrarMensaje("error", "Error de conexión al registrar camarero.");
  }
}



async function cargarCamarerosAgregados() {
  await cargarUsuariosDesdeServidor();
  const container = document.getElementById('camareros-list');
  let html = '';

  const camareros = users.filter(u => 
    u.role === 'camarero' && 
    (u.parent === currentUser.email || u.parent === currentUser._id)
  );

  if (camareros.length === 0) {
    html += '<p>No hay camareros agregados directamente por ti.</p>';
  } else {
    html += '<table><tr><th>Alias</th><th>Email</th><th>Acciones</th></tr>';
    camareros.forEach(c => {
      html += `<tr>
        <td>${c.alias}</td>
        <td>${c.email}</td>
        <td><button onclick="eliminarUsuario('${c._id}')">Eliminar</button></td>
      </tr>`;
    });
    html += '</table>';
  }

  container.innerHTML = html;
}




// 🔴 Primero definir claramente ambas funciones al inicio:

async function guardarUsuarioEnServidor(usuario) {
  try {
    const respuesta = await fetch(`${SERVER_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuario)
    });

    if (!respuesta.ok) {
      const errorText = await respuesta.text();
      throw new Error(`Error del servidor: ${respuesta.status} - ${errorText}`);
    }

    console.log('Usuario guardado correctamente en servidor.');
  } catch (error) {
    console.error("Error guardando usuario en servidor:", error);
  }
}




function mostrarContenedor(id, guardarEnHistorial = true) {
  if (id === 'payments-page') {
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-qr').innerHTML = '';
  }

  const current = document.querySelector('#content .container.active');
  if (guardarEnHistorial && current && current.id !== id) {
    if (navigationStack[navigationStack.length - 1] !== current.id) {
      navigationStack.push(current.id);
    }
  }

  const views = document.querySelectorAll('#content .container');
  views.forEach(view => view.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}



async function generarEsquemaRelaciones() {
  await cargarUsuariosDesdeServidor();
  const contenedor = document.getElementById('esquema-usuarios');
  contenedor.scrollTop = 0;
  contenedor.innerHTML = '';

  const crearBloqueUsuario = (alias, icono, color, rol, marginLeft = 0, registradoPor = '') => {
    const div = document.createElement('div');
    div.style.marginLeft = `${marginLeft}px`;
    div.style.border = `2px solid ${color}`;
    div.style.borderRadius = '10px';
    div.style.padding = '8px 12px';
    div.style.marginBottom = '8px';
    div.style.background = '#fff';
    div.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';

    const fila = document.createElement('div');
    fila.style.display = 'flex';
    fila.style.justifyContent = 'space-between';
    fila.style.alignItems = 'center';

    const izquierda = document.createElement('div');
    izquierda.innerHTML = `${icono} <strong style="color:${color}">${alias}</strong>`;

    const derecha = document.createElement('div');
    derecha.innerHTML = `<em style="color:#666">${rol}</em>`;

    fila.appendChild(izquierda);
    fila.appendChild(derecha);
    div.appendChild(fila);

    if (registradoPor) {
      const registro = document.createElement('small');
      registro.style.color = '#666';
      registro.textContent = `(Registrado por: ${registradoPor})`;
      div.appendChild(registro);
    }

    return div;
  };

  const colorRoles = {
    socio: '#007bff',
    familiar: '#28a745',
    invitado: '#6c757d',
    portero: '#dc3545',
    restaurante: '#fd7e14',
    admin: '#ffc107',
    camarero: '#fd7e14' // Color para camarero
  };

  const iconos = {
    socio: '👤',
    familiar: '👪',
    invitado: '🎟️',
    portero: '🚪',
    restaurante: '🍽️',
    admin: '👑',
    camarero: '🍷' // Icono para camarero
  };

  // Administradores
  const administradores = users.filter(u => u.role === 'admin');
  administradores.forEach(admin => {
    const bloqueAdmin = crearBloqueUsuario(admin.alias, iconos.admin, colorRoles.admin, 'admin');

    // Familiares del admin
    const familiares = users.filter(f => f.parent === admin.email && f.role === 'familiar');
    familiares.forEach(fam => {
      const famDiv = crearBloqueUsuario(fam.alias, iconos.familiar, colorRoles.familiar, 'familiar', 20);
      // Invitados de ese familiar
      const invitadosFamiliar = users.filter(i => i.parent === fam.email && i.role === 'invitado');
      invitadosFamiliar.forEach(inv => {
        const invDiv = crearBloqueUsuario(inv.alias, iconos.invitado, colorRoles.invitado, 'invitado', 40);
        famDiv.appendChild(invDiv);
      });
      bloqueAdmin.appendChild(famDiv);
    });

    // Invitados directos del admin
    const invitadosDirectos = users.filter(i => i.parent === admin.email && i.role === 'invitado');
    invitadosDirectos.forEach(inv => {
      const invDiv = crearBloqueUsuario(inv.alias, iconos.invitado, colorRoles.invitado, 'invitado directo', 20);
      bloqueAdmin.appendChild(invDiv);
    });

    contenedor.appendChild(bloqueAdmin);
  });

  // Socios y sus relaciones
  const socios = users.filter(u => u.role === 'socio');
  socios.forEach(socio => {
    const bloqueSocio = crearBloqueUsuario(socio.alias, iconos.socio, colorRoles.socio, 'socio');

    const familiares = users.filter(f => f.parent === socio.email && f.role === 'familiar');
    familiares.forEach(fam => {
      const famDiv = crearBloqueUsuario(fam.alias, iconos.familiar, colorRoles.familiar, 'familiar', 20);
      const invitadosFamiliar = users.filter(i => i.parent === fam.email && i.role === 'invitado');
      invitadosFamiliar.forEach(inv => {
        const invDiv = crearBloqueUsuario(inv.alias, iconos.invitado, colorRoles.invitado, 'invitado', 40);
        famDiv.appendChild(invDiv);
      });
      bloqueSocio.appendChild(famDiv);
    });

    const invitadosDirectos = users.filter(i => i.parent === socio.email && i.role === 'invitado');
    invitadosDirectos.forEach(inv => {
      const invDiv = crearBloqueUsuario(inv.alias, iconos.invitado, colorRoles.invitado, 'invitado directo', 20);
      bloqueSocio.appendChild(invDiv);
    });

    contenedor.appendChild(bloqueSocio);
  });


	// Restaurante y camareros como hijos
	const restaurante = users.find(u => u.role === 'restaurante');
	if (restaurante) {
	  const padre = users.find(u => u.email === restaurante.parent);
	  const registradoPor = padre ? padre.alias : restaurante.parent || '';
	  const bloqueRestaurante = crearBloqueUsuario(restaurante.alias, iconos.restaurante, colorRoles.restaurante, 'restaurante', 0, registradoPor);

	  // Camareros dependientes del restaurante
	  const camareros = users.filter(u => u.role === 'camarero');
	  camareros.forEach(camarero => {
	  const padre = users.find(u => u.email === camarero.parent || u.alias === camarero.parent);
	  const registradoPor = padre ? padre.alias : camarero.parent;
	  const camareroDiv = crearBloqueUsuario(camarero.alias, iconos.camarero, colorRoles.camarero, 'camarero', 20, registradoPor);

		bloqueRestaurante.appendChild(camareroDiv);
	  });

	  contenedor.appendChild(bloqueRestaurante);
	}

	// Porteros al final
	const porteros = users.filter(u => u.role === 'portero');
	porteros.forEach(portero => {
	  const padre = users.find(u => u.email === portero.parent);
	  const registradoPor = padre ? padre.alias : portero.parent || '';
	  const bloque = crearBloqueUsuario(portero.alias, iconos.portero, colorRoles.portero, 'portero', 0, registradoPor);
	  contenedor.appendChild(bloque);
	});

}

async function hayEventosNuevos() {
  try {
    const res = await fetch(`${SERVER_URL}/eventos`);
    const eventos = await res.json();
    if (!currentUser.eventosVistos) currentUser.eventosVistos = [];
    return eventos.some(evento => !currentUser.eventosVistos.includes(evento._id));
  } catch (err) {
    console.error("Error verificando eventos nuevos:", err);
    return false;
  }
}

function generarMenu() {
  const menuGrid = document.querySelector('#menu-container .menu-grid');
  let html = '';
  
  if (currentUser.role === 'socio') {
    html += '<button onclick="mostrarOpcion(\'entry-qr-page\')">Entrada</button>';
    html += '<button id="wallet-btn" onclick="mostrarOpcion(\'wallet-menu\')">Wallet</button>';
    html += '<button onclick="mostrarOpcion(\'admin-menu\')">Gestión</button>';
	html += '<button onclick="mostrarOpcion(\'carta-page\'); cargarCartaRestaurante();">Carta</button>';
    html += '<button id="eventos-btn" onclick="mostrarOpcion(\'ver-eventos-page\'); cargarEventos();">Eventos</button>';
    html += '<button id="tiempo-btn" onclick="mostrarOpcion(\'tiempo-page\'); cargarTiempo();">El Tiempo</button>';

    html += '<button onclick="mostrarOpcion(\'chat-page\')">Chat</button>';
  } else if (currentUser.role === 'admin') {
    html += '<button onclick="mostrarOpcion(\'entry-qr-page\')">Entrada</button>';
    html += '<button id="wallet-btn" onclick="mostrarOpcion(\'wallet-menu\')">Wallet</button>';
    html += '<button onclick="mostrarOpcion(\'admin-menu\')">Gestión</button>';
	html += '<button onclick="mostrarOpcion(\'carta-page\'); cargarCartaRestaurante();">Carta</button>';
    html += '<button id="eventos-btn" onclick="mostrarOpcion(\'eventos-page\'); cargarEventos();">Eventos</button>';
    html += '<button id="tiempo-btn" onclick="mostrarOpcion(\'tiempo-page\'); cargarTiempo();">El Tiempo</button>';

    html += '<button onclick="mostrarOpcion(\'chat-page\')">Chat</button>';
  } else if (currentUser.role === 'familiar') {
    html += '<button onclick="mostrarOpcion(\'entry-qr-page\')">Entrada</button>';
    html += '<button id="wallet-btn" onclick="mostrarOpcion(\'wallet-menu\')">Wallet</button>';
    html += '<button onclick="mostrarOpcion(\'admin-menu\')">Gestión</button>';
	html += '<button onclick="mostrarOpcion(\'carta-page\'); cargarCartaRestaurante();">Carta</button>';
    html += '<button id="eventos-btn" onclick="mostrarOpcion(\'ver-eventos-page\'); cargarEventos();">Eventos</button>';
    html += '<button id="tiempo-btn" onclick="mostrarOpcion(\'tiempo-page\'); cargarTiempo();">El Tiempo</button>';

    html += '<button onclick="mostrarOpcion(\'chat-page\')">Chat</button>';
  } else if (currentUser.role === 'portero') {
    html += '<button onclick="mostrarOpcion(\'dashboard-portero\')">Dashboard</button>';
    html += '<button onclick="mostrarOpcion(\'scanner-page\')">Escanear</button>';
  } else if (currentUser.role === 'restaurante') {
    html += '<button onclick="mostrarOpcion(\'dashboard\')">Dashboard</button>';
    html += '<button onclick="mostrarOpcion(\'scanner-page\')">Escanear</button>';
    html += '<button onclick="mostrarOpcion(\'recarga-page\'); cargarSociosParaRecarga();">Recargar Socios</button>';
    html += '<button onclick="mostrarOpcion(\'wallet-restaurante\')">Monedero</button>';
	html += '<button onclick="mostrarOpcion(\'carta-page\'); cargarCartaRestaurante();">Carta</button>';
	html += '<button onclick="mostrarOpcion(\'submenu-restaurante\'); generarSubmenuRestaurante();">Gestión</button>';
  } else if (currentUser.role === 'camarero') {
    html += '<button onclick="mostrarOpcion(\'scanner-page\')">Escanear</button>';
	html += '<button onclick="mostrarOpcion(\'carta-page\'); cargarCartaRestaurante();">Carta</button>';
  }
  html += '<button onclick="cerrarSesion()">Cerrar Sesión</button>';
  menuGrid.innerHTML = html;

  // Verificar eventos nuevos y añadir el emoji 🔴 arriba del botón
  hayEventosNuevos().then(tieneNuevos => {
    const eventosBtn = document.getElementById('eventos-btn');
    if (eventosBtn) {
      eventosBtn.innerHTML = `Eventos${tieneNuevos ? '<span class="event-badge">🔴</span>' : ''}`;
    }
  });

  // Verificar recargas nuevas y añadir el emoji 🔵 al botón "Wallet"
  hayRecargasNuevas().then(tieneRecargasNuevas => {
    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) {
      walletBtn.innerHTML = `Wallet${tieneRecargasNuevas ? '<span class="recarga-badge">🔵</span>' : ''}`;
    }
  });
  
  actualizarIconoTiempoSVG();

}


async function mostrarOpcion(id) {
  const menu = document.getElementById('menu-container');
  if (menu) menu.classList.remove('active');

  const current = document.querySelector('#content .container.active');
  if (current && current.id !== id) {
    if (!['add-familiar-page', 'add-invited-page'].includes(current.id) &&
        navigationStack[navigationStack.length - 1] !== current.id) {
      navigationStack.push(current.id);
    }
    if (current.id === 'scanner-page') detenerScanner();
    if (current.id === 'payments-page') detenerPollingPago();
  }

  mostrarContenedor(id);
  agregarBotonAtras(id);
  detenerPollingChat();

  switch (id) {
    case 'chat-page':
      prepararChat();
      break;
    case 'view-familiares-page':
      cargarFamiliaresAgregados();
      break;
    case 'view-invited-page':
      cargarInvitadosAgregados();
      break;
    case 'admin-menu':
      generarSubmenuAdministracion();
      break;
    case 'carta-page':
      cargarCartaRestaurante();
      break;
    case 'dashboard':
      await prepararDashboardRestaurante();
      break;
	case 'gestionar-camareros-page':
	  await prepararVistaGestionCamareros();
	  break;


    case 'dashboard-portero':
      await prepararDashboardPortero();
      break;
    case 'entry-qr-page':
      mostrarQRdeEntrada();
      break;
    case 'payments-page':
      prepararVistaPagos();
      break;
    case 'scanner-page':
      verificarPermisoEscaner();
      break;
    case 'wallet-page':
      cargarWallet();
      break;
    case 'wallet-menu':
      generarSubmenuWallet();
      break;
    case 'admin-page':
      cargarAdminUsuarios();
      break;
    case 'view-socios-page':
      cargarSociosAgregados();
      break;
    case 'wallet-restaurante':
      prepararVistaRestaurante();
      break;
    case 'recarga-page':
      cargarSociosParaRecarga();
      break;
	case 'camarero-page':  //supongo q podremos crear una funcion con esto y llamarla desde aqui como el resto de case
      if (currentUser.role !== 'camarero') {
        
		mostrarMensaje("error", "Acceso no permitido.");
        mostrarContenedor('menu-container');
      }
      break;
	  
  }
}

function prepararChat() {
  console.log('📥 Entrando al chat, cargando mensajes iniciales');
  cargarMensajesChat();
  iniciarPollingChat();
}

async function prepararDashboardRestaurante() {
  if (currentUser.role !== 'restaurante') {
    
    mostrarMensaje("error", "Acceso no permitido.");
    mostrarContenedor('menu-container');
    return;
  }

  console.log("Entrando en dashboard para:", currentUser.email);
  await cargarUsuariosDesdeServidor();
  await cargarTransaccionesDesdeServidor();

  const ventas = transactions.filter(t => t.type === 'venta' && t.userEmail === currentUser.email);
  const recargas = transactions.filter(t => t.type === 'ingreso' && t.from === currentUser.email);
  const totalVentas = ventas.reduce((sum, t) => sum + t.amount, 0);
  const totalRecargas = recargas.reduce((sum, t) => sum + t.amount, 0);

  const socios = users.filter(u => u.role === 'socio' || u.role === 'admin');
  const resumenSocios = socios.map(socio => {
    const compras = transactions.filter(t => t.type === 'pago' && t.userEmail === socio.email);
    const recargasRecibidas = transactions.filter(t => t.type === 'ingreso' && t.userEmail === socio.email);
    const totalCompras = compras.reduce((sum, t) => sum + t.amount, 0);
    const totalRecargas = recargasRecibidas.reduce((sum, t) => sum + t.amount, 0);
    return { alias: socio.alias, compras: totalCompras, recargas: totalRecargas };
  });

  const familiares = users.filter(u => u.role === 'familiar');
  const resumenFamiliares = familiares.map(fam => {
    const compras = transactions.filter(t => t.type === 'pago' && t.userEmail === fam.email);
    const totalCompras = compras.reduce((sum, t) => sum + t.amount, 0);
    return { alias: fam.alias, compras: totalCompras };
  });

  document.getElementById('total-recargas').textContent = formatearEuros(totalRecargas);
  document.getElementById('total-ventas').textContent = formatearEuros(totalVentas);
  document.getElementById('resumen-socios').innerHTML = resumenSocios.map(s => `
    <li class="resumen-item">
      <div class="alias">${s.alias}</div>
      <div class="detalle">Recargas: ${formatearEuros(s.recargas)}</div>
      <div class="detalle">Compras: ${formatearEuros(s.compras)}</div>
    </li>`).join('');
  document.getElementById('resumen-familiares').innerHTML = resumenFamiliares.map(f => `
    <li class="resumen-item">
      <div class="alias">${f.alias}</div>
      <div class="detalle">Compras: ${formatearEuros(f.compras)}</div>
    </li>`).join('');
}



async function prepararVistaGestionCamareros() {
  if (currentUser.role !== 'restaurante') {
    mostrarMensaje("error", "Acceso no permitido.");
    mostrarContenedor('menu-container');
    return;
  }

  await cargarUsuariosDesdeServidor();
  await cargarCamarerosAgregados();
}


async function prepararDashboardPortero() {
  if (currentUser.role !== 'portero') {
    
	mostrarMensaje("error", "Acceso no permitido.");
    mostrarContenedor('menu-container');
    return;
  }

  console.log('📋 Cargando dashboard del portero');
  const res = await fetch(`${SERVER_URL}/entradas`);
  const entradas = await res.json();
  const propias = entradas.filter(e => e.email);
  await cargarUsuariosDesdeServidor();

  const lista = document.getElementById('lista-entradas-portero');
  lista.innerHTML = propias.map(e => {
    const rol = e.role || 'Desconocido';
    const iconos = {
      'invitado': '🎟️',
      'socio': '👤',
      'familiar': '👪',
      'admin': '👑'
    };
    const icono = iconos[rol] || '❓';
    return `<li>${e.nombre || e.email} - ${e.hora} <br><small>${icono} Rol: ${rol}</small></li>`;
  }).join('');
}

function mostrarQRdeEntrada() {
  console.log('🔍 Mostrando entry-qr-page');
  if (['invitado', 'socio', 'familiar', 'admin'].includes(currentUser.role)) {
    showEntryQR();
  } else {
    
	mostrarMensaje("error", "No tienes acceso al QR.");
    mostrarContenedor('menu-container');
  }
}

function prepararVistaPagos() {
  document.getElementById('payment-amount').value = '';
  document.getElementById('payment-qr').innerHTML = '';
  if (pendingTransactionId) iniciarPollingPago();
}

function verificarPermisoEscaner() {
  console.log('Rol detectado:', currentUser.role);
  if (['portero', 'restaurante', 'camarero'].includes(currentUser.role)) {
    iniciarScanner();
  } else {
    
	mostrarMensaje("error", "Acceso no permitido para escanear.");
    mostrarContenedor('menu-container');
  }
}

function prepararVistaRestaurante() {
  cargarRecargasRestaurante();
  cargarVentasRestaurante();
  document.getElementById('extracto-recargas').style.display = 'block';
  document.getElementById('extracto-ventas').style.display = 'none';
}





function generarSubmenuWallet() {
  const walletMenu = document.getElementById('wallet-menu');
  if (!walletMenu) return;

  // Limpiamos botones anteriores (excepto el título h2)
  const botones = walletMenu.querySelectorAll('button');
  botones.forEach(b => b.remove());

  const crearBoton = (texto, accion) => {
    const btn = document.createElement('button');
    btn.textContent = texto;
    btn.onclick = accion;
    walletMenu.appendChild(btn);
  };
  
  crearBoton('Pago', () => mostrarOpcion('payments-page'));
  crearBoton('Monedero', () => mostrarOpcion('wallet-page'));


  if (currentUser.role === 'socio' || currentUser.role === 'admin') {
    crearBoton('Recargar Familiar', () => {
      mostrarOpcion('recarga-familiar-page');
      cargarFamiliaresParaRecarga();
    });
  }

  agregarBotonAtras('wallet-menu'); // ✅ AÑADIDO para mostrar botón "Atrás"
}



function cargarFamiliaresParaRecarga() {
  const select = document.getElementById('select-familiar');
  select.innerHTML = '<option value="">Seleccione un familiar</option>';
  const familiares = users.filter(u => u.role === 'familiar' && u.parent === currentUser.email);
  familiares.forEach(fam => {
    const option = document.createElement('option');
    option.value = fam.email;
    option.textContent = `${fam.alias} (${fam.email})`;
    select.appendChild(option);
  });
}


function generarSubmenuAdministracion() {
  const container = document.getElementById('admin-buttons');
  container.innerHTML = '';

  // Botón "Familiares"
  if (['admin', 'socio'].includes(currentUser.role)) {
    container.innerHTML += '<button onclick="mostrarOpcion(\'view-familiares-page\'); cargarFamiliaresAgregados();">Familiares</button>';
  }

  // Botón "Invitados"
  if (['admin', 'socio', 'familiar'].includes(currentUser.role)) {
    container.innerHTML += '<button onclick="mostrarOpcion(\'view-invited-page\'); cargarInvitadosAgregados();">Invitados</button>';
  }

  // Para admin, mantener opción de añadir socios y ver esquema
  if (currentUser.role === 'admin') {
    container.innerHTML += '<button onclick="mostrarOpcion(\'add-user-page\')">Añadir Socio</button>';
	container.innerHTML += '<button onclick="mostrarOpcion(\'view-socios-page\'); cargarSociosAgregados();">Ver Socios</button>'; 
    container.innerHTML += '<button onclick="mostrarOpcion(\'relaciones-page\'); generarEsquemaRelaciones();">Ver Esquema</button>';
	container.innerHTML += '<button onclick="mostrarOpcion(\'admin-page\')">Todos los Usuarios</button>'; // ✅ NUEVO BOTÓN
  }
}



function mostrarSeccionWallet(seccionId) {
  document.getElementById('extracto-recargas').style.display = 'none';
  document.getElementById('extracto-ventas').style.display = 'none';

  document.getElementById(seccionId).style.display = 'block';

  if (seccionId === 'extracto-recargas') {
    cargarRecargasRestaurante();
  } else if (seccionId === 'extracto-ventas') {
    cargarVentasRestaurante();
  }
}


async function cargarVentasRestaurante() {
  await cargarTransaccionesDesdeServidor();
  const div = document.getElementById('lista-ventas');
  div.innerHTML = '';
  const ventas = transactions.filter(t => t.type === 'venta' && t.userEmail === currentUser.email);

  if (ventas.length === 0) {
    div.innerHTML = '<p>No hay ventas registradas.</p>';
  } else {
    // Ordenar de más reciente a más antigua
    ventas.sort((a, b) => new Date(b.date) - new Date(a.date));
    let html = '<ul>';
    ventas.forEach(t => {
      const nombreCliente = users.find(u => u.email === t.from)?.alias || t.alias || t.from || 'Cliente desconocido';
	  html += `<li>${formatearFecha(t.date)} - ${nombreCliente} pagó ${formatearEuros(t.amount)}</li>`;

    });
    html += '</ul>';
    div.innerHTML = html;
  }
}




function generarSubmenuRestaurante() {
  const container = document.getElementById('restaurante-buttons');
  container.innerHTML = '';

  // Botón "Camareros"
  container.innerHTML += '<button onclick="mostrarOpcion(\'gestionar-camareros-page\'); prepararVistaGestionCamareros();">Camareros</button>';

  // Puedes añadir más botones en el futuro aquí
  agregarBotonAtras('wallet-menu');  // Para mostrar el botón Atrás
}




async function cargarRecargasRestaurante() {
  await cargarTransaccionesDesdeServidor(); // Recargar transacciones desde el servidor
  const div = document.getElementById('lista-recargas');
  div.innerHTML = '';

  // Filtrar recargas realizadas por el restaurante (donde el restaurante es el origen)
  const recargas = transactions.filter(t =>
    t.type === 'ingreso' && t.from === currentUser.email // Recargas enviadas por el restaurante
  );

  if (recargas.length === 0) {
    div.innerHTML = '<p>No hay recargas registradas.</p>';
  } else {
    // Ordenar de más reciente a más antigua
    recargas.sort((a, b) => new Date(b.date) - new Date(a.date));
    let html = '<ul>';
    recargas.forEach(t => {
      const usuario = users.find(u => u.email === t.userEmail);
      html += `<li>${formatearFecha(t.date)} - Recarga a ${usuario?.alias || t.userEmail}: ${formatearEuros(t.amount)}</li>`;
    });
    html += '</ul>';
    div.innerHTML = html;
  }
}




function agregarBotonAtras(id) {
  // No añadir botón "Atrás" en el menú principal
  if (id === 'menu-container') return;

  const container = document.getElementById(id);
  const existingBtn = container.querySelector('.back-button');
  if (existingBtn) {
    existingBtn.remove();
  }

  const btn = document.createElement('button');
  btn.classList.add('back-button');
  btn.style.marginBottom = '10px';

  if (currentUser?.role === 'invitado' && id === 'entry-qr-page') {
    btn.textContent = 'Cerrar sesión';
    btn.onclick = cerrarSesion;
  } else {
    btn.textContent = 'Atrás';
	btn.onclick = function () {
	  if (id === 'scanner-page') detenerScanner(); // ✅ Detenemos escáner si venimos de scanner

	  container.classList.remove('active');
	  const anterior = navigationStack.pop();
	  if (anterior) {
		console.log('Regresando a:', anterior, 'Pila restante:', navigationStack);
		mostrarOpcion(anterior);
	  } else {
		console.log('Pila vacía, yendo a menu-container');
		mostrarOpcion('menu-container');
	  }
	};
  }

	const wrapper = document.createElement('div');
	wrapper.className = 'atras-wrapper';
	wrapper.appendChild(btn);
	container.insertBefore(wrapper, container.firstChild);


}

function cerrarSesion() {
  detenerPollingChat();
  detenerScanner(); // Añadido para detener la cámara
  currentUser = null;
  navigationStack = [];

  document.querySelectorAll('#content .container.active')
    .forEach(el => el.classList.remove('active'));

  const qrContainer = document.getElementById('entry-qr-code');
  if (qrContainer) qrContainer.innerHTML = '';

  const roleDisplay = document.getElementById('user-role-display');
  if (roleDisplay) roleDisplay.innerHTML = '';

  document.getElementById('main-app').style.display = 'none';

  const registerContainer = document.getElementById('register-container');
  if (registerContainer) {
    registerContainer.classList.remove('active');
    registerContainer.style.display = 'none';
  }

  const loginContainer = document.getElementById('login-container');
  if (loginContainer) {
    loginContainer.style.display = 'block';
    loginContainer.classList.add('active');
  }
}



document.getElementById('recarga-familiar-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const familiarEmail = document.getElementById('select-familiar').value;
  const amount = parseFloat(document.getElementById('familiar-recarga-amount').value);

  if (!familiarEmail || !amount || amount <= 0) {
    
	mostrarMensaje("error", "Datos inválidos.");
    return;
  }

  const familiarIndex = users.findIndex(u => u.email === familiarEmail && u.role === 'familiar');
  const remitenteIndex = users.findIndex(u => u.email === currentUser.email);

  if (familiarIndex < 0 || remitenteIndex < 0) {
    
	mostrarMensaje("error", "Usuario no encontrado.");
    return;
  }

  if (users[remitenteIndex].balance < amount) {
    
	mostrarMensaje("error", "Saldo insuficiente.");
    return;
  }

  // Actualizar saldos
  users[remitenteIndex].balance -= amount;
  users[familiarIndex].balance += amount;

  const fecha = new Date().toISOString();

  // Crear transacciones
  const transaccionSalida = {
    
    userEmail: currentUser.email,
    amount: amount,
    date: fecha,
    type: "transferencia",
    to: familiarEmail
  };

  const transaccionEntrada = {
   
    userEmail: familiarEmail,
    amount: amount,
    date: fecha,
    type: "recarga",
    from: currentUser.email
  };

  try {
    // Guardar transacciones y actualizar usuarios en el servidor
    await Promise.all([
      guardarTransaccionIndividual(transaccionSalida),
      guardarTransaccionIndividual(transaccionEntrada),
      actualizarUsuarioEnServidor(users[remitenteIndex]),
      actualizarUsuarioEnServidor(users[familiarIndex])
    ]);

    // Recargar datos desde el servidor
    await cargarTransaccionesDesdeServidor();
    await cargarUsuariosDesdeServidor();

    // Actualizar currentUser localmente
    currentUser = users[remitenteIndex];
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    
	mostrarMensaje("exito", "Transferencia realizada correctamente.");
    cargarWallet(); // Actualizar la vista del monedero
    this.reset();
  } catch (error) {
    console.error("Error en la transferencia:", error);

	mostrarMensaje("error", "Hubo un error al realizar la transferencia.");
  }
});




document.getElementById('to-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('register-container').classList.remove('active');
  document.getElementById('register-container').style.display = 'none';
  document.getElementById('login-container').style.display = 'block';
  document.getElementById('login-container').classList.add('active');
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const alias = document.getElementById('alias').value;
  const role = document.getElementById('role').value;
  const balance = 0;
  const nuevoUsuario = { email, password, alias, role, balance: 0, parent }; 
  await guardarUsuarioEnServidor(nuevoUsuario);
  users.push(nuevoUsuario); // (opcional si quieres mantenerlo en memoria)
  

  localStorage.setItem('users', JSON.stringify(users));
  
  mostrarMensaje("exito", "Registro exitoso. Ahora puedes iniciar sesión.");
  document.getElementById('register-form').reset();
  document.getElementById('register-container').classList.remove('active');
  document.getElementById('login-container').classList.add('active');
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const loginInput = document.getElementById('login-user').value;
  const password = document.getElementById('login-password').value;
  const user = users.find(u => (u.email === loginInput || u.alias === loginInput));

  if (user && user.password === password) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    aplicarEstilosPorRol(currentUser.role);
    document.getElementById('user-type').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

	if (currentUser.role === 'invitado') {
	  showEntryQR();
	  agregarBotonAtras('entry-qr-page');
	} else if (currentUser.role === 'portero') { //supongo q este else lo podemos quitar
	  generarMenu();
	  mostrarContenedor('menu-container'); 
	} else {
	  generarMenu();
	  mostrarContenedor('menu-container');
	}

  } else {
    
	mostrarMensaje("error", "Usuario o contraseña incorrectos.");
  }
});


async function showEntryQR() {
  console.log('📸 Generando QR de entrada para:', currentUser);
  
  if (!currentUser || (currentUser.role !== 'socio' && currentUser.role !== 'familiar' && currentUser.role !== 'admin' && currentUser.role !== 'invitado')) {
    console.warn('🚫 No tienes permiso para ver el QR de entrada');
    
	mostrarMensaje("error", "No tienes permiso para ver el QR de entrada.");
    mostrarContenedor('menu-container');
    return;
  }

  try {
    if (!currentUser.entryQR) {
      currentUser.entryQR = btoa(currentUser.email + '-' + Date.now());
      console.log('🆕 QR generado:', currentUser.entryQR);
      const index = users.findIndex(u => u.email === currentUser.email);
      if (index >= 0) {
        users[index].entryQR = currentUser.entryQR;
        await actualizarUsuarioEnServidor(users[index]); // Guardar en el servidor
        localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Actualizar localStorage
        console.log('💾 QR guardado en el servidor y localStorage');
      } else {
        console.warn('⚠️ Usuario no encontrado en users');
      }
    }

    const qrContainer = document.getElementById('entry-qr-code');
    if (!qrContainer) {
      console.error('❌ Elemento entry-qr-code no encontrado');
      
	  mostrarMensaje("error", "No se encontró el contenedor del QR.");
      return;
    }

    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: currentUser.entryQR,
      width: 180,
      height: 180
    });
    console.log('✅ QR renderizado en el DOM');

    const roleDisplay = document.getElementById('user-role-display');
    if (roleDisplay) {
      roleDisplay.innerHTML = 'Tipo: ' + currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    } else {
      console.warn('⚠️ Elemento user-role-display no encontrado');
    }

    mostrarContenedor('entry-qr-page');
  } catch (error) {
    console.error('❌ Error generando QR:', error);
    
	mostrarMensaje("error", "Error al generar el QR de entrada: " + error.message);
  }
}


function generarTicket() {
  const quantity = parseInt(document.getElementById('ticket-quantity').value);
  if (!quantity || quantity <= 0) {
    
	mostrarMensaje("error", "Ingrese una cantidad válida.");
    return;
  }
  const ticket = {
    
    userEmail: currentUser.email,
    quantity: quantity,
    used: false,
    createdAt: new Date().toISOString()
  };
  tickets.push(ticket);
  localStorage.setItem('tickets', JSON.stringify(tickets));
  document.getElementById('tickets-count').textContent = getUserTicketsCount();
  document.getElementById('ticket-qr').innerHTML = '';
  new QRCode(document.getElementById('ticket-qr'), {
    text: ticket._id.toString(),
    width: 180,
    height: 180
  });
}

function getUserTicketsCount() {
  return tickets.filter(t => t.userEmail === currentUser.email && !t.used).length;
}

function formatearEuros(cantidad) {
  return `${cantidad.toFixed(2)} €`;
}


function procesarEscaneo() {
  const code = document.getElementById('scan-input').value;
  if (!code) {
  
	mostrarMensaje("error", "Ingrese un código.");
    return;
  }
  const ticket = tickets.find(t => t.id.toString() === code && !t.used);
  const resultDiv = document.getElementById('scan-result');
  if (ticket) {
    ticket.used = true;
    // Se elimina: localStorage.setItem('tickets', JSON.stringify(tickets));
    resultDiv.innerHTML = 'Ticket válido para: ' + ticket.userEmail + '<br>Cantidad: ' + ticket.quantity;
    const transaction = {
      
      userEmail: ticket.userEmail,
      amount: ticket.quantity,
      date: new Date().toISOString(),
      type: "ticket"
    };
    transactions.push(transaction);
    // En lugar de guardar en localStorage, lo enviamos al servidor:
    guardarTransaccionIndividual(transaction)
      .then(() => cargarTransaccionesDesdeServidor())
      .catch(err => console.error(err));
  } else {
    resultDiv.innerHTML = 'Código inválido o ticket ya utilizado.';
  }
}


// Iniciar polling con logs para depuración
function iniciarPollingChat() {
  if (!chatInterval) {
    console.log('▶️ Iniciando polling para el chat');
    chatInterval = setInterval(async () => {
      const chatPage = document.getElementById('chat-page');
      if (chatPage && chatPage.classList.contains('active')) {
        console.log('🔄 Actualizando mensajes del chat...');
        await cargarMensajesChat();
      } else {
        console.log('⏸️ Chat no está activo, pausando actualización');
      }
    }, 5000); // Cada 5 segundos
  } else {
    console.log('ℹ️ Polling ya estaba activo');
  }
}

// Detener polling con log
function detenerPollingChat() {
  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
    console.log('⏹️ Polling detenido');
  }
}




// Asegurar que cargarMensajesChat no duplique mensajes
async function cargarMensajesChat() {
  await cargarMensajesDesdeServidor(); // Cargar mensajes desde el servidor
  const chatDiv = document.getElementById('chat-messages');

  if (!chatDiv) {
    console.error('❌ Elemento chat-messages no encontrado');
    return;
  }
  
  
    // Obtener mensajes actuales en el DOM
  const mensajesActuales = Array.from(chatDiv.getElementsByTagName('p')).map(p => {
    const [sender, ...rest] = p.textContent.split(': ');
    const messageWithDate = rest.join(': ');
    const message = messageWithDate.substring(0, messageWithDate.lastIndexOf(' ('));
    const date = messageWithDate.match(/\(([^)]+)\)/)?.[1];
    return { sender, message, date };
  });

  // Filtrar mensajes nuevos
  const nuevosMensajes = chatMessages.filter(msg => {
    return !mensajesActuales.some(
      m => m.sender === msg.sender && m.message === msg.message && m.date === formatearFecha(msg.date)
    );
  });

  // Mostrar todos los mensajes si el chat está vacío
  if (chatDiv.innerHTML === '' && chatMessages.length > 0) {
    chatDiv.innerHTML = chatMessages
      .map(msg => `<p><strong>${msg.sender}:</strong> ${msg.message} <small>(${formatearFecha(msg.date)})</small></p>`)
      .join('');
  } else if (nuevosMensajes.length > 0) {
    // Añadir solo los nuevos mensajes
    nuevosMensajes.forEach(msg => {
      chatDiv.innerHTML += `<p><strong>${msg.sender}:</strong> ${msg.message} <small>(${formatearFecha(msg.date)})</small></p>`;
    });
  }

  // Desplazar al final si hay nuevos mensajes
  if (nuevosMensajes.length > 0) {
    chatDiv.scrollTop = chatDiv.scrollHeight;
    console.log(`✅ ${nuevosMensajes.length} mensajes nuevos añadidos`);
  } else {
    console.log('ℹ️ No hay mensajes nuevos');
  }
}



async function enviarMensaje() {
  const messageText = document.getElementById('chat-input').value;
  if (!messageText) return;

  const mensaje = {
    sender: currentUser.alias,
    message: messageText,
    date: new Date().toISOString()
  };

  try {
    await guardarMensajeIndividual(mensaje); // Guardar en el servidor
    await cargarMensajesChat(); // Recargar mensajes desde el servidor
    document.getElementById('chat-input').value = ''; // Limpiar input
  } catch (err) {
    console.error('Error enviando mensaje:', err);
   
	mostrarMensaje("error", "No se pudo enviar el mensaje.");
  }
}


async function obtenerUsuarioDesdeServidor(email) {
  const res = await fetch(`${SERVER_URL}/usuarios/email/${email}`);
  if (!res.ok) throw new Error('No se pudo cargar el usuario desde el servidor');
  return await res.json();
}


async function cargarWallet() {
  await cargarTransaccionesDesdeServidor();
  await cargarUsuariosDesdeServidor();

  const userIndex = users.findIndex(u => u.email === currentUser.email);
  if (userIndex >= 0) {
    currentUser = users[userIndex];
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  } else {
    console.error('Usuario no encontrado en la lista:', currentUser.email);
    return;
  }

  // Actualizar saldo en el contenedor existente
  const saldoContainer = document.getElementById('wallet-balance-container');
  if (saldoContainer) {
    saldoContainer.textContent = formatearEuros(currentUser.balance);
  }

  // Actualizar el historial de transacciones
  const walletDiv = document.getElementById('wallet-transactions');
  walletDiv.innerHTML = '';

  // Filtrar transacciones válidas relacionadas con el usuario
  const userTransactions = transactions.filter(t => {
    const amountNum = parseFloat(t.amount);
    // Solo transacciones donde el usuario es el titular (userEmail)
    const esRelevante = t.userEmail === currentUser.email;
    const esValida = !isNaN(amountNum) && amountNum > 0 && ['pago', 'venta', 'ingreso', 'transferencia', 'recarga'].includes(t.type);
    if (!esRelevante || !esValida) {
      console.log('❌ Transacción filtrada:', t);
    }
    return esRelevante && esValida;
  });

  console.log('📜 Transacciones válidas para mostrar:', userTransactions);

  if (userTransactions.length === 0) {
    walletDiv.innerHTML = '<p>No hay transacciones.</p>';
  } else {
    userTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    let html = '';
    userTransactions.forEach(t => {
      const cantidad = parseFloat(t.amount);
      if (isNaN(cantidad) || cantidad <= 0) {
        console.warn('🛑 Transacción no válida en segunda verificación:', t);
        return;
      }

      let descripcion = '';
      let cambio = 0;
      let color = 'black';

      if (t.type === 'pago') {
        const receptor = users.find(u => u.email === t.to);
        descripcion = receptor?.role === 'restaurante' ? 'Pago al Restaurante' : `Pago a ${receptor?.alias || 'Usuario'}`;
        cambio = -cantidad;
        color = 'red';
      } else if (t.type === 'venta') {
        const cliente = users.find(u => u.email === t.from);
        descripcion = `Venta a ${cliente?.alias || t.from}`;
        cambio = +cantidad;
        color = 'green';
      } else if (t.type === 'ingreso') {
        descripcion = 'Ingreso recibido';
        cambio = +cantidad;
        color = 'green';
      } else if (t.type === 'transferencia') {
        const receptor = users.find(u => u.email === t.to);
        descripcion = `Transferencia a ${receptor?.alias || t.to}`;
        cambio = -cantidad;
        color = 'orange';
      } else if (t.type === 'recarga') {
        const remitente = users.find(u => u.email === t.from);
        descripcion = `Recarga de ${remitente?.alias || t.from}`;
        cambio = +cantidad;
        color = 'green';
      }

      html += `
        <div class="transaccion-item" style="
          border: 1px solid #ccc;
          border-left: 5px solid ${color};
          padding: 10px;
          margin-bottom: 10px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        ">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>${descripcion}</span>
            <span style="color: ${color};">${cambio >= 0 ? '+' : ''}${formatearEuros(cambio)}</span>
          </div>
          <div style="font-size: 0.9em; color: #555;">${formatearFecha(t.date)}</div>
        </div>
      `;
    });
    walletDiv.innerHTML = html;
  }

  // Marcar recargas como vistas
// Marcar recargas como vistas
const nuevasRecargas = transactions.filter(t =>
  (t.type === 'recarga' || t.type === 'ingreso') &&
  t.userEmail === currentUser.email &&
  !currentUser.recargasVistas?.includes(t._id)
);

if (nuevasRecargas.length > 0) {
  const nuevosVistos = [...new Set([
    ...(currentUser.recargasVistas || []),
    ...nuevasRecargas.map(r => r._id)
  ])];

  currentUser.recargasVistas = nuevosVistos;

  const i = users.findIndex(u => u.email === currentUser.email);
  if (i >= 0) users[i].recargasVistas = nuevosVistos;

  await actualizarUsuarioEnServidor(currentUser);
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  generarMenu(); // 🔵 fuera
}


  console.log('✅ Saldo actualizado en UI:', currentUser.balance);
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  const hora = fecha.getHours().toString().padStart(2, '0');
  const minutos = fecha.getMinutes().toString().padStart(2, '0');
  return `${dia}/${mes}/${año} ${hora}:${minutos}`;
}


async function cargarAdminUsuarios() {
  const adminDiv = document.getElementById('admin-users');
  adminDiv.innerHTML = '<p>Cargando usuarios...</p>';
  await cargarUsuariosDesdeServidor();

  const getRegistrador = (u) => {
    if (!u.parent) return 'Auto-registrado';
    const registrador = users.find(x => x.email === u.parent || x._id === u.parent);
    return registrador?.alias || u.parent;
  };

  const getColorRol = (role) => {
    const colores = {
      admin: '#ffc107',
      socio: '#007bff',
      familiar: '#28a745',
      invitado: '#6c757d',
      restaurante: '#fd7e14',
      portero: '#dc3545',
      camarero: '#fd7e14' 
    };
    return colores[role] || '#000';
  };

	const filaUsuario = (u) => {
	  return `<tr style="color:${getColorRol(u.role)}">
		<td style="padding: 4px 10px;">${u.role}</td>
		<td style="padding: 4px 10px;">${u.alias}</td>
		<td style="padding: 4px 10px;">${getRegistrador(u)}</td>
		<td style="padding: 4px 10px;">
		  <button style="padding: 4px 8px; font-size: 12px;" onclick="eliminarUsuario('${u._id}')">Eliminar</button>
		</td>
	  </tr>`;
	};

  let table = '<table><tr><th>Rol</th><th>Alias</th><th>Registrado por</th><th>Acciones</th></tr>';

  const admin = users.find(u => u.role === 'admin');
  const socios = users.filter(u => u.role === 'socio').sort((a, b) => a.alias.localeCompare(b.alias));
  const familiares = users.filter(u => u.role === 'familiar');
  const invitados = users.filter(u => u.role === 'invitado');
  const restaurante = users.find(u => u.role === 'restaurante');
  const portero = users.find(u => u.role === 'portero');
  const camareros = users.filter(u => u.role === 'camarero'); // Añadir camareros

  // Admin
  if (admin) table += filaUsuario(admin);
  // Socios
  if (socios.length > 0) socios.forEach(socio => table += filaUsuario(socio));
  // Familiares del Admin
  if (admin && familiares.some(f => f.parent === admin.email)) {
    familiares.filter(f => f.parent === admin.email)
      .sort((a, b) => a.alias.localeCompare(b.alias))
      .forEach(fam => table += filaUsuario(fam));
  }
  // Familiares de Socios
  if (socios.some(s => familiares.some(f => f.parent === s.email))) {
    socios.forEach(socio => {
      familiares.filter(f => f.parent === socio.email)
        .sort((a, b) => a.alias.localeCompare(b.alias))
        .forEach(fam => table += filaUsuario(fam));
    });
  }
  // Invitados del Admin
  if (admin && invitados.some(i => i.parent === admin.email)) {
    invitados.filter(i => i.parent === admin.email)
      .sort((a, b) => a.alias.localeCompare(b.alias))
      .forEach(inv => table += filaUsuario(inv));
  }
  // Invitados de familiares del Admin
  if (admin && familiares.some(f => f.parent === admin.email && invitados.some(i => i.parent === f.email))) {
    familiares.filter(f => f.parent === admin.email).forEach(fam => {
      invitados.filter(i => i.parent === fam.email)
        .sort((a, b) => a.alias.localeCompare(b.alias))
        .forEach(inv => table += filaUsuario(inv));
    });
  }
  // Invitados de Socios
  if (socios.some(s => invitados.some(i => i.parent === s.email))) {
    socios.forEach(socio => {
      invitados.filter(i => i.parent === socio.email)
        .sort((a, b) => a.alias.localeCompare(b.alias))
        .forEach(inv => table += filaUsuario(inv));
    });
  }
  // Invitados de familiares de Socios
  if (socios.some(s => familiares.some(f => f.parent === s.email && invitados.some(i => i.parent === f.email)))) {
    socios.forEach(socio => {
      familiares.filter(f => f.parent === socio.email).forEach(fam => {
        invitados.filter(i => i.parent === fam.email)
          .sort((a, b) => a.alias.localeCompare(b.alias))
          .forEach(inv => table += filaUsuario(inv));
      });
    });
  }
  // Restaurante
  if (restaurante) table += filaUsuario(restaurante);
    // Camareros
  if (camareros.length > 0) {
    camareros.sort((a, b) => a.alias.localeCompare(b.alias)) // Ordenar alfabéticamente
      .forEach(camarero => table += filaUsuario(camarero));
  }
  // Portero
  if (portero) table += filaUsuario(portero);


  table += '</table>';
  adminDiv.innerHTML = table;
}


async function eliminarUsuario(id) {
	const usuario = users.find(u => u._id === id);
	const texto = usuario ? `al usuario ${usuario.alias || usuario.email}` : 'este usuario';
	if (!confirm(`¿Estás seguro de eliminar ${texto}?`)) return;


  try {
    const res = await fetch(`${SERVER_URL}/usuarios/id/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error(`Error al eliminar: ${res.statusText}`);

   
	mostrarMensaje("exito", "Usuario eliminado correctamente.");
    await cargarUsuariosDesdeServidor();

    // 🔄 Detectar vista actual y recargar la correspondiente
    const vistaActiva = document.querySelector('#content .container.active')?.id;

		switch (vistaActiva) {
		  case 'view-familiares-page':
			await cargarFamiliaresAgregados();
			break;
		  case 'view-invited-page':
			await cargarInvitadosAgregados();
			break;
		  case 'admin-page':
			await cargarAdminUsuarios();
			break;
		  case 'gestionar-camareros-page':
			await cargarCamarerosAgregados();
			break;
		  default:
			console.warn('Vista no controlada tras eliminar usuario:', vistaActiva);
    break;
}


  } catch (err) {
    console.error('❌ Error al eliminar usuario:', err);
    
	mostrarMensaje("error", "No se pudo eliminar el usuario. Verifica si existe en el servidor.");
  }
}




function inyectarDinero() {
  const alias = document.getElementById('admin-user-alias').value;
  const amount = parseFloat(document.getElementById('admin-amount').value);
  if (!alias || !amount || amount <= 0) {
    
	mostrarMensaje("error", "Ingrese un alias y cantidad válidos.");
    return;
  }
  const userIndex = users.findIndex(u => u.alias === alias);
  if (userIndex >= 0) {
    users[userIndex].balance += amount;
    localStorage.setItem('users', JSON.stringify(users));
   
	mostrarMensaje("error", "Dinero inyectado correctamente.");
    cargarAdminUsuarios();
  } else {
    
	mostrarMensaje("error", "Usuario no encontrado.");
  }
}

async function cargarSociosAgregados() {
  await cargarUsuariosDesdeServidor();
  const container = document.getElementById('socios-list');
  let html = '';
  let socios;
  
  if (currentUser.role === 'admin') {
    socios = users.filter(u => u.role === 'socio');
  } else {
    socios = users.filter(u => u.role === 'socio' && u.parent === currentUser._id);
  }
  
  if (socios.length === 0) {
    html = '<p>No hay socios agregados.</p>';
  } else {
    html = '<table><tr><th>Alias</th><th>Email</th><tr>';
    socios.forEach(socio => {
      html += `<tr><td>${socio.alias}</td><td>${socio.email}</td><tr>`;
    });
    html += '</table>';
  }
  container.innerHTML = html;
}

async function cargarFamiliaresAgregados() {
  await cargarUsuariosDesdeServidor();
  const container = document.getElementById('familiares-list');
  let html = '';

  const familiares = users.filter(u => u.role === 'familiar' && u.parent === currentUser.email);
  
  html += '<button onclick="mostrarOpcion(\'add-familiar-page\')">Añadir Familiar</button>';

  if (familiares.length === 0) {
    html += '<p>No hay familiares agregados.</p>';
  } else {
    html += '<table><tr><th>Alias</th><th>Email</th><th>Acciones</th></tr>';
    familiares.forEach(fam => {
      html += `<tr>
        <td>${fam.alias}</td>
        <td>${fam.email}</td>
        <td><button onclick="eliminarUsuario('${fam._id}')">Eliminar</button></td>
      </tr>`;
    });
    html += '</table>';
  }

  container.innerHTML = html;
}


async function cargarInvitadosAgregados() {
  await cargarUsuariosDesdeServidor();
  const container = document.getElementById('invitados-list');
  let html = '';

  const invitados = users.filter(u => 
	  u.role === 'invitado' && 
	  (u.parent === currentUser.email || u.parent === currentUser._id)
	);

  
  html += '<button onclick="mostrarOpcion(\'add-invited-page\'); setParentForInvite(currentUser.email)">Añadir Invitado</button>';

  if (invitados.length === 0) {
    html += '<p>No hay invitados agregados directamente por ti.</p>';
  } else {
  html += '<table><tr><th>Alias</th><th>Email</th><th>Acciones</th></tr>';
  invitados.forEach(inv => {
    html += `<tr>
      <td>${inv.alias}</td>
      <td>${inv.email}</td>
      <td><button onclick="eliminarUsuario('${inv._id}')">Eliminar</button></td>
    </tr>`;
  });
  html += '</table>';

  }

  container.innerHTML = html;
}

// Evento para actualizar el monedero al entrar a su vista
document.getElementById('wallet-page')?.addEventListener('click', cargarWallet);

//document.getElementById('chat-page')?.addEventListener('click', cargarMensajesChat);
document.getElementById('admin-page')?.addEventListener('click', async () => {
  await cargarAdminUsuarios();
});

document.getElementById('payments-page')?.addEventListener('click', () => {
  // Opcional: resetear la vista de pagos
  document.getElementById('payment-qr').innerHTML = '';
  
 
});



// Evento para añadir usuarios (Admin)
document.getElementById('add-user-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('new-user-email').value;
  const alias = document.getElementById('new-user-alias').value;
  const password = document.getElementById('new-user-password').value;
  const role = document.getElementById('new-user-role').value;
  const parent = currentUser.email; // Asignar el email del administrador como parent

  if (users.find(u => u.email === email || u.alias === alias)) {
    
	mostrarMensaje("advertencia", "El usuario ya existe.");
    return;
  }
  
  const nuevoUsuario = {  email, password, alias, role, balance: 0, parent }; // Incluir parent en el objeto
  users.push(nuevoUsuario);
  await guardarUsuarioEnServidor(nuevoUsuario);

 
  mostrarMensaje("exito", "Usuario añadido correctamente.");
  this.reset();

  navigationStack = ['menu-container'];
  mostrarContenedor('admin-menu', false);
});



// Evento para que un socio añada familiares (máx. 4)
document.getElementById('add-familiar-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const familiares = users.filter(u => u.parent === currentUser.email && u.role === 'familiar');
  if (familiares.length >= 4) {

	mostrarMensaje("advertencia", "Se alcanzó el máximo de familiares.");
    return;
  }

  const email = document.getElementById('new-familiar-email').value;
  const alias = document.getElementById('new-familiar-alias').value;
  const password = document.getElementById('new-familiar-password').value;
  const parent = currentUser.email;
  const role = 'familiar';

  const nuevoUsuario = {  email, password, alias, role, balance: 0, parent };
  users.push(nuevoUsuario);
  await guardarUsuarioEnServidor(nuevoUsuario);

	
	mostrarMensaje("exito", "Familiar añadido correctamente.");
	this.reset();

	// Asegurar que navigationStack apunte a admin-menu *antes* de mostrar vista
	navigationStack = ['menu-container', 'admin-menu'];
	await cargarFamiliaresAgregados();
	mostrarContenedor('view-familiares-page', false); // No guardar en historial
	agregarBotonAtras('view-familiares-page');
});

document.getElementById('formulario-camarero-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!this.checkValidity()) {
    mostrarMensaje("error", "Completa todos los campos correctamente.");
    return;
  }

  await registrarCamarero();
});




document.getElementById('add-invited-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const invitados = users.filter(u => u.parent === currentUser.email && u.role === 'invitado');
  if (invitados.length >= 4 && currentUser.role !== 'familiar') {
    
	mostrarMensaje("advertencia", "Se alcanzó el máximo de invitados directos.");
    return;
  }

  const email = document.getElementById('new-invited-email').value;
  const alias = document.getElementById('new-invited-alias').value;
  const password = document.getElementById('new-invited-password').value;
  const role = 'invitado';
  const parent = localStorage.getItem('parentForInvite') || currentUser.email;

  const nuevoUsuario = {  email, password, alias, role, balance: 0, parent };
  users.push(nuevoUsuario);
  await guardarUsuarioEnServidor(nuevoUsuario);

  
  mostrarMensaje("exito", "Invitado añadido correctamente.");
  this.reset();
  localStorage.removeItem('parentForInvite');

  // Establecer la pila de navegación para que "Atrás" vaya a admin-menu
	navigationStack = ['menu-container', 'admin-menu'];
	await cargarInvitadosAgregados();
	mostrarContenedor('view-invited-page', false); // evitar que se añada de nuevo
	agregarBotonAtras('view-invited-page');
	generarSubmenuAdministracion()
});





let pendingTransactionId = null; // Variable global para rastrear la transacción pendiente
let pendingCustomId = null; // ✅ Ahora está definida globalmente

let paymentPollingInterval = null;

// Función para procesar el pago (mantiene la funcionalidad para otros roles)
async function procesarPago(e) {
  e.preventDefault();

  // Si ya hay una transacción pendiente, la eliminamos primero
  if (pendingTransactionId) {
    console.log('🗑️ Eliminando transacción anterior pendiente:', pendingTransactionId);
    await eliminarTransaccionPendiente(pendingTransactionId);
    pendingTransactionId = null;
  }

  const amountInput = document.getElementById('payment-amount');
  const amount = parseFloat(amountInput.value);
  const qrContainer = document.getElementById('payment-qr');

  if (!amount || amount <= 0) {
    mostrarMensaje("advertencia", "Ingrese una cantidad válida.");
    return;
  }

  if (currentUser.balance < amount) {
    mostrarMensaje("error", "Saldo insuficiente.");
    return;
  }

  const restaurante = users.find(u => u.role === 'restaurante');
  if (!restaurante) {
    mostrarMensaje("error", "No se encontró un restaurante configurado.");
    return;
  }

  // Generamos una customId que nos servirá para seguir la transacción en el polling
  const customId = `${currentUser.email}-${Date.now()}-${amount}`;

  const transaccionPendiente = {
    userEmail: currentUser.email,
    cantidad: amount,
    de: currentUser.email,
    fecha: new Date().toISOString(),
    estado: "pendiente",
    restauranteEmail: restaurante.email,
	customId
  };

  try {
    const res = await fetch(`${SERVER_URL}/transaccionesPendientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaccionPendiente)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('💥 Error del servidor:', errorText);
      throw new Error('Error al guardar transacción pendiente');
    }

    const saved = await res.json();
    console.log('✅ Transacción pendiente guardada:', saved);

   pendingCustomId = customId; // ✅ Usamos la variable correcta



    // Mostrar el QR con el objeto completo
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: JSON.stringify({ customId }), // Solo incluimos el customId para simplificar
      width: 180,
      height: 180
    });

    amountInput.value = '';
    mostrarMensaje("exito", "QR generado. Escanéalo en el restaurante.");
    iniciarPollingPago(); // Iniciamos con el customId
  } catch (error) {
    console.error('❌ Error:', error);
    mostrarMensaje("error", "Error al generar el QR de pago.");
  }
}

async function iniciarPollingPago() {
  if (!pendingCustomId) {
    console.log('ℹ️ No hay transacción pendiente con customId');
    return;
  }

  if (paymentPollingInterval) return;

  console.log('▶️ Iniciando polling por customId:', pendingCustomId);
  const qrContainer = document.getElementById('payment-qr');

  paymentPollingInterval = setInterval(async () => {
    const paymentsPage = document.getElementById('payments-page');
    if (!paymentsPage || !paymentsPage.classList.contains('active')) {
      detenerPollingPago();
      return;
    }

    try {
      await cargarTransaccionesDesdeServidor();

      const transaccionConfirmada = transactions.find(t =>
        t.customId === pendingCustomId &&
        t.type === 'pago' &&
        t.userEmail === currentUser.email
      );

      if (transaccionConfirmada) {
        const restaurante = users.find(u => u.email === transaccionConfirmada.to);
        qrContainer.innerHTML = `
          <div style="text-align: center; color: green; padding: 20px;">
            <h3>✅ Pago confirmado</h3>
            <p>Has pagado ${formatearEuros(transaccionConfirmada.amount)} a ${'Restaurante'}</p>
            <p>Fecha: ${formatearFecha(transaccionConfirmada.date)}</p>
          </div>
        `;    
		mostrarNotificacionEntrada("✅");
        detenerPollingPago();
		
        pendingTransactionId = null;
        pendingCustomId = null;
      } else {
        console.log(`⏳ Aún no se ha encontrado la transacción con customId ${pendingCustomId}`);
      }
    } catch (err) {
	  mostrarNotificacionEntrada("❌");
      console.error('❌ Error en polling por customId:', err);
    }
  }, 2000);
}


function detenerPollingPago() {
  if (paymentPollingInterval) {
    clearInterval(paymentPollingInterval);
    paymentPollingInterval = null;
    console.log('⏹️ Polling detenido');
  }
}

// Asegurarnos de que cargarTransaccionesDesdeServidor funcione
async function cargarTransaccionesDesdeServidor() {
  try {
    const res = await fetch(`${SERVER_URL}/transacciones`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    transactions = await res.json();
  } catch (err) {
    console.error('Error cargando transacciones:', err);
    transactions = [];
  }
}

// Nueva función para cargar transacciones pendientes
async function cargarTransaccionesPendientesDesdeServidor() {
  try {
    const res = await fetch(`${SERVER_URL}/transaccionesPendientes`);
    transaccionesPendientes = await res.json();
  } catch (err) {
    console.error('Error cargando transacciones pendientes:', err);
    transaccionesPendientes = [];
  }
}

// Nueva función para actualizar transacciones pendientes en el servidor
async function actualizarTransaccionesPendientesEnServidor(transaccionesPendientes) {
  try {
    await fetch(`${SERVER_URL}/transaccionesPendientes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaccionesPendientes)
    });
  } catch (err) {
    console.error('Error actualizando transacciones pendientes:', err);
  }
}







// Función para cargar socios en el select de recarga (para rol restaurante)
function cargarSociosParaRecarga() {
  const select = document.getElementById('recarga-socio-select');
  select.innerHTML = '<option value="">Seleccione un socio</option>';
  // Se muestran todos los socios
  const socios = users.filter(u =>(u.role === 'socio' || u.role === 'admin') && u.email !== currentUser.email);
  socios.forEach(socio => {
    const option = document.createElement('option');
    option.value = socio.email;
    option.textContent = socio.alias + ' (' + socio.email + ')';
    select.appendChild(option);
  });
}



async function actualizarUsuarioEnServidor(usuario) {
  try {
    const res = await fetch(`${SERVER_URL}/usuarios/email/${usuario.email}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuario)
    });

    if (!res.ok) throw new Error(`Error al actualizar usuario: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    throw error;
  }
}


document.getElementById('payment-form').addEventListener('submit', procesarPago);

// Función para procesar la recarga (para rol restaurante)
document.getElementById('recarga-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const socioEmail = document.getElementById('recarga-socio-select').value;
  const amount = parseFloat(document.getElementById('recarga-amount').value);

  if (!socioEmail || !amount || amount <= 0) {
   
	mostrarMensaje("error", "Datos inválidos.");
    return;
  }

  const socioIndex = users.findIndex(u => u.email === socioEmail);
  if (socioIndex < 0) {
    
	mostrarMensaje("error", "Socio no encontrado.");
    return;
  }

  users[socioIndex].balance += amount;

  const transaccion = {
    userEmail: socioEmail,
    amount: amount,
    date: new Date().toISOString(),
    type: "ingreso",
    from: currentUser.email
  };

  try {
    const savedTransaction = await guardarTransaccionIndividual(transaccion);
    await actualizarUsuarioEnServidor(users[socioIndex]);
    await cargarTransaccionesDesdeServidor();
    await cargarUsuariosDesdeServidor();

    // Actualizar currentUser si es el usuario recargado
    const updatedCurrentUser = users.find(u => u.email === currentUser.email);
    if (updatedCurrentUser) {
      currentUser = updatedCurrentUser;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    // Si el usuario recargado es el administrador, actualizar su vista
    if (socioEmail === currentUser.email) {
      currentUser.balance += amount;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

  
	mostrarMensaje("exito", "Recarga realizada correctamente.");
    this.reset();
    cargarRecargasRestaurante();
  } catch (error) {
    
	mostrarMensaje("error", "Hubo un error guardando en el servidor: " + error);
  }
});


document.getElementById('tickets-page')?.addEventListener('click', () => {
  document.getElementById('tickets-count').textContent = getUserTicketsCount();
});

document.getElementById('admin-page')?.addEventListener('click', async () => {
      await cargarAdminUsuarios();
});
// La vista de pagos se mantiene para otros roles


function aplicarEstilosPorRol(rol) {
  const header = document.getElementById('header');
  const mainApp = document.getElementById('main-app');
  header.className = '';
  mainApp.className = '';
  header.classList.add('role-' + rol);
  mainApp.classList.add('role-' + rol);
}

async function cargarEventos() {
  const lista = document.getElementById('eventos-lista') || document.getElementById('ver-eventos-lista');
  const form = document.getElementById('formulario-evento');
  lista.innerHTML = 'Cargando eventos...';

  try {
    const res = await fetch(`${SERVER_URL}/eventos`);
    const eventos = await res.json();
    console.log('Eventos cargados desde el servidor:', eventos);

    if (eventos.length === 0) {
      lista.innerHTML = '<p>No hay eventos publicados.</p>';
    } else {
      // Ordenar por fecha (día)
      eventos.sort((a, b) => new Date(a.dia) - new Date(b.dia));

      let html = '<div class="eventos-container">';
      eventos.forEach(ev => {
        // Obtener el día de la semana en español
        const fecha = new Date(ev.dia);
        const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
        const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

        html += `
          <div class="evento-item" style="
            border: 1px solid #ccc;
            padding: 10px;
            margin-bottom: 10px;
            background: #fff;
            border-radius: 5px;
          ">
            <strong>${ev.descripcion}</strong>
            <div>${diaSemanaCapitalizado}, ${formatearFechaSimple(ev.dia)}</div>
            <div>${ev.hora}</div>
            
        `;
        if (currentUser.role === 'admin') {
          html += ` <button onclick="eliminarEvento('${ev._id}')">Eliminar</button>`;
        }
        html += '</div>';
      });
      html += '</div>';
      lista.innerHTML = html;
    }

    // Mostrar formulario solo para admin
    if (form) {
      form.style.display = (currentUser.role === 'admin') ? 'block' : 'none';
    }

    // Marcar eventos como vistos
    if (!currentUser.eventosVistos) currentUser.eventosVistos = [];
    const eventosIds = eventos.map(ev => ev._id);
    const nuevosVistos = eventosIds.filter(id => !currentUser.eventosVistos.includes(id));
    if (nuevosVistos.length > 0) {
      currentUser.eventosVistos = [...new Set([...currentUser.eventosVistos, ...eventosIds])];
      await actualizarUsuarioEnServidor(currentUser);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      generarMenu(); // Actualizar el menú para quitar el badge
    }

  } catch (err) {
    console.error('Error cargando eventos:', err);
    lista.innerHTML = 'Error al cargar los eventos.';
  }
}

// Función auxiliar para formatear la fecha (ya existente, sin cambios)
function formatearFechaSimple(fechaISO) {
  const fecha = new Date(fechaISO);
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
}

async function crearEvento() {
  const dia = document.getElementById('nuevo-evento-dia').value;
  const hora = document.getElementById('nuevo-evento-hora').value;
  const descripcion = document.getElementById('nuevo-evento-descripcion').value;

  if (!dia || !hora || !descripcion) {
    
	mostrarMensaje("advertencia", "Debes completar todos los campos: día, hora y descripción.");
    return;
  }

  const evento = {
	
    dia,
    hora,
    descripcion,
    creadoPor: currentUser.alias,
    fechaCreacion: new Date().toISOString()
  };

  try {
    const res = await fetch(`${SERVER_URL}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evento)
    });
    if (!res.ok) throw new Error(`Error al crear evento: ${res.status}`);
    
	mostrarMensaje("exito", "Evento creado correctamente.");
    document.getElementById('nuevo-evento-dia').value = '';
    document.getElementById('nuevo-evento-hora').value = '';
    document.getElementById('nuevo-evento-descripcion').value = '';
    await cargarEventos(); // Recargar eventos
  } catch (err) {
    console.error('Error creando evento:', err);
   
	mostrarMensaje("error", "No se pudo crear el evento.");
  }
}

async function eliminarEvento(id) {
  if (!confirm('¿Seguro que quieres eliminar este evento?')) return;

  try {
    const res = await fetch(`${SERVER_URL}/eventos/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error al eliminar evento: ${res.status} - ${errorText}`);
    }
	mostrarMensaje("exito", "Evento eliminado correctamente");
    console.log(`Evento con ID ${id} eliminado correctamente`);
    await cargarEventos(); // Recargar la lista después de eliminar
  } catch (err) {
    console.error('Error eliminando evento:', err);
    
	mostrarMensaje("advertencia", "No se pudo eliminar el evento: " + err.message);
  }
}


function aplicarFondoPorClima(tipo) {
  const contenedor = document.getElementById('tiempo-page');

  // Elimina clases previas de clima pero deja 'container'
  contenedor.classList.remove(
    'clima-clear', 'clima-rain', 'clima-clouds',
    'clima-thunderstorm', 'clima-snow', 'clima-default'
  );

  // Siempre mantenemos la clase container
  contenedor.classList.add('container');

  // Añadimos la clase correspondiente
  switch (tipo.toLowerCase()) {
    case 'clear':
      contenedor.classList.add('clima-clear');
      break;
    case 'rain':
      contenedor.classList.add('clima-rain');
      break;
    case 'clouds':
      contenedor.classList.add('clima-clouds');
      break;
    case 'thunderstorm':
      contenedor.classList.add('clima-thunderstorm');
      break;
    case 'snow':
      contenedor.classList.add('clima-snow');
      break;
    default:
      contenedor.classList.add('clima-default');
  }
}




async function cargarTiempo() {
  const tiempoActualDiv = document.getElementById('tiempo-actual');
  const pronosticoDiv = document.getElementById('tiempo-pronostico');

  
  const ciudad = 'Sevilla,ES';
  const urlActual = `https://api.openweathermap.org/data/2.5/weather?q=${ciudad}&appid=${API_KEY}&units=metric&lang=es`;
  const urlPronostico = `https://api.openweathermap.org/data/2.5/forecast?q=${ciudad}&appid=${API_KEY}&units=metric&lang=es`;

  try {
    // Tiempo actual
    const resActual = await fetch(urlActual);
    const dataActual = await resActual.json();
	const icono = dataActual.weather[0].icon;
	const descripcion = dataActual.weather[0].description;
	const temp = dataActual.main.temp;
	const humedad = dataActual.main.humidity;
	console.log('🌤️ Tipo de clima:', dataActual.weather[0].main);
	aplicarFondoPorClima(dataActual.weather[0].main);

	tiempoActualDiv.innerHTML = `
	  <div style="display:flex; align-items:center; gap:10px;">
		<img src="https://openweathermap.org/img/wn/${icono}@2x.png" alt="${descripcion}" style="width:60px; height:60px;">
		<div>
		  <p><strong style="text-transform: capitalize;">${descripcion}</strong></p>
		  <p>Temperatura: ${temp} °C</p>
		  <p>Humedad: ${humedad}%</p>
		</div>
	  </div>
	`;

    // Pronóstico 5 días (cada 3 horas, filtramos 1 por día)
    const resPronostico = await fetch(urlPronostico);
    const dataPronostico = await resPronostico.json();

    const porDia = {};
    dataPronostico.list.forEach(entry => {
      const fecha = entry.dt_txt.split(' ')[0];
      if (!porDia[fecha] && entry.dt_txt.includes('12:00:00')) {
        porDia[fecha] = entry;
      }
    });

    let html = '<ul>';
    Object.values(porDia).slice(0, 5).forEach(p => {
      const dia = new Date(p.dt_txt).toLocaleDateString('es-ES', { weekday: 'long' });
      html += `<li><strong>${dia}</strong>: ${p.weather[0].description}, ${p.main.temp}°C</li>`;
    });
    html += '</ul>';

    pronosticoDiv.innerHTML = html;

  } catch (err) {
    console.error('Error al cargar el tiempo:', err);
    tiempoActualDiv.innerHTML = 'No se pudo cargar el tiempo.';
    pronosticoDiv.innerHTML = '';
  }
}

// Llamadas iniciales al cargar la web
window.addEventListener('DOMContentLoaded', () => {
  cargarUsuariosDesdeServidor();
  cargarTransaccionesDesdeServidor();
  cargarMensajesDesdeServidor();
});

async function cargarCartaRestaurante() {
  const lista = document.getElementById('carta-lista');
  lista.scrollTop = 0;
  if (!lista) {
    console.error("❌ No se encontró el contenedor 'carta-lista'");
    return;
  }

  try {
    const res = await fetch(`${SERVER_URL}/carta`);
    const carta = await res.json();

    if (!Array.isArray(carta)) {
      throw new Error('La carta no tiene el formato esperado');
    }

    if (carta.length === 0) {
      lista.innerHTML = '<p>No hay productos en la carta.</p>';
      return;
    }

    lista.innerHTML = ''; // Limpiar contenido

    carta.forEach(categoria => {
      const titulo = document.createElement('h3');
      titulo.textContent = categoria.categoria;
      lista.appendChild(titulo);

      const ul = document.createElement('ul');
      categoria.items.forEach(plato => {
        let precio;
        if (currentUser.role === 'socio') {
          precio = plato.precio_familiar;
        } else if (currentUser.role === 'admin') {
          precio = plato.precio_familiar;
        } else {
          precio = plato.precio_familiar;
        }

        const li = document.createElement('li');
        li.innerHTML = `
		  <span class="nombre-plato">${plato.nombre}</span>
		  <span class="precio-plato">${formatearEuros(precio)}</span>
		`;

        ul.appendChild(li);
      });

      lista.appendChild(ul);
    });

  } catch (err) {
    console.error('Error cargando carta:', err);
    lista.innerHTML = '<p>Error al cargar la carta.</p>';
  }
}



function formatearEuros(cantidad) {
  const valor = parseFloat(cantidad);
  return isNaN(valor) ? '—' : `${valor.toFixed(2)} €`;
}


// Variable global para controlar el escáner y evitar duplicados
let html5QrCode = null;
let isProcessing = false;

function iniciarScanner() {
  if (html5QrCode) {
    html5QrCode.stop().catch(err => console.error('Error al detener escáner previo:', err));
    html5QrCode = null;
  }

  html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: 250 };

  console.log('▶️ Iniciando escáner...');
  html5QrCode.start(
    { facingMode: "environment" },
    config,
    async (decodedText, decodedResult) => {
      if (isProcessing) {
        console.log('⏳ Escaneo ya en proceso, ignorando...');
        return;
      }

      isProcessing = true;
      console.log('✅ QR detectado:', decodedText);

      try {
        if (currentUser.role === 'portero') {
          await procesarInvitado(decodedText);
        } else if (['restaurante', 'camarero'].includes(currentUser.role)) { // Añadimos 'camarero'
          await procesarPagoEscaneado(decodedText);
        } else {
          console.log('🚫 Rol no permitido para escanear:', currentUser.role);
          document.getElementById('resultado').innerText = '❌ Rol no permitido para escanear.';
          document.getElementById('resultado').style.color = 'red';
        }
        await html5QrCode.stop();
        console.log('⏹️ Escáner detenido');
        html5QrCode = null;
      } catch (err) {
        console.error('❌ Error procesando QR:', err);
      } finally {
        isProcessing = false;
      }
    },
    (errorMessage) => {}
  ).catch((err) => {
    console.error("Error al iniciar escáner:", err);
    isProcessing = false;
  });
}

function detenerScanner() {
  if (html5QrCode) {
    html5QrCode.stop()
      .then(() => {
        console.log('⏹️ Escáner detenido correctamente');
        html5QrCode = null;
        isProcessing = false;
        document.getElementById('resultado').innerText = ''; // 🔽 BORRAR MENSAJE
      })
      .catch(err => console.error('Error al detener escáner:', err));
  } else {
    console.log('ℹ️ No hay escáner activo para detener');
    document.getElementById('resultado').innerText = ''; // 🔽 BORRAR TAMBIÉN AQUÍ POR SI ACASO
  }
}

let yaProcesado = false;

async function procesarInvitado(email) {
	
  if (yaProcesado) return; // Evita duplicados
    yaProcesado = true;
  try {
    const res = await fetch(`${SERVER_URL}/usuarios`);
    if (!res.ok) throw new Error(`Error al cargar usuarios: ${res.status}`);
    const usuarios = await res.json();

    document.getElementById('resultado').innerText = '';
    document.getElementById('resultado').style.color = '';

    let emailSolo;
    try {
      const decoded = atob(email);
      emailSolo = decoded.split('-')[0];
      console.log('📩 Email decodificado:', emailSolo);
    } catch (err) {
      document.getElementById('resultado').innerText = '❌ QR no válido. No se puede decodificar.';
      document.getElementById('resultado').style.color = 'red';
	  mostrarNotificacionEntrada("❌");
      return;
    }

    if (!emailSolo || !emailSolo.includes('@')) {
      document.getElementById('resultado').innerText = '❌ QR no contiene un email válido.';
      document.getElementById('resultado').style.color = 'red';
      return;
    }

    const usuario = usuarios.find(u => u.email === emailSolo);
    if (!usuario) {
      document.getElementById('resultado').innerText = `❌ Usuario no registrado: ${emailSolo}`;
      document.getElementById('resultado').style.color = 'red';
      return;
    }

    const rolesValidos = ['admin', 'socio', 'familiar', 'invitado'];
    if (rolesValidos.includes(usuario.role)) {
      const hora = new Date().toLocaleTimeString();
      const alias = usuario.alias || usuario.nombre || emailSolo;
      const socio = usuario.parent || 'ninguno';

      const entrada = {
        email: emailSolo,
        nombre: alias,
        hora,
        socio,
        role: usuario.role
      };

      const post = await fetch(`${SERVER_URL}/entradas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entrada)
      });

      if (!post.ok) {
        const texto = await post.text();
        throw new Error(`Fallo al guardar entrada: ${texto}`);
      }
		
      //const mensaje = `✅ Entrada registrada: ${alias} - Rol: ${usuario.role} - A las ${hora}`;
	  detenerScanner();
	  mostrarNotificacionEntrada("✅");
      document.getElementById('resultado').innerText = mensaje;
      document.getElementById('resultado').style.color = 'green';
	 
      console.log('✅ Entrada guardada en el servidor');
    } else {
      document.getElementById('resultado').innerText = `❌ Rol no permitido para entrada: ${usuario.role} (${emailSolo})`;
      document.getElementById('resultado').style.color = 'red';
    }
  } catch (err) {
	detenerScanner();  
	mostrarNotificacionEntrada("❌");
    document.getElementById('resultado').innerText = '❌ Error al registrar entrada: ' + err.message;
    document.getElementById('resultado').style.color = 'red';
    throw err;
  }
}



async function procesarPagoEscaneado(qrText) {
  try {
    document.getElementById('resultado').innerText = '';
    document.getElementById('resultado').style.color = '';

    console.log('📸 QR escaneado:', qrText);

    let datosQR;
    try {
      datosQR = JSON.parse(qrText);
    } catch (err) {
      document.getElementById('resultado').innerText = '❌ QR no válido';
      document.getElementById('resultado').style.color = 'red';
	  mostrarNotificacionEntrada("❌");
      return;
    }

    const customId = datosQR.customId;
    if (!customId) {
      document.getElementById('resultado').innerText = '❌ QR inválido (sin customId)';
      document.getElementById('resultado').style.color = 'red';
      return;
    }

    const res = await fetch(`${SERVER_URL}/procesarTransaccionPendientePorCustomId/${encodeURIComponent(customId)}`, {
      method: 'POST'
    });

    const data = await res.json();

    if (!res.ok) {
      document.getElementById('resultado').innerText = `❌ ${data.error || 'Error procesando transacción'}`;
      document.getElementById('resultado').style.color = 'red';
      return;
    }

    document.getElementById('resultado').innerText = `✅ Pago de ${formatearEuros(data.pago.amount)} confirmado`;
	mostrarNotificacionEntrada("✅");
    document.getElementById('resultado').style.color = 'green';

    await cargarUsuariosDesdeServidor();
    console.log('✅ Transacción procesada correctamente:', data);

  } catch (err) {
    document.getElementById('resultado').innerText = '❌ Error procesando pago';
	mostrarNotificacionEntrada("❌");
    document.getElementById('resultado').style.color = 'red';
    console.error('❌ Error procesando pago:', err);
  }
}



async function cargarFamiliaresConInvitados() {
  await cargarUsuariosDesdeServidor();
  const container = document.getElementById('familiares-list');
  let html = '';

  // Filtrar familiares del usuario actual
  const familiares = users.filter(u => u.role === 'familiar' && u.parent === currentUser.email);

  if (familiares.length === 0) {
    html = '<p>No hay familiares agregados.</p>';
  } else {
    html = '<div class="familiares-container">';
    familiares.forEach(fam => {
      html += `
        <div class="familiar-item">
          <h3>${fam.alias} (${fam.email})</h3>
          <button onclick="mostrarOpcion('add-invited-page'); setParentForInvite('${fam.email}')">Invitar</button>
          <div class="invitados-subsection">
            <h4>Invitados:</h4>
      `;

      // Invitados de este familiar
      const invitados = users.filter(u => u.role === 'invitado' && u.parent === fam.email);
      if (invitados.length === 0) {
        html += '<p>No hay invitados asociados.</p>';
      } else {
        html += '<table><tr><th>Alias</th><th>Email</th></tr>';
        invitados.forEach(inv => {
          html += `<tr><td>${inv.alias}</td><td>${inv.email}</td></tr>`;
        });
        html += '</table>';
      }

      html += '</div></div>';
    });
    html += '</div>';
  }

  container.innerHTML = html;
}


function setParentForInvite(parentEmail) {
  localStorage.setItem('parentForInvite', parentEmail);
}

async function guardarTransaccionPendiente(transaccion) {
  try {
    const res = await fetch(`${SERVER_URL}/transaccionesPendientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaccion)
    });
    if (!res.ok) throw new Error('Error al guardar transacción pendiente');
    console.log('✅ Transacción pendiente guardada en el servidor');
  } catch (err) {
    console.error('❌ Error guardando transacción pendiente:', err);
  }
}


async function cargarTransaccionesPendientesDesdeServidor() {
  try {
    const res = await fetch(`${SERVER_URL}/transaccionesPendientes`);
    if (!res.ok) throw new Error('Error al cargar transacciones pendientes');
    const transaccionesPendientes = await TransaccionPendiente.findById(req.body._id);
    console.log('🗃️ Transacciones pendientes cargadas:', transaccionesPendientes);
    return transaccionesPendientes;
  } catch (err) {
    console.error('❌ Error cargando transacciones pendientes:', err);
    return [];
  }
}


async function eliminarTransaccionPendiente(id) {
  try {
    const res = await fetch(`${SERVER_URL}/transaccionesPendientes/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar transacción pendiente');
    console.log(`🗑️ Transacción pendiente con ID ${id} eliminada`);
  } catch (err) {
    console.error('❌ Error eliminando transacción pendiente:', err);
  }
}


function formatearFechaSimple(fechaISO) {
  const fecha = new Date(fechaISO);
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
}


async function actualizarIconoTiempoSVG() {
  const ciudad = 'Sevilla';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${ciudad}&units=metric&lang=es&appid=${API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const descripcion = data.weather[0].main.toLowerCase();
    const tiempoBtn = document.getElementById('tiempo-btn');

    if (!tiempoBtn) return;

    let svgUrl = "";

    if (descripcion.includes("rain")) {
      svgUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='white' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M16 13v3m-4-3v4m-4-2v2m8-8a4 4 0 0 0-8 0c0 .34.04.67.1.99A5 5 0 1 0 8 19h8a5 5 0 0 0 0-10z'/%3E%3C/svg%3E";
    } else if (descripcion.includes("clouds")) {
      svgUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='white' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M3 19h13a5 5 0 0 0 0-10 6.5 6.5 0 0 0-12.36 2A5.5 5.5 0 0 0 3 19z'/%3E%3C/svg%3E";
    } else if (descripcion.includes("clear")) {
      svgUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='white' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='5'/%3E%3Cline x1='12' y1='1' x2='12' y2='3'/%3E%3Cline x1='12' y1='21' x2='12' y2='23'/%3E%3Cline x1='4.22' y1='4.22' x2='5.64' y2='5.64'/%3E%3Cline x1='18.36' y1='18.36' x2='19.78' y2='19.78'/%3E%3Cline x1='1' y1='12' x2='3' y2='12'/%3E%3Cline x1='21' y1='12' x2='23' y2='12'/%3E%3Cline x1='4.22' y1='19.78' x2='5.64' y2='18.36'/%3E%3Cline x1='18.36' y1='5.64' x2='19.78' y2='4.22'/%3E%3C/svg%3E";    } else {
      svgUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FFFFFF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='16' cy='10' r='4'/%3E%3Cpath d='M3 19h13a5 5 0 0 0 0-10 6.5 6.5 0 0 0-12.36 2A5.5 5.5 0 0 0 3 19z'/%3E%3C/svg%3E";
    }

    tiempoBtn.style.setProperty('--icono-tiempo', `url("${svgUrl}")`);
  } catch (err) {
    console.error("Error al obtener el tiempo:", err);
  }
}


function mostrarNotificacionEntrada(texto) {
  let contenedor = document.getElementById('notificacion-entrada');

  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'notificaciones';
    contenedor.style.position = 'fixed';
    contenedor.style.top = '40%';
    contenedor.style.left = '50%';
    contenedor.style.transform = 'translate(-50%, -50%) scale(0.2)'; // centrar y escalar
    contenedor.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
    contenedor.style.opacity = '0';
    contenedor.style.zIndex = '9999';
    document.body.appendChild(contenedor);
  }

  contenedor.innerHTML = `<div style="
    font-size: 4rem;

    color: white;
;
    text-align: center;
  "><strong>${texto}</strong></div>`;

  // Mostrar
  setTimeout(() => {
    contenedor.style.opacity = '1';
    contenedor.style.transform = 'translate(-50%, -50%) scale(1.1)';
  }, 10);

  // Rebote suave
  setTimeout(() => {
    contenedor.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 400);

  // Desaparecer
  setTimeout(() => {
    contenedor.style.opacity = '0';
    contenedor.style.transform = 'translate(-50%, -50%) scale(0.2)';
  }, 2000);

  setTimeout(() => contenedor.remove(), 2000);
  setTimeout(() => yaProcesado = false, 2000);
}
