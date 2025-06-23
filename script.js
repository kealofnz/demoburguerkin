document.addEventListener('DOMContentLoaded', async () => {
    const loader           = document.getElementById('loader');
    const productContainer = document.getElementById('productContainer');

    // Mostrar la animación de carga al inicio
    productContainer.style.display = 'none';
    loader.style.display           = 'block';

    try {
        /* ------------------------------------------------------------------
           Llamada a la función serverless /api/products (Vercel) que lee
           la tabla PRODUCTOS en tu base MySQL de Hostinger.
           ------------------------------------------------------------------ */
        const response = await fetch('/api/products');

        // Verificar si la respuesta fue exitosa
        if (!response.ok) {
            let errorBody = 'No details available';
            try { errorBody = await response.text(); } catch (e) {
                console.error('Could not parse error response body:', e);
            }
            throw new Error(`Error al obtener los datos. Status: ${response.status}. Body: ${errorBody}`);
        }

        const products = await response.json();

        if (products.length > 0) {
            console.log('Productos obtenidos:', products); // Debug

            // Mostrar las categorías y los productos
            const categories = getUniqueCategories(products);
            displayCategories(categories);
            displayProducts(groupProductsByName(products));

            // Ocultar loader y mostrar productos
            loader.style.display           = 'none';
            productContainer.style.display = 'block';
        } else {
            console.warn('No hay productos disponibles en la base de datos.');
            productContainer.innerHTML     = '<p>No hay productos disponibles en este momento.</p>';
            productContainer.style.display = 'block';
            loader.style.display           = 'none';
        }
    } catch (error) {
        console.error('Error al cargar los productos:', error);
        alert('Hubo un problema al cargar los datos. Por favor, revisa la consola para más detalles o intenta nuevamente más tarde.');
        loader.style.display           = 'none';
        productContainer.innerHTML     = '<p>Error al cargar los productos. Intenta refrescar la página.</p>';
        productContainer.style.display = 'block';
    }
});


// Función para obtener categorías únicas
function getUniqueCategories(products) {
    const categories = new Set();
    products.forEach(product => {
        if (product.Categoría) {
            categories.add(product.Categoría);
        }
    });
    return Array.from(categories);
}

// Función para mostrar las categorías en el menú lateral
function displayCategories(categories) {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) {
        console.error("El contenedor de la lista de categorías no se encontró.");
        return;
    }

    categoryList.innerHTML = ''; // Limpiar solo las categorías existentes

    const allCategoriesLink = document.createElement('a');
    allCategoriesLink.href = 'javascript:void(0)';
    allCategoriesLink.textContent = 'Todas las categorías';
    allCategoriesLink.onclick = () => filterProducts('all');
    categoryList.appendChild(allCategoriesLink);

    categories.forEach(category => {
        const categoryLink = document.createElement('a');
        categoryLink.href = 'javascript:void(0)';
        categoryLink.textContent = category;
        categoryLink.onclick = () => filterProducts(category);
        categoryList.appendChild(categoryLink);
    });
}

function groupProductsByName(products) {
    return products.reduce((grouped, product) => {
        // Usa el nombre del producto como clave
        const name = product.Nombre || "Sin nombre";
        
        // Si no existe la clave, inicializa un array vacío
        if (!grouped[name]) {
            grouped[name] = [];
        }
        
        // Agrega el producto al grupo correspondiente
        grouped[name].push(product);

        return grouped;
    }, {}); // El objeto inicial vacío
}



