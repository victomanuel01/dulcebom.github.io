console.log("--- SISTEMA CARGADO ---");
// 1. (Superclase)
class Persona {
    constructor(name, email) {
        this.name = name;
        this.email = email;
    }

    obtenerIdentidad() {
        return `${this.name} (${this.email})`;
    }
}

// 2. (Herencia)
class Cliente extends Persona {
    constructor(id, name, email, phone, address) {
        super(name, email);
        this.id = id;
        this.phone = phone;
        this.address = address;
    }

    obtenerFicha() {
        return `Cliente #${this.id}: ${this.name} - Tel: ${this.phone}`;
    }
}

// 3. CLASE PRODUCTO
class Producto {
    constructor(id, nombre, precio_base, descripcion, imagen_url) {
        this.id = id;
        this.nombre = nombre;
        this.precio_base = parseFloat(precio_base);
        this.descripcion = descripcion;
        this.imagen_url = imagen_url;
    }

    obtenerPrecioFormateado() {
        return `S/ ${this.precio_base.toFixed(2)}`;
    }
}

// 4. CLASE PEDIDO
class Pedido {
    constructor(data) {
        this.id = data.id;
        this.client = data.client;
        this.id_producto = data.id_producto;
        this.details = data.details;
        this.orderNotes = data.orderNotes;
        this.amount = parseFloat(data.amount);
        this.discount = parseInt(data.discount);
        this.finalAmount = parseFloat(data.finalAmount);
        this.deliveryDate = data.deliveryDate;
        this.receiptMessage = data.receiptMessage;
        this.status = data.status;
        this.docType = data.docType;
        this.ruc = data.ruc;
        this.date = data.date;
    }
}

let clients = [];
let orders = [];
let products = [];
let salesChart;

const predefinedMessages = [
    "¡Gracias por elegirnos!",
    "¡Feliz cumpleaños!",
    "¡Que disfrutes tu celebración!",
    "¡Felicidades en tu día!"
];

let Modals = {
    order: { hide: () => document.getElementById('orderModal').classList.add('d-none'), show: () => document.getElementById('orderModal').classList.remove('d-none') },
    client: { hide: () => document.getElementById('clientModal').classList.add('d-none'), show: () => document.getElementById('clientModal').classList.remove('d-none') },
    deleteConfirm: { hide: () => document.getElementById('deleteConfirmModal').classList.add('d-none'), show: () => document.getElementById('deleteConfirmModal').classList.remove('d-none') },
    receipt: { hide: () => document.getElementById('receiptModal').classList.add('d-none'), show: () => document.getElementById('receiptModal').classList.remove('d-none') },
    product: { hide: () => document.getElementById('productModal').classList.add('d-none'), show: () => document.getElementById('productModal').classList.remove('d-none') }
};

// DOMContentLoaded manejado por home.html

function toggleViewMode(mode) {
    const auth = document.getElementById('authContainer');
    const dash = document.getElementById('dashboard');

    if (mode === 'dashboard') {
        auth.classList.remove('d-flex');
        auth.classList.add('d-none');
        dash.classList.remove('d-none');
        dash.classList.add('d-flex');
    } else {
        auth.classList.remove('d-none');
        auth.classList.add('d-flex');
        dash.classList.remove('d-flex');
        dash.classList.add('d-none');
    }
}

function toggleAuthMode(mode, event) {
    if (event) event.preventDefault();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const recoverForm = document.getElementById('recoverForm');
    const title = document.getElementById('authTitle');

    loginForm.classList.add('d-none');
    registerForm.classList.add('d-none');
    recoverForm.classList.add('d-none');

    if (mode === 'register') {
        registerForm.classList.remove('d-none');
        title.textContent = 'Crear Cuenta';
    } else if (mode === 'recover') {
        recoverForm.classList.remove('d-none');
        title.textContent = 'Restablecer Contraseña';
    } else {
        loginForm.classList.remove('d-none');
        title.textContent = 'Iniciar Sesión';
    }
}

async function callApi(action, payload = {}) {
    payload.auditUser = sessionStorage.getItem('loggedInUser') || 'Desconocido';
    const formData = new FormData();
    formData.append('action', action);
    formData.append('payload', JSON.stringify(payload));

    try {
        const response = await fetch('/api', { method: 'POST', body: formData });
        const text = await response.text();
        try {
            const result = JSON.parse(text);
            if (!result.success) throw new Error(result.message);
            return result;
        } catch (jsonError) {
            console.error("API Error:", text);
            throw new Error("Error en servidor. Posible JSON Inválido: " + text);
        }
    } catch (error) {
        showToast('Error', error.message, 'danger');
        throw error;
    }
}

