document.addEventListener("DOMContentLoaded", async () => {
  const notice = document.getElementById("adminNotice");
  const showError = (message, error) => {
    if (error) {
      console.error(message, error);
      const details = [error.message, error.details, error.hint, error.code]
        .filter((value) => typeof value === "string" && value);
      notice.textContent = details.length ? `${message} ${details.join(" ")}` : message;
    } else {
      notice.textContent = message;
    }
    notice.hidden = false;
  };

  let authData;
  let authError;
  try {
    ({ data: authData, error: authError } = await window.db.auth.getUser());
  } catch (error) {
    showError("Admin sessiyasini tekshirib bo'lmadi.", error);
    return;
  }
  if (authError) {
    showError("Admin sessiyasini tekshirib bo'lmadi.", authError);
    return;
  }
  if (!authData?.user) {
    window.location.replace("./index.html");
    return;
  }

  let isAdmin;
  try {
    const result = await window.db.rpc("is_admin");
    if (result.error) {
      showError("Admin huquqini tekshirib bo'lmadi.", result.error);
      return;
    }
    isAdmin = result.data;
  } catch (error) {
    showError("Admin huquqini tekshirib bo'lmadi.", error);
    return;
  }
  if (!isAdmin) {
    try {
      const { error } = await window.db.auth.signOut();
      if (error) console.error("Admin bo'lmagan sessiyadan chiqib bo'lmadi.", error);
    } catch (error) {
      console.error("Admin bo'lmagan sessiyadan chiqib bo'lmadi.", error);
    }
    window.location.replace("./index.html");
    return;
  }

  const readLegacyArray = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(value)) {
        throw new Error(`"${key}" ma'lumoti ro'yxat emas.`);
      }
      return value;
    } catch (error) {
      showError("Saqlangan ma'lumotlarni o'qishda xatolik yuz berdi.", error);
      return [];
    }
  };

  let productsResponse;
  let ordersResponse;
  try {
    [productsResponse, ordersResponse] = await Promise.all([
      window.db.from("products").select("*"),
      window.db.from("orders").select("*").order("created_at", { ascending: false })
    ]);
  } catch (error) {
    showError("Supabase ma'lumotlarini yuklab bo'lmadi.", error);
    return;
  }
  if (productsResponse.error || ordersResponse.error) {
    showError("Supabase ma'lumotlarini yuklab bo'lmadi.", productsResponse.error || ordersResponse.error);
    return;
  }

  let productRows = productsResponse.data;
  let orderRows = ordersResponse.data;
  let importedLegacyData = false;
  const previousProducts = readLegacyArray("evos-products").filter((product) =>
    product && typeof product.id === "string" && typeof product.title === "string" &&
    typeof product.image === "string" && typeof product.category === "string" &&
    Number.isFinite(product.unitPrice)
  );
  const oldProducts = Array.from(new Map(
    previousProducts.map((product) => [product.id, product])
  ).values());
  if (oldProducts.length > 0) {
    let data;
    let error;
    try {
      ({ data, error } = await window.db
        .from("products")
        .upsert(oldProducts.map((product) => ({
          id: product.id,
          title: product.title,
          image: product.image,
          category: product.category,
          unit_price: product.unitPrice,
          description: product.description || ""
        })), { onConflict: "id", ignoreDuplicates: true })
        .select());
    } catch (requestError) {
      showError("Qurilmadagi eski mahsulotlarni Supabase'ga ko'chirib bo'lmadi.", requestError);
      return;
    }
    if (error) {
      showError("Qurilmadagi eski mahsulotlarni Supabase'ga ko'chirib bo'lmadi.", error);
      return;
    }
    importedLegacyData = importedLegacyData || data.length > 0;
  }
  const oldOrders = readLegacyArray("evos-order-history").filter((order) =>
    order && typeof order.id === "string" && typeof order.createdAt === "string" &&
    typeof order.phone === "string" && typeof order.address === "string" &&
    Number.isFinite(order.total) && Array.isArray(order.items)
  );
  if (oldOrders.length > 0) {
    let data;
    let error;
    try {
      ({ data, error } = await window.db
        .from("orders")
        .upsert(oldOrders.map((order) => ({
          id: order.id,
          created_at: order.createdAt,
          phone: order.phone,
          address: order.address,
          items: order.items,
          total: order.total
        })), { onConflict: "id", ignoreDuplicates: true })
        .select());
    } catch (requestError) {
      showError("Qurilmadagi eski buyurtmalarni Supabase'ga ko'chirib bo'lmadi.", requestError);
      return;
    }
    if (error) {
      showError("Qurilmadagi eski buyurtmalarni Supabase'ga ko'chirib bo'lmadi.", error);
      return;
    }
    importedLegacyData = importedLegacyData || data.length > 0;
  }

  if (importedLegacyData) {
    let updatedProducts;
    let updatedOrders;
    try {
      [updatedProducts, updatedOrders] = await Promise.all([
        window.db.from("products").select("*"),
        window.db.from("orders").select("*").order("created_at", { ascending: false })
      ]);
    } catch (error) {
      showError("Ko'chirilgan Supabase ma'lumotlarini qayta yuklab bo'lmadi.", error);
      return;
    }
    if (updatedProducts.error || updatedOrders.error) {
      showError("Ko'chirilgan Supabase ma'lumotlarini qayta yuklab bo'lmadi.",
        updatedProducts.error || updatedOrders.error);
      return;
    }
    productRows = updatedProducts.data;
    orderRows = updatedOrders.data;
  }

  const orders = orderRows.map((order) => ({
    id: order.id,
    createdAt: order.created_at,
    phone: order.phone,
    address: order.address,
    items: order.items,
    total: Number(order.total)
  })).filter((order) =>
    order && typeof order.id === "string" && typeof order.createdAt === "string" &&
    typeof order.phone === "string" && typeof order.address === "string" &&
    Number.isFinite(order.total) && Array.isArray(order.items)
  );
  let products = productRows.map((product) => ({
    id: product.id,
    title: product.title,
    image: product.image,
    category: product.category,
    unitPrice: Number(product.unit_price),
    description: product.description || ""
  })).filter((product) =>
    product && typeof product.id === "string" && typeof product.title === "string" &&
    typeof product.image === "string" && typeof product.category === "string" &&
    Number.isFinite(product.unitPrice)
  );
  if (importedLegacyData) {
    notice.hidden = false;
    notice.textContent = "Eski qurilma ma'lumotlari Supabase'ga ko'chirildi.";
  }
  const formatPrice = (price) => `${Number(price).toLocaleString("uz-UZ")} so'm`;
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Sana ko'rsatilmagan"
      : new Intl.DateTimeFormat("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
  };
  const startOfDay = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };
  const isSameDay = (left, right) => startOfDay(left).getTime() === startOfDay(right).getTime();
  const today = new Date();
  const todayOrders = orders.filter((order) => isSameDay(order.createdAt, today));
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const soldItems = orders.reduce((sum, order) => sum + order.items.reduce(
    (itemTotal, item) => itemTotal + (Number.isInteger(item.quantity) ? item.quantity : 0), 0
  ), 0);

  document.getElementById("totalRevenue").textContent = formatPrice(revenue);
  document.getElementById("totalOrders").textContent = orders.length.toLocaleString("uz-UZ");
  document.getElementById("totalProducts").textContent = products.length.toLocaleString("uz-UZ");
  document.getElementById("todayRevenue").textContent = formatPrice(todayRevenue);
  document.getElementById("todayOrderHint").textContent = `${todayOrders.length} ta bugungi buyurtma`;
  document.getElementById("todayOrders").textContent = todayOrders.length.toLocaleString("uz-UZ");
  document.getElementById("soldItems").textContent = soldItems.toLocaleString("uz-UZ");
  document.getElementById("averageOrder").textContent = formatPrice(orders.length ? revenue / orders.length : 0);
  document.getElementById("navOrderCount").textContent = orders.length.toLocaleString("uz-UZ");
  document.getElementById("ordersBadge").textContent = `${orders.length} ta buyurtma`;
  document.getElementById("productsBadge").textContent = `${products.length} ta mahsulot`;

  const createCell = (row, value, className = "") => {
    const cell = document.createElement("td");
    if (className) {
      cell.className = className;
    }
    cell.textContent = value;
    row.append(cell);
    return cell;
  };
  const createOrderRows = (target, orderList, includeAddress) => {
    target.replaceChildren();
    orderList.forEach((order) => {
      const row = document.createElement("tr");
      createCell(row, order.id, "order-id-cell");
      createCell(row, formatDate(order.createdAt));
      createCell(row, order.phone);
      if (includeAddress) {
        createCell(row, order.address, "address-cell");
      }
      const itemText = order.items.map((item) =>
        `${item.title || "Mahsulot"} × ${Number.isInteger(item.quantity) ? item.quantity : 0}`
      ).join(", ");
      createCell(row, itemText || "Mahsulotlar ko'rsatilmagan", "order-items-cell");
      createCell(row, formatPrice(order.total), "amount-cell");
      target.append(row);
    });
  };

  const recentOrders = orders.slice(0, 5);
  createOrderRows(document.getElementById("recentOrders"), recentOrders, false);
  createOrderRows(document.getElementById("allOrders"), orders, true);
  document.getElementById("recentOrdersEmpty").hidden = orders.length > 0;
  document.getElementById("allOrdersEmpty").hidden = orders.length > 0;

  const soldByProduct = new Map();
  orders.forEach((order) => order.items.forEach((item) => {
    if (typeof item.id === "string" && Number.isInteger(item.quantity)) {
      soldByProduct.set(item.id, (soldByProduct.get(item.id) || 0) + item.quantity);
    }
  }));
  const productsBody = document.getElementById("allProducts");
  const updateProductCount = () => {
    document.getElementById("totalProducts").textContent = products.length.toLocaleString("uz-UZ");
    document.getElementById("productsBadge").textContent = `${products.length} ta mahsulot`;
    document.getElementById("allProductsEmpty").hidden = products.length > 0;
  };
  const renderProducts = () => {
    productsBody.replaceChildren();
    products.forEach((product) => {
      const row = document.createElement("tr");
      const productCell = document.createElement("td");
      productCell.className = "product-name-cell";
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = "";
      image.loading = "lazy";
      const title = document.createElement("span");
      title.textContent = product.title;
      productCell.append(image, title);
      row.append(productCell);
      createCell(row, product.category);
      createCell(row, formatPrice(product.unitPrice));
      createCell(row, (soldByProduct.get(product.id) || 0).toLocaleString("uz-UZ"), "amount-cell");
      const actions = document.createElement("td");
      actions.className = "product-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "product-edit";
      editButton.textContent = "O'zgartirish";
      editButton.addEventListener("click", () => openProductForm(product));
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "product-delete";
      deleteButton.textContent = "O'chirish";
      deleteButton.addEventListener("click", async () => {
        if (!window.confirm(`${product.title} mahsulotini o'chirmoqchimisiz?`)) return;
        let data;
        let error;
        try {
          ({ data, error } = await window.db
            .from("products")
            .delete()
            .eq("id", product.id)
            .select("id")
            .single());
        } catch (requestError) {
          showError("Mahsulotni Supabase'dan o'chirib bo'lmadi.", requestError);
          return;
        }
        if (error || !data) {
          showError("Mahsulotni Supabase'dan o'chirib bo'lmadi.",
            error || new Error("Supabase javobida o'chirilgan mahsulot topilmadi."));
          return;
        }
        products = products.filter((item) => item.id !== product.id);
        renderProducts();
        notice.hidden = false;
        notice.textContent = "Mahsulot o'chirildi.";
      });
      actions.append(editButton, deleteButton);
      row.append(actions);
      productsBody.append(row);
    });
  };
  renderProducts();
  updateProductCount();

  const chart = document.getElementById("revenueChart");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      date,
      total: orders.reduce((sum, order) =>
        isSameDay(order.createdAt, date) ? sum + order.total : sum, 0
      )
    };
  });
  const maxDailyRevenue = Math.max(...days.map((day) => day.total), 1);
  days.forEach(({ date, total }) => {
    const column = document.createElement("div");
    column.className = "chart-column";
    const amount = document.createElement("span");
    amount.className = "chart-amount";
    amount.textContent = total ? formatPrice(total) : "";
    const track = document.createElement("div");
    track.className = "chart-track";
    const bar = document.createElement("span");
    bar.className = "chart-bar";
    bar.style.height = `${Math.max(total ? (total / maxDailyRevenue) * 100 : 0, 3)}%`;
    bar.setAttribute("aria-label", formatPrice(total));
    track.append(bar);
    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit" }).format(date);
    column.append(amount, track, label);
    chart.append(column);
  });

  const views = {
    overview: document.getElementById("overviewView"),
    orders: document.getElementById("ordersView"),
    products: document.getElementById("productsView")
  };
  const titles = {
    overview: "Umumiy ko'rinish",
    orders: "Buyurtmalar",
    products: "Mahsulotlar"
  };
  const openView = (name) => {
    Object.entries(views).forEach(([viewName, view]) => {
      const active = viewName === name;
      view.hidden = !active;
      view.classList.toggle("active", active);
    });
    document.getElementById("pageTitle").textContent = titles[name];
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === name);
    });
  };
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => openView(button.dataset.view));
  });
  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => openView(button.dataset.openView));
  });
  document.getElementById("logoutButton").addEventListener("click", async () => {
    let error;
    try {
      ({ error } = await window.db.auth.signOut());
    } catch (requestError) {
      showError("Admin hisobidan chiqib bo'lmadi.", requestError);
      return;
    }
    if (error) {
      showError("Admin hisobidan chiqib bo'lmadi.", error);
      return;
    }
    window.location.replace("./index.html");
  });

  const productModalOverlay = document.getElementById("productModalOverlay");
  const productForm = document.getElementById("productForm");
  const productId = document.getElementById("productId");
  const productTitle = document.getElementById("productTitle");
  const productCategory = document.getElementById("productCategory");
  const productPrice = document.getElementById("productPrice");
  const productImage = document.getElementById("productImage");
  const productDescription = document.getElementById("productDescription");

  const updateCategorySuggestions = () => {
    const suggestions = document.getElementById("categorySuggestions");
    const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];
    suggestions.replaceChildren();
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      suggestions.append(option);
    });
  };

  const closeProductForm = () => {
    productModalOverlay.classList.remove("active");
    productModalOverlay.setAttribute("aria-hidden", "true");
    productForm.reset();
  };
  const openProductForm = (product = null) => {
    updateCategorySuggestions();
    productId.value = product?.id || "";
    productTitle.value = product?.title || "";
    productCategory.value = product?.category || "";
    productPrice.value = product ? String(product.unitPrice) : "";
    productImage.value = product?.image || "";
    productDescription.value = product?.description || "";
    document.getElementById("productFormTitle").textContent = product ? "Mahsulotni o'zgartirish" : "Yangi mahsulot";
    productModalOverlay.classList.add("active");
    productModalOverlay.setAttribute("aria-hidden", "false");
    productTitle.focus();
  };

  document.getElementById("openProductForm").addEventListener("click", () => openProductForm());
  document.getElementById("closeProductForm").addEventListener("click", closeProductForm);
  document.getElementById("cancelProductForm").addEventListener("click", closeProductForm);
  productModalOverlay.addEventListener("click", (event) => {
    if (event.target === productModalOverlay) closeProductForm();
  });
  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const existingId = productId.value;
    const title = productTitle.value.trim();
    const category = productCategory.value.trim();
    const unitPrice = Number(productPrice.value);
    const image = productImage.value.trim();
    const description = productDescription.value.trim();
    if (!title || !category || !image || !Number.isFinite(unitPrice) || unitPrice < 0) {
      showError("Mahsulot ma'lumotlarini to'liq va to'g'ri kiriting.");
      return;
    }

    const id = existingId || `product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let data;
    let error;
    try {
      ({ data, error } = await window.db.from("products").upsert({
        id,
        title,
        category,
        unit_price: unitPrice,
        image,
        description
      }).select().single());
    } catch (requestError) {
      showError("Mahsulotni Supabase'ga saqlab bo'lmadi.", requestError);
      return;
    }
    if (error || !data) {
      showError("Mahsulotni Supabase'ga saqlab bo'lmadi.", error || new Error("Supabase javobida mahsulot yo'q."));
      return;
    }

    const savedProduct = {
      id: data.id,
      title: data.title,
      category: data.category,
      unitPrice: Number(data.unit_price),
      image: data.image,
      description: data.description || ""
    };
    if (existingId) {
      products = products.map((product) => product.id === existingId ? savedProduct : product);
    } else {
      products.push(savedProduct);
    }
    renderProducts();
    updateProductCount();
    closeProductForm();
    notice.hidden = false;
    notice.textContent = existingId ? "Mahsulot o'zgartirildi." : "Yangi mahsulot qo'shildi.";
    updateCategorySuggestions();
  });
});