// Función para mostrar productos (MODIFICADA para manejar Estado)
function displayProducts(groupedProducts) {
    try {
        // Validar que el argumento sea un objeto válido
        if (!groupedProducts || typeof groupedProducts !== 'object' || Object.keys(groupedProducts).length === 0) {
            console.warn("No hay productos para mostrar o el formato de datos no es válido.");
            return;
        }

        const productContainer = document.querySelector('main');
        if (!productContainer) {
            throw new Error("El contenedor principal de productos no se encontró en el DOM.");
        }

        productContainer.innerHTML = ''; // Limpiar el contenedor

        const fragment = document.createDocumentFragment(); // Usar fragmento para optimizar el DOM

        // Iterar sobre los productos agrupados
        Object.keys(groupedProducts).forEach(productName => {
            const productOptions = groupedProducts[productName]; // Ahora usamos el array de opciones
            const product = productOptions?.[0]; // Tomar el primer producto como base para datos comunes

            if (!product) {
                console.warn(`El producto "${productName}" no tiene información válida. Se omitirá.`);
                return;
            }

            // --- NUEVO: Leer el estado del producto ---
            const estadoProducto = product.Estado || 'Activo'; // Asume 'Activo' si no está definido
            const isInactive = estadoProducto === 'Inactivo';
            // --- FIN NUEVO ---

            // Crear contenedor principal del producto
            const productDiv = document.createElement('div');
            productDiv.classList.add('menu-item');
            if (isInactive) {
                productDiv.classList.add('menu-item--inactive'); // Añadir clase para estilo de inactivo
            }
            productDiv.dataset.category = product.Categoría || 'Sin categoría';

            // Imagen del producto
            const img = document.createElement('img');
            img.src = product.Imagen || 'placeholder.jpg';
            img.alt = productName || 'Producto sin nombre';
            img.classList.add('item-image');
            productDiv.appendChild(img);

            // Información del producto
            const infoDiv = document.createElement('div');
            infoDiv.classList.add('item-info');
            productDiv.appendChild(infoDiv);

            // Encabezado del producto
            const headerDiv = document.createElement('div');
            headerDiv.classList.add('item-header');
            infoDiv.appendChild(headerDiv);

            // Título y precio
            const titleDiv = document.createElement('div');
            titleDiv.classList.add('item-title');
            headerDiv.appendChild(titleDiv);

            const title = document.createElement('h2');
            title.textContent = productName || 'Producto sin nombre';
            titleDiv.appendChild(title);

            const price = document.createElement('p');
            price.classList.add('price');
            if (!isNaN(product.Precio)) {
                price.textContent = `L${parseFloat(product.Precio).toFixed(2)}`;
            } else {
                console.warn(`El precio del producto "${productName}" no es válido.`);
                price.textContent = "Precio no disponible";
            }
            titleDiv.appendChild(price);

            // Botón de añadir al carrito (MODIFICADO)
            const addButton = document.createElement('button');
            addButton.classList.add('add-btn');

            if (isInactive) {
                addButton.textContent = 'NO DISPONIBLE';
                addButton.disabled = true; // Deshabilitar el botón
                addButton.classList.add('add-btn--disabled'); // Clase para estilo deshabilitado
            } else {
                addButton.textContent = 'AÑADIR+';
                addButton.addEventListener('click', () => {
                    // Asegúrate de pasar el array completo de opciones
                    if (productOptions && productOptions.length > 0) {
                        toggleModal(productName, productOptions);
                    } else {
                        console.error(`No hay opciones disponibles para el producto "${productName}".`);
                    }
                });
            }
            headerDiv.appendChild(addButton);

            // Descripción del producto
            const descriptionDiv = document.createElement('div');
            descriptionDiv.classList.add('item-description');
            infoDiv.appendChild(descriptionDiv);

            const description = document.createElement('p');
            description.textContent = product.Descripción || 'Sin descripción disponible.';
            descriptionDiv.appendChild(description);

             // --- NUEVO OPCIONAL: Mensaje de no disponibilidad ---
             if (isInactive) {
                const unavailableMsg = document.createElement('p');
                unavailableMsg.textContent = 'Producto no disponible temporalmente.';
                unavailableMsg.classList.add('item-unavailable-message'); // Clase para estilo
                infoDiv.appendChild(unavailableMsg); // Añadir después de la descripción
             }
             // --- FIN NUEVO OPCIONAL ---


            // Agregar el producto al fragmento
            fragment.appendChild(productDiv);
        });

        // Insertar los productos en el contenedor principal
        productContainer.appendChild(fragment);
    } catch (error) {
        console.error("Error al mostrar los productos:", error.message);
        alert("Hubo un problema al cargar los productos. Por favor, intenta nuevamente.");
    }
}



function filterProducts(category) {
    const allProducts = document.querySelectorAll('.menu-item');
    allProducts.forEach(product => {
        const productCategory = product.getAttribute('data-category');
        product.style.display = (category === 'all' || productCategory.toLowerCase() === category.toLowerCase()) ? 'flex' : 'none';
    });
    toggleMenu(); // Cerrar menú después de filtrar
}

function validateNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 ? num : defaultValue;
}



function updateTotalPrice(productOptions) {
    try {
        const sizeSelect = document.getElementById("productSize");
        const quantityInput = document.querySelector(".quantity-input");
        const extrasCheckboxes = document.querySelectorAll(".extras-options input[type='checkbox']:checked");
        const addButton = document.querySelector(".modal-add-btn");

        if (!sizeSelect || !quantityInput || !addButton) {
            throw new Error("Elementos necesarios no encontrados en el DOM.");
        }

        const sizeValue = validateNumber(sizeSelect.value, productOptions[0]?.Precio);
        const quantity = Math.max(validateNumber(quantityInput.value, 1), 1);

        const extrasTotal = Array.from(extrasCheckboxes)
            .reduce((sum, extra) => sum + validateNumber(extra.value), 0);

        const totalPrice = (sizeValue + extrasTotal) * quantity;

        addButton.textContent = `Añadir L${totalPrice.toFixed(2)}`;
    } catch (error) {
        console.error("Error en updateTotalPrice:", error.message);
    }
}