function showView(viewId, element, dataAlreadyLoaded = false) {
    const loggedIn = !!sessionStorage.getItem('loggedInUser');

    if (!loggedIn) {
        toggleViewMode('login');
        return;
    }

    toggleViewMode('dashboard');

    const userRole = sessionStorage.getItem('loggedInUserRole') || 'empleado';

    document.querySelectorAll('.sidebar-custom li[data-role]').forEach(navItem => {
        const roles = navItem.dataset.role || '';
        navItem.style.display = roles.includes(userRole) ? 'block' : 'none';
    });

    document.querySelectorAll('.main-wrapper > div[data-role]').forEach(v => v.classList.add('d-none'));

    let finalViewId = viewId;
    const targetView = document.getElementById(viewId);
    if (!targetView || !(targetView.dataset.role || '').includes(userRole)) {
        finalViewId = (userRole === 'admin') ? 'dashboardView' : 'ordersView';
        element = document.querySelector(`.sidebar-custom .nav-link[onclick*="'${finalViewId}'"]`);
    }

    document.getElementById(finalViewId).classList.remove('d-none');

    if (element && element.classList) {
        document.querySelectorAll('.sidebar-custom .nav-link').forEach(l => l.classList.remove('active-link'));
        element.classList.add('active-link');
    }

    if (dataAlreadyLoaded) refreshViews(finalViewId);
    else loadDataFromServer().then(() => refreshViews(finalViewId));

    const username = sessionStorage.getItem('loggedInUser');
    document.getElementById('welcomeMessage').textContent = `Hola, ${username}`;
    document.getElementById('userNameSidebar').textContent = username;
}

async function refreshViews(viewId) {
    if (viewId === 'dashboardView') { updateDashboardCards(); updateSalesChart(); }
    if (viewId === 'ordersView') { loadAllOrders(); renderRecentOrders(); }
    if (viewId === 'clientsView') loadAllClients();
    if (viewId === 'productsView') loadAllProducts();
    if (viewId === 'reportsView') await renderAuditLog();
}

async function loadDataFromServer() {
    try {
        const data = await callApi('loadAllData');

        clients = (data.clients || []).map(c =>
            new Cliente(c.id, c.name, c.email, c.phone, c.address)
        );

        products = (data.products || []).map(p =>
            new Producto(p.id, p.nombre, p.precio_base, p.descripcion, p.imagen_url)
        );

        orders = (data.orders || []).map(o => new Pedido(o));

        return true;
    } catch (error) { return false; }
}

async function renderAuditLog() {
    const tableBody = document.getElementById('auditLogTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Cargando...</td></tr>';
    try {
        const result = await callApi('loadAuditLogs');
        const logs = result.logs || [];
        tableBody.innerHTML = '';
        if (logs.length === 0) { tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Sin actividad.</td></tr>'; return; }
        logs.forEach(log => {
            let badgeClass = 'bg-secondary';
            if (log.accion === 'Eliminar') badgeClass = 'bg-danger';
            if (log.accion === 'Crear') badgeClass = 'bg-success';
            if (log.accion === 'Editar') badgeClass = 'bg-primary';
            tableBody.innerHTML += `<tr><td>${log.fecha}</td><td class="fw-bold">${log.usuario}</td><td><span class="badge ${badgeClass}">${log.accion}</span></td><td>${log.entidad}</td><td class="text-muted small">${log.detalles}</td></tr>`;
        });
    } catch (error) {}
}

function updateDashboardCards() {
    const completed = orders.filter(o => o.status === 'completed');
    const totalRevenue = completed.reduce((sum, o) => sum + o.finalAmount, 0);
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    document.getElementById('totalRevenue').textContent = `S/ ${totalRevenue.toFixed(2)}`;
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('newCustomers').textContent = clients.length;
    document.getElementById('pendingOrders').textContent = pendingCount;
}

function updateSalesChart() {
    const labels = [];
    const salesData = new Array(7).fill(0);
    const dateKeys = [];
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        labels.push(`${daysOfWeek[date.getDay()]} ${date.getDate()}`);
        dateKeys.push(date.toISOString().split('T')[0]);
    }
    orders.filter(o => o.status === 'completed').forEach(o => {
        const idx = dateKeys.indexOf(o.deliveryDate);
        if(idx !== -1) salesData[idx] += o.finalAmount;
    });
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: "Ingresos", backgroundColor: "rgba(245, 230, 200, 0.85)", borderColor: "rgba(210, 185, 145, 1)", data: salesData, tension: 0.1 }] }, options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => 'S/ ' + v } } }, plugins: { legend: { display: false } } } });
}

