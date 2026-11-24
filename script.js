/* ==========================================================================
   Shampy_shampoo — script.js (ใช้ร่วมกันทุกหน้า)

   ไฟล์นี้ตรวจจากองค์ประกอบในหน้าว่าอยู่หน้าไหน แล้วทำงานเฉพาะส่วนนั้น
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     ค่าคงที่
     ------------------------------------------------------------------------ */
  var PRODUCTS_URL = 'products.json';

  var ORDER_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbzXOjKRC1bWbIqjR-E2EUmfZhqDK9iEorDnSQl43Qv6Jo9VJS_HseEjAD8uTyaZ3cp2/exec';

  var CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvl3jhxYuR3a2YQtBPh8Frk_xVuRT94TsS8a6YvUrXIhYBk6Jf95iocstq0OFvjVi9yL0ebV7vW-x2/pub?gid=0&single=true&output=csv';

  var MOODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  /* ------------------------------------------------------------------------
     ตัวช่วย
     ------------------------------------------------------------------------ */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatPrice(value) {
    var n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString('th-TH');
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  function isValidMood(key) {
    return MOODS.some(function (m) { return m.key === key; });
  }

  /* ========================================================================
     1) หน้า product.html
     ======================================================================== */
  function initProductPage() {
    var list = document.getElementById('product-list');
    var bar = document.getElementById('filter-bar');
    if (!list) return;

    var products = [];
    var currentMood = 'all';

    // อ่าน ?mood=xxx
    var paramMood = new URLSearchParams(window.location.search).get('mood');
    if (paramMood) {
      paramMood = paramMood.toLowerCase();
      if (isValidMood(paramMood)) currentMood = paramMood;
    }

    function buildFilterBar() {
      if (!bar) return;
      bar.innerHTML = '';
      MOODS.forEach(function (m) {
        var btn = el('button', 'filter__btn');
        btn.type = 'button';
        btn.dataset.mood = m.key;

        if (m.key !== 'all') {
          btn.setAttribute('data-mood', m.key); // ให้ .mood-dot ใช้สีของ mood
          btn.appendChild(el('span', 'mood-dot'));
        }
        btn.appendChild(document.createTextNode(m.label));

        btn.addEventListener('click', function () {
          setMood(m.key);
        });
        bar.appendChild(btn);
      });
      updateFilterState();
    }

    function updateFilterState() {
      if (!bar) return;
      var buttons = bar.querySelectorAll('.filter__btn');
      for (var i = 0; i < buttons.length; i++) {
        var active = buttons[i].dataset.mood === currentMood;
        buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
        buttons[i].classList.toggle('is-active', active);
      }
    }

    function setMood(key) {
      currentMood = key;
      updateFilterState();
      renderProducts();
      try {
        var url = new URL(window.location.href);
        if (key === 'all') url.searchParams.delete('mood');
        else url.searchParams.set('mood', key);
        window.history.replaceState(null, '', url);
      } catch (e) { /* ไม่เป็นไร ถ้าอัปเดต URL ไม่ได้ */ }
    }

    function buildCard(p) {
      var itemName = p.name + ' ' + p.size;
      var orderUrl =
        'order.html?item=' + encodeURIComponent(itemName) +
        '&price=' + encodeURIComponent(p.price);

      var card = el('article', 'product-card');
      card.setAttribute('data-mood', p.mood);

      var media = el('div', 'product-card__media');
      var img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name + ' ' + p.size;
      img.loading = 'lazy';
      media.appendChild(img);

      var body = el('div', 'product-card__body');
      body.appendChild(el('h3', 'product-card__title', p.name));

      var meta = el('p', 'product-card__meta');
      meta.appendChild(el('span', 'mood-dot'));
      meta.appendChild(document.createTextNode(moodLabel(p.mood) + ' · ' + p.size));
      body.appendChild(meta);

      var footer = el('div', 'product-card__footer');
      var price = el('span', 'price', formatPrice(p.price));
      price.appendChild(el('small', null, 'บาท'));

      var link = el('a', 'btn', 'สั่งซื้อ');
      link.href = orderUrl;

      footer.appendChild(price);
      footer.appendChild(link);
      body.appendChild(footer);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function renderProducts() {
      list.innerHTML = '';
      var shown = products.filter(function (p) {
        return currentMood === 'all' || p.mood === currentMood;
      });

      if (shown.length === 0) {
        list.appendChild(el('p', 'text-muted', 'ยังไม่มีสินค้าในหมวดนี้'));
        return;
      }
      shown.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    buildFilterBar();

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('โหลด ' + PRODUCTS_URL + ' ไม่สำเร็จ (' + res.status + ')');
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        renderProducts();
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = '';
        list.appendChild(el('p', 'text-muted', 'ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง'));
      });
  }

  /* ========================================================================
     2) หน้า order.html
     ======================================================================== */
  function initOrderPage() {
    var form = document.getElementById('orderForm');
    if (!form) return;

    var itemsEl = document.getElementById('items');
    var totalEl = document.getElementById('total');

    // เติมค่าจาก URL parameter ลงทั้งช่อง items และ total
    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    if (itemsEl && item !== null) itemsEl.value = item;
    if (totalEl && price !== null) totalEl.value = price;

    var sending = false;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (sending) return;

      var payload = {
        customerName: document.getElementById('customerName').value,
        contact: document.getElementById('contact').value,
        items: document.getElementById('items').value,
        total: document.getElementById('total').value,
        note: document.getElementById('note').value
      };

      var submitBtn = form.querySelector('[type="submit"]');
      sending = true;
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        sending = false;
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ========================================================================
     3) หน้า admin.html
     ======================================================================== */

  // parse CSV เอง: รองรับเครื่องหมายคำพูด, "" แทน ", คอมมาและขึ้นบรรทัดใหม่ในช่อง
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    text = text.replace(/^\uFEFF/, '');

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }

    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่างทิ้ง
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    var COLUMNS = 6; // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ

    function showMessage(message) {
      tbody.innerHTML = '';
      var tr = document.createElement('tr');
      var td = el('td', 'text-muted', message);
      td.colSpan = COLUMNS;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage('กำลังโหลดข้อมูล…');

    fetch(CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ (' + res.status + ')');
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);

        // ถ้าแถวแรกเป็นหัวตาราง (ช่องแรกไม่มีตัวเลขเลย เช่น "วันเวลา") ให้ข้าม
        if (rows.length > 0 && !/\d/.test(rows[0][0] || '')) {
          rows.shift();
        }

        // รายการใหม่ถูกต่อท้ายชีตเสมอ จึงกลับลำดับให้ล่าสุดขึ้นก่อน
        rows.reverse();

        if (rows.length === 0) {
          showMessage('ยังไม่มีคำสั่งซื้อ');
          return;
        }

        tbody.innerHTML = '';
        rows.forEach(function (r) {
          var tr = document.createElement('tr');
          for (var i = 0; i < COLUMNS; i++) {
            tr.appendChild(el('td', null, r[i] !== undefined ? r[i] : ''));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      });
  }

  /* ------------------------------------------------------------------------
     เริ่มทำงานเมื่อโหลดหน้าเสร็จ
     ------------------------------------------------------------------------ */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