// Función principal para configurar y mostrar el modal (MODIFICADA con chequeo de Estado)
function toggleModal(productName, productOptions) {
    try {
        // --- NUEVO: Comprobar estado antes de continuar ---
        if (productOptions?.[0]?.Estado === 'Inactivo') {
            console.warn(`Intento de abrir modal para producto inactivo: ${productName}`);
            alert('Este producto no está disponible en este momento.'); // Mensaje al usuario
            return; // No abrir el modal
        }
        // --- FIN NUEVO ---

        const modal = document.getElementById("modalProducto");
        const floatingCart = document.getElementById("floatingCart");

        if (!modal || !floatingCart) {
            throw new Error("El modal o el carrito flotante no se encontraron en el DOM.");
        }

        // Ocultar el modal si ya está abierto
        if (modal.style.display === "block") {
            modal.style.display = "none";
            floatingCart.style.display = "flex";
            return;
        }

        // Validar los datos del producto (ya se hizo la comprobación de estado arriba)
        if (!productName || !productOptions || !Array.isArray(productOptions) || productOptions.length === 0) {
            throw new Error("Los detalles del producto no son válidos.");
        }

        // Obtener límite de extras (con el nombre correcto de tu campo)
        const limiteExtrasRaw = productOptions[0]?.['Limite de Extras'];
        const maxExtras = typeof limiteExtrasRaw === 'number' && limiteExtrasRaw >= 0
                            ? limiteExtrasRaw
                            : Infinity;
        console.log(`Límite de extras para ${productName}: ${maxExtras === Infinity ? 'Sin límite' : maxExtras}`);


        // Configurar título y descripción del modal
        document.querySelector(".modal-title").textContent = productName;
        document.querySelector(".modal-description").textContent =
            productOptions[0]?.Descripción || "Sin descripción disponible.";

        const sizeSelect = document.getElementById("productSize");
        if (!sizeSelect) {
            throw new Error("El elemento de selección de tamaño no se encontró en el DOM.");
        }

        // Configurar selector de tamaños (sin cambios)
        // ... (resto del código de configuración de tamaños) ...
        sizeSelect.innerHTML = '';
        const hasSizes = productOptions.some(option => option.Tamaño);

        if (hasSizes) {
            productOptions.forEach((option, index) => {
                if (option.Tamaño && !isNaN(option.Precio)) {
                    const sizeOption = document.createElement("option");
                    sizeOption.value = option.Precio;
                    sizeOption.textContent = `${option.Tamaño} - L${parseFloat(option.Precio).toFixed(2)}`;
                    if (index === 0) sizeOption.selected = true;
                    sizeSelect.appendChild(sizeOption);
                } else {
                    console.warn(`Opción de tamaño inválida para "${productName}":`, option);
                }
            });
            sizeSelect.style.display = "block";
        } else {
            sizeSelect.style.display = "none";
             if (productOptions[0] && !isNaN(productOptions[0].Precio)) {
                 document.querySelector(".modal-add-btn").textContent = `Añadir L${parseFloat(productOptions[0].Precio).toFixed(2)}`;
             } else {
                 document.querySelector(".modal-add-btn").textContent = `Añadir (Precio no disp.)`;
                 console.warn(`Precio base no válido para ${productName}`);
             }
        }

        // Configurar extras (sin cambios en la lógica de límite)
        // ... (resto del código de configuración de extras con la lógica de maxExtras) ...
        const extrasContainer = document.querySelector(".extras-options");
        if (!extrasContainer) {
            throw new Error("El contenedor de extras no se encontró en el DOM.");
        }
        extrasContainer.innerHTML = '';

        if (productOptions[0]?.Extras && maxExtras > 0) {
            const extras = productOptions[0].Extras.split(',').map(extra => extra.trim());
            extras.forEach(extra => {
                const [name, price] = extra.split(':');
                const parsedPrice = parseFloat(price);
                if (name && !isNaN(parsedPrice)) {
                    const label = document.createElement('label');
                    const checkboxId = `extra-${name.trim().replace(/\s+/g, '-')}-${Date.now()}`;
                    label.innerHTML = `
                        <input type="checkbox" id="${checkboxId}" value="${parsedPrice}" data-extra-name="${name.trim()}"> ${name.trim()} - L${parsedPrice.toFixed(2)}
                    `;

                    const checkbox = label.querySelector('input');
                    checkbox.addEventListener('change', function() {
                        const allCheckboxes = extrasContainer.querySelectorAll('input[type="checkbox"]');
                        const checkedCheckboxes = extrasContainer.querySelectorAll('input[type="checkbox"]:checked');
                        const checkedCount = checkedCheckboxes.length;

                        if (checkedCount >= maxExtras) {
                            allCheckboxes.forEach(cb => {
                                if (!cb.checked) {
                                    cb.disabled = true;
                                    cb.parentElement.classList.add('disabled-extra');
                                }
                            });
                            if (this.checked && checkedCount > maxExtras) {
                                 this.checked = false;
                                 alert(`Solo puedes seleccionar un máximo de ${maxExtras} extras.`);
                            }
                        } else {
                            allCheckboxes.forEach(cb => {
                                cb.disabled = false;
                                cb.parentElement.classList.remove('disabled-extra');
                            });
                        }
                        updateTotalPrice(productOptions);
                    });
                    extrasContainer.appendChild(label);
                } else {
                    console.warn(`Extra inválido detectado para "${productName}":`, extra);
                }
            });
        } else if (maxExtras === 0) {
             extrasContainer.innerHTML = "<p>Este producto no permite seleccionar extras.</p>";
        } else {
            extrasContainer.innerHTML = "<p>No hay extras disponibles para este producto.</p>";
        }


        // Configurar cantidad y botones de ajuste (sin cambios)
        // ... (resto del código de configuración de cantidad y botones +/-) ...
        const quantityInput = document.querySelector(".quantity-input");
        const increaseBtn = document.querySelector(".quantity-plus");
        const decreaseBtn = document.querySelector(".quantity-minus");
        const updatePriceHandler = () => updateTotalPrice(productOptions); // Handler para remover listeners

        if (quantityInput) {
            quantityInput.value = 1;
            quantityInput.removeEventListener('input', updatePriceHandler); // Limpiar listener previo
            quantityInput.addEventListener('input', updatePriceHandler);
        }

        if (increaseBtn) {
            const newIncreaseBtn = increaseBtn.cloneNode(true);
            increaseBtn.parentNode.replaceChild(newIncreaseBtn, increaseBtn);
            newIncreaseBtn.onclick = () => {
                const currentValue = parseInt(quantityInput.value) || 1;
                quantityInput.value = currentValue + 1;
                updateTotalPrice(productOptions);
            };
        }

        if (decreaseBtn) {
            const newDecreaseBtn = decreaseBtn.cloneNode(true);
            decreaseBtn.parentNode.replaceChild(newDecreaseBtn, decreaseBtn);
            newDecreaseBtn.onclick = () => {
                const currentValue = parseInt(quantityInput.value) || 1;
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                    updateTotalPrice(productOptions);
                }
            };
        }


        // Mostrar el modal
        modal.style.display = "block";
        floatingCart.style.display = "none";

        // Actualizar precio inicial
        updateTotalPrice(productOptions);

        // Listener para tamaños
        sizeSelect.removeEventListener('change', updatePriceHandler); // Limpiar listener previo
        sizeSelect.addEventListener('change', updatePriceHandler);


    } catch (error) {
        console.error("Error en toggleModal:", error.message);
        alert("Hubo un problema al abrir el modal. Por favor, inténtalo de nuevo.");
         const modal = document.getElementById("modalProducto");
         const floatingCart = document.getElementById("floatingCart");
         if (modal) modal.style.display = "none";
         if (floatingCart) floatingCart.style.display = "flex";
    }
}

