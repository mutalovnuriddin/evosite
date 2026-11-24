
document.addEventListener("DOMContentLoaded", () => {
    // Barcha bo'limlar va yon panel linklarini tanlab olamiz
    const sections = document.querySelectorAll(".menu-section");
    const navLinks = document.querySelectorAll(".category-item");

    // Ekranda qaysi qism turganini kuzatuvchi ob'ekt (IntersectionObserver)
    const observerOptions = {
        root: null,
        rootMargin: "-130px 0px -70% 0px", // Aktiv hududni sozlash
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Barcha linklardan "active" klassini olib tashlaymiz
                navLinks.forEach(link => link.classList.remove("active"));

                // Faqat ekrandagi bo'limga tegishli linkka "active" beramiz
                const activeId = entry.target.getAttribute("id");
                const activeLink = document.querySelector(`.category-item[href="#${activeId}"]`);
                if (activeLink) {
                    activeLink.classList.add("active");
                }
            }
        });
    }, observerOptions);

    // Har bir bo'limni kuzatuvga qo'shamiz
    sections.forEach(section => {
        observer.observe(section);
    });
});





document.addEventListener("DOMContentLoaded", async () => {
  
  // 1. Modallarni tanlab olish
  const modalOverlay = document.getElementById("productModal");
  const closeModalBtn = document.getElementById("closeModal");
  const productsArea = document.querySelector(".products-area");
  const categoryList = document.querySelector(".category-list");
  const slugify = (value) => value.toLocaleLowerCase("uz")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "kategoriya";

  const seedProducts = () => {
    const seeded = [];
    document.querySelectorAll(".menu-section").forEach((section) => {
      const category = section.querySelector(".category-header h2")?.textContent.trim() || "Menyu";
      section.querySelectorAll(".product-card").forEach((card) => {
        const title = card.querySelector(".product-title")?.textContent.trim();
        const price = card.querySelector(".product-price")?.textContent || "";
        const image = card.querySelector(".product-img img")?.src || "";
        if (!title) return;
        seeded.push({
          id: `${title.toLocaleLowerCase("uz")}|${Number(price.replace(/[^\d]/g, ""))}`,
          title,
          image,
          category,
          unitPrice: Number(price.replace(/[^\d]/g, "")) || 0,
          description: card.getAttribute("data-desc") || ""
        });
      });
    });
    return Array.from(new Map(seeded.map((product) => [product.id, product])).values());
  };

  try {
    if (!localStorage.getItem("evos-products")) {
      localStorage.setItem("evos-products", JSON.stringify(seedProducts()));
    }
  } catch (error) {
    console.error("Boshlang'ich mahsulotlar qurilmada keshlanmadi.", error);
  }

  const storageNotice = document.getElementById("storageNotice");
  const showStorageError = (message, error) => {
    if (error) console.error(message, error);
    storageNotice.textContent = message;
    storageNotice.hidden = false;
  };
  let storedProducts = [];
  try {
    const { data, error } = await window.db
      .from("products")
      .select("id,title,image,category,unit_price,description")
      .order("category")
      .order("title");
    if (error) throw error;
    storedProducts = data.map((product) => ({
      id: product.id,
      title: product.title,
      image: product.image,
      category: product.category,
      unitPrice: Number(product.unit_price),
      description: product.description || ""
    }));
  } catch (error) {
    showStorageError("Menyu Supabase'dan yuklanmadi. Bazani sozlash va internetni tekshiring.", error);
  }

  if (storedProducts.length > 0) {
    productsArea.replaceChildren();
    categoryList.replaceChildren();
    const groups = new Map();
    storedProducts.forEach((product) => {
      if (!groups.has(product.category)) groups.set(product.category, []);
      groups.get(product.category).push(product);
    });
    groups.forEach((items, category) => {
      const categoryId = slugify(category);
      const navItem = document.createElement("a");
      navItem.className = "category-item";
      navItem.href = `#${categoryId}`;
      navItem.innerHTML = '<span class="cat-icon">🍽️</span>';
      const navName = document.createElement("span");
      navName.className = "cat-name";
      navName.textContent = category;
      navItem.append(navName);
      categoryList.append(navItem);

      const section = document.createElement("section");
      section.id = categoryId;
      section.className = "menu-section";
      const header = document.createElement("div");
      header.className = "category-header";
      header.innerHTML = '<span class="header-icon">🍽️</span>';
      const heading = document.createElement("h2");
      heading.textContent = category;
      header.append(heading);
      const grid = document.createElement("div");
      grid.className = "products-grid";
      items.forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.dataset.productId = product.id;
        if (product.description) card.dataset.desc = product.description;
        const imageContainer = document.createElement("div");
        imageContainer.className = "product-img";
        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.title;
        imageContainer.append(image);
        const title = document.createElement("h3");
        title.className = "product-title";
        title.textContent = product.title;
        const bottom = document.createElement("div");
        bottom.className = "product-bottom";
        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent = `${product.unitPrice.toLocaleString("uz-UZ")} so'm`;
        const addButton = document.createElement("button");
        addButton.className = "add-to-cart-btn";
        addButton.type = "button";
        addButton.textContent = "Savatga";
        bottom.append(price, addButton);
        card.append(imageContainer, title, bottom);
        grid.append(card);
      });
      section.append(header, grid);
      productsArea.append(section);
    });
    const dynamicLinks = Array.from(categoryList.querySelectorAll(".category-item"));
    if (dynamicLinks.length > 0) dynamicLinks[0].classList.add("active");
    const dynamicObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        dynamicLinks.forEach((link) => link.classList.remove("active"));
        const activeLink = dynamicLinks.find((link) => link.getAttribute("href") === `#${entry.target.id}`);
        if (activeLink) activeLink.classList.add("active");
      });
    }, { root: null, rootMargin: "-130px 0px -70% 0px", threshold: 0 });
    productsArea.querySelectorAll(".menu-section").forEach((section) => dynamicObserver.observe(section));
  }

  const productCards = document.querySelectorAll(".product-card");

  // 2. Modal ichidagi elementlarni tanlab olish
  const modalImg = document.getElementById("modalImg");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalPrice = document.getElementById("modalPrice");
  const modalBadge = document.getElementById("modalBadge");
  const modalAddToCartBtn = document.getElementById("modalBtn");
  const cartCountBadge = document.getElementById("cartCount");
  const cartButton = document.getElementById("openCart");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartDrawer = document.getElementById("cartDrawer");
  const closeCartBtn = document.getElementById("closeCart");
  const cartItemsContainer = document.getElementById("cartItems");
  const cartEmptyMessage = document.getElementById("cartEmpty");
  const cartSummary = document.getElementById("cartSummary");
  const cartTotal = document.getElementById("cartTotal");
  const checkoutButton = document.getElementById("checkoutButton");
  const checkoutOverlay = document.getElementById("checkoutOverlay");
  const checkoutDialog = checkoutOverlay.querySelector(".checkout-dialog");
  const closeCheckoutButton = document.getElementById("closeCheckout");
  const phoneStep = document.getElementById("phoneStep");
  const addressStep = document.getElementById("addressStep");
  const checkoutSuccess = document.getElementById("checkoutSuccess");
  const checkoutReceipt = document.getElementById("checkoutReceipt");
  const phoneInput = document.getElementById("checkoutPhone");
  const addressInput = document.getElementById("checkoutAddress");
  const backToPhoneButton = document.getElementById("backToPhone");
  const finishCheckoutButton = document.getElementById("finishCheckout");
  const historyButton = document.getElementById("openHistory");
  const historyOverlay = document.getElementById("historyOverlay");
  const closeHistoryButton = document.getElementById("closeHistory");
  const historyItemsContainer = document.getElementById("historyItems");
  const historyEmptyMessage = document.getElementById("historyEmpty");
  const readStoredArray = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(value)) {
        throw new Error(`Saqlangan ${key} ma'lumoti ro'yxat emas.`);
      }
      return value;
    } catch (error) {
      console.error(`"${key}" ma'lumotini o'qib bo'lmadi.`, error);
      showStorageError("Saqlangan ma'lumotlarni o'qishda xatolik yuz berdi.");
      return [];
    }
  };
  const saveStoredValue = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`"${key}" ma'lumotini saqlab bo'lmadi.`, error);
      showStorageError("Brauzer ma'lumotlarni saqlay olmadi. Brauzer sozlamalarini tekshiring.");
    }
  };
  let cartItems = readStoredArray("evos-cart").filter((item) =>
    item && typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.image === "string" && Number.isFinite(item.unitPrice) &&
    Number.isInteger(item.quantity) && item.quantity > 0
  );
  const orderHistory = readStoredArray("evos-order-history").filter((order) =>
    order && typeof order.id === "string" && typeof order.createdAt === "string" &&
    Array.isArray(order.items) && order.items.length > 0 &&
    order.items.every((item) => item && typeof item.title === "string" &&
      Number.isFinite(item.unitPrice) && Number.isInteger(item.quantity) && item.quantity > 0) &&
    Number.isFinite(order.total) &&
    typeof order.phone === "string" && typeof order.address === "string"
  );
  let currentProduct = null;

  const formatPrice = (price) => `${String(price).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm`;
  const formatDate = (date) => new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));

  const renderReceipt = (order, container) => {
    container.replaceChildren();
    const receipt = document.createElement("article");
    receipt.className = "receipt-card";

    const heading = document.createElement("div");
    heading.className = "receipt-heading";
    const brand = document.createElement("strong");
    brand.textContent = "EVOS";
    const receiptLabel = document.createElement("span");
    receiptLabel.textContent = "BUYURTMA CHEKI";
    heading.append(brand, receiptLabel);

    const orderId = document.createElement("p");
    orderId.className = "receipt-order-id";
    orderId.textContent = `Buyurtma ID: ${order.id}`;
    const date = document.createElement("p");
    date.className = "receipt-date";
    date.textContent = formatDate(order.createdAt);

    const customer = document.createElement("div");
    customer.className = "receipt-customer";
    const phone = document.createElement("p");
    phone.textContent = `Telefon: ${order.phone}`;
    const address = document.createElement("p");
    address.textContent = `Manzil: ${order.address}`;
    customer.append(phone, address);

    const items = document.createElement("ul");
    items.className = "receipt-line-items";
    order.items.forEach((item) => {
      const line = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = `${item.title} × ${item.quantity}`;
      const price = document.createElement("strong");
      price.textContent = formatPrice(item.unitPrice * item.quantity);
      line.append(name, price);
      items.append(line);
    });

    const total = document.createElement("div");
    total.className = "receipt-total";
    const totalLabel = document.createElement("span");
    totalLabel.textContent = "Jami";
    const totalPrice = document.createElement("strong");
    totalPrice.textContent = formatPrice(order.total);
    total.append(totalLabel, totalPrice);

    const qrSection = document.createElement("div");
    qrSection.className = "receipt-qr-section";
    const qrCode = document.createElement("div");
    qrCode.className = "receipt-qr";
    qrCode.setAttribute("aria-label", `Buyurtma ${order.id} uchun QR kod`);
    const qrCaption = document.createElement("span");
    qrCaption.textContent = "Buyurtma raqamini QR orqali tekshiring";
    if (typeof QRCode === "function") {
      new QRCode(qrCode, {
        text: JSON.stringify({ orderId: order.id, total: order.total }),
        width: 112,
        height: 112,
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      qrCode.textContent = "QR kodni yuklab bo'lmadi";
      qrCode.classList.add("receipt-qr-unavailable");
    }
    qrSection.append(qrCode, qrCaption);

    const printButton = document.createElement("button");
    printButton.className = "receipt-print";
    printButton.type = "button";
    printButton.textContent = "Chekni chop etish";
    printButton.addEventListener("click", () => {
      document.querySelectorAll(".receipt-print-target").forEach((element) => {
        element.classList.remove("receipt-print-target");
      });
      receipt.classList.add("receipt-print-target");
      window.print();
      receipt.classList.remove("receipt-print-target");
    });

    receipt.append(heading, orderId, date, customer, items, total, qrSection, printButton);
    container.append(receipt);
  };

  const renderOrderHistory = () => {
    historyItemsContainer.replaceChildren();
    historyEmptyMessage.hidden = orderHistory.length > 0;
    orderHistory.slice().reverse().forEach((order) => {
      const entry = document.createElement("div");
      entry.className = "history-entry";
      renderReceipt(order, entry);
      historyItemsContainer.append(entry);
    });
  };

  const getProduct = (card) => {
    const title = card.querySelector(".product-title").textContent.trim();
    const priceText = card.querySelector(".product-price").textContent;
    const unitPrice = Number(priceText.replace(/[^\d]/g, ""));

    return {
      id: card.dataset.productId || `${title.toLocaleLowerCase("uz")}|${unitPrice}`,
      title,
      image: card.querySelector(".product-img img").src,
      unitPrice
    };
  };

  const updateCart = () => {
    saveStoredValue("evos-cart", cartItems);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const total = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    cartCountBadge.textContent = itemCount;
    cartCountBadge.hidden = itemCount === 0;
    cartButton.setAttribute("aria-label", `Savat, ${itemCount} ta mahsulot`);
    cartSummary.textContent = `${itemCount} ta mahsulot · ${formatPrice(total)}`;
    cartTotal.textContent = formatPrice(total);
    cartEmptyMessage.hidden = cartItems.length > 0;
    checkoutButton.hidden = cartItems.length === 0;
    cartItemsContainer.replaceChildren();

    cartItems.forEach((item) => {
      const row = document.createElement("article");
      row.className = "cart-item";

      const image = document.createElement("img");
      image.className = "cart-item-image";
      image.src = item.image;
      image.alt = item.title;

      const details = document.createElement("div");
      details.className = "cart-item-details";

      const heading = document.createElement("div");
      heading.className = "cart-item-heading";

      const title = document.createElement("h3");
      title.className = "cart-item-title";
      title.textContent = item.title;

      const removeButton = document.createElement("button");
      removeButton.className = "cart-remove";
      removeButton.type = "button";
      removeButton.dataset.cartAction = "remove";
      removeButton.dataset.productId = item.id;
      removeButton.setAttribute("aria-label", `${item.title}ni savatdan o'chirish`);
      removeButton.textContent = "×";

      const controls = document.createElement("div");
      controls.className = "cart-item-controls";

      const linePrice = document.createElement("strong");
      linePrice.className = "cart-item-price";
      linePrice.textContent = formatPrice(item.unitPrice * item.quantity);

      const quantity = document.createElement("div");
      quantity.className = "cart-quantity";

      const decreaseButton = document.createElement("button");
      decreaseButton.type = "button";
      decreaseButton.dataset.cartAction = "decrease";
      decreaseButton.dataset.productId = item.id;
      decreaseButton.setAttribute("aria-label", `${item.title} sonini kamaytirish`);
      decreaseButton.textContent = "-";

      const quantityValue = document.createElement("span");
      quantityValue.textContent = item.quantity;
      quantityValue.setAttribute("aria-label", "Mahsulot soni");

      const increaseButton = document.createElement("button");
      increaseButton.type = "button";
      increaseButton.dataset.cartAction = "increase";
      increaseButton.dataset.productId = item.id;
      increaseButton.setAttribute("aria-label", `${item.title} sonini oshirish`);
      increaseButton.textContent = "+";

      quantity.append(decreaseButton, quantityValue, increaseButton);
      heading.append(title, removeButton);
      controls.append(linePrice, quantity);
      details.append(heading, controls);
      row.append(image, details);
      cartItemsContainer.append(row);
    });
  };

  const setCheckoutStep = (step) => {
    phoneStep.hidden = step !== "phone";
    addressStep.hidden = step !== "address";
    checkoutSuccess.hidden = step !== "success";

    const descriptionId = {
      phone: "checkoutPrompt",
      address: "addressPrompt",
      success: "successMessage"
    }[step];
    checkoutDialog.setAttribute("aria-describedby", descriptionId);
  };

  const closeCheckout = () => {
    checkoutOverlay.classList.remove("active");
    checkoutOverlay.setAttribute("aria-hidden", "true");
    phoneStep.reset();
    addressStep.reset();
    phoneInput.setCustomValidity("");
    addressInput.setCustomValidity("");
    setCheckoutStep("phone");
    document.body.style.overflow = cartOverlay.classList.contains("active") ||
      historyOverlay.classList.contains("active") ? "hidden" : "auto";
    cartButton.focus();
  };

  const addToCart = (product) => {
    const existingItem = cartItems.find((item) => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cartItems.push({ ...product, quantity: 1 });
    }
    updateCart();
  };

  // 3. Har bir kartani bosilganda modalni ochish
  productCards.forEach(card => {
    const addToCartBtn = card.querySelector(".add-to-cart-btn");
    addToCartBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      addToCart(getProduct(card));
    });

    card.addEventListener("click", () => {
      // Kartadagi ma'lumotlarni o'qib olish
      const imgSrc = card.querySelector(".product-img img").src;
      const titleText = card.querySelector(".product-title").innerText;
      const priceText = card.querySelector(".product-price").innerText;
      currentProduct = getProduct(card);
      
      // Karta ichida stiker (badge) bormi tekshirish
      const badgeEl = card.querySelector(".badge");
      if (badgeEl) {
        modalBadge.innerText = badgeEl.innerText;
        modalBadge.style.display = "inline-block";
        // Agar qizil stiker bo'lsa modalga ham moslash
        if(badgeEl.classList.contains("red")) {
          modalBadge.style.background = "#e53935";
          modalBadge.style.boxShadow = "0 4px 10px rgba(229, 57, 53, 0.3)";
        } else {
          modalBadge.style.background = "linear-gradient(90deg, #ffc107, #ff9800)";
          modalBadge.style.boxShadow = "0 4px 10px rgba(255, 152, 0, 0.3)";
        }
      } else {
        modalBadge.style.display = "none";
      }

      // Karta elementida 'data-desc' orqali yozilgan izohni olish
      const descText = card.getAttribute("data-desc") || "Ushbu mahsulot uchun batafsil ma'lumot hozircha kiritilmagan.";

      // O'qib olingan ma'lumotlarni modal ichiga joylash
      modalImg.src = imgSrc;
      modalTitle.innerText = titleText;
      modalDesc.innerText = descText;
      modalPrice.innerText = priceText;

      // Modalni ko'rsatish (Animatsiya klassini qo'shish)
      modalOverlay.classList.add("active");
      
      // Orqa fonda skrollni to'xtatib qo'yish
      document.body.style.overflow = "hidden";
    });
  });

  // 4. Yopish funksiyasi
  const closeModal = () => {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "auto"; // Skrollni qaytarish
  };

  closeModalBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Hodisa tarqalishini to'xtatish
    closeModal();
  });

  modalAddToCartBtn.addEventListener("click", () => {
    if (currentProduct) {
      addToCart(currentProduct);
    }
  });

  checkoutButton.addEventListener("click", () => {
    if (cartItems.length === 0) {
      return;
    }

    setCheckoutStep("phone");
    checkoutOverlay.classList.add("active");
    checkoutOverlay.setAttribute("aria-hidden", "false");
    phoneInput.focus();
  });

  phoneInput.addEventListener("input", () => phoneInput.setCustomValidity(""));
  phoneStep.addEventListener("submit", (event) => {
    event.preventDefault();
    const phoneDigits = phoneInput.value.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      phoneInput.setCustomValidity("Telefon raqamini to'g'ri kiriting.");
      phoneInput.reportValidity();
      return;
    }

    phoneInput.setCustomValidity("");
    setCheckoutStep("address");
    addressInput.focus();
  });

  addressInput.addEventListener("input", () => addressInput.setCustomValidity(""));
  addressStep.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (addressInput.value.trim().length < 5) {
      addressInput.setCustomValidity("Manzilni to'liq kiriting.");
      addressInput.reportValidity();
      return;
    }

    addressInput.setCustomValidity("");
    const createdAt = new Date().toISOString();
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const orderId = `EV-${createdAt.slice(0, 10).replace(/-/g, "")}-${randomSuffix}`;
    const order = {
      id: orderId,
      createdAt,
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim(),
      items: cartItems.map((item) => ({ ...item })),
      total: cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    };
    const { error } = await window.db.from("orders").insert({
      id: order.id,
      created_at: order.createdAt,
      phone: order.phone,
      address: order.address,
      items: order.items,
      total: order.total
    });
    if (error) {
      showStorageError("Buyurtmani bazaga saqlab bo'lmadi. Qayta urinib ko'ring.", error);
      return;
    }

    orderHistory.push(order);
    saveStoredValue("evos-order-history", orderHistory);
    renderOrderHistory();
    renderReceipt(order, checkoutReceipt);
    cartItems = [];
    updateCart();
    cartOverlay.classList.remove("active");
    cartOverlay.setAttribute("aria-hidden", "true");
    cartButton.setAttribute("aria-expanded", "false");
    setCheckoutStep("success");
  });

  historyButton.addEventListener("click", () => {
    renderOrderHistory();
    historyOverlay.classList.add("active");
    historyOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeHistoryButton.focus();
  });

  const closeHistory = () => {
    historyOverlay.classList.remove("active");
    historyOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = checkoutOverlay.classList.contains("active") ||
      cartOverlay.classList.contains("active") ? "hidden" : "auto";
    historyButton.focus();
  };

  closeHistoryButton.addEventListener("click", closeHistory);
  historyOverlay.addEventListener("click", (event) => {
    if (event.target === historyOverlay) {
      closeHistory();
    }
  });

  backToPhoneButton.addEventListener("click", () => {
    setCheckoutStep("phone");
    phoneInput.focus();
  });
  closeCheckoutButton.addEventListener("click", closeCheckout);
  finishCheckoutButton.addEventListener("click", closeCheckout);
  checkoutOverlay.addEventListener("click", (event) => {
    if (event.target === checkoutOverlay) {
      closeCheckout();
    }
  });

  cartButton.addEventListener("click", () => {
    cartOverlay.classList.add("active");
    cartOverlay.setAttribute("aria-hidden", "false");
    cartButton.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeCartBtn.focus();
  });

  const closeCart = () => {
    cartOverlay.classList.remove("active");
    cartOverlay.setAttribute("aria-hidden", "true");
    cartButton.setAttribute("aria-expanded", "false");
    document.body.style.overflow = modalOverlay.classList.contains("active") ? "hidden" : "auto";
    cartButton.focus();
  };

  closeCartBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", (event) => {
    if (event.target === cartOverlay) {
      closeCart();
    }
  });

  cartItemsContainer.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest("button[data-cart-action]");
    if (!button) {
      return;
    }

    const itemIndex = cartItems.findIndex((item) => item.id === button.dataset.productId);
    if (itemIndex === -1) {
      return;
    }

    if (button.dataset.cartAction === "increase") {
      cartItems[itemIndex].quantity += 1;
    } else if (button.dataset.cartAction === "decrease") {
      cartItems[itemIndex].quantity -= 1;
      if (cartItems[itemIndex].quantity === 0) {
        cartItems.splice(itemIndex, 1);
      }
    } else if (button.dataset.cartAction === "remove") {
      cartItems.splice(itemIndex, 1);
    }

    updateCart();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && checkoutOverlay.classList.contains("active")) {
      closeCheckout();
    } else if (event.key === "Escape" && historyOverlay.classList.contains("active")) {
      closeHistory();
    } else if (event.key === "Escape" && cartOverlay.classList.contains("active")) {
      closeCart();
    }
  });

  // 5. Qora fon (overlay) bosilganda ham yopilishi uchun
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  updateCart();
  renderOrderHistory();
});