function renderRecentOrders() {
    const body = document.getElementById('recentOrdersTableBody'); body.innerHTML = '';
    orders.slice(0, 5).forEach(o => { const s = getStatusInfo(o.status); body.innerHTML += `<tr><td>${o.client.name}</td><td>S/ ${o.finalAmount.toFixed(2)}</td><td><span class="badge ${s.bsClass}">${s.text}</span></td></tr>`; });
}

function loadAllOrders() {
    const list = document.getElementById('allOrdersList'); list.innerHTML = '';
    const filter = document.getElementById('orderSearchInputFilter').value.toLowerCase();

    const filtered = orders.filter(o =>
        (o.client.name || '').toLowerCase().includes(filter) ||
        (o.details || '').toLowerCase().includes(filter) ||
        (o.orderNotes || '').toLowerCase().includes(filter)
    );

    if (filtered.length === 0) { list.innerHTML = '<div class="p-3 text-center text-muted bg-white border rounded">No se encontraron pedidos.</div>'; return; }
    filtered.forEach(o => {
        const s = getStatusInfo(o.status);
        const docBadge = (o.docType === 'factura') ? '<span class="badge bg-secondary ms-2">FACTURA</span>' : '<span class="badge bg-light text-dark border ms-2">BOLETA</span>';

        list.innerHTML += `<div class="list-group-item list-group-item-action border-0 shadow-sm mb-2 rounded"><div class="d-flex justify-content-between align-items-start"><div><h5 class="mb-1 fw-bold">${o.client.name} ${docBadge} <small class="text-muted">#${o.id}</small></h5><p class="mb-1 text-muted">${o.details} · ${(o.orderNotes||"").match(/\[CAKE:(.*?)\]/)?.[1]||""} - <strong class="text-primary">S/ ${o.finalAmount.toFixed(2)}</strong></p></div><small class="text-muted">${o.deliveryDate}</small></div><div class="d-flex justify-content-between align-items-center mt-2 border-top pt-2"><span class="badge ${s.bsClass} cursor-pointer" style="cursor:pointer" onclick="toggleOrderStatus('${o.id}')" title="Clic para cambiar estado">${s.text}</span><div class="btn-group btn-group-sm"><button class="btn btn-outline-primary" onclick="viewReceipt('${o.id}')" title="Recibo"><i class="bi bi-receipt"></i></button><button class="btn btn-outline-success" onclick="showEditOrderModal('${o.id}')" title="Editar"><i class="bi bi-pencil-square"></i></button><button class="btn btn-outline-danger" onclick="showDeleteConfirmation('${o.id}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button></div></div></div>`;
    });
}

function loadAllClients() {
    const body = document.getElementById('allClientsTableBody');
    body.innerHTML = '';
    const filter = document.getElementById('clientSearchInputFilter').value.toLowerCase();

    const filtered = clients.filter(c =>
        (c.name || '').toLowerCase().includes(filter) ||
        (c.email || '').toLowerCase().includes(filter)
    );

    if (filtered.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">No hay clientes.</td></tr>';
        return;
    }

    filtered.forEach(c => {
        body.innerHTML += `<tr>
            <td>${c.name || 'Sin nombre'}</td>
            <td class="text-muted small">${c.email || ''}</td>
            <td class="text-muted small">${c.phone || ''}</td>
            <td class="text-muted small">${c.address || ''}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-success" onclick="prepareEditClientModal(${c.id})">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
        </tr>`;
    });
}