// Asegúrate de tener también la función updateTotalPrice disponible
// y el CSS opcional si lo deseas.




function toggleMenu() {
    try {
        const menu = document.getElementById("side-menu");
        if (!menu) {
            throw new Error("El elemento del menú lateral no se encontró en el DOM.");
        }

        // Determinar si el menú está abierto o cerrado
        const isMenuHidden = menu.style.left === "-250px" || menu.style.left === "";
        console.log(`Menú antes del cambio: ${isMenuHidden ? "Cerrado" : "Abierto"}`);

        // Alternar estado del menú
        if (isMenuHidden) {
            showMenu(menu);
        } else {
            hideMenu(menu);
        }

        console.log(`Menú después del cambio: ${menu.style.left === "0px" ? "Abierto" : "Cerrado"}`);
    } catch (error) {
        console.error("Error al alternar el menú:", error.message);
    }
}

// Mostrar el menú
function showMenu(menu) {
    menu.style.left = "0px";
    console.log("Menú abierto");

    // Agregar evento para cerrar al hacer clic fuera del menú
    setTimeout(() => {
        document.addEventListener('click', closeMenuOnClickOutside);
    }, 0);
}

// Ocultar el menú
function hideMenu(menu) {
    menu.style.left = "-250px";
    console.log("Menú cerrado");

    // Eliminar el evento para cerrar al hacer clic fuera del menú
    document.removeEventListener('click', closeMenuOnClickOutside);
}