document.addEventListener("DOMContentLoaded", () => {
  const searchToggle = document.getElementById("searchToggle");
  const searchPanel = document.getElementById("searchPanel");
  const searchInput = document.getElementById("productSearch");
  const searchStatus = document.getElementById("searchStatus");
  const searchResults = document.getElementById("searchResults");
  const getProductCards = () => Array.from(document.querySelectorAll(".product-card"));

  const normalize = (value) => value
    .toLocaleLowerCase("uz")
    .replace(/[’ʻ‘`']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  const closeSearch = () => {
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-label", "Qidiruvni ochish");
    searchPanel.setAttribute("aria-hidden", "true");
    searchPanel.classList.remove("active");
    searchInput.value = "";
    searchResults.replaceChildren();
    searchStatus.textContent = "Qidirish uchun mahsulot nomini yozing";
  };

  const openSearch = () => {
    searchToggle.setAttribute("aria-expanded", "true");
    searchToggle.setAttribute("aria-label", "Qidiruvni yopish");
    searchPanel.setAttribute("aria-hidden", "false");
    searchPanel.classList.add("active");
    searchInput.focus();
  };

  searchToggle.addEventListener("click", () => {
    if (searchToggle.getAttribute("aria-expanded") === "true") {
      closeSearch();
    } else {
      openSearch();
    }
  });

  searchInput.addEventListener("input", () => {
    const query = normalize(searchInput.value);
    searchResults.replaceChildren();

    if (!query) {
      searchStatus.textContent = "Qidirish uchun mahsulot nomini yozing";
      return;
    }

    const matches = getProductCards().filter((card) => {
      const title = card.querySelector(".product-title").textContent;
      return normalize(title).includes(query);
    });

    if (matches.length === 0) {
      searchStatus.textContent = "Mahsulot topilmadi";
      return;
    }

    searchStatus.textContent = `${matches.length} ta mahsulot topildi`;
    matches.forEach((card) => {
      const result = document.createElement("button");
      result.className = "search-result";
      result.type = "button";
      result.setAttribute("role", "listitem");

      const image = card.querySelector(".product-img img");
      const thumbnail = document.createElement("img");
      thumbnail.src = image.src;
      thumbnail.alt = "";

      const details = document.createElement("span");
      details.className = "search-result-details";

      const title = document.createElement("span");
      title.className = "search-result-title";
      title.textContent = card.querySelector(".product-title").textContent.trim();

      const price = document.createElement("span");
      price.className = "search-result-price";
      price.textContent = card.querySelector(".product-price").textContent.trim();

      details.append(title, price);
      result.append(thumbnail, details);
      result.addEventListener("click", () => {
        closeSearch();
        card.click();
      });
      searchResults.append(result);
    });
  });

  document.addEventListener("click", (event) => {
    if (!searchPanel.contains(event.target) && !searchToggle.contains(event.target)) {
      closeSearch();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchToggle.getAttribute("aria-expanded") === "true") {
      closeSearch();
      searchToggle.focus();
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const openLoginButton = document.getElementById("openLogin");
  const loginOverlay = document.getElementById("loginOverlay");
  const closeLoginButton = document.getElementById("closeLogin");
  const loginForm = document.getElementById("adminLoginForm");
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");
  const loginError = document.getElementById("loginError");

  const closeLogin = () => {
    loginOverlay.classList.remove("active");
    loginOverlay.setAttribute("aria-hidden", "true");
    loginForm.reset();
    loginError.hidden = true;
    document.body.style.overflow = "auto";
    openLoginButton.focus();
  };

  openLoginButton.addEventListener("click", () => {
    loginOverlay.classList.add("active");
    loginOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    usernameInput.focus();
  });

  closeLoginButton.addEventListener("click", closeLogin);
  loginOverlay.addEventListener("click", (event) => {
    if (event.target === loginOverlay) {
      closeLogin();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { data, error } = await window.db.auth.signInWithPassword({
      email: usernameInput.value.trim(),
      password: passwordInput.value
    });
    if (error || !data.user) {
      if (error) console.error("Admin Supabase hisobiga kira olmadi.", error);
      loginError.textContent = "Email yoki parol noto'g'ri, yoxud Supabase Auth sozlanmagan.";
      loginError.hidden = false;
      passwordInput.focus();
      return;
    }

    const { data: isAdmin, error: roleError } = await window.db.rpc("is_admin");
    if (roleError || !isAdmin) {
      if (roleError) console.error("Admin huquqini tekshirib bo'lmadi.", roleError);
      const { error: signOutError } = await window.db.auth.signOut();
      if (signOutError) console.error("Admin bo'lmagan sessiyadan chiqib bo'lmadi.", signOutError);
      loginError.textContent = roleError
        ? "Admin huquqini tekshirib bo'lmadi. Supabase sozlamalarini tekshiring."
        : "Bu hisobga admin huquqi berilmagan.";
      loginError.hidden = false;
      return;
    }

    window.location.href = "./admin.html";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && loginOverlay.classList.contains("active")) {
      closeLogin();
    }
  });
});