function loadAllProducts() {
    const grid = document.getElementById('catalogGrid');
    grid.innerHTML = '';

    const searchVal = document.getElementById('productSearchFilter') ? document.getElementById('productSearchFilter').value.toLowerCase() : '';
    const sortVal = document.getElementById('productSortFilter') ? document.getElementById('productSortFilter').value : 'name_asc';

    let filteredProducts = products.filter(p => {
        return p.nombre.toLowerCase().includes(searchVal) || (p.descripcion || '').toLowerCase().includes(searchVal);
    });

    filteredProducts.sort((a, b) => {
        if (sortVal === 'price_asc') return a.precio_base - b.precio_base;
        if (sortVal === 'price_desc') return b.precio_base - a.precio_base;
        if (sortVal === 'name_asc') return a.nombre.localeCompare(b.nombre);
        return 0;
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-5"><i class="bi bi-search display-1 opacity-25"></i><h4 class="mt-3">No encontramos coincidencias</h4></div>`;
        return;
    }

    filteredProducts.forEach(p => {
        const imgUrl = p.imagen_url || 'assets/pedidos.jpg';
        grid.innerHTML += `
        <div class="col-12 col-md-6 col-lg-4 col-xl-3">
            <div class="card h-100 shadow-sm border-0 hover-scale">
                <div style="height: 200px; overflow: hidden; background:#f8f9fa; position: relative;" class="d-flex align-items-center justify-content-center">
                    <img src="${imgUrl}" class="w-100 h-100" style="object-fit: cover;" alt="${p.nombre}">
                    <div class="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75 rounded-pill">ID: ${p.id}</div>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="fw-bold text-dark mb-1 text-truncate" title="${p.nombre}">${p.nombre}</h5>
                    <p class="text-primary fw-bold fs-4 mb-2">S/ ${p.precio_base.toFixed(2)}</p>
                    <p class="text-muted small flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${p.descripcion || 'Sin descripción'}
                    </p>
                    
                    <button class="btn btn-primary w-100 mb-2 fw-bold shadow-sm" onclick="venderProducto(${p.id})">
                        <i class="bi bi-cart-plus-fill me-2"></i>VENDER AHORA
                    </button>

                    <div class="d-flex gap-2 border-top pt-2">
                        <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="prepareEditProductModal(${p.id})">
                            <i class="bi bi-pencil-fill"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="showDeleteProductConfirmation(${p.id})">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    });
}

function venderProducto(productId) {
    const ordersLink = document.querySelector(`.sidebar-custom .nav-link[onclick*="'ordersView'"]`);
    showView('ordersView', ordersLink);

    prepareNewOrderModal();

    const select = document.getElementById('orderProductSelect');
    select.value = productId;

    updateOrderAmountFromProduct();

    document.getElementById('clientRUC').value = '';
    toggleRUCInput(false);
    document.getElementById('optionBoleta').checked = true;

    document.getElementById('cakeTypeSelect').value = "";

    setTimeout(() => {
        document.getElementById('clientSearchInput').focus();
        showToast('Listo', 'Producto cargado al pedido. Seleccione cliente y tipo de queque.', 'success');
    }, 300);
}

function toggleRUCInput(show) {
    const container = document.getElementById('rucInputContainer');
    if (container) {
        container.style.display = show ? 'block' : 'none';
        if (!show) {
            document.getElementById('clientRUC').value = '';
        }
    }
}

function prepareNewOrderModal() {
    document.querySelector('#orderModal form').reset();
    document.getElementById('orderModalTitle').textContent = 'Crear Pedido';
    document.getElementById('editingOrderId').value = '';
    populateClientDatalist();
    populateProductSelect();
    document.getElementById('editClientBtn').disabled = true;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('deliveryDate').value = today;

    document.getElementById('clientRUC').value = '';
    document.getElementById('optionBoleta').checked = true;
    toggleRUCInput(false);

    document.getElementById('cakeTypeSelect').value = "";

    Modals.order.show();
}

function showEditOrderModal(id) {
    const o = orders.find(x => x.id == id);
    if (!o) return;

    // Preparar sin reset para no perder valores
    populateClientDatalist();
    populateProductSelect();

    document.getElementById('orderModalTitle').textContent = `Editar #${o.id}`;
    document.getElementById('editingOrderId').value = o.id;

    // Cliente: asignar directo sin setTimeout
    document.getElementById('clientSearchInput').value = o.client.name;
    document.getElementById('editClientBtn').disabled = false;

    document.getElementById('orderProductSelect').value = o.id_producto;
    document.getElementById('orderAmount').value = o.amount;
    document.getElementById('orderDiscount').value = o.discount;
    document.getElementById('deliveryDate').value = o.deliveryDate;
    document.getElementById('orderCustomMessage').value = o.receiptMessage || '';
    document.getElementById('clientRUC').value = '';

    const fullNotes = o.orderNotes || '';
    const cakeMatch = fullNotes.match(/\[CAKE:(.*?)\]/);
    const cakeType = cakeMatch ? cakeMatch[1] : "";
    const cleanNotes = fullNotes.replace(/\[CAKE:.*?\]\s*/, '').trim();

    document.getElementById('cakeTypeSelect').value = cakeType;
    document.getElementById('orderNotes').value = cleanNotes;

    if (o.docType === 'factura') {
        document.getElementById('optionFactura').checked = true;
        toggleRUCInput(true);
        document.getElementById('clientRUC').value = o.ruc || '';
    } else {
        document.getElementById('optionBoleta').checked = true;
        toggleRUCInput(false);
    }

    Modals.order.show();
}

async function saveOrder(e) {
    e.preventDefault();
    const id = document.getElementById('editingOrderId').value;
    const cName = document.getElementById('clientSearchInput').value;
    const client = clients.find(c => c.name === cName);
    const pId = document.getElementById('orderProductSelect').value;
    const prod = products.find(p => p.id == pId);
    const amount = document.getElementById('orderAmount').value;
    let discount = parseFloat(document.getElementById('orderDiscount').value);
    const deliveryDate = document.getElementById('deliveryDate').value;

    const docType = document.querySelector('input[name="docTypeOptions"]:checked').value;
    const ruc = document.getElementById('clientRUC').value.trim() || null;
    const cakeType = document.getElementById('cakeTypeSelect').value;
    const userNotes = document.getElementById('orderNotes').value.trim();

    if (!client) { showToast('Error', 'Cliente no válido', 'danger'); return; }
    if (!prod) { showToast('Error', 'Seleccione producto', 'danger'); return; }
    if (!cakeType) { showToast('Error', 'Seleccione el Tipo de Queque', 'danger'); document.getElementById('cakeTypeSelect').focus(); return; }

    if (!validateOrderInputs(amount, deliveryDate)) {
        return;
    }

    if (docType === 'factura') {
        if (!ruc) {
            showToast('Error', 'Debe ingresar RUC o DNI para Factura', 'danger');
            document.getElementById('clientRUC').focus();
            return;
        }
        if (ruc.length !== 8 && ruc.length !== 11) {
            showToast('Error', 'El DNI debe tener 8 dígitos y el RUC 11 dígitos.', 'danger');
            document.getElementById('clientRUC').focus();
            return;
        }
    }

    const parsedAmount = parseFloat(amount);
    const finalAmount = parsedAmount - (parsedAmount * (discount / 100));
    const fullOrderNotes = `[CAKE:${cakeType}] ${userNotes}`.trim();
    const detailsForTable = prod.nombre;

    await callApi('saveOrder', {
        id: id || null,
        client: client,
        id_producto: pId,
        orderNotes: fullOrderNotes,
        details: detailsForTable,
        amount: parsedAmount,
        discount: discount || 0,
        finalAmount: finalAmount,
        deliveryDate: deliveryDate,
        receiptMessage: document.getElementById('orderCustomMessage').value,
        docType: docType,
        ruc: ruc
    });
    showToast('Éxito', 'Pedido guardado', 'success');
    Modals.order.hide();
    showView('ordersView');
}

function showDeleteConfirmation(id) { document.getElementById('orderIdToDelete').value = id; document.querySelector('#deleteConfirmModal .btn-danger').setAttribute('onclick', 'confirmDelete()'); Modals.deleteConfirm.show(); }
async function confirmDelete() { await callApi('deleteOrder', { id: document.getElementById('orderIdToDelete').value }); showToast('Éxito', 'Pedido eliminado', 'info'); Modals.deleteConfirm.hide(); showView('ordersView'); }
async function toggleOrderStatus(id) { const o = orders.find(x => x.id == id); const ns = getStatusInfo(o.status).next; await callApi('toggleOrderStatus', { id, newStatus: ns }); showView('ordersView'); }

function prepareNewClientModal() { document.querySelector('#clientModal form').reset(); document.getElementById('clientModalTitle').textContent = 'Nuevo Cliente'; document.getElementById('editingClientId').value = ''; Modals.client.show(); }
function prepareEditClientModal(id) { const c = clients.find(x => x.id == id); if (!c) return; document.getElementById('clientModalTitle').textContent = 'Editar Cliente'; document.getElementById('editingClientId').value = c.id; document.getElementById('clientName').value = c.name; document.getElementById('clientEmail').value = c.email; document.getElementById('clientPhone').value = c.phone; document.getElementById('clientAddress').value = c.address; Modals.client.show(); }
function editSelectedClient() { const name = document.getElementById('clientSearchInput').value; const c = clients.find(cl => cl.name === name); if(c) { Modals.order.hide(); prepareEditClientModal(c.id); } }
async function saveClient(e) { e.preventDefault(); await callApi('saveClient', { id: document.getElementById('editingClientId').value || null, name: document.getElementById('clientName').value, email: document.getElementById('clientEmail').value, phone: document.getElementById('clientPhone').value, address: document.getElementById('clientAddress').value }); showToast('Éxito', 'Cliente guardado', 'success'); Modals.client.hide(); await loadDataFromServer(); if(!document.getElementById('dashboard').classList.contains('d-none')) loadAllClients(); }

function prepareNewProductModal() {
    document.querySelector('#productModal form').reset();
    document.getElementById('productModalTitle').textContent = 'Nueva Torta';
    document.getElementById('editingProductId').value = '';
    document.getElementById('imgPreview').src = 'assets/imagen.jpg';
    Modals.product.show();
}

function prepareEditProductModal(id) {
    const p = products.find(x => x.id == id);
    if (!p) return;
    document.getElementById('productModalTitle').textContent = 'Editar Torta';
    document.getElementById('editingProductId').value = p.id;
    document.getElementById('productName').value = p.nombre;
    document.getElementById('productPrice').value = p.precio_base;
    document.getElementById('productDescription').value = p.descripcion;
    document.getElementById('imgPreview').src = p.imagen_url || 'assets/imagen.jpg';
    Modals.product.show();
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imgPreview').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveProduct(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('action', 'saveProduct');
    formData.append('id', document.getElementById('editingProductId').value);
    formData.append('nombre', document.getElementById('productName').value);
    formData.append('precio_base', document.getElementById('productPrice').value);
    formData.append('descripcion', document.getElementById('productDescription').value);

    const auditData = { auditUser: sessionStorage.getItem('loggedInUser') };
    formData.append('payload', JSON.stringify(auditData));

    const fileInput = document.getElementById('productImageInput');
    if(fileInput.files[0]) {
        formData.append('imagen', fileInput.files[0]);
    }

    try {
        const response = await fetch('/api', { method: 'POST', body: formData });
        const result = await response.json();

        if(result.success) {
            showToast('Éxito', 'Catálogo actualizado', 'success');
            Modals.product.hide();
            await loadDataFromServer();
            loadAllProducts();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast('Error', 'No se pudo guardar: ' + error.message, 'danger');
    }
}

function showDeleteProductConfirmation(id) { document.getElementById('orderIdToDelete').value = id; document.querySelector('#deleteConfirmModal .btn-danger').setAttribute('onclick', 'confirmDeleteProduct()'); Modals.deleteConfirm.show(); }
async function confirmDeleteProduct() { await callApi('deleteProduct', { id: document.getElementById('orderIdToDelete').value }); showToast('Éxito', 'Producto eliminado', 'info'); Modals.deleteConfirm.hide(); showView('productsView'); document.querySelector('#deleteConfirmModal .btn-danger').setAttribute('onclick', 'confirmDelete()'); }

function viewReceipt(id) {
    const o = orders.find(x => x.id == id);
    if (!o) return;

    document.getElementById('receiptOrderId').textContent = `#${o.id}`;
    document.getElementById('receiptContentWrapper').innerHTML = generateReceiptHTML(o);
    document.getElementById('customMessageInput').value = o.receiptMessage || '';

    const msgContainer = document.getElementById('predefinedMessages');
    msgContainer.innerHTML = '';
    predefinedMessages.forEach(msg => {
        const btn = document.createElement('button');
        btn.className = "btn btn-sm btn-light me-1 mb-1 border";
        btn.textContent = msg;
        btn.onclick = () => { document.getElementById('customMessageInput').value = msg; };
        msgContainer.appendChild(btn);
    });

    Modals.receipt.show();

    setTimeout(() => {
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = "";
        try {
            let cleanPath = window.location.protocol + "//" + window.location.host + window.location.pathname;
            cleanPath = cleanPath.replace('index.html', '');
            if (cleanPath.endsWith('/')) { cleanPath = cleanPath.slice(0, -1); }
            const qrUrl = `${cleanPath}/ver_recibo.php?id=${o.id}`;
            new QRCode(qrContainer, { text: qrUrl, width: 128, height: 128, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.M });
        } catch(e) { console.error("Error QR:", e); qrContainer.innerHTML = "<small class='text-muted'>Error al generar QR</small>"; }
    }, 100);
}

function generateReceiptHTML(o) {
    const total = o.finalAmount;
    const baseImponible = total / 1.18;
    const igvAmount = total - baseImponible;

    const docTitle = (o.docType === 'factura') ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA';
    const rucHtml = (o.docType === 'factura' && o.ruc) ? `<p class="mb-1"><strong>RUC/DNI Cliente:</strong> ${o.ruc}</p>` : '';

    const fullNotes = o.orderNotes || '';
    const cakeMatch = fullNotes.match(/\[CAKE:(.*?)\]/);
    const cakeType = cakeMatch ? cakeMatch[1] : "No especificado";
    const cleanNotes = fullNotes.replace(/\[CAKE:.*?\]\s*/, '').trim();

    const productName = o.details;

    let discHTML = o.discount > 0 ? `<li class="d-flex justify-content-between small text-danger"><span>Desc (${o.discount}%):</span><span>-S/ ${(o.amount * o.discount / 100).toFixed(2)}</span></li>` : '';
    let notesHTML = cleanNotes ? `<div class="mt-2 p-2 bg-warning bg-opacity-10 border border-warning rounded small mb-0"><strong>Nota Pedido:</strong> ${cleanNotes}</div>` : '';

    return `
    <div class="font-monospace text-secondary">
        <div class="text-center mb-3">
            <h5 class="fw-bold text-dark mb-0">${docTitle}</h5>
            <small>RUC: 20123456789</small>
        </div>
        <div class="border-bottom pb-2 mb-2">
            <p class="mb-1"><strong>Fecha:</strong> ${o.date}</p>
            <p class="mb-1"><strong>Cliente:</strong> ${o.client.name}</p>
            ${rucHtml}
        </div>
        <div class="mb-3">
            <p class="fw-bold fs-6 mb-1">${productName}</p>
            <p class="mb-1"><strong>Tipo Queque:</strong> ${cakeType}</p> 
            ${notesHTML}
        </div>
        
        <ul class="list-unstyled border-top pt-2 mt-2">
            <li class="d-flex justify-content-between small"><span>Op. Gravada:</span><span>S/ ${baseImponible.toFixed(2)}</span></li>
            <li class="d-flex justify-content-between small"><span>IGV (18%):</span><span>S/ ${igvAmount.toFixed(2)}</span></li>
            ${discHTML}
            <li class="d-flex justify-content-between fs-4 fw-bold text-primary mt-2 border-top pt-1">
                <span>TOTAL:</span><span>S/ ${o.finalAmount.toFixed(2)}</span>
            </li>
        </ul>
    </div>`;
}

async function saveCustomMessage() {
    const id = document.getElementById('receiptOrderId').textContent.replace('#', '');
    await callApi('saveCustomMessage', { id: id, message: document.getElementById('customMessageInput').value });
    const order = orders.find(o => o.id == id);
    if(order) order.receiptMessage = document.getElementById('customMessageInput').value;
    showToast('Guardado', 'Mensaje actualizado', 'success');
}

function printReceipt() {
    const content = document.getElementById('receiptContentWrapper').innerHTML;
    const msg = document.getElementById('customMessageInput').value;

    const qrContainer = document.getElementById('qrcode');
    let qrHtml = '';

    if (qrContainer) {
        const qrCanvas = qrContainer.querySelector('canvas');
        const qrImg = qrContainer.querySelector('img');

        if (qrCanvas) {
            qrHtml = `<img src="${qrCanvas.toDataURL()}" width="150" height="150" style="display:block; margin: 10px auto;">`;
        } else if (qrImg && qrImg.src) {
            qrHtml = `<img src="${qrImg.src}" width="150" height="150" style="display:block; margin: 10px auto;">`;
        }
    }

    const win = window.open('', '', 'height=700,width=500');

    win.document.write(`
        <html>
            <head>
                <title>Imprimir Recibo</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 400px; margin: 0 auto; text-align: center; }
                    h2 { margin: 0; color: #ec4899; text-align: center; text-transform: uppercase; } 
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; border-top: 2px dashed #ccc; padding-top: 10px; }
                    .qr-box { text-align: center; margin: 20px 0; display: flex; justify-content: center; }
                    ul { padding: 0; list-style: none; text-align: left; }
                    li { display: flex; justify-content: space-between; margin-bottom: 5px; }
                </style>
            </head>
            <body>
                <h2>RS Pedidos</h2>
                <p style="margin-bottom:20px; font-size: 14px;">Dulces momentos</p>
                
                <div style="text-align: left;">
                    ${content}
                </div>

                <div class="qr-box">
                    ${qrHtml}
                </div>

                <div class="footer">
                    <p><strong>${msg}</strong></p>
                    <p>¡Gracias por su preferencia!</p>
                </div>
            </body>
        </html>
    `);

    win.document.close();
    win.focus();

    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
}

async function login(e) {
    e.preventDefault();
    const r = await callApi('login', { email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value });
    if (r.success) {
        sessionStorage.setItem('loggedInUser', r.user.name);
        sessionStorage.setItem('loggedInUserRole', r.user.role);
        await loadDataFromServer();
        showView(r.user.role === 'admin' ? 'dashboardView' : 'ordersView');
    } else {
        showToast('Error', r.message, 'danger');
    }
}

async function register(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (name.length < 3) {
        showToast('Error', 'El nombre debe tener al menos 3 caracteres.', 'danger');
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        showToast('Error', 'El formato del email no es válido.', 'danger');
        return;
    }
    if (password.length < 6) {
        showToast('Error', 'La contraseña debe tener al menos 6 caracteres.', 'danger');
        return;
    }

    const role = 'admin';

    const r = await callApi('registerUser', { name, email, password, role });

    if (r.success) {
        showToast('Éxito', 'Cuenta creada. Inicia sesión.', 'success');
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = password;
        toggleAuthMode('login');
    } else {
        showToast('Error', r.message, 'danger');
    }
}

async function recoverPass(e) {
    e.preventDefault();
    const email = document.getElementById('recoverEmail').value;
    const newPassword = document.getElementById('recoverPassword').value;

    if (!email || !newPassword) {
        showToast('Atención', 'Rellena todos los campos.', 'warning');
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        showToast('Error', 'El formato del email no es válido.', 'danger');
        return;
    }
    if (newPassword.length < 6) {
        showToast('Error', 'La nueva contraseña debe tener al menos 6 caracteres.', 'danger');
        return;
    }

    const r = await callApi('recoverPassword', { email, newPassword });

    if (r.success) {
        showToast('Éxito', 'Contraseña actualizada. Ingresa ahora.', 'success');
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = newPassword;
        toggleAuthMode('login');
    } else {
        showToast('Error', r.message, 'danger');
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = '/logout';
}

function populateClientDatalist() {
    // datalist reemplazado por dropdown personalizado
}

function handleClientSelection() {
    const val = document.getElementById('clientSearchInput').value;
    const exists = clients.some(c => c.name === val);
    document.getElementById('editClientBtn').disabled = !exists;
    closeClientDropdown();
}

function populateProductSelect() {
    const s = document.getElementById('orderProductSelect');
    s.innerHTML = '<option disabled selected value="">-- Seleccionar --</option>' + products.map(p => `<option value="${p.id}" data-price="${p.precio_base}">${p.nombre} - S/ ${p.precio_base.toFixed(2)}</option>`).join('');
}

function updateOrderAmountFromProduct() {
    const s = document.getElementById('orderProductSelect');
    if (s.selectedIndex < 0) return;
    const p = s.options[s.selectedIndex].dataset.price;
    if (p) document.getElementById('orderAmount').value = parseFloat(p).toFixed(2);
}

function getStatusInfo(s) {
    const m = { pending: { text: 'Pendiente', bsClass: 'bg-warning text-dark', next: 'in_progress' }, in_progress: { text: 'En Proceso', bsClass: 'bg-info text-dark', next: 'completed' }, completed: { text: 'Completado', bsClass: 'bg-success', next: 'pending' } };
    return m[s] || m.pending;
}

function showToast(t, m, type) {
    const toastContainer = document.getElementById('toastContainer');
    const id = 'toast-' + Date.now();
    const colorClass = type === 'success' ? 'text-bg-success' : (type === 'danger' ? 'text-bg-danger' : 'text-bg-primary');
    const html = `<div id="${id}" class="toast align-items-center ${colorClass} border-0 show" role="alert" aria-live="assertive" aria-atomic="true"><div class="d-flex"><div class="toast-body"><strong>${t}</strong>: ${m}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" onclick="document.getElementById('${id}').remove()"></button></div></div>`;
    const div = document.createElement('div');
    div.innerHTML = html;
    toastContainer.appendChild(div.firstElementChild);
    setTimeout(() => { const el = document.getElementById(id); if(el) el.remove(); }, 4000);
}

function toggleSidebar() {
    document.getElementById('sidebarMenu').classList.toggle('show');
}

function validateOrderInputs(amountValue, dateValue) {
    const amount = parseFloat(amountValue);

    if (isNaN(amount) || amount < 0) {
        showToast('Error de Validación', 'El monto del pedido no puede ser negativo.', 'danger');
        return false;
    }

    let inputDateStr = dateValue;

    const inputDate = new Date(inputDateStr);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    inputDate.setHours(0, 0, 0, 0);

    if (inputDate < today) {
        showToast('Error de Validación', 'La fecha de entrega no puede ser anterior a la fecha actual.', 'danger');
        return false;
    }

    return true;
}
function showClientDropdown(query) {
    let dropdown = document.getElementById('clientDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'clientDropdown';
        dropdown.style.cssText = 'position:absolute;z-index:9999;background:#fff;border:1px solid #ddd;border-radius:8px;max-height:200px;overflow-y:auto;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.1);';
        const wrapper = document.getElementById('clientSearchInput').parentElement;
        wrapper.style.position = 'relative';
        wrapper.appendChild(dropdown);
    }
    // Si el valor coincide exactamente con un cliente, no mostrar dropdown
    const exactMatch = clients.some(c => c.name === query);
    if (exactMatch || query.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    const filtered = clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
    if (filtered.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    dropdown.innerHTML = filtered.map(c =>
        `<div onclick="selectClient('${c.name.replace(/'/g,"\\'")}', ${c.id})"
              style="padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f0f0f0;"
              onmouseover="this.style.background='#fdf0f7'" onmouseout="this.style.background='#fff'">
            ${c.name}
        </div>`
    ).join('');
    dropdown.style.display = 'block';
}

function selectClient(name, id) {
    document.getElementById('clientSearchInput').value = name;
    document.getElementById('editClientBtn').disabled = false;
    closeClientDropdown();
}

function closeClientDropdown() {
    const d = document.getElementById('clientDropdown');
    if (d) d.style.display = 'none';
}