// Cerrar el menú al hacer clic fuera de él
function closeMenuOnClickOutside(event) {
    const menu = document.getElementById("side-menu");
    const menuButton = document.querySelector(".menu-icon"); // Botón para abrir el menú

    if (!menu) {
        console.warn("Intento de cerrar el menú, pero no se encontró el elemento del menú lateral.");
        return;
    }

    // Verifica si el clic ocurrió fuera del menú y del botón que lo abre
    if (!menu.contains(event.target) && event.target !== menuButton) {
        hideMenu(menu); // Ocultar el menú
    }
}


// Función optimizada para mostrar/ocultar el modal del carrito
function toggleCartModal() {
    try {
        // Referencias a los elementos del DOM
        const modal = document.getElementById("cartModal");
        const floatingCart = document.getElementById("floatingCart");

        // Validar que ambos elementos existan
        if (!modal) throw new Error("No se encontró el modal del carrito en el DOM.");
        if (!floatingCart) throw new Error("No se encontró el carrito flotante en el DOM.");

        // Alternar visibilidad del modal y el carrito flotante
        const isModalVisible = modal.style.display === "block";
        modal.style.display = isModalVisible ? "none" : "block";
        floatingCart.style.display = isModalVisible ? "flex" : "none";

        // Renderizar contenido del carrito solo si se está mostrando el modal
        if (!isModalVisible) {
            renderCart();
        }
    } catch (error) {
        console.error("Error en toggleCartModal:", error.message);
    }
}



// Declarar el carrito globalmente
let cart = [];



function addToCart() {
    try {
        const productName = document.querySelector(".modal-title")?.textContent.trim() || '';
        const sizeSelect = document.getElementById("productSize");
        const hasSizes = sizeSelect && sizeSelect.style.display !== "none";

        // Obtener el precio total calculado en el modal del producto
        const addButton = document.querySelector(".modal-add-btn");
        const totalPrice = parseFloat(addButton.textContent.replace(/[^0-9.]/g, "")); // Captura el precio del botón
        const quantity = Math.max(validateNumber(document.querySelector(".quantity-input")?.value, 1), 1);

        const extras = Array.from(document.querySelectorAll(".extras-options input[type='checkbox']:checked"))
            .map(extra => ({
                name: extra.getAttribute("data-extra-name")?.trim() || "Extra desconocido",
                price: validateNumber(extra.value)
            }));

        const uniqueKey = `${productName}_${hasSizes ? sizeSelect?.selectedOptions[0]?.textContent.trim() : 'default'}_${extras.map(extra => extra.name).join(",")}`;
        const existingIndex = cart.findIndex(product => product.key === uniqueKey);

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                key: uniqueKey,
                name: productName,
                size: hasSizes ? sizeSelect?.selectedOptions[0]?.textContent.trim() : null,
                basePrice: totalPrice / quantity, // Guardar el precio unitario correctamente
                quantity,
                extras: [...extras]
            });
        }

        updateCartDetails();
        renderCart();
        closeProductModal();
    } catch (error) {
        console.error("Error en addToCart:", error.message);
    }
}



function updateCartDetails() {
    try {
        const cartItemsElement = document.getElementById("cartItems");
        const cartTotalElement = document.getElementById("cartTotal");
        const totalAmountElement = document.getElementById("totalAmount");

        let totalQuantity = 0;
        let totalAmount = 0;

        cart.forEach(product => {
            const validQuantity = Math.max(validateNumber(product.quantity), 1);
            totalQuantity += validQuantity;
            totalAmount += validateNumber(product.basePrice) * validQuantity;
        });

        if (cartItemsElement) cartItemsElement.textContent = `${totalQuantity} ARTÍCULO${totalQuantity !== 1 ? 'S' : ''}`;
        if (cartTotalElement) cartTotalElement.textContent = `L${totalAmount.toFixed(2)}`;
        if (totalAmountElement) totalAmountElement.textContent = `L${totalAmount.toFixed(2)}`;
    } catch (error) {
        console.error("Error en updateCartDetails:", error.message);
    }
}


