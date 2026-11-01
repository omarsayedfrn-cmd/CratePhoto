/**
 * ============================================================================
 * مصمم الصور - وحدة الأدوات المتقدمة (Pro Tools)
 * ============================================================================
 * تُحمَّل قبل app.js لتضيف الحقول والواجهة، ثم تُكمل التهيئة بعد تحميل التطبيق.
 */

(function () {
  'use strict';
  if (window.__PRO_LOADED__) return;
  window.__PRO_LOADED__ = true;

  const q = id => document.getElementById(id);
  const make = (tag, cls, html) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  // --------------------------------------------------------------------------
  // 1. الحالة المحفوظة
  // --------------------------------------------------------------------------
  const PRO_KEY = 'designerPro1';
  const proState = (() => {
    const fallback = { favorites: [], safeZones: false, rulers: false, onboardingSeen: false };
    try {
      return Object.assign(fallback, JSON.parse(localStorage.getItem(PRO_KEY) || '{}'));
    } catch (err) {
      return fallback;
    }
  })();
  const saveProState = () => {
    try { localStorage.setItem(PRO_KEY, JSON.stringify(proState)); } catch (err) { /* تجاهل */ }
  };
  const isFav = id => proState.favorites.includes(id);

  // --------------------------------------------------------------------------
  // 2. الإشعارات
  // --------------------------------------------------------------------------
  let toastTimer = null;
  function toast(message, duration = 2400) {
    let box = q('proToast');
    if (!box) {
      box = make('div', 'pro-toast');
      box.id = 'proToast';
      document.body.append(box);
    }
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), duration);
  }

  // --------------------------------------------------------------------------
  // 3. مساعدات عامة
  // --------------------------------------------------------------------------
  const fieldIndex = id => formFields.findIndex(field => field.id === id);
  function setFieldValue(array, id, value) {
    const idx = fieldIndex(id);
    if (idx > -1) array[idx] = value;
  }
  function setField(id, value) {
    const node = q(id);
    if (!node) return;
    if (node.type === 'checkbox') node.checked = !!value;
    else node.value = value;
  }
  function downloadBlobSafe(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 8000);
  }
  function loadImageFromUrl(src) {
    return new Promise((resolve, reject) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  function averageColor(img) {
    if (!img) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 40) continue;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
    }
    if (!count) return null;
    const hex = v => Math.round(v / count).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  // --------------------------------------------------------------------------
  // 4. القوالب الجديدة
  // --------------------------------------------------------------------------
  function drawBurst(ctx, cx, cy, radius, color, points = 16) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? radius * 0.74 : radius;
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      ctx[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  const NEW_TEMPLATES = {
    quote(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
      const { W, H } = v;
      ctx.save();
      ctx.fillStyle = hexToRgba(v.gold, 0.18);
      ctx.font = `700 ${W * 0.62}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'ltr';
      ctx.fillText('\u201C', W / 2, H * 0.22);
      ctx.restore();
      const items = [[v.t1, v.tc, 235 * v.k], ...v.t2.map(line => [line, v.gold, 205 * v.k])].filter(item => item[0]);
      stackText(ctx, items, W / 2, H * 0.3, fb - 60, W - 170, v.dark, fontConfig, shadowMode, shadowStrength);
    },

    sale(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
      const { W, H } = v;
      const cx = W / 2;
      const cy = H * 0.4;
      const radius = Math.min(W, H) * 0.31;
      drawBurst(ctx, cx, cy, radius, v.gold, 18);
      drawCircle(ctx, cx, cy, radius * 0.82, v.c1);
      renderText(ctx, v.big || '50%', cx, cy - radius * 0.05, Math.min(radius * 1.05, 320 * v.k), v.gold, v.dark, 'center', shadowMode, shadowStrength, fontConfig);
      renderText(ctx, '\u062E\u0635\u0645', cx, cy + radius * 0.42, Math.max(60, radius * 0.3), v.tc, null, 'center', 'none', 0, fontConfig);
      const items = [[v.t1, v.tc, 150 * v.k], ...v.t2.map(line => [line, v.gold, 135 * v.k])].filter(item => item[0]);
      stackText(ctx, items, W / 2, cy + radius + 60, fb - 20, W - 140, v.dark, fontConfig, shadowMode, shadowStrength);
    },

    timeline(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
      const top = drawTitle(ctx, v, 'timeline', 70, false, fb, fontConfig, shadowMode, shadowStrength) + 40;
      const stepsList = v.steps.length ? v.steps : ['\u0627\u0643\u062A\u0628 \u0627\u0644\u0646\u0642\u0637 \u0647\u0646\u0627'];
      const count = stepsList.length;
      const lineX = v.W - 150;
      const bottom = fb - 40;
      const span = Math.max(1, bottom - top);
      ctx.strokeStyle = hexToRgba(v.gold, 0.5);
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(lineX, top);
      ctx.lineTo(lineX, bottom);
      ctx.stroke();
      stepsList.forEach((stepText, i) => {
        const centerY = top + ((i + 0.5) / count) * span;
        drawCircle(ctx, lineX, centerY, 42, v.gold);
        renderText(ctx, ARABIC_DIGITS[i] || `${i + 1}`, lineX, centerY - 3, 58, v.dark, null, 'center', 'none', 0, fontConfig);
        const size = calculateFitFontSize(ctx, stepText, Math.min(110, (span / count) * 0.5) * v.k, v.W - 300, fontConfig);
        renderText(ctx, stepText, lineX - 80, centerY - size * 0.06, size, v.tc, v.dark, 'right', shadowMode, shadowStrength, fontConfig);
      });
    },

    qa(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
      const questionHeight = Math.min(320, (fb - 160) * 0.38);
      drawRoundedRect(ctx, 60, 70, v.W - 120, questionHeight, 60);
      ctx.fillStyle = v.tc;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(v.W * 0.6, 70 + questionHeight - 2);
      ctx.lineTo(v.W * 0.6 + 100, 70 + questionHeight - 2);
      ctx.lineTo(v.W * 0.6 + 30, 70 + questionHeight + 75);
      ctx.closePath();
      ctx.fill();
      stackText(ctx, [[v.t1 || '\u0633\u0624\u0627\u0644\u0643 \u0647\u0646\u0627', v.dark, 185 * v.k]], v.W / 2, 90, 70 + questionHeight - 20, v.W - 240, null, fontConfig, shadowMode, shadowStrength);
      const items = v.t2.map(line => [line, v.gold, 170 * v.k]).filter(item => item[0]);
      stackText(ctx, items, v.W / 2, 70 + questionHeight + 90, fb - 40, v.W - 140, v.dark, fontConfig, shadowMode, shadowStrength);
    },

    split(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
      const top = drawTitle(ctx, v, 'split', 70, false, fb, fontConfig, shadowMode, shadowStrength) + 30;
      const gap = 28;
      const pad = 60;
      const panelW = (v.W - pad * 2 - gap) / 2;
      const panelH = Math.max(120, fb - top - 20);
      const labels = [v.steps[0] || '\u0642\u0628\u0644', v.steps[1] || '\u0628\u0639\u062F'];
      const positions = [v.W - pad - panelW, pad];
      positions.forEach((x, i) => {
        drawRoundedRect(ctx, x, top, panelW, panelH, 36);
        ctx.fillStyle = hexToRgba(v.dark, 0.55);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(v.gold, 0.75);
        ctx.lineWidth = 5;
        ctx.stroke();
        drawCircle(ctx, x + panelW / 2, top + panelH / 2, Math.min(110, panelH * 0.2), hexToRgba(v.gold, 0.14));
        renderText(ctx, labels[i], x + panelW / 2, top + 70, 70, v.gold, null, 'center', 'none', 0, fontConfig);
      });
    },

    metrics(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
      const top = drawTitle(ctx, v, 'metrics', 70, false, fb, fontConfig, shadowMode, shadowStrength) + 40;
      const raw = v.steps.length ? v.steps : ['50%\u007C\u0639\u0645\u064A\u0644 \u0633\u0639\u064A\u062F', '4.9\u007C\u062A\u0642\u064A\u064A\u0645', '24/7\u007C\u062F\u0639\u0645'];
      const items = raw.slice(0, 3);
      const n = items.length;
      const gap = 22;
      const pad = 50;
      const cardW = (v.W - pad * 2 - gap * (n - 1)) / n;
      const cardH = Math.max(160, fb - top - 30);
      items.forEach((item, i) => {
        const parts = item.split(/[|:]/).map(part => part.trim());
        const number = parts[0] || '\u2014';
        const label = parts.slice(1).join(' ') || '';
        const x = v.W - pad - cardW - i * (cardW + gap);
        drawRoundedRect(ctx, x, top, cardW, cardH, 34);
        ctx.fillStyle = hexToRgba(v.dark, 0.55);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(v.gold, 0.5);
        ctx.lineWidth = 4;
        ctx.stroke();
        renderText(ctx, number, x + cardW / 2, top + cardH * 0.4, Math.min(cardW * 0.4, 175 * v.k), v.gold, null, 'center', shadowMode, shadowStrength, fontConfig);
        renderText(ctx, label, x + cardW / 2, top + cardH * 0.74, Math.min(cardW * 0.18, 78 * v.k), v.tc, null, 'center', 'none', 0, fontConfig);
      });
    }
  };

  window.TEMPLATES = Object.assign(window.TEMPLATES || {}, NEW_TEMPLATES);

  const TPL_META = [
    { id: 'cover', name: '\u063A\u0644\u0627\u0641' },
    { id: 'bubble', name: '\u0641\u0642\u0627\u0639\u0629' },
    { id: 'sun', name: '\u0634\u0645\u0633' },
    { id: 'diag', name: '\u0642\u0637\u0631\u064A' },
    { id: 'stat', name: '\u0631\u0642\u0645 \u0643\u0628\u064A\u0631' },
    { id: 'shot', name: '\u0633\u0643\u0631\u064A\u0646 \u0634\u0648\u062A' },
    { id: 'cards', name: '\u0628\u0637\u0627\u0642\u0627\u062A' },
    { id: 'bands', name: '\u0634\u0631\u0627\u064A\u0637' },
    { id: 'check', name: '\u0642\u0627\u064A\u0645\u0629' },
    { id: 'quote', name: '\u0627\u0642\u062A\u0628\u0627\u0633', isNew: true },
    { id: 'sale', name: '\u062E\u0635\u0645', isNew: true },
    { id: 'timeline', name: '\u062E\u0637 \u0632\u0645\u0646\u064A', isNew: true },
    { id: 'qa', name: '\u0633\u0624\u0627\u0644 \u0648\u062C\u0648\u0627\u0628', isNew: true },
    { id: 'split', name: '\u0645\u0642\u0627\u0631\u0646\u0629', isNew: true },
    { id: 'metrics', name: '\u0623\u0631\u0642\u0627\u0645', isNew: true }
  ];

  // --------------------------------------------------------------------------
  // 5. بناء الواجهة (قبل app.js حتى تُحفظ الحقول الجديدة)
  // --------------------------------------------------------------------------
  const ctl = document.querySelector('.ctl');
  const tabsBar = document.querySelector('.tabs');
  if (tabsBar) {
    const proTab = make('button', 'tab');
    proTab.type = 'button';
    proTab.dataset.tab = 'pro';
    proTab.setAttribute('role', 'tab');
    proTab.setAttribute('aria-selected', 'false');
    proTab.textContent = '\u0623\u062F\u0648\u0627\u062A';
    tabsBar.append(proTab);
  }

  const proPanel = make('section', 'tabpanel');
  proPanel.dataset.panel = 'pro';
  proPanel.setAttribute('role', 'tabpanel');
  proPanel.innerHTML = `
    <div class="group">
      <h3>أدوات العرض</h3>
      <label>معاينة الجهاز
        <select id="deviceSel">
          <option value="none">عادي</option>
          <option value="phone">موبايل</option>
          <option value="tablet">تابلت</option>
          <option value="post">منشور</option>
        </select>
      </label>
      <div class="chk">
        <label><input type="checkbox" id="safeZones"> مناطق آمنة</label>
        <label><input type="checkbox" id="rulers"> مساطر</label>
      </div>
      <p class="hint">المناطق الآمنة بتوضح المساحة اللي مش بتتقطع في الستوري. المساطر بتساعد في التوزيع.</p>
    </div>

    <div class="group">
      <h3>تناسق الألوان</h3>
      <div class="row">
        <button type="button" class="chip" data-harmony="warm">دافئ</button>
        <button type="button" class="chip" data-harmony="cool">بارد</button>
        <button type="button" class="chip" data-harmony="contrast">تباين</button>
        <button type="button" class="chip" data-harmony="mono">أحادي</button>
      </div>
      <button type="button" class="chip" id="harmonyFromImage">استخرج اللون من الصورة</button>
      <small>بيولّد لوحة ألوان متناسقة من لون الخلفية أو من صورة مختارة.</small>
    </div>

    <div class="group">
      <h3>كاروسيل وبيانات</h3>
      <button type="button" class="chip" id="splitCarousel">قسّم النص لكاروسيل</button>
      <label>ملف CSV <small>(عمود للعنوان وعمود للوصف)</small>
        <input type="file" id="csvFile" accept=".csv,text/csv">
      </label>
      <div class="row">
        <button type="button" class="chip" id="csvBuild" disabled>توليد شرائح من CSV</button>
        <button type="button" class="chip" id="csvZip" disabled>تنزيل ZIP</button>
      </div>
      <small id="csvInfo"></small>
    </div>

    <div class="group">
      <h3>المشروع والمساعدة</h3>
      <div class="row">
        <button type="button" class="chip" id="saveProject">حفظ المشروع</button>
        <button type="button" class="chip" id="loadProject">فتح مشروع</button>
      </div>
      <input type="file" id="loadProjectFile" class="hid" accept=".json,application/json">
      <div class="row">
        <button type="button" class="chip" id="copyStyle">نسخ الستايل</button>
        <button type="button" class="chip" id="pasteStyle">لصق ستايل</button>
      </div>
      <div class="row">
        <button type="button" class="chip" id="showTour">جولة تعريفية</button>
        <button type="button" class="chip" id="showKeys">اختصارات الكيبورد</button>
      </div>
    </div>

    <div class="group">
      <h3>الذكاء الاصطناعي (Gemini)</h3>
      <label>مفتاح Gemini API
        <input type="password" id="aiKey" placeholder="AIza..." dir="ltr" autocomplete="off">
      </label>
      <div class="row">
        <button type="button" class="chip" id="aiKeySave">حفظ المفتاح</button>
        <button type="button" class="chip" id="aiKeyClear">مسح</button>
      </div>
      <small id="aiKeyStatus"></small>
      <small>المفتاح بيتحفظ في متصفحك فقط. لو الموقع متظبط على Vercel بمفتاح في السيرفر مش هتحتاج تكتبه هنا.</small>
      <hr class="sep">
      <label>موضوع المنشور
        <input type="text" id="aiTopic" placeholder="مثلاً: تطبيق لحل الواجبات">
      </label>
      <div class="g2">
        <label>نوع المنشور
          <select id="aiType">
            <option value="ad">إعلان / عرض</option>
            <option value="tip">تعليمي / خطوات</option>
            <option value="quote">اقتباس / فكرة</option>
            <option value="list">قائمة نقاط</option>
          </select>
        </label>
        <label>النبرة
          <select id="aiTone">
            <option value="enthusiastic">حماسية</option>
            <option value="professional">احترافية</option>
            <option value="friendly">ودودة</option>
            <option value="funny">خفيفة</option>
          </select>
        </label>
      </div>
      <label>عدد النقاط
        <input type="range" id="aiCount" min="3" max="5" value="3">
      </label>
      <button type="button" class="chip" id="aiGenerate">ولّد النص</button>
      <div id="aiOut" class="ai-out hid"></div>
      <button type="button" class="chip" id="aiApply" disabled>طبّق على الشريحة</button>
      <hr class="sep">
      <label>وصف صورة بالذكاء الاصطناعي
        <input type="text" id="aiPrompt" placeholder="خلفية جرافيك بنفسجي وذهبي بدون كلام">
      </label>
      <div class="row">
        <button type="button" class="chip" id="aiBg">خلفية مولّدة</button>
        <button type="button" class="chip" id="aiLayer">إضافة الصورة كعنصر</button>
      </div>
      <button type="button" class="chip" id="aiRmBg">إزالة خلفية الصورة المحددة بالذكاء الاصطناعي</button>
      <small id="aiImageStatus">توليد الصور متاح حسب خطة مفتاح Gemini. لو الحصة صفر هيظهر تنبيه.</small>
    </div>

    <div class="group">
      <h3>تأثيرات النص المتقدمة</h3>
      <label>تباعد الحروف
        <input type="range" id="tsp" class="f" min="-10" max="30" value="0">
      </label>
      <div class="chk">
        <label><input type="checkbox" id="thl" class="f"> تظليل الكلمات المميزة</label>
        <label><input type="checkbox" id="tun" class="f"> خط تحت الكلمات المميزة</label>
        <label><input type="checkbox" id="tgd" class="f"> تدرّج لوني للكلمات المميزة</label>
      </div>
      <small>الكلمات المميزة هي اللي مكتوبة بين { }.</small>
      <small>ستايلات سريعة:</small>
      <div class="row" id="textPresets">
        <button type="button" class="chip" data-tp="strong">عنوان قوي</button>
        <button type="button" class="chip" data-tp="calm">هادئ</button>
        <button type="button" class="chip" data-tp="bold">ملفت</button>
        <button type="button" class="chip" data-tp="flat">بدون ظل</button>
      </div>
    </div>
  `;
  if (ctl) ctl.append(proPanel);

  const contentPanel = document.querySelector('.tabpanel[data-panel="content"]');
  if (contentPanel) {
    const galleryCard = make('div', 'group');
    galleryCard.innerHTML = `
      <h3>معرض القوالب</h3>
      <div class="tpl-grid" id="tplGrid"></div>
      <div class="row">
        <button type="button" class="chip" id="surpriseBtn">فاجئني بتصميم</button>
        <button type="button" class="chip" id="refreshGallery">تحديث المعاينات</button>
      </div>
    `;
    const firstGroup = contentPanel.querySelector('.group');
    if (firstGroup) firstGroup.insertAdjacentElement('afterend', galleryCard);
    else contentPanel.append(galleryCard);
  }

  const tpRow = q('tp');
  if (tpRow) {
    TPL_META.filter(meta => meta.isNew).forEach(meta => {
      const btn = make('button', null, meta.name);
      btn.type = 'button';
      btn.dataset.t = meta.id;
      tpRow.append(btn);
    });
  }

  const elementsPanel = document.querySelector('.tabpanel[data-panel="elements"]');
  if (elementsPanel) {
    const layersCard = make('div', 'group');
    layersCard.innerHTML = `
      <h3>الطبقات والترتيب</h3>
      <div id="layerList" class="layer-list"></div>
      <small>محاذاة العنصر المحدد:</small>
      <div class="row" id="alignRow">
        <button type="button" class="chip" data-al="left">يسار</button>
        <button type="button" class="chip" data-al="hcenter">وسط أفقي</button>
        <button type="button" class="chip" data-al="right">يمين</button>
        <button type="button" class="chip" data-al="top">فوق</button>
        <button type="button" class="chip" data-al="vcenter">وسط رأسي</button>
        <button type="button" class="chip" data-al="bottom">تحت</button>
      </div>
      <p class="hint">تقدر تخفي أو تقفل أو ترتب أو تكرر أي عنصر من القائمة. العنصر المقفول مش بيتسحب بالغلط.</p>
    `;
    elementsPanel.append(layersCard);

    const imageTools = make('div', 'group');
    imageTools.innerHTML = `
      <h3>أدوات الصور والأشكال</h3>
      <small>حدد صورة على المعاينة الأول، بعدها استخدم الأدوات دي.</small>
      <small>شكل الصورة:</small>
      <div class="row" id="shapeRow">
        <button type="button" class="chip" data-shape="rounded">حواف</button>
        <button type="button" class="chip" data-shape="circle">دايرة</button>
        <button type="button" class="chip" data-shape="star">نجمة</button>
        <button type="button" class="chip" data-shape="hex">سداسي</button>
        <button type="button" class="chip" data-shape="blob">بلوب</button>
        <button type="button" class="chip" data-shape="arch">قوس</button>
        <button type="button" class="chip" data-shape="diamond">معيّن</button>
        <button type="button" class="chip" data-shape="triangle">مثلث</button>
      </div>
      <small>فلتر الصورة:</small>
      <div class="row" id="fxRow">
        <button type="button" class="chip" data-fx="">أصلي</button>
        <button type="button" class="chip" data-fx="bw">أبيض وأسود</button>
        <button type="button" class="chip" data-fx="warm">دافئ</button>
        <button type="button" class="chip" data-fx="cool">بارد</button>
        <button type="button" class="chip" data-fx="vivid">حيوي</button>
        <button type="button" class="chip" data-fx="vintage">قديم</button>
        <button type="button" class="chip" data-fx="fade">باهت</button>
      </div>
      <div class="row">
        <button type="button" class="chip" id="rmBg">إزالة الخلفية (تقريبي)</button>
        <button type="button" class="chip" id="dupLayer">تكرار العنصر</button>
      </div>
      <hr class="sep">
      <small>مكتبة أشكال:</small>
      <div class="row" id="shapeLib">
        <button type="button" class="chip" data-stk="s:rect">مربع</button>
        <button type="button" class="chip" data-stk="s:circle">دايرة</button>
        <button type="button" class="chip" data-stk="s:ring">حلقة</button>
        <button type="button" class="chip" data-stk="s:triangle">مثلث</button>
        <button type="button" class="chip" data-stk="s:diamond">معيّن</button>
        <button type="button" class="chip" data-stk="s:star">نجمة</button>
        <button type="button" class="chip" data-stk="s:burst">انفجار</button>
        <button type="button" class="chip" data-stk="s:badge">شارة</button>
        <button type="button" class="chip" data-stk="s:blob">بلوب</button>
        <button type="button" class="chip" data-stk="s:wave">موجة</button>
        <button type="button" class="chip" data-stk="s:line">خط</button>
        <button type="button" class="chip" data-stk="s:arrow">سهم</button>
        <button type="button" class="chip" data-stk="s:dot">نقطة</button>
      </div>
      <label>كود QR <small>(رابط أو نص)</small>
        <input type="text" id="qrText" dir="ltr" placeholder="https://...">
      </label>
      <button type="button" class="chip" id="qrAdd">إضافة QR للشريحة</button>
    `;
    elementsPanel.append(imageTools);
  }

  const preview = document.querySelector('.pv');
  if (preview) {
    const exportRow = make('div', 'export-pro');
    exportRow.innerHTML = `
      <select id="expFmt" aria-label="صيغة التصدير">
        <option value="png">PNG</option>
        <option value="jpg">JPG</option>
        <option value="webp">WebP</option>
      </select>
      <label class="mini"><input type="checkbox" id="expTrans"> شفاف</label>
      <button type="button" id="expOne">الشريحة</button>
      <button type="button" id="expZip">ZIP</button>
      <button type="button" id="expPdf">PDF</button>
      <button type="button" id="expGif">GIF</button>
      <button type="button" id="expVid">فيديو</button>
    `;
    const lastDownload = q('dla');
    if (lastDownload) lastDownload.insertAdjacentElement('afterend', exportRow);
    else preview.append(exportRow);

    const slideTools = make('div', 'slide-tools');
    slideTools.innerHTML = `
      <button type="button" id="dupSlide">تكرار الشريحة</button>
      <button type="button" id="slideEarlier" title="تقديم الشريحة">↑</button>
      <button type="button" id="slideLater" title="تأخير الشريحة">↓</button>
      <button type="button" id="copyLayer">نسخ العنصر</button>
      <button type="button" id="pasteLayer">لصق العنصر</button>
    `;
    exportRow.insertAdjacentElement('afterend', slideTools);
  }

  // --------------------------------------------------------------------------
  // 6. طبقات العرض (مناطق آمنة + مساطر)
  // --------------------------------------------------------------------------
  window.drawProOverlays = function (ctx, v, exportMode) {
    if (exportMode) return;

    if (proState.safeZones) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 200, 120, 0.55)';
      ctx.setLineDash([22, 14]);
      ctx.lineWidth = 3;
      ctx.strokeRect(v.W * 0.06, v.H * 0.06, v.W * 0.88, v.H * 0.88);
      ctx.strokeRect(v.W * 0.1, v.H * 0.1, v.W * 0.8, v.H * 0.8);
      ctx.restore();
    }

    if (proState.rulers) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, v.W, 44);
      ctx.fillRect(0, 0, 44, v.H);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '700 22px CairoB, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2;
      const step = 100;
      for (let x = step; x < v.W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 18);
        ctx.stroke();
        if (x % (step * 2) === 0) ctx.fillText(String(x), x, 32);
      }
      for (let y = step; y < v.H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(18, y);
        ctx.stroke();
        if (y % (step * 2) === 0) {
          ctx.save();
          ctx.translate(32, y);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(String(y), 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  };

  // --------------------------------------------------------------------------
  // 7. التهيئة بعد تحميل التطبيق
  // --------------------------------------------------------------------------
  function initPro() {
    if (typeof window.getFormValues !== 'function' || typeof window.draw !== 'function') {
      setTimeout(initPro, 120);
      return;
    }

    const baseGetFormValues = window.getFormValues;
    window.getFormValues = function () {
      const values = baseGetFormValues();
      values.tsp = +(q('tsp') ? q('tsp').value : 0);
      values.thl = !!(q('thl') && q('thl').checked);
      values.tun = !!(q('tun') && q('tun').checked);
      values.tgd = !!(q('tgd') && q('tgd').checked);
      return values;
    };

    const bigLabel = q('big') ? q('big').closest('label') : null;
    const stepsLabel = q('steps') ? q('steps').closest('label') : null;
    if (bigLabel) bigLabel.classList.add('sale');
    if (stepsLabel) stepsLabel.classList.add('timeline', 'split', 'metrics', 'qa');

    const sizeSelect = q('size');
    if (sizeSelect && !sizeSelect.dataset.proSizes) {
      sizeSelect.dataset.proSizes = '1';
      [
        ['1920x1080', 'يوتيوب / 16:9 1920×1080'],
        ['1200x1500', 'بينتريست 4:5 1200×1500'],
        ['1080x566', 'إكس / تويتر 1080×566'],
        ['820x312', 'بانر لينكدإن 820×312'],
        ['1500x500', 'هيدر إكس 1500×500'],
        ['2480x3508', 'طباعة A4 2480×3508']
      ].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        sizeSelect.append(option);
      });
    }

    if (q('safeZones')) q('safeZones').checked = !!proState.safeZones;
    if (q('rulers')) q('rulers').checked = !!proState.rulers;
    if (q('deviceSel')) {
      let savedDevice = 'none';
      try { savedDevice = localStorage.getItem('deviceView') || 'none'; } catch (err) { /* تجاهل */ }
      q('deviceSel').value = savedDevice;
      applyDevice(savedDevice);
    }

    if (typeof window.refreshLayerControls === 'function') {
      const baseRefresh = window.refreshLayerControls;
      window.refreshLayerControls = function () {
        baseRefresh();
        renderLayerList();
      };
    }

    wireGallery();
    wireLayers();
    wireImageTools();
    wireExport();
    wireToolsTab();
    wireDialogs();
    wireSlides();
    wireAI();

    renderGallery();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => renderGallery());
    }
    renderLayerList();
    updateTemplateTabs();
    updateFieldVisibility();
    draw();

    if (!proState.onboardingSeen) {
      setTimeout(() => openDialog('proTour'), 900);
    }
  }

  // --------------------------------------------------------------------------
  // 8. معرض القوالب
  // --------------------------------------------------------------------------
  function selectTemplate(id) {
    activeTemplate = id;
    updateTemplateTabs();
    updateFieldVisibility();
    draw();
    saveState();
    commitNow();
    highlightGallery();
  }

  function toggleFavorite(id) {
    const index = proState.favorites.indexOf(id);
    if (index > -1) proState.favorites.splice(index, 1);
    else proState.favorites.push(id);
    saveProState();
  }

  function highlightGallery() {
    const grid = q('tplGrid');
    if (!grid) return;
    [...grid.children].forEach(card => {
      if (!card.dataset.tpl) return;
      card.classList.toggle('on', card.dataset.tpl === activeTemplate);
      const star = card.querySelector('.tpl-star');
      if (star) star.classList.toggle('fav', isFav(card.dataset.tpl));
    });
  }

  let galleryRendering = false;
  async function renderGallery() {
    const grid = q('tplGrid');
    if (!grid || galleryRendering) return;
    galleryRendering = true;
    grid.innerHTML = '<small class="gal-loading">جاري تجهيز المعاينات...</small>';
    await sleep(30);

    const ordered = [...TPL_META].sort((a, b) => Number(isFav(b.id)) - Number(isFav(a.id)));
    const previousLinkRect = window.__linkRect;
    grid.innerHTML = '';

    for (const meta of ordered) {
      const card = make('div', 'tpl-thumb' + (meta.id === activeTemplate ? ' on' : ''));
      card.dataset.tpl = meta.id;

      const previewCanvas = document.createElement('canvas');
      try {
        draw(true, {
          canvas: previewCanvas,
          ctx: previewCanvas.getContext('2d'),
          template: meta.id,
          scale: 0.26
        });
        const img = document.createElement('img');
        img.alt = meta.name;
        img.loading = 'lazy';
        img.src = previewCanvas.toDataURL('image/jpeg', 0.7);
        card.append(img);
      } catch (err) {
        console.warn('تعذر تجهيز معاينة القالب', meta.id, err);
      }

      const caption = make('span', 'tpl-cap', meta.name);
      const star = make('button', 'tpl-star' + (isFav(meta.id) ? ' fav' : ''), '★');
      star.type = 'button';
      star.title = 'إضافة للمفضلة';
      star.addEventListener('click', event => {
        event.stopPropagation();
        toggleFavorite(meta.id);
        renderGallery();
      });
      card.append(caption, star);
      card.addEventListener('click', () => selectTemplate(meta.id));
      grid.append(card);
      await sleep(0);
    }

    window.__linkRect = previousLinkRect;
    galleryRendering = false;
  }

  function wireGallery() {
    if (q('surpriseBtn')) {
      q('surpriseBtn').onclick = () => {
        const templates = TPL_META.map(meta => meta.id);
        const palettes = Object.values(PALETTES);
        const patterns = ['stripes', 'solid', 'dots', 'grid', 'gradient', 'radial', 'rays'];
        activeTemplate = templates[Math.floor(Math.random() * templates.length)];
        const palette = palettes[Math.floor(Math.random() * palettes.length)];
        ['c1', 'c2', 'gold', 'dark', 'tc'].forEach((id, i) => setField(id, palette[i]));
        setField('pat', patterns[Math.floor(Math.random() * patterns.length)]);
        setField('ft', Math.random() > 0.5 ? 'c' : 'f');
        setField('sm', ['hard', 'long', 'soft', 'none'][Math.floor(Math.random() * 4)]);
        updateTemplateTabs();
        updateFieldVisibility();
        draw();
        saveState();
        commitNow();
        highlightGallery();
        toast('اتعمل تصميم مفاجئ');
      };
    }
    if (q('refreshGallery')) {
      q('refreshGallery').onclick = () => {
        renderGallery();
        toast('اتحدثت معاينات القوالب');
      };
    }
  }

  // --------------------------------------------------------------------------
  // 9. الطبقات
  // --------------------------------------------------------------------------
  function layerName(layer) {
    if (layer.type === 'image') return layer.qr ? 'QR' : 'صورة';
    const icon = String(layer.icon || '');
    if (icon.startsWith('s:')) return 'شكل';
    if (icon.startsWith('e:')) return 'إيموجي';
    return 'ملصق';
  }

  function renderLayerList() {
    const list = q('layerList');
    if (!list) return;
    list.innerHTML = '';

    if (!layers.length) {
      list.innerHTML = '<p class="hint">مفيش صور أو ملصقات في الشريحة دي. ضيف من تبويب العناصر.</p>';
      return;
    }

    [...layers].reverse().forEach(layer => {
      const row = make('div', 'layer-row' + (layer.id === selectedLayerId ? ' on' : ''));
      if (layer.hidden) row.classList.add('off');
      row.dataset.id = layer.id;

      row.innerHTML = `
        <button type="button" class="lname" data-a="sel">${layerName(layer)}</button>
        <button type="button" data-a="hide" title="إظهار/إخفاء">${layer.hidden ? '◌' : '◉'}</button>
        <button type="button" data-a="lock" title="قفل/فتح">${layer.locked ? '▣' : '▢'}</button>
        <button type="button" data-a="up" title="تقديم">↑</button>
        <button type="button" data-a="down" title="تأخير">↓</button>
        <button type="button" data-a="dup" title="تكرار">⧉</button>
        <button type="button" data-a="del" title="حذف">✕</button>
      `;

      row.querySelector('[data-a="sel"]').onclick = () => {
        if (layer.locked) { toast('العنصر مقفول — افتحه الأول'); return; }
        selectedLayerId = layer.id;
        refreshLayerControls();
        draw();
      };
      row.querySelector('[data-a="hide"]').onclick = () => {
        layer.hidden = !layer.hidden;
        renderLayerList();
        draw();
        saveState();
        commitNow();
      };
      row.querySelector('[data-a="lock"]').onclick = () => {
        layer.locked = !layer.locked;
        renderLayerList();
        saveState();
      };
      row.querySelector('[data-a="up"]').onclick = () => moveLayer(layer, 1);
      row.querySelector('[data-a="down"]').onclick = () => moveLayer(layer, -1);
      row.querySelector('[data-a="dup"]').onclick = () => duplicateLayer(layer);
      row.querySelector('[data-a="del"]').onclick = () => deleteLayer(layer);

      list.append(row);
    });
  }

  function moveLayer(layer, direction) {
    const index = layers.indexOf(layer);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= layers.length) return;
    layers.splice(index, 1);
    layers.splice(target, 0, layer);
    renderLayerList();
    draw();
    saveState();
    commitNow();
  }

  function duplicateLayer(layer) {
    const copy = Object.assign({}, layer, { id: nextLayerId++, x: layer.x + 30, y: layer.y + 30 });
    layers.push(copy);
    selectedLayerId = copy.id;
    refreshLayerControls();
    draw();
    saveState();
    commitNow();
  }

  function deleteLayer(layer) {
    const index = layers.indexOf(layer);
    if (index > -1) layers.splice(index, 1);
    if (selectedLayerId === layer.id) selectedLayerId = null;
    refreshLayerControls();
    draw();
    saveState();
    commitNow();
  }

  function alignSelected(mode) {
    const layer = selectedLayer();
    if (!layer) { toast('حدد عنصر من المعاينة الأول'); return; }
    const v = getFormValues();
    const bounds = layerBounds(layer);
    const margin = 40;
    if (mode === 'left') layer.x = bounds.w / 2 + margin;
    if (mode === 'right') layer.x = v.W - bounds.w / 2 - margin;
    if (mode === 'hcenter') layer.x = v.W / 2;
    if (mode === 'top') layer.y = bounds.h / 2 + margin;
    if (mode === 'bottom') layer.y = v.H - bounds.h / 2 - margin;
    if (mode === 'vcenter') layer.y = v.H / 2;
    draw();
    saveState();
    commitNow();
  }

  function wireLayers() {
    document.querySelectorAll('#alignRow [data-al]').forEach(btn => {
      btn.onclick = () => alignSelected(btn.dataset.al);
    });
  }

  // --------------------------------------------------------------------------
  // 10. أدوات الصور والأشكال
  // --------------------------------------------------------------------------
  function patchSelected(patch) {
    const layer = selectedLayer();
    if (!layer) { toast('حدد صورة أو عنصر من المعاينة الأول'); return false; }
    Object.assign(layer, patch);
    refreshLayerControls();
    draw();
    saveState();
    commitNow();
    return true;
  }

  function removeBackground(layer) {
    if (!layer || layer.type !== 'image' || !layer.img) {
      toast('حدد صورة الأول');
      return;
    }
    try {
      const img = layer.img;
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = data.data;
      const w = canvas.width;
      const h = canvas.height;
      const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
      let r = 0, g = 0, b = 0;
      corners.forEach(offset => { r += pixels[offset]; g += pixels[offset + 1]; b += pixels[offset + 2]; });
      r /= corners.length; g /= corners.length; b /= corners.length;
      const tolerance = 52;
      const visited = new Uint8Array(w * h);
      const stack = [];
      corners.forEach(offset => stack.push((offset / 4) | 0));

      while (stack.length) {
        const idx = stack.pop();
        if (visited[idx]) continue;
        visited[idx] = 1;
        const offset = idx * 4;
        const dr = pixels[offset] - r;
        const dg = pixels[offset + 1] - g;
        const db = pixels[offset + 2] - b;
        if (Math.sqrt(dr * dr + dg * dg + db * db) > tolerance) continue;
        pixels[offset + 3] = 0;
        const x = idx % w;
        const y = (idx / w) | 0;
        if (x > 0) stack.push(idx - 1);
        if (x < w - 1) stack.push(idx + 1);
        if (y > 0) stack.push(idx - w);
        if (y < h - 1) stack.push(idx + w);
      }

      ctx.putImageData(data, 0, 0);
      const out = new Image();
      out.onload = () => {
        layer.img = out;
        draw();
        saveState();
        commitNow();
        toast('اتشالت الخلفية (لو الخلفية بسيطة)');
      };
      out.src = canvas.toDataURL('image/png');
    } catch (err) {
      console.warn(err);
      toast('الصورة كبيرة أو مش مناسبة للإزالة التلقائية');
    }
  }

  function addSticker(icon, name) {
    const v = getFormValues();
    layers.push({
      id: nextLayerId++,
      type: 'sticker',
      icon,
      x: v.W / 2,
      y: v.H / 2,
      size: 260,
      rot: 0,
      color: v.gold,
      op: 100
    });
    selectedLayerId = layers[layers.length - 1].id;
    refreshLayerControls();
    draw();
    saveState();
    commitNow();
    toast(`اتضاف ${name || 'العنصر'}`);
  }

  async function addQrLayer() {
    const input = q('qrText');
    const text = (input && input.value.trim()) || 'https://example.com';
    if (!window.qrcode) { toast('مكتبة QR مش محملة'); return; }
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const modules = qr.getModuleCount();
      const margin = 4;
      const scale = 8;
      const size = (modules + margin * 2) * scale;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = getFormValues().dark || '#121212';
      for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect((col + margin) * scale, (row + margin) * scale, scale, scale);
          }
        }
      }
      const img = await loadImageFromUrl(canvas.toDataURL('image/png'));
      const v = getFormValues();
      layers.push({
        id: nextLayerId++,
        type: 'image',
        qr: true,
        img,
        x: v.W / 2,
        y: v.H / 2,
        w: v.W * 0.24,
        rot: 0,
        rad: 12,
        shape: 'rounded',
        op: 100
      });
      selectedLayerId = layers[layers.length - 1].id;
      refreshLayerControls();
      draw();
      saveState();
      commitNow();
      toast('اتضاف QR للشريحة');
    } catch (err) {
      console.warn(err);
      toast('تعذر توليد QR');
    }
  }

  function wireImageTools() {
    document.querySelectorAll('#shapeRow [data-shape]').forEach(btn => {
      btn.onclick = () => {
        const layer = selectedLayer();
        if (!layer || layer.type !== 'image') { toast('حدد صورة الأول'); return; }
        patchSelected({ shape: btn.dataset.shape, fit: btn.dataset.shape === 'circle' ? 'circle' : 'cover' });
      };
    });
    document.querySelectorAll('#fxRow [data-fx]').forEach(btn => {
      btn.onclick = () => {
        const layer = selectedLayer();
        if (!layer || layer.type !== 'image') { toast('حدد صورة الأول'); return; }
        patchSelected({ fx: btn.dataset.fx || null, br: 100, co: 100, sat: 100 });
      };
    });
    document.querySelectorAll('#shapeLib [data-stk]').forEach(btn => {
      btn.onclick = () => addSticker(btn.dataset.stk, btn.textContent.trim());
    });
    if (q('rmBg')) q('rmBg').onclick = () => removeBackground(selectedLayer());
    if (q('dupLayer')) q('dupLayer').onclick = () => {
      const layer = selectedLayer();
      if (!layer) { toast('حدد عنصر الأول'); return; }
      duplicateLayer(layer);
    };
    if (q('qrAdd')) q('qrAdd').onclick = addQrLayer;
  }

  // --------------------------------------------------------------------------
  // 11. التصدير المتقدم
  // --------------------------------------------------------------------------
  const exportMime = format => format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const exportExt = format => format === 'jpg' ? 'jpg' : format === 'webp' ? 'webp' : 'png';

  function canvasBlob(mime, quality = 0.92) {
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), mime, quality);
    });
  }

  async function withAllSlides(callback) {
    const previous = currentSlideIndex;
    slides[previous] = takeSnapshot();
    for (let i = 0; i < slides.length; i++) {
      goToSlide(i, true);
      await callback(i);
    }
    goToSlide(previous, true);
    draw();
  }

  async function exportSlideBlob(format, transparent, quality) {
    draw(true, { noBg: transparent && format === 'png' });
    return canvasBlob(exportMime(format), quality);
  }

  async function exportZip() {
    if (!window.JSZip) { toast('مكتبة ZIP مش محملة'); return; }
    const format = q('expFmt').value;
    const transparent = q('expTrans').checked;
    const zip = new window.JSZip();
    toast('جاري تجهيز ملف ZIP...', 6000);
    try {
      await withAllSlides(async index => {
        const blob = await exportSlideBlob(format, transparent, 0.92);
        zip.file(`slide-${index + 1}.${exportExt(format)}`, blob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlobSafe(content, 'slides.zip');
      toast('تم تنزيل ZIP');
    } catch (err) {
      console.warn(err);
      toast('حصلت مشكلة في ZIP');
      draw();
    }
  }

  async function exportPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) { toast('مكتبة PDF مش محملة'); return; }
    const { jsPDF } = window.jspdf;
    let doc = null;
    toast('جاري تجهيز PDF...', 6000);
    try {
      await withAllSlides(async () => {
        draw(true);
        const data = canvas.toDataURL('image/jpeg', 0.95);
        const w = canvas.width;
        const h = canvas.height;
        const orientation = w >= h ? 'landscape' : 'portrait';
        if (!doc) doc = new jsPDF({ orientation, unit: 'px', format: [w, h], compress: true });
        else doc.addPage([w, h], orientation);
        doc.addImage(data, 'JPEG', 0, 0, w, h);
      });
      doc.save('slides.pdf');
      toast('تم تنزيل PDF');
    } catch (err) {
      console.warn(err);
      toast('حصلت مشكلة في PDF');
      draw();
    }
  }

  async function exportGif() {
    if (!window.gifenc) { toast('مكتبة GIF مش محملة'); return; }
    toast('جاري تجهيز GIF...', 8000);
    try {
      draw(true);
      const source = canvas;
      const maxSide = 540;
      const ratio = Math.min(1, maxSide / Math.max(source.width, source.height));
      const fw = Math.max(2, Math.round(source.width * ratio));
      const fh = Math.max(2, Math.round(source.height * ratio));
      const frame = document.createElement('canvas');
      frame.width = fw;
      frame.height = fh;
      const fctx = frame.getContext('2d', { willReadFrequently: true });
      const gif = window.gifenc.GIFEncoder();
      const frames = 13;
      const bgColor = getFormValues().c1;

      for (let i = 0; i < frames; i++) {
        const t = i / (frames - 1);
        const ease = 1 - Math.pow(1 - t, 3);
        fctx.save();
        fctx.fillStyle = bgColor;
        fctx.fillRect(0, 0, fw, fh);
        fctx.globalAlpha = ease;
        const scaleUp = 0.94 + 0.06 * ease;
        const dw = fw * scaleUp;
        const dh = fh * scaleUp;
        fctx.drawImage(source, (fw - dw) / 2, (fh - dh) / 2, dw, dh);
        fctx.restore();
        const imageData = fctx.getImageData(0, 0, fw, fh);
        const palette = window.gifenc.quantize(imageData.data, 256);
        const indexed = window.gifenc.applyPalette(imageData.data, palette);
        gif.writeFrame(indexed, fw, fh, { palette, delay: 80 });
      }
      gif.finish();
      downloadBlobSafe(new Blob([gif.bytes()], { type: 'image/gif' }), 'slide.gif');
      toast('تم تنزيل GIF');
    } catch (err) {
      console.warn(err);
      toast('حصلت مشكلة في GIF');
    }
    draw();
  }

  async function exportVideo() {
    if (!window.MediaRecorder || !canvas.captureStream || typeof MediaRecorder === 'undefined') {
      toast('المتصفح لا يدعم تصدير الفيديو');
      return;
    }
    toast('جاري تجهيز فيديو قصير...', 8000);
    try {
      draw(true);
      const source = canvas;
      const maxSide = 720;
      const ratio = Math.min(1, maxSide / Math.max(source.width, source.height));
      const fw = Math.max(2, Math.round(source.width * ratio));
      const fh = Math.max(2, Math.round(source.height * ratio));
      const frame = document.createElement('canvas');
      frame.width = fw;
      frame.height = fh;
      const fctx = frame.getContext('2d');
      const bgColor = getFormValues().c1;
      const candidates = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
      const stream = frame.captureStream(30);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
      const stopped = new Promise(resolve => { recorder.onstop = resolve; });

      recorder.start();
      const duration = 2400;
      const start = performance.now();
      await new Promise(resolve => {
        function tick(now) {
          const t = Math.min(1, (now - start) / duration);
          const ease = 1 - Math.pow(1 - t, 3);
          fctx.save();
          fctx.fillStyle = bgColor;
          fctx.fillRect(0, 0, fw, fh);
          fctx.globalAlpha = ease;
          const scaleUp = 0.94 + 0.06 * ease;
          const dw = fw * scaleUp;
          const dh = fh * scaleUp;
          fctx.drawImage(source, (fw - dw) / 2, (fh - dh) / 2, dw, dh);
          fctx.restore();
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
      await sleep(120);
      recorder.stop();
      await stopped;
      const type = (mimeType || 'video/webm').split(';')[0];
      downloadBlobSafe(new Blob(chunks, { type }), `slide.${type.includes('mp4') ? 'mp4' : 'webm'}`);
      toast('تم تنزيل الفيديو');
    } catch (err) {
      console.warn(err);
      toast('حصلت مشكلة في الفيديو');
    }
    draw();
  }

  function wireExport() {
    q('expOne').onclick = async () => {
      const format = q('expFmt').value;
      const blob = await exportSlideBlob(format, q('expTrans').checked, 0.92);
      downloadBlobSafe(blob, `slide-${currentSlideIndex + 1}.${exportExt(format)}`);
      draw();
      toast(`تم تنزيل ${format.toUpperCase()}`);
    };
    q('expZip').onclick = exportZip;
    q('expPdf').onclick = exportPdf;
    q('expGif').onclick = exportGif;
    q('expVid').onclick = exportVideo;
    q('expFmt').onchange = () => {
      const format = q('expFmt').value;
      q('expTrans').disabled = format !== 'png';
      if (format !== 'png') q('expTrans').checked = false;
    };
  }

  // --------------------------------------------------------------------------
  // 12. الأدوات: الجهاز، الألوان، الكاروسيل
  // --------------------------------------------------------------------------
  function applyDevice(mode) {
    let wrap = document.querySelector('.device-wrap');
    if (!wrap) {
      const canvasEl = q('cv');
      if (!canvasEl || !canvasEl.parentElement) return;
      wrap = make('div', 'device-wrap');
      canvasEl.parentElement.insertBefore(wrap, canvasEl);
      wrap.append(canvasEl);
    }
    wrap.className = 'device-wrap' + (mode && mode !== 'none' ? ` device-${mode}` : '');
    try { localStorage.setItem('deviceView', mode); } catch (err) { /* تجاهل */ }
  }

  function hexToHsl(hex) {
    const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#7F0025';
    const num = parseInt(normalized.slice(1), 16);
    const r = (num >> 16) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const toHex = value => Math.round((value + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function applyHarmony(mode) {
    const base = hexToHsl(q('c1').value);
    let accentHue = base.h;
    if (mode === 'warm') accentHue = base.h + 38;
    if (mode === 'cool') accentHue = base.h - 42;
    if (mode === 'contrast') accentHue = base.h + 180;
    const accentSat = mode === 'mono' ? Math.max(25, base.s - 10) : 78;
    const accentLight = mode === 'mono' ? Math.min(82, base.l + 28) : 58;

    setField('c1', hslToHex(base.h, Math.max(35, base.s), Math.max(14, Math.min(34, base.l))));
    setField('c2', hslToHex(base.h, Math.max(30, base.s * 0.9), Math.max(8, Math.min(24, base.l - 6))));
    setField('gold', hslToHex(accentHue, accentSat, accentLight));
    setField('dark', hslToHex(base.h, Math.max(15, Math.min(40, base.s * 0.5)), 7));
    setField('tc', hslToHex(base.h, 18, 97));
    draw();
    saveState();
    commitNow();
    renderGallery();
    toast('اتغيرت لوحة الألوان');
  }

  function harmonyFromImage() {
    const selected = selectedLayer();
    const img = (selected && selected.type === 'image' && selected.img) || loadedAssets.bg || loadedAssets.screenshot;
    if (!img) { toast('ارفع صورة الأول'); return; }
    const avg = averageColor(img);
    if (!avg) { toast('مش قادر أستخرج اللون'); return; }
    setField('c1', avg);
    applyHarmony('mono');
  }

  function splitCarousel() {
    const parts = q('t2').value.split('\n').map(line => line.trim()).filter(Boolean);
    if (parts.length < 2) {
      toast('اكتب كل جزء من النص في سطر منفصل الأول');
      return;
    }
    slides[currentSlideIndex] = takeSnapshot();
    const base = slides[currentSlideIndex];
    const newSlides = parts.map((part, i) => {
      const values = [...base.v];
      setFieldValue(values, 't2', part);
      setFieldValue(values, 'cnt', `${i + 1}/${parts.length}`);
      return {
        tpl: base.tpl,
        v: values,
        IMG: base.IMG,
        BG: base.BG,
        LOGO: base.LOGO,
        layers: cloneLayers(base.layers)
      };
    });
    slides.splice(currentSlideIndex + 1, 0, ...newSlides);
    renderSlideTabs();
    goToSlide(currentSlideIndex + 1, true);
    saveState();
    commitNow();
    toast(`اتعمل ${newSlides.length} شرائح كاروسيل`);
  }

  // --------------------------------------------------------------------------
  // 13. CSV
  // --------------------------------------------------------------------------
  let csvRows = null;
  let csvMapping = null;

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else quoted = false;
        } else cell += ch;
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell);
        cell = '';
        rows.push(row);
        row = [];
      } else if (ch !== '\r') {
        cell += ch;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter(cells => cells.some(value => value.trim() !== ''));
  }

  function detectMapping(header) {
    const mapping = { t1: 0, t2: 1, steps: -1, big: -1, cnt: -1 };
    if (!header) return mapping;
    const normalized = header.map(value => value.trim().toLowerCase());
    const find = words => normalized.findIndex(value => words.some(word => value.includes(word)));
    const titleIdx = find(['title', 'head', 'عنوان', 'رئيس']);
    const descIdx = find(['desc', 'sub', 'text', 'نص', 'وصف', 'تفاصيل']);
    const stepsIdx = find(['step', 'list', 'points', 'نقاط', 'خطو']);
    const bigIdx = find(['big', 'number', 'value', 'رقم', 'قيمة', 'إحصا']);
    const cntIdx = find(['count', 'index', 'ترقيم', 'ترتيب']);
    if (titleIdx > -1) mapping.t1 = titleIdx;
    if (descIdx > -1) mapping.t2 = descIdx;
    mapping.steps = stepsIdx;
    mapping.big = bigIdx;
    mapping.cnt = cntIdx;
    return mapping;
  }

  function buildFromCsv() {
    if (!csvRows || csvRows.length < 2) {
      toast('ارفع ملف CSV فيه صف عناوين وصف بيانات');
      return;
    }
    slides[currentSlideIndex] = takeSnapshot();
    const base = slides[currentSlideIndex];
    const newSlides = [];
    csvRows.slice(1).forEach(row => {
      const values = [...base.v];
      const pick = column => (column >= 0 && row[column] != null ? row[column].trim() : '');
      setFieldValue(values, 't1', pick(csvMapping.t1));
      setFieldValue(values, 't2', pick(csvMapping.t2).replace(/\s*\|\s*/g, '\n'));
      if (csvMapping.steps > -1) setFieldValue(values, 'steps', pick(csvMapping.steps).replace(/\s*\|\s*/g, '\n'));
      if (csvMapping.big > -1) setFieldValue(values, 'big', pick(csvMapping.big));
      if (csvMapping.cnt > -1) setFieldValue(values, 'cnt', pick(csvMapping.cnt));
      newSlides.push({
        tpl: base.tpl,
        v: values,
        IMG: base.IMG,
        BG: base.BG,
        LOGO: base.LOGO,
        layers: cloneLayers(base.layers)
      });
    });
    slides.splice(currentSlideIndex + 1, 0, ...newSlides);
    renderSlideTabs();
    goToSlide(currentSlideIndex + 1, true);
    saveState();
    commitNow();
    toast(`اتعملت ${newSlides.length} شريحة من CSV`);
  }

  function wireCsv() {
    const fileInput = q('csvFile');
    if (!fileInput) return;
    fileInput.onchange = async event => {
      const file = event.target.files[0];
      if (!file) return;
      const text = await file.text();
      csvRows = parseCsv(text);
      csvMapping = detectMapping(csvRows[0]);
      const ready = csvRows.length > 1;
      q('csvBuild').disabled = !ready;
      q('csvZip').disabled = !ready;
      q('csvInfo').textContent = ready
        ? `اتقرأ ${csvRows.length - 1} صف. الأعمدة: عنوان=${csvMapping.t1 + 1}, وصف=${csvMapping.t2 + 1}`
        : 'الملف فاضي أو مفيهوش بيانات';
    };
    q('csvBuild').onclick = buildFromCsv;
    q('csvZip').onclick = async () => {
      buildFromCsv();
      await sleep(250);
      exportZip();
    };
  }

  // --------------------------------------------------------------------------
  // 14. المشروع ومشاركة الستايل
  // --------------------------------------------------------------------------
  function imageToDataUrl(img) {
    if (!img) return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.width || 1;
    canvas.height = img.height || 1;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  async function saveProject() {
    slides[currentSlideIndex] = takeSnapshot();
    toast('جاري تجهيز ملف المشروع...', 6000);
    try {
      const output = { version: 2, savedAt: new Date().toISOString(), slides: [] };
      for (const slide of slides) {
        const layersOut = [];
        for (const layer of slide.layers || []) {
          const copy = Object.assign({}, layer);
          if (copy.type === 'image' && copy.img) copy.img = imageToDataUrl(copy.img);
          else if (copy.img) copy.img = null;
          layersOut.push(copy);
        }
        output.slides.push({
          tpl: slide.tpl,
          v: [...slide.v],
          IMG: imageToDataUrl(slide.IMG),
          BG: imageToDataUrl(slide.BG),
          LOGO: imageToDataUrl(slide.LOGO),
          layers: layersOut
        });
      }
      const blob = new Blob([JSON.stringify(output)], { type: 'application/json' });
      downloadBlobSafe(blob, 'designer-project.json');
      toast('تم حفظ المشروع');
    } catch (err) {
      console.warn(err);
      toast('الصور كبيرة جداً للحفظ');
    }
  }

  async function loadProjectFile(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.slides) || !data.slides.length) throw new Error('bad file');
      const newSlides = [];
      for (const slide of data.slides) {
        const slideLayers = [];
        for (const layer of slide.layers || []) {
          const copy = Object.assign({}, layer);
          if (copy.img) copy.img = await loadImageFromUrl(copy.img);
          slideLayers.push(copy);
        }
        newSlides.push({
          tpl: slide.tpl,
          v: slide.v,
          IMG: await loadImageFromUrl(slide.IMG),
          BG: await loadImageFromUrl(slide.BG),
          LOGO: await loadImageFromUrl(slide.LOGO),
          layers: slideLayers
        });
      }
      slides = newSlides;
      currentSlideIndex = 0;
      applySnapshot(slides[0]);
      renderSlideTabs();
      draw();
      saveState();
      commitNow();
      renderGallery();
      toast('اتفتح المشروع');
    } catch (err) {
      console.warn(err);
      toast('الملف مش صالح');
    }
  }

  function copyStyle() {
    const style = {};
    STYLE_KEYS.forEach(key => { if (q(key)) style[key] = q(key).value; });
    const text = JSON.stringify(style);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast('تم نسخ الستايل'))
        .catch(() => window.prompt('انسخ الستايل:', text));
    } else {
      window.prompt('انسخ الستايل:', text);
    }
  }

  function applyStyleObject(style) {
    STYLE_KEYS.forEach(key => { if (style[key] != null && q(key)) q(key).value = style[key]; });
    draw();
    saveState();
    commitNow();
    renderGallery();
    toast('اتطبق الستايل');
  }

  async function pasteStyle() {
    try {
      const text = await navigator.clipboard.readText();
      applyStyleObject(JSON.parse(text));
    } catch (err) {
      const text = window.prompt('الصق كود الستايل هنا:');
      if (!text) return;
      try { applyStyleObject(JSON.parse(text)); }
      catch (inner) { toast('الكود مش صالح'); }
    }
  }

  // --------------------------------------------------------------------------
  // 15. النوافذ التوضيحية
  // --------------------------------------------------------------------------
  function ensureDialog() {
    let dialog = q('proDialog');
    if (dialog) return dialog;
    dialog = make('dialog', 'pro-dialog');
    dialog.id = 'proDialog';
    dialog.innerHTML = `
      <div class="dlg-head">
        <strong id="proDialogTitle">مساعدة</strong>
        <button type="button" class="chip" id="proDialogClose">إغلاق</button>
      </div>
      <div id="proDialogBody"></div>
    `;
    document.body.append(dialog);
    q('proDialogClose').onclick = () => dialog.close();
    return dialog;
  }

  function openDialog(kind) {
    const dialog = ensureDialog();
    const title = q('proDialogTitle');
    const body = q('proDialogBody');
    if (kind === 'proTour') {
      title.textContent = 'جولة سريعة في الأداة';
      body.innerHTML = `
        <ol class="dlg-steps">
          <li>اختار القالب والمقاس من تبويب <b>المحتوى</b> أو من <b>معرض القوالب</b>.</li>
          <li>اكتب عنوانك والأسطر. الكلمة اللي بين <b>{ }</b> بتطلع بلون مميز.</li>
          <li>من تبويب <b>التصميم</b> غيّر الألوان والخلفية أو جرّب <b>تناسق الألوان</b>.</li>
          <li>من تبويب <b>العناصر</b> ضيف صور وملصقات وأشكال، وحدد أي عنصر عشان تظهر أدواته.</li>
          <li>من تبويب <b>أدوات</b> اعمل كاروسيل، حمّل CSV، أو صدّر ZIP/PDF/GIF/فيديو.</li>
        </ol>
        <p class="hint">تقدر تسحب أي عنصر على المعاينة بالماوس أو الصباع، وCtrl+Z للتراجع.</p>
      `;
      proState.onboardingSeen = true;
      saveProState();
    } else {
      title.textContent = 'اختصارات الكيبورد';
      body.innerHTML = `
        <ul class="dlg-keys">
          <li><b>Ctrl + Z</b> تراجع</li>
          <li><b>Ctrl + Y</b> أو <b>Ctrl + Shift + Z</b> إعادة</li>
          <li><b>Delete</b> حذف العنصر المحدد</li>
          <li><b>Esc</b> إلغاء تحديد العنصر</li>
          <li><b>الأسهم</b> تحريك العنصر 10px</li>
          <li><b>Shift + الأسهم</b> تحريك العنصر 40px</li>
        </ul>
      `;
    }
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else window.alert(body.textContent);
  }

  function wireDialogs() {
    if (q('showTour')) q('showTour').onclick = () => openDialog('proTour');
    if (q('showKeys')) q('showKeys').onclick = () => openDialog('proKeys');
  }

  // --------------------------------------------------------------------------
  // 15.b أدوات الشرائح والنسخ بينها
  // --------------------------------------------------------------------------
  let layerClipboard = null;

  function duplicateSlide() {
    slides[currentSlideIndex] = takeSnapshot();
    const base = slides[currentSlideIndex];
    const copy = {
      tpl: base.tpl,
      v: [...base.v],
      IMG: base.IMG,
      BG: base.BG,
      LOGO: base.LOGO,
      layers: cloneLayers(base.layers)
    };
    slides.splice(currentSlideIndex + 1, 0, copy);
    renderSlideTabs();
    goToSlide(currentSlideIndex + 1, true);
    saveState();
    commitNow();
    toast('اتعملت نسخة من الشريحة');
  }

  function moveSlide(delta) {
    const target = currentSlideIndex + delta;
    if (target < 0 || target >= slides.length) return;
    slides[currentSlideIndex] = takeSnapshot();
    const [moved] = slides.splice(currentSlideIndex, 1);
    slides.splice(target, 0, moved);
    currentSlideIndex = target;
    applySnapshot(slides[target]);
    renderSlideTabs();
    draw();
    saveState();
    commitNow();
  }

  function copySelectedLayer() {
    const layer = selectedLayer();
    if (!layer) { toast('حدد عنصر الأول'); return; }
    layerClipboard = Object.assign({}, layer);
    toast('اتنسخ العنصر — تقدر تلصقه في أي شريحة');
  }

  function pasteLayer() {
    if (!layerClipboard) { toast('مفيش عنصر منسوخ'); return; }
    const copy = Object.assign({}, layerClipboard, {
      id: nextLayerId++,
      x: layerClipboard.x + 30,
      y: layerClipboard.y + 30
    });
    layers.push(copy);
    selectedLayerId = copy.id;
    refreshLayerControls();
    draw();
    saveState();
    commitNow();
    toast('اتلصق العنصر');
  }

  function wireSlides() {
    if (q('dupSlide')) q('dupSlide').onclick = duplicateSlide;
    if (q('slideEarlier')) q('slideEarlier').onclick = () => moveSlide(-1);
    if (q('slideLater')) q('slideLater').onclick = () => moveSlide(1);
    if (q('copyLayer')) q('copyLayer').onclick = copySelectedLayer;
    if (q('pasteLayer')) q('pasteLayer').onclick = pasteLayer;
  }

  // --------------------------------------------------------------------------
  // 15.c الذكاء الاصطناعي (Gemini)
  // --------------------------------------------------------------------------
  let lastAIResult = null;

  function getStoredKey() {
    try { return (localStorage.getItem('geminiKey') || '').trim(); } catch (err) { return ''; }
  }

  function updateKeyStatus() {
    const status = q('aiKeyStatus');
    if (!status) return;
    const key = getStoredKey();
    status.textContent = key
      ? 'المفتاح محفوظ محلياً في المتصفح.'
      : 'مفيش مفتاح محفوظ. على Vercel ممكن السيرفر يكون مجهز بمفتاح (GEMINI_API_KEY).';
  }

  function saveAIKey() {
    const value = (q('aiKey').value || '').trim();
    if (value.length < 20) { toast('المفتاح مش صالح'); return; }
    try { localStorage.setItem('geminiKey', value); } catch (err) { toast('المتصفح مش سامح بالحفظ'); return; }
    q('aiKey').value = '';
    updateKeyStatus();
    toast('اتحفظ المفتاح في المتصفح');
  }

  async function callGemini(model, payload) {
    const key = getStoredKey();
    const host = location.hostname;
    const canProxy = location.protocol.startsWith('http') && host && host !== 'localhost' && host !== '127.0.0.1';

    if (canProxy) {
      let proxyResponse = null;
      try {
        proxyResponse = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, payload })
        });
      } catch (err) {
        proxyResponse = null;
      }
      if (proxyResponse) {
        if (proxyResponse.ok) return proxyResponse.json();
        const status = proxyResponse.status;
        const canRetryDirect = key && (status === 401 || status === 403 || status === 429 || status >= 500);
        if (![404, 405, 501].includes(status) && !canRetryDirect) {
          const data = await proxyResponse.json().catch(() => ({}));
          const message = (data.error && data.error.message) || (typeof data.error === 'string' ? data.error : '') || data.message || `HTTP ${status}`;
          throw new Error(message);
        }
      }
    }

    if (!key) throw new Error('NO_KEY');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((data.error && data.error.message) || `HTTP ${response.status}`);
    return data;
  }

  function aiErrorMessage(error) {
    const message = String((error && error.message) || error || '');
    if (message === 'NO_KEY') return 'أضف مفتاح Gemini من إعدادات الذكاء الاصطناعي الأول.';
    if (/quota|429|rate limit|exceeded/i.test(message)) return 'تجاوزت حصة المفتاح أو الموديل مش متاح على خطتك الحالية.';
    if (/api key|invalid|401|403|permission|unauthor/i.test(message)) return 'المفتاح غير صالح أو مش مصرح له.';
    if (message === 'NO_IMAGE') return 'الموديل رجّع رد بدون صورة. جرّب وصف تاني.';
    if (message === 'BAD_JSON') return 'رد الموديل مش مفهوم. جرّب تاني.';
    return 'حصل خطأ: ' + message;
  }

  function parseAIJson(text) {
    if (!text) return null;
    let clean = String(text).trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start > -1 && end > start) clean = clean.slice(start, end + 1);
    try { return JSON.parse(clean); } catch (err) { return null; }
  }

  function collectAIText(data) {
    const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    return parts.map(part => part.text || '').join('').trim();
  }

  function setAIOut(message, isError) {
    const box = q('aiOut');
    if (!box) return;
    box.classList.remove('hid');
    box.classList.toggle('error', !!isError);
    box.textContent = message;
  }

  function renderAIResult(result) {
    const box = q('aiOut');
    if (!box) return;
    box.classList.remove('hid', 'error');
    box.innerHTML = '';
    const addText = (tag, text, cls) => {
      if (!text) return;
      const node = make(tag, cls);
      node.textContent = text;
      box.append(node);
    };
    addText('strong', result.title);
    result.lines.forEach(line => addText('p', line));
    if (result.steps.length) {
      const list = make('ul');
      result.steps.forEach(step => {
        const item = make('li');
        item.textContent = step;
        list.append(item);
      });
      box.append(list);
    }
    if (result.big) addText('small', 'الرقم الكبير: ' + result.big);
    if (result.badge) addText('small', 'الشارة: ' + result.badge);
  }

  const AI_TYPE_LABELS = {
    ad: 'إعلان أو عرض',
    tip: 'محتوى تعليمي بخطوات',
    quote: 'اقتباس أو فكرة',
    list: 'قائمة نقاط'
  };
  const AI_TONE_LABELS = {
    enthusiastic: 'حماسية',
    professional: 'احترافية',
    friendly: 'ودودة',
    funny: 'خفيفة ومرحة'
  };

  async function generateAIText() {
    const topic = (q('aiTopic').value || '').trim();
    if (!topic) { toast('اكتب موضوع المنشور الأول'); return; }
    const type = AI_TYPE_LABELS[q('aiType').value] || AI_TYPE_LABELS.ad;
    const tone = AI_TONE_LABELS[q('aiTone').value] || AI_TONE_LABELS.enthusiastic;
    const count = +(q('aiCount').value || 3);
    const button = q('aiGenerate');
    button.disabled = true;
    q('aiApply').disabled = true;
    setAIOut('جاري توليد النص...');

    const prompt = [
      'أنت كاتب محتوى عربي محترف لتصميمات السوشيال ميديا.',
      `اكتب منشورًا عن: ${topic}.`,
      `نوع المحتوى: ${type}. النبرة: ${tone}.`,
      'أعطني JSON فقط بدون أي شرح أو Markdown بهذا الشكل:',
      '{"title":"عنوان قصير جذاب","lines":["سطر 1","سطر 2"],"steps":["نقطة 1","نقطة 2"],"big":"رقم أو كلمة قصيرة","badge":"شارة قصيرة"}',
      'الشروط:',
      '- title أقل من 45 حرفًا.',
      '- lines من 1 إلى 3 أسطر، كل سطر أقل من 50 حرفًا.',
      `- steps عددها ${count} نقاط قصيرة، أو [] لو النوع لا يحتاج نقاطًا.`,
      '- big وbadge اختياريان، ولو مش مناسبين سيبهم نص فارغ.',
      '- لو مناسب، حط { } حول أهم كلمة في السطر لجعلها ملونة.',
      '- ممنوع أي نص خارج JSON.'
    ].join('\n');

    try {
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9 }
      };
      const data = await callGemini('gemini-2.5-flash', payload);
      const parsed = parseAIJson(collectAIText(data));
      if (!parsed) throw new Error('BAD_JSON');

      const toList = value => Array.isArray(value) ? value : (value ? [value] : []);
      const result = {
        title: String(parsed.title || '').trim(),
        lines: toList(parsed.lines).map(String).filter(Boolean).slice(0, 3),
        steps: toList(parsed.steps).map(String).filter(Boolean).slice(0, 5),
        big: parsed.big ? String(parsed.big).trim() : '',
        badge: parsed.badge ? String(parsed.badge).trim() : ''
      };
      if (!result.title && !result.lines.length) throw new Error('BAD_JSON');

      lastAIResult = result;
      renderAIResult(result);
      q('aiApply').disabled = false;
    } catch (err) {
      lastAIResult = null;
      setAIOut(aiErrorMessage(err), true);
    } finally {
      button.disabled = false;
    }
  }

  function applyAIResult() {
    if (!lastAIResult) { toast('ولّد نص الأول'); return; }
    const result = lastAIResult;
    setField('t1', result.title || '');
    setField('t2', result.lines.join('\n'));
    if (result.steps.length) setField('steps', result.steps.join('\n'));
    if (result.big) setField('big', result.big);
    if (result.badge) setField('badge', result.badge);
    draw();
    saveState();
    commitNow();
    highlightGallery();
    toast('اتطبق النص على الشريحة');
  }

  async function generateAIImage(asLayer) {
    const prompt = (q('aiPrompt').value || '').trim() || (q('aiTopic').value || '').trim() || 'abstract gradient background for social media, no text';
    const status = q('aiImageStatus');
    if (status) status.textContent = 'جاري توليد الصورة...';
    try {
      const payload = {
        contents: [{ parts: [{ text: `Generate a high-quality image for a social media design: ${prompt}. No text, no letters, no watermark.` }] }],
        generationConfig: { responseModalities: ['IMAGE'] }
      };
      const data = await callGemini('gemini-2.5-flash-image', payload);
      const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      const imagePart = parts.find(part => part.inlineData && part.inlineData.data);
      if (!imagePart) throw new Error('NO_IMAGE');
      const src = `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
      const image = await loadImageFromUrl(src);
      if (asLayer) {
        const v = getFormValues();
        layers.push({
          id: nextLayerId++,
          type: 'image',
          img: image,
          x: v.W / 2,
          y: v.H / 2,
          w: v.W * 0.7,
          rot: 0,
          rad: 20,
          shape: 'rounded',
          op: 100
        });
        selectedLayerId = layers[layers.length - 1].id;
        refreshLayerControls();
      } else {
        loadedAssets.bg = image;
      }
      draw();
      saveState();
      commitNow();
      if (status) status.textContent = 'تم توليد الصورة.';
      toast('تم توليد الصورة');
    } catch (err) {
      if (status) status.textContent = aiErrorMessage(err);
    }
  }

  async function aiRemoveBackground() {
    const layer = selectedLayer();
    if (!layer || layer.type !== 'image' || !layer.img) { toast('حدد صورة الأول'); return; }
    const status = q('aiImageStatus');
    if (status) status.textContent = 'جاري إزالة الخلفية بالذكاء الاصطناعي...';
    try {
      const dataUrl = imageToDataUrl(layer.img);
      const base64 = dataUrl.split(',')[1];
      const payload = {
        contents: [{
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64 } },
            { text: 'Remove the background completely and keep the main subject only, placed on a pure solid white background. Do not add text or new objects. Output only the edited image.' }
          ]
        }],
        generationConfig: { responseModalities: ['IMAGE'] }
      };
      const data = await callGemini('gemini-2.5-flash-image', payload);
      const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      const imagePart = parts.find(part => part.inlineData && part.inlineData.data);
      if (!imagePart) throw new Error('NO_IMAGE');
      const src = `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
      layer.img = await loadImageFromUrl(src);
      draw();
      saveState();
      commitNow();
      if (status) status.textContent = 'اتشالت الخلفية بالذكاء الاصطناعي.';
      toast('تم تعديل الصورة');
    } catch (err) {
      if (status) status.textContent = aiErrorMessage(err) + ' — جرّب زر الإزالة التقريبي.';
    }
  }

  function wireAI() {
    if (q('aiKeySave')) q('aiKeySave').onclick = saveAIKey;
    if (q('aiKeyClear')) {
      q('aiKeyClear').onclick = () => {
        try { localStorage.removeItem('geminiKey'); } catch (err) { /* تجاهل */ }
        updateKeyStatus();
        toast('اتمسح المفتاح');
      };
    }
    if (q('aiGenerate')) q('aiGenerate').onclick = generateAIText;
    if (q('aiApply')) q('aiApply').onclick = applyAIResult;
    if (q('aiBg')) q('aiBg').onclick = () => generateAIImage(false);
    if (q('aiLayer')) q('aiLayer').onclick = () => generateAIImage(true);
    if (q('aiRmBg')) q('aiRmBg').onclick = aiRemoveBackground;
    updateKeyStatus();
  }

  // --------------------------------------------------------------------------
  // 16. ربط تبويب الأدوات
  // --------------------------------------------------------------------------
  function wireToolsTab() {
    const deviceSel = q('deviceSel');
    if (deviceSel) deviceSel.onchange = () => applyDevice(deviceSel.value);

    if (q('safeZones')) {
      q('safeZones').onchange = event => {
        proState.safeZones = event.target.checked;
        saveProState();
        draw();
      };
    }
    if (q('rulers')) {
      q('rulers').onchange = event => {
        proState.rulers = event.target.checked;
        saveProState();
        draw();
      };
    }

    document.querySelectorAll('[data-harmony]').forEach(btn => {
      btn.onclick = () => applyHarmony(btn.dataset.harmony);
    });
    if (q('harmonyFromImage')) q('harmonyFromImage').onclick = harmonyFromImage;
    if (q('splitCarousel')) q('splitCarousel').onclick = splitCarousel;
    wireCsv();

    if (q('saveProject')) q('saveProject').onclick = saveProject;
    if (q('loadProject')) q('loadProject').onclick = () => q('loadProjectFile').click();
    if (q('loadProjectFile')) {
      q('loadProjectFile').onchange = event => {
        loadProjectFile(event.target.files[0]);
        event.target.value = '';
      };
    }
    if (q('copyStyle')) q('copyStyle').onclick = copyStyle;
    if (q('pasteStyle')) q('pasteStyle').onclick = pasteStyle;

    document.querySelectorAll('#textPresets [data-tp]').forEach(btn => {
      btn.onclick = () => {
        const presets = {
          strong: { scale: 120, lh: 96, sm: 'long', ss: 145 },
          calm: { scale: 92, lh: 120, sm: 'soft', ss: 80 },
          bold: { scale: 130, lh: 86, sm: 'hard', ss: 180 },
          flat: { scale: 100, lh: 105, sm: 'none', ss: 100 }
        };
        const preset = presets[btn.dataset.tp];
        if (!preset) return;
        Object.entries(preset).forEach(([id, value]) => setField(id, value));
        draw();
        saveState();
        commitNow();
        toast('اتطبق ستايل النص');
      };
    });
  }

  // --------------------------------------------------------------------------
  // 17. التشغيل
  // --------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPro);
  } else {
    setTimeout(initPro, 0);
  }
})();