function renderCart() {
    try {
        const cartItemsContainer = document.querySelector(".cart-items");
        const cartTotalElement = document.querySelector(".cart-total span:last-child");

        if (!cartItemsContainer || !cartTotalElement) {
            throw new Error("Elementos necesarios del carrito no encontrados en el DOM.");
        }

        cartItemsContainer.innerHTML = ""; // Limpiar el contenedor
        let totalAmount = 0;

        cart.forEach(product => {
            // Calcula el total por producto usando basePrice y quantity
            const productTotal = validateNumber(product.basePrice) * product.quantity;
            totalAmount += productTotal;

            // Crea el elemento del producto en el carrito
            const cartItem = document.createElement("div");
            cartItem.classList.add("cart-item");
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <span>${product.name} ${product.size ? `(${product.size})` : ''}</span>
                    <div class="quantity-controls">
                        <button class="quantity-minus" onclick="updateCartQuantity('${product.key}', -1)">-</button>
                        <input type="number" class="quantity-input" value="${product.quantity}" min="1" readonly>
                        <button class="quantity-plus" onclick="updateCartQuantity('${product.key}', 1)">+</button>
                    </div>
                    <span class="item-price">L${productTotal.toFixed(2)}</span>
                    <button class="remove-item" onclick="removeFromCart('${product.key}')">&times;</button>
                </div>
                ${product.extras.length ? `<p class="cart-item-extras">Extras: ${product.extras.map(extra => `${extra.name} - L${extra.price.toFixed(2)}`).join(", ")}</p>` : ''}
            `;

            cartItemsContainer.appendChild(cartItem);
        });

        cartTotalElement.textContent = `L${totalAmount.toFixed(2)}`;
    } catch (error) {
        console.error("Error en renderCart:", error.message);
    }
}







function removeFromCart(productKey) {
    // Filtrar el carrito y eliminar el producto con la clave dada
    cart = cart.filter(product => product.key !== productKey);
    updateCartDetails();
    renderCart();
}

// Hacerla global si es necesario
window.removeFromCart = removeFromCart;



// Mostrar/Ocultar monto a pagar en efectivo
document.getElementById("paymentType").addEventListener("change", function() {
    const paymentType = this.value;
    const cashAmountSection = document.getElementById("cashAmountSection");
    cashAmountSection.style.display = paymentType === "efectivo" ? "block" : "none";
    if (paymentType !== "efectivo") {
        document.getElementById("cashAmount").value = ''; // Limpiar el monto en efectivo si cambia de método de pago
        document.getElementById("changeAmount").textContent = "$0.00";
    }
});

// Event Listener para calcular cambio automáticamente al ingresar monto en efectivo
document.getElementById("cashAmount").addEventListener("input", calculateChange);


function calculateChange() {
    try {
        const cashAmount = validateNumber(document.getElementById("cashAmount").value);
        const totalAmount = validateNumber(document.getElementById("totalAmount").textContent.replace("L", "").trim());
        const changeAmountElement = document.getElementById("changeAmount");

        const change = Math.max(cashAmount - totalAmount, 0);
        changeAmountElement.textContent = `L${change.toFixed(2)}`;
    } catch (error) {
        console.error("Error en calculateChange:", error.message);
    }
}

function updateCartQuantity(productKey, change) {
    try {
        const productIndex = cart.findIndex(product => product.key === productKey);
        if (productIndex === -1) return;

        const product = cart[productIndex];
        const newQuantity = Math.max(product.quantity + change, 0);

        if (newQuantity === 0) {
            cart.splice(productIndex, 1);
        } else {
            product.quantity = newQuantity;
        }

        updateCartDetails();
        renderCart();
    } catch (error) {
        console.error("Error en updateCartQuantity:", error.message);
    }
}

function updateQuantity(change) {
    try {
        const quantityInput = document.querySelector(".quantity-input");
        if (!quantityInput) {
            throw new Error("El campo de entrada para la cantidad no se encontró en el DOM.");
        }

        const currentValue = parseInt(quantityInput.value, 10) || 1;
        const newValue = currentValue + change;

        if (newValue >= 1) {
            quantityInput.value = newValue;

            // Llamar a updateTotalPrice para actualizar el precio del botón
            const productOptions = JSON.parse(quantityInput.dataset.productOptions || "[]"); // Suponer que las opciones del producto se pasan aquí
            updateTotalPrice(productOptions);
        } else {
            console.warn("No se permiten cantidades menores a 1.");
        }
    } catch (error) {
        console.error("Error al actualizar la cantidad:", error.message);
    }
}

// Función para mostrar/ocultar campos adicionales en el formulajrio del carrito
function toggleTableNumberField() {
    const orderTypeSelect = document.getElementById("orderTypeSelect");
    const tableNumberContainer = document.getElementById("tableNumberContainer");
    const addressContainer = document.getElementById("addressContainer");
    const phoneContainer = document.getElementById("phoneContainer");
    const locationContainer = document.getElementById("locationContainer");

    const isDomicilio = orderTypeSelect.value === "domicilio";

    tableNumberContainer.style.display = orderTypeSelect.value === "mesa" ? "block" : "none";
    addressContainer.style.display = isDomicilio || orderTypeSelect.value === "llevar" ? "block" : "none";
    phoneContainer.style.display = isDomicilio || orderTypeSelect.value === "llevar" ? "block" : "none";
    locationContainer.style.display = isDomicilio ? "block" : "none"; // Mostrar el botón de ubicación solo para pedidos a domicilio
}

let customerLocation = null;
let map = null; // Variable para almacenar la instancia del mapa

function getLocation() {
    if (navigator.geolocation) {
        document.getElementById("locationStatus").textContent = "Capturando ubicación...";
        navigator.geolocation.getCurrentPosition(
            position => {
                customerLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                document.getElementById("locationStatus").textContent = "Ubicación capturada";
                
                // Mostrar el contenedor del mapa y actualizar la ubicación en el minimapa
                document.getElementById("miniMap").style.display = "block";
                showMiniMap(customerLocation.latitude, customerLocation.longitude);
            },
            error => {
                document.getElementById("locationStatus").textContent = "Error al capturar ubicación.";
                console.error("Error de geolocalización:", error);
            }
        );
    } else {
        document.getElementById("locationStatus").textContent = "Geolocalización no disponible.";
    }
}

function showMiniMap(lat, lon) {
    if (!map) {
        // Inicializar el mapa solo una vez
        map = L.map('miniMap').setView([lat, lon], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
        L.marker([lat, lon]).addTo(map).bindPopup("Tu ubicación actual").openPopup();
    } else {
        // Si el mapa ya existe, actualiza la vista y el marcador
        map.setView([lat, lon], 15);
        L.marker([lat, lon]).addTo(map).bindPopup("Tu ubicación actual").openPopup();
    }
}





function submitOrder() {
    try {
        // Generar un número de pedido aleatorio
        const orderNumber = Math.floor(Math.random() * 1000000);
        const orderDate = new Date().toLocaleString(); // Fecha y hora del pedido

        // Obtener los datos del cliente
        const orderType = document.getElementById("orderTypeSelect").value;
        const tableNumber = document.getElementById("tableNumberInput").value;
        const customerName = document.getElementById("customerName").value || "Cliente no identificado";
        const customerAddress = document.getElementById("customerAddress").value || "No proporcionada";
        const customerPhone = document.getElementById("customerPhone").value || "No proporcionado";
        const paymentType = document.getElementById("paymentType").value;
        const cashAmount = document.getElementById("cashAmount").value || 0;
        const changeAmount = document.getElementById("changeAmount").textContent || "L0.00";
        const totalAmount = document.getElementById("totalAmount").textContent || "L0.00";

        // Generar el mensaje tipo factura
        let message = `*Orden #:* ${orderNumber}\n`;
        message += `*Fecha de Pedido:* ${orderDate}\n`;
        message += `*Nombre del Cliente:* ${customerName}\n`;
        if (orderType === "mesa") {
            message += `*Número de Mesa:* ${tableNumber}\n`;
        }
        if (orderType === "llevar" || orderType === "domicilio") {
            message += `*Dirección:* ${customerAddress}\n`;
            message += `*Teléfono:* ${customerPhone}\n`;
            if (orderType === "domicilio" && customerLocation) {
                message += `*Ubicación:* https://maps.google.com/?q=${customerLocation.latitude},${customerLocation.longitude}\n`;
            }
        }
        message += `\n*Productos Pedidos:*\n`;

        // Listar los productos, incluyendo tamaño, extras y comentarios
        cart.forEach(product => {
            const productTotal = (validateNumber(product.basePrice) * product.quantity).toFixed(2);
            message += `- ${product.quantity}x ${product.name} ${product.size ? `(${product.size})` : ''} - L${productTotal}\n`;
            if (product.extras.length > 0) {
                message += `  *Extras:* ${product.extras.map(extra => `${extra.name} - L${extra.price.toFixed(2)}`).join(", ")}\n`;
            }
            if (product.comment) {
                message += `  *Comentario:* ${product.comment}\n`;
            }
            message += "----\n"; // Separador de productos
        });

        // Agregar detalles de entrega y pago
        message += `\n*Tipo de Pedido:* ${orderType}\n`;
        message += `*Método de Pago:* ${paymentType}\n`;
        if (paymentType === "efectivo") {
            message += `*Monto Pagado:* L${parseFloat(cashAmount).toFixed(2)}\n`;
            message += `*Cambio:* ${changeAmount}\n`;
        }
        message += `*Total:* ${totalAmount}\n`;

        // Codificar el mensaje para la URL de WhatsApp
        const encodedMessage = encodeURIComponent(message);
        const phoneNumber = "50497757736"; // Reemplaza con tu número de teléfono de WhatsApp
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        // Redirigir al usuario a WhatsApp
        window.open(whatsappUrl, "_blank");

        // Vaciar el carrito y limpiar campos como antes
        cart = [];
        updateCartDetails();
        renderCart();

        // Limpiar el campo del monto en efectivo y el cambio
        document.getElementById("cashAmount").value = '';
        document.getElementById("changeAmount").textContent = "L0.00";

        // Limpiar otros campos del formulario
        document.getElementById("orderTypeSelect").value = "";
        document.getElementById("tableNumberInput").value = "";
        document.getElementById("customerName").value = "";
        document.getElementById("customerAddress").value = "";
        document.getElementById("customerPhone").value = "";

        // Mostrar la tarjeta de confirmación de pedido enviado
        showOrderConfirmation();
    } catch (error) {
        console.error("Error en submitOrder:", error.message);
        alert("Hubo un problema al procesar tu pedido. Intenta nuevamente.");
    }
}







// Función para mostrar la tarjeta de confirmación de pedido enviado
function showOrderConfirmation() {
    // Crear el elemento de la tarjeta de confirmación
    const confirmationCard = document.createElement("div");
    confirmationCard.classList.add("card");
    confirmationCard.innerHTML = `
        <button class="dismiss" type="button" onclick="dismissOrderConfirmation()">×</button>
        <div class="header">
            <div class="image">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 7L9.00004 18L3.99994 13" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            </div>
            <div class="content">
                <span class="title">Orden Enviada</span>
                <p class="message">¡Gracias por tu orden! pronto nos pondremos en contacto contigo..</p>
            </div>
        </div>
    `;

    // Estilo para centrar la tarjeta en pantalla
    confirmationCard.style.position = "fixed";
    confirmationCard.style.top = "50%";
    confirmationCard.style.left = "50%";
    confirmationCard.style.transform = "translate(-50%, -50%)";
    confirmationCard.style.zIndex = "1000"; // Asegura que esté sobre otros elementos

    // Agregar la tarjeta al cuerpo del documento
    document.body.appendChild(confirmationCard);
}

// Función para cerrar la tarjeta de confirmación
function dismissOrderConfirmation() {
    const confirmationCard = document.querySelector(".card");
    if (confirmationCard) {
        confirmationCard.remove(); // Elimina la tarjeta del DOM
    }
}


// Función para abrir el modal del producto
function openProductModal(productName = '', productPrice = '', productDescription = '', extras = []) {
    const modal = document.getElementById("modalProducto");
    const floatingCart = document.getElementById("floatingCart");

    // Configurar los datos del producto en el modal
    document.querySelector(".modal-title").textContent = productName;
    document.querySelector(".modal-description").textContent = productDescription;
    document.querySelector(".modal-add-btn").textContent = `Añadir $${productPrice}`;
    document.querySelector(".quantity-input").value = 1;

    // Limpiar comentario y extras previos
    const commentField = document.getElementById("productComment");
    if (commentField) commentField.value = '';

    const extrasContainer = document.querySelector(".extras-options");
    extrasContainer.innerHTML = '';

    extras.forEach(extra => {
        extrasContainer.insertAdjacentHTML('beforeend', `
            <label><input type="checkbox" value="${extra}"> ${extra}</label>
        `);
    });

    // Mostrar el modal y ocultar el carrito flotante
    modal.style.display = "block";
    floatingCart.style.display = "none";
}

// Función para cerrar el modal del producto
function closeProductModal() {
    const modal = document.getElementById("modalProducto");
    const floatingCart = document.getElementById("floatingCart");

    // Ocultar el modal y mostrar el carrito flotante
    modal.style.display = "none";
    floatingCart.style.display = "flex";
}




