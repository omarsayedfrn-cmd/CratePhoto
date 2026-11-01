/**
 * ============================================================================
 * مصمم الصور - ملف المنطق الرئيسي للتطبيق (App Controller)
 * ============================================================================
 * يشمل: إدارة الشرائح، الصور المتعددة، الملصقات والأيقونات الجاهزة،
 *        سحب النصوص والعناصر، تحسين الصور، قوالب الستايل المحفوظة،
 *        والتراجع والإعادة (Undo / Redo).
 */

// ----------------------------------------------------------------------------
// 1. لوحات الألوان الجاهزة (Color Palettes)
// ----------------------------------------------------------------------------
const PALETTES = {
  'كلاسيك':      ['#7F0025', '#6c001f', '#D3AE3A', '#121212', '#ffffff'],
  'أسود وذهبي':  ['#121212', '#1d1d1d', '#D3AE3A', '#000000', '#ffffff'],
  'أزرق':        ['#0b2a5b', '#0a2350', '#ffd166', '#06142e', '#ffffff'],
  'أخضر':        ['#0f5132', '#0c4429', '#f2c94c', '#06251a', '#ffffff'],
  'بنفسجي':      ['#4b1d79', '#411868', '#ffb703', '#220a3d', '#ffffff'],
  'أحمر':        ['#c1121f', '#a60f1a', '#ffffff', '#3a0206', '#ffffff'],
  'تيل':         ['#0f766e', '#0d625b', '#fde68a', '#053a35', '#ffffff'],
  'فاتح':        ['#f5efe6', '#ebe3d6', '#7F0025', '#e2d6c3', '#1b1b1b']
};

// مفاتيح الستايل التي تُحفظ وتُطبَّق كقالب لون/خط/ظل
const STYLE_KEYS = ['c1', 'c2', 'gold', 'dark', 'tc', 'ft', 'sm', 'ss', 'pat', 'fr', 'scale', 'lh', 'tal'];

// ----------------------------------------------------------------------------
// 2. عناصر DOM والمتغيرات العامة للحالة (DOM & State)
// ----------------------------------------------------------------------------
const $ = id => document.getElementById(id);
const canvas = $('cv');
const ctx = canvas.getContext('2d');
const formFields = [...document.querySelectorAll('.f')];

// الصور المحملة من المستخدم (اللقطة الأصلية + الخلفية + الشعار)
const loadedAssets = {
  screenshot: null,
  bg: null,
  logo: null
};

// القالب النشط وقائمة الشرائح
let activeTemplate = 'cover';
let slides = [];
let currentSlideIndex = 0;

// طبقات الشريحة الحالية (صور متعددة + ملصقات) والعنصر المحدد
let layers = [];
let selectedLayerId = null;
let nextLayerId = 1;

// إعدادات الشبكة والمغناطيس (يتم تفعيلها/إيقافها من الواجهة)
let snapEnabled = true;
let gridStep = 40;
let activeGuides = null;

// دالة مساعدة لتجزئة النص لأسطر
const splitLines = text => text.split('\n').map(line => line.trim()).filter(Boolean);

// دوال إعدادات الخط النشط
const getFontWeight = () => ($('ft').value === 'c' ? 700 : 400);
const getFontFamily = () => ($('ft').value === 'c' ? 'CairoB, FP, sans-serif' : 'FP, CairoB, sans-serif');
const getFontConfig = () => ({
  weight: getFontWeight(),
  family: getFontFamily()
});

// ----------------------------------------------------------------------------
// 3. قراءة قيم حقول النموذج (Form Values Extractor)
// ----------------------------------------------------------------------------
function getFormValues() {
  const [W, H] = $('size').value.split('x').map(Number);
  const val = id => $(id).value;
  const isChecked = id => $(id).checked;

  return {
    W,
    H,
    k: val('scale') / 100,
    t1: val('t1').trim(),
    t2: splitLines(val('t2')),
    big: val('big').trim(),
    steps: splitLines(val('steps')).slice(0, 5),
    link: val('link').trim(),
    tal: val('tal'),
    lh: +val('lh'),
    ttx: +val('ttx'),
    tty: +val('tty'),
    lkx: +val('lkx'),
    lky: +val('lky'),
    chev: isChecked('chev'),
    icon: isChecked('icon'),
    circ: isChecked('circ'),
    bars: isChecked('bars'),
    cd: val('cd'),
    fr: val('fr'),
    badge: val('badge').trim(),
    bpos: val('bpos'),
    wm: val('wm').trim(),
    wpos: val('wpos'),
    cnt: val('cnt').trim(),
    lgpos: val('lgpos'),
    sfr: isChecked('sfr'),
    ssd: isChecked('ssd'),
    ix: +val('ix'),
    iy: +val('iy'),
    isc: val('isc') / 100,
    ir: +val('ir'),
    c1: val('c1'),
    c2: val('c2'),
    gold: val('gold'),
    dark: val('dark'),
    tc: val('tc'),
    pat: val('pat'),
    ov: val('ov') / 100
  };
}

// ----------------------------------------------------------------------------
// 4. حفظ واسترجاع الحالة والشرائح (State & Slide Management)
// ----------------------------------------------------------------------------
function cloneLayers(list) {
  return (list || []).map(l => ({ ...l }));
}

function takeSnapshot() {
  return {
    tpl: activeTemplate,
    v: formFields.map(field => (field.type === 'checkbox' ? field.checked : field.value)),
    IMG: loadedAssets.screenshot,
    BG: loadedAssets.bg,
    LOGO: loadedAssets.logo,
    layers: cloneLayers(layers)
  };
}

function applySnapshot(snapshot) {
  activeTemplate = snapshot.tpl;

  formFields.forEach((field, i) => {
    if (snapshot.v[i] !== undefined) {
      if (field.type === 'checkbox') {
        field.checked = snapshot.v[i];
      } else {
        field.value = snapshot.v[i];
      }
    }
  });

  loadedAssets.screenshot = snapshot.IMG || null;
  loadedAssets.bg = snapshot.BG || null;
  loadedAssets.logo = snapshot.LOGO || null;

  layers = cloneLayers(snapshot.layers);
  selectedLayerId = null;

  updateTemplateTabs();
  updateFieldVisibility();
  refreshLayerControls();
}

function saveState() {
  slides[currentSlideIndex] = takeSnapshot();
  try {
    localStorage.setItem(
      'designer2',
      JSON.stringify({
        cur: currentSlideIndex,
        SL: slides.map(slide => ({
          tpl: slide.tpl,
          v: slide.v,
          // نُخزّن الملصقات فقط (بدون بيانات الصور لأنها لا تُحفظ في التخزين المحلي)
          layers: (slide.layers || []).filter(l => l.type === 'sticker')
        }))
      })
    );
  } catch (err) {
    console.warn('تعذر حفظ البيانات في التخزين المحلي:', err);
  }
}

function renderSlideTabs() {
  const container = $('sl');
  container.innerHTML = '';

  slides.forEach((_, index) => {
    const btn = document.createElement('button');
    btn.textContent = index + 1;
    btn.className = index === currentSlideIndex ? 'on' : '';
    btn.onclick = () => goToSlide(index);
    container.append(btn);
  });

  // زر إضافة شريحة جديدة
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ شريحة جديدة';
  addBtn.onclick = () => {
    saveState();
    slides.splice(currentSlideIndex + 1, 0, {
      tpl: slides[currentSlideIndex].tpl,
      v: [...slides[currentSlideIndex].v],
      IMG: slides[currentSlideIndex].IMG,
      BG: slides[currentSlideIndex].BG,
      LOGO: slides[currentSlideIndex].LOGO,
      layers: cloneLayers(slides[currentSlideIndex].layers)
    });
    goToSlide(currentSlideIndex + 1);
    commitNow();
  };
  container.append(addBtn);

  // زر حذف الشريحة الحالية
  const delBtn = document.createElement('button');
  delBtn.textContent = '🗑 حذف';
  delBtn.onclick = () => {
    if (slides.length > 1) {
      slides.splice(currentSlideIndex, 1);
      goToSlide(Math.min(currentSlideIndex, slides.length - 1), true);
      commitNow();
    }
  };
  container.append(delBtn);
}

function goToSlide(targetIndex, noSave = false) {
  if (!noSave) {
    slides[currentSlideIndex] = takeSnapshot();
  }
  currentSlideIndex = targetIndex;
  applySnapshot(slides[targetIndex]);
  renderSlideTabs();
  draw();
  saveState();
}

// ----------------------------------------------------------------------------
// 5. تحديث واجهة المستخدم والقوالب (UI Updates)
// ----------------------------------------------------------------------------
function updateTemplateTabs() {
  document.querySelectorAll('#tp button').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.t === activeTemplate);
  });
}

function updateFieldVisibility() {
  canvas.style.touchAction = 'none';

  document.querySelectorAll('.only').forEach(elem => {
    elem.classList.toggle('hid', !elem.classList.contains(activeTemplate));
  });
}

// ----------------------------------------------------------------------------
// 5.b تبديل تبويبات لوحة التحكم (Control Panel Tabs)
// ----------------------------------------------------------------------------
function showControlTab(name) {
  document.querySelectorAll('.tab').forEach(tab => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('on', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.tabpanel').forEach(panel => {
    panel.classList.toggle('on', panel.dataset.panel === name);
  });
  try { localStorage.setItem('controlTab', name); } catch (err) { /* تجاهل */ }
}

// تفويض الحدث حتى تعمل التبويبات المضافة لاحقاً (تبويب الأدوات)
document.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (tab) showControlTab(tab.dataset.tab);
});

const savedControlTab = (() => {
  try { return localStorage.getItem('controlTab'); } catch { return null; }
})();

if (savedControlTab && document.querySelector(`.tab[data-tab="${savedControlTab}"]`)) {
  showControlTab(savedControlTab);
}

// ----------------------------------------------------------------------------
// 6. دالة الرسم الأساسية (Main Canvas Render Loop)
// ----------------------------------------------------------------------------
function draw(exportMode = false, options = {}) {
  const v = getFormValues();
  const target = options.canvas || canvas;
  const tctx = options.ctx || target.getContext('2d');
  const template = options.template || activeTemplate;
  const exportScale = options.scale || +$('xs').value;
  const fontConfig = getFontConfig();
  const shadowMode = $('sm').value;
  const shadowStrength = +$('ss').value;

  // تحديث إعدادات النص العامة (محاذاة، مسافة أسطر، إزاحة العنوان، لون الكلمات المميزة)
  TXT.lh = v.lh / 100;
  TXT.align = v.tal;
  TXT.ox = v.ttx;
  TXT.oy = v.tty;
  TXT.accent = v.gold;
  TXT.rich = true;
  TXT.spacing = v.tsp || 0;
  TXT.highlight = !!v.thl;
  TXT.underline = !!v.tun;
  TXT.gradient = !!v.tgd;

  target.width = Math.max(1, Math.round(v.W * exportScale));
  target.height = Math.max(1, Math.round(v.H * exportScale));

  tctx.setTransform(exportScale, 0, 0, exportScale, 0, 0);
  tctx.lineCap = 'butt';
  tctx.filter = 'none';

  // 1. رسم الخلفية (يمكن تخطيها لتصدير خلفية شفافة)
  if (!options.noBg) drawBackground(tctx, v, loadedAssets.bg);

  // 2. رسم العناصر التزيينية وحساب الحد المتبقي للمحتوى
  const bottomLimit = drawDeco(tctx, v) - 30;

  // 3. رسم القالب النشط
  if (window.TEMPLATES && window.TEMPLATES[template]) {
    window.TEMPLATES[template](tctx, v, bottomLimit, loadedAssets, fontConfig, shadowMode, shadowStrength);
  }

  // 4. رسم الطبقات (الصور المتعددة + الملصقات) وإطار التحديد
  drawLayers(tctx, layers, options.hideLayers ? null : selectedLayerId, exportMode);

  // 5. رسم الطبقات العلوية الإضافية (الإطار، الشارة، الترقيم، العلامة المائية، الشعار)
  drawOverlays(tctx, v, loadedAssets.logo, fontConfig);

  // 6. أدوات المحاذاة على الشاشة فقط (شبكة + خطوط المغناطيس) — لا تُصدَّر
  if (!exportMode) {
    if (snapEnabled) drawGrid(tctx, v, gridStep);
    drawGuides(tctx, v, activeGuides);
  }

  // 7. طبقات إضافية من وحدة الأدوات (مناطق آمنة/مساطر) — لا تُصدَّر
  if (window.drawProOverlays) window.drawProOverlays(tctx, v, exportMode, options);
}

// ----------------------------------------------------------------------------
// 7. التعامل مع الصور والمرفقات (Asset Upload Handlers)
// ----------------------------------------------------------------------------
function loadImageFile(file, assetKey) {
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    if (assetKey === 'i') loadedAssets.screenshot = img;
    else if (assetKey === 'b') loadedAssets.bg = img;
    else if (assetKey === 'l') loadedAssets.logo = img;
    draw();
    saveState();
    commitNow();
  };
  img.src = URL.createObjectURL(file);
}

// إضافة صورة كطبقة مستقلة (تقدر تضيف أكتر من صورة في نفس الشريحة)
function addImageLayer(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const img = new Image();
  img.onload = () => {
    const v = getFormValues();
    layers.push({
      id: nextLayerId++,
      type: 'image',
      img,
      x: v.W / 2,
      y: v.H / 2,
      w: v.W * 0.6,
      rot: 0,
      rad: 30,
      op: 100,
      br: 100,
      co: 100,
      sat: 100,
      fit: 'cover',
      frame: false,
      shadow: true,
      color: v.gold
    });
    selectedLayerId = layers[layers.length - 1].id;
    refreshLayerControls();
    draw();
    saveState();
    commitNow();
  };
  img.src = URL.createObjectURL(file);
}

$('img').onchange = e => loadImageFile(e.target.files[0], 'i');
$('bgimg').onchange = e => loadImageFile(e.target.files[0], 'b');
$('logo').onchange = e => loadImageFile(e.target.files[0], 'l');
$('addimg').onchange = e => {
  [...e.target.files].forEach(addImageLayer);
  e.target.value = '';
};

// دعم لصق الصور مباشرة من الحافظة (Ctrl+V)
document.addEventListener('paste', e => {
  const clipboardFiles = [...(e.clipboardData?.files || [])];
  const imageFile = clipboardFiles.find(file => file.type.startsWith('image/'));
  if (imageFile) {
    activeTemplate = 'shot';
    updateTemplateTabs();
    updateFieldVisibility();
    loadImageFile(imageFile, 'i');
  }
});

// ----------------------------------------------------------------------------
// 8. التعامل مع أزرار القوالب والألوان والمدخلات (Events)
// ----------------------------------------------------------------------------
// التبديل بين القوالب
$('tp').onclick = e => {
  const btn = e.target.closest('button');
  if (btn) {
    activeTemplate = btn.dataset.t;
    updateTemplateTabs();
    updateFieldVisibility();
    draw();
    saveState();
    commitNow();
  }
};

// إنشاء أزرار لوحات الألوان الجاهزة
Object.entries(PALETTES).forEach(([paletteName, colors]) => {
  const chipBtn = document.createElement('button');
  chipBtn.className = 'chip';
  chipBtn.innerHTML = `<i style="background:${colors[0]}"></i><i style="background:${colors[2]}"></i>${paletteName}`;
  chipBtn.onclick = () => {
    ['c1', 'c2', 'gold', 'dark', 'tc'].forEach((id, idx) => {
      $(id).value = colors[idx];
    });
    draw();
    saveState();
    commitNow();
  };
  $('pal').append(chipBtn);
});

// إعادة الرسم والحفظ التلقائي عند أي تعديل في الحقول
formFields.forEach(field => {
  field.addEventListener('input', () => {
    draw();
    saveState();
    scheduleCommit();
  });
});

// ----------------------------------------------------------------------------
// 8.b إضافة الملصقات والأيقونات الجاهزة (Stickers & Icons)
// ----------------------------------------------------------------------------
document.querySelectorAll('#stickers .stk').forEach(btn => {
  btn.onclick = () => {
    const v = getFormValues();
    layers.push({
      id: nextLayerId++,
      type: 'sticker',
      icon: btn.dataset.icon,
      x: v.W / 2,
      y: v.H / 2,
      size: 220,
      rot: 0,
      color: v.gold,
      op: 100
    });
    selectedLayerId = layers[layers.length - 1].id;
    refreshLayerControls();
    draw();
    saveState();
    commitNow();
  };
});

// ----------------------------------------------------------------------------
// 8.c ترتيب الصور سريعاً (صورتين جنب بعض / فوق بعض / صورة + خطوة / قص دايرة)
// ----------------------------------------------------------------------------
function arrangeImages(mode) {
  const v = getFormValues();
  let imgs = layers.filter(l => l.type === 'image' && l.img);

  // لو فيه صورة واحدة، نكرّرها لتنفيذ التخطيط
  if (imgs.length === 1 && (mode === 'side' || mode === 'stack' || mode === 'step')) {
    const src = imgs[0];
    const copy = { ...src, id: nextLayerId++ };
    layers.push(copy);
    imgs = [src, copy];
  }

  imgs.forEach((l, i) => {
    if (mode === 'side') {
      l.w = v.W * 0.44;
      l.x = v.W * (i % 2 ? 0.73 : 0.27);
      l.y = v.H * 0.55 + Math.floor(i / 2) * v.H * 0.35;
      l.rad = 26;
      l.fit = 'cover';
    } else if (mode === 'stack') {
      l.w = v.W * 0.72;
      l.x = v.W / 2;
      l.y = v.H * (0.32 + i * 0.34);
      l.rad = 26;
      l.fit = 'cover';
    } else if (mode === 'step') {
      l.w = v.W * 0.42;
      l.x = v.W * (i % 2 ? 0.3 : 0.72);
      l.y = v.H * 0.55;
      l.rad = 26;
      l.fit = 'cover';
    } else if (mode === 'circle') {
      l.w = v.W * 0.5;
      l.x = v.W * (imgs.length > 1 ? (i % 2 ? 0.72 : 0.28) : 0.5);
      l.y = v.H * 0.5;
      l.fit = 'circle';
    }
  });

  selectedLayerId = imgs.length ? imgs[0].id : null;
  refreshLayerControls();
  draw();
  saveState();
  commitNow();
}

document.querySelectorAll('[data-arr]').forEach(btn => {
  btn.onclick = () => arrangeImages(btn.dataset.arr);
});

// ----------------------------------------------------------------------------
// 8.d التحكم في الطبقة المحددة (Selected Layer Controls)
// ----------------------------------------------------------------------------
function selectedLayer() {
  return layers.find(l => l.id === selectedLayerId) || null;
}

function layerSizePercent(l) {
  const v = getFormValues();
  return l.type === 'image'
    ? Math.round((l.w / (v.W * 0.6)) * 100)
    : Math.round((l.size / 300) * 100);
}

function refreshLayerControls() {
  const box = $('layctl');
  const l = selectedLayer();
  if (!l) {
    box.classList.add('hid');
    canvas.style.cursor = activeTemplate === 'shot' ? 'grab' : 'move';
    return;
  }
  box.classList.remove('hid');
  $('lw').value = Math.max(10, Math.min(500, layerSizePercent(l)));
  $('lr').value = l.rot || 0;
  $('lrad').value = l.rad || 0;
  $('lop').value = l.op == null ? 100 : l.op;
  $('lbr').value = l.br == null ? 100 : l.br;
  $('lco').value = l.co == null ? 100 : l.co;
  $('lsat').value = l.sat == null ? 100 : l.sat;
  $('lcol').value = l.color || $('gold').value;
  canvas.style.cursor = 'grab';
}

function patchSelectedLayer(patch) {
  const l = selectedLayer();
  if (!l) return;
  Object.assign(l, patch);
  draw();
  saveState();
  scheduleCommit();
}

$('lw').oninput = e => {
  const l = selectedLayer();
  if (!l) return;
  const pct = +e.target.value / 100;
  if (l.type === 'image') patchSelectedLayer({ w: getFormValues().W * 0.6 * pct });
  else patchSelectedLayer({ size: 300 * pct });
};
$('lr').oninput = e => patchSelectedLayer({ rot: +e.target.value });
$('lrad').oninput = e => patchSelectedLayer({ rad: +e.target.value });
$('lop').oninput = e => patchSelectedLayer({ op: +e.target.value });
$('lbr').oninput = e => patchSelectedLayer({ br: +e.target.value });
$('lco').oninput = e => patchSelectedLayer({ co: +e.target.value });
$('lsat').oninput = e => patchSelectedLayer({ sat: +e.target.value });
$('lcol').oninput = e => patchSelectedLayer({ color: e.target.value });

$('lfront').onclick = () => {
  const i = layers.findIndex(l => l.id === selectedLayerId);
  if (i > -1) layers.push(layers.splice(i, 1)[0]);
  draw();
  saveState();
  commitNow();
};

$('lback').onclick = () => {
  const i = layers.findIndex(l => l.id === selectedLayerId);
  if (i > -1) layers.unshift(layers.splice(i, 1)[0]);
  draw();
  saveState();
  commitNow();
};

$('ldel').onclick = () => {
  layers = layers.filter(l => l.id !== selectedLayerId);
  selectedLayerId = null;
  refreshLayerControls();
  draw();
  saveState();
  commitNow();
};

// ----------------------------------------------------------------------------
// 8.e قوالب الستايل المحفوظة (Saved Style Presets)
// ----------------------------------------------------------------------------
const loadStylePresets = () => {
  try { return JSON.parse(localStorage.getItem('stylePresets') || '[]'); }
  catch { return []; }
};
const saveStylePresets = list => localStorage.setItem('stylePresets', JSON.stringify(list));

function renderStylePresets() {
  const list = loadStylePresets();
  const box = $('stlist');
  box.innerHTML = '';
  list.forEach((preset, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.innerHTML = `<i style="background:${preset.style.c1}"></i><i style="background:${preset.style.gold}"></i><b>${preset.name}</b><span class="x" title="حذف">✕</span>`;
    chip.onclick = e => {
      if (e.target.classList.contains('x')) {
        const next = loadStylePresets();
        next.splice(i, 1);
        saveStylePresets(next);
        renderStylePresets();
        return;
      }
      STYLE_KEYS.forEach(key => { if (preset.style[key] != null) $(key).value = preset.style[key]; });
      draw();
      saveState();
      commitNow();
    };
    box.append(chip);
  });
}

$('stsave').onclick = () => {
  const name = $('stname').value.trim() || `ستايل ${loadStylePresets().length + 1}`;
  const style = {};
  STYLE_KEYS.forEach(key => { style[key] = $(key).value; });
  const list = loadStylePresets();
  list.push({ name, style });
  saveStylePresets(list);
  $('stname').value = '';
  renderStylePresets();
};

// ----------------------------------------------------------------------------
// 9. التحريك والسحب (Drag Text, Layers & Screenshot)
// ----------------------------------------------------------------------------
let drag = null;
const clampPos = val => Math.max(-1000, Math.min(1000, val));

function toCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const v = getFormValues();
  return {
    x: (e.clientX - rect.left) * (v.W / rect.width),
    y: (e.clientY - rect.top) * (v.H / rect.height)
  };
}

const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// البحث عن أعلى طبقة تحت المؤشر (مع مراعاة الدوران)
function pointInLayer(p) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (l.type === 'image' && !l.img) continue;
    if (l.hidden || l.locked) continue;
    const b = layerBounds(l);
    const a = -(l.rot || 0) * Math.PI / 180;
    const dx = p.x - l.x;
    const dy = p.y - l.y;
    const rx = dx * Math.cos(a) - dy * Math.sin(a);
    const ry = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(rx) <= b.w / 2 && Math.abs(ry) <= b.h / 2) return l;
  }
  return null;
}

// ----------------------------------------------------------------------------
// 9.a محاذاة مغناطيسية: تراكب على الشبكة أو على خطوط المنتصف/العناصر الأخرى
// ----------------------------------------------------------------------------
function snapAxis(value, targets, step, tolerance) {
  let best = null;
  let bestDist = tolerance;
  targets.forEach(t => {
    const d = Math.abs(value - t);
    if (d <= bestDist) { bestDist = d; best = t; }
  });
  if (best != null) return { val: best, guide: best };
  return { val: Math.round(value / step) * step, guide: null };
}

// إرجاع الإحداثيات المغناطيسية لطبقة أثناء سحبها
function snapLayerPosition(x, y, excludeId) {
  if (!snapEnabled) return { x, y, guides: null };
  const v = getFormValues();
  const tolerance = Math.max(12, gridStep * 0.45);

  const verticalTargets = [v.W / 2, 60, v.W - 60];
  const horizontalTargets = [v.H / 2, 60, v.H - 60];

  layers.forEach(l => {
    if (l.id === excludeId) return;
    const b = layerBounds(l);
    verticalTargets.push(l.x, l.x - b.w / 2, l.x + b.w / 2);
    horizontalTargets.push(l.y, l.y - b.h / 2, l.y + b.h / 2);
  });

  const xr = snapAxis(x, verticalTargets, gridStep, tolerance);
  const yr = snapAxis(y, horizontalTargets, gridStep, tolerance);

  return {
    x: xr.val,
    y: yr.val,
    guides: {
      v: xr.guide != null ? [xr.guide] : [],
      h: yr.guide != null ? [yr.guide] : []
    }
  };
}

// تفعيل/إيقاف الشبكة والمغناطيس
$('snap').onchange = e => {
  snapEnabled = e.target.checked;
  activeGuides = null;
  localStorage.setItem('snapOn', snapEnabled ? '1' : '0');
  draw();
};
$('gsize').onchange = e => {
  gridStep = +e.target.value;
  localStorage.setItem('gridStep', String(gridStep));
  draw();
};

canvas.addEventListener('pointerdown', e => {
  const p = toCanvasPoint(e);
  const v = getFormValues();
  const hit = pointInLayer(p);

  if (hit) {
    selectedLayerId = hit.id;
    refreshLayerControls();
    drag = { kind: 'layer', id: hit.id, sx: p.x, sy: p.y, ox: hit.x, oy: hit.y };
    draw();
  } else if (activeTemplate === 'shot' && window.__linkRect && pointInRect(p, window.__linkRect)) {
    selectedLayerId = null;
    refreshLayerControls();
    drag = {
      kind: 'link', sx: p.x, sy: p.y,
      ox: +$('lkx').value, oy: +$('lky').value,
      bcx: v.W / 2 + +$('lkx').value,
      bcy: window.__linkRect.y - +$('lky').value + window.__linkRect.h / 2
    };
    draw();
  } else if (activeTemplate === 'shot' && loadedAssets.screenshot) {
    selectedLayerId = null;
    refreshLayerControls();
    drag = { kind: 'shot', sx: p.x, sy: p.y, ox: +$('ix').value, oy: +$('iy').value, bcx: v.W / 2, bcy: v.H / 2 };
    draw();
  } else {
    selectedLayerId = null;
    refreshLayerControls();
    drag = { kind: 'title', sx: p.x, sy: p.y, ox: +$('ttx').value, oy: +$('tty').value, bcx: v.W / 2 };
    draw();
  }

  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('pointermove', e => {
  if (!drag) {
    // تغيير المؤشر عند المرور فوق عنصر
    const p = toCanvasPoint(e);
    canvas.style.cursor = pointInLayer(p) ? 'grab' : (activeTemplate === 'shot' && loadedAssets.screenshot ? 'grab' : 'move');
    return;
  }

  const p = toCanvasPoint(e);
  const dx = p.x - drag.sx;
  const dy = p.y - drag.sy;

  if (drag.kind === 'layer') {
    const l = layers.find(x => x.id === drag.id);
    if (l) {
      const snapped = snapLayerPosition(drag.ox + dx, drag.oy + dy, l.id);
      l.x = snapped.x;
      l.y = snapped.y;
      activeGuides = snapped.guides;
    }
    draw();
  } else if (drag.kind === 'shot') {
    const snapped = snapLayerPosition(drag.bcx + dx, drag.bcy + dy, null);
    $('ix').value = clampPos(snapped.x - drag.bcx + drag.ox);
    $('iy').value = clampPos(snapped.y - drag.bcy + drag.oy);
    activeGuides = snapped.guides;
    draw();
  } else if (drag.kind === 'link') {
    const snapped = snapLayerPosition(drag.bcx + dx, drag.bcy + dy, null);
    $('lkx').value = clampPos(snapped.x - drag.bcx + drag.ox);
    $('lky').value = clampPos(snapped.y - drag.bcy + drag.oy);
    activeGuides = snapped.guides;
    draw();
  } else if (drag.kind === 'title') {
    const snapped = snapLayerPosition(drag.bcx + dx, drag.bcy ?? (drag.oy + dy), null);
    $('ttx').value = clampPos(snapped.x - drag.bcx + drag.ox);
    $('tty').value = clampPos(drag.oy + dy);
    activeGuides = snapped.guides;
    draw();
  }
});

canvas.addEventListener('pointerup', () => {
  if (!drag) return;
  drag = null;
  activeGuides = null;
  canvas.style.cursor = 'grab';
  draw();
  saveState();
  commitNow();
});

// زر إعادة ضبط مكان وأبعاد لقطة الشاشة
$('irs').onclick = () => {
  $('ix').value = 0;
  $('iy').value = 0;
  $('isc').value = 100;
  $('ir').value = 0;
  draw();
  saveState();
  commitNow();
};

// ----------------------------------------------------------------------------
// 9.b اختصارات لوحة المفاتيح (Keyboard Shortcuts)
// ----------------------------------------------------------------------------
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select';

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
    return;
  }
  if (typing) return;

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
    e.preventDefault();
    $('ldel').click();
  } else if (e.key === 'Escape') {
    selectedLayerId = null;
    refreshLayerControls();
    draw();
  } else if (e.key.startsWith('Arrow') && selectedLayerId) {
    e.preventDefault();
    const step = e.shiftKey ? 40 : 10;
    const l = selectedLayer();
    if (!l) return;
    if (e.key === 'ArrowLeft') l.x -= step;
    if (e.key === 'ArrowRight') l.x += step;
    if (e.key === 'ArrowUp') l.y -= step;
    if (e.key === 'ArrowDown') l.y += step;
    draw();
    saveState();
    scheduleCommit();
  }
});

// ----------------------------------------------------------------------------
// 10. التراجع والإعادة (Undo / Redo)
// ----------------------------------------------------------------------------
let history = [];
let historyIndex = -1;
let restoring = false;
let ready = false;
let commitTimer = null;

function captureState() {
  return {
    slides: slides.map(s => ({
      tpl: s.tpl,
      v: [...s.v],
      IMG: s.IMG,
      BG: s.BG,
      LOGO: s.LOGO,
      layers: cloneLayers(s.layers)
    })),
    idx: currentSlideIndex,
    sel: selectedLayerId
  };
}

function restoreState(snap) {
  restoring = true;
  slides = snap.slides.map(s => ({
    tpl: s.tpl,
    v: [...s.v],
    IMG: s.IMG,
    BG: s.BG,
    LOGO: s.LOGO,
    layers: cloneLayers(s.layers)
  }));
  currentSlideIndex = snap.idx;
  applySnapshot(slides[currentSlideIndex]);
  selectedLayerId = snap.sel;
  refreshLayerControls();
  renderSlideTabs();
  draw();
  saveState();
  restoring = false;
  updateHistoryUI();
}

function commit() {
  if (!ready || restoring) return;
  history = history.slice(0, historyIndex + 1);
  history.push(captureState());
  if (history.length > 80) history.shift();
  historyIndex = history.length - 1;
  updateHistoryUI();
}

function commitNow() {
  clearTimeout(commitTimer);
  commit();
}

function scheduleCommit() {
  if (!ready || restoring) return;
  clearTimeout(commitTimer);
  commitTimer = setTimeout(commit, 400);
}

function updateHistoryUI() {
  $('undo').disabled = historyIndex <= 0;
  $('redo').disabled = historyIndex >= history.length - 1;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    restoreState(history[historyIndex]);
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    restoreState(history[historyIndex]);
  }
}

$('undo').onclick = undo;
$('redo').onclick = redo;

// ----------------------------------------------------------------------------
// 11. تصدير وتنزيل الصور (PNG Export)
// ----------------------------------------------------------------------------
const downloadBlob = (blob, filename) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// تنزيل الشريحة الحالية
$('dl').onclick = () => {
  draw(true);
  canvas.toBlob(blob => {
    downloadBlob(blob, `slide-${currentSlideIndex + 1}.png`);
    draw();
  });
};

// تنزيل كل الشرائح بالترتيب
$('dla').onclick = async () => {
  const originalIndex = currentSlideIndex;
  saveState();

  for (let i = 0; i < slides.length; i++) {
    goToSlide(i, true);
    draw(true);
    await new Promise(resolve => {
      canvas.toBlob(blob => {
        downloadBlob(blob, `slide-${i + 1}.png`);
        resolve();
      });
    });
    // تأخير بسيط لمنع تداخل التنزيلات بالمتصفح
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  goToSlide(originalIndex, true);
  draw();
};

// ----------------------------------------------------------------------------
// 12. بدء وتشغيل التطبيق (Initialization)
// ----------------------------------------------------------------------------
(function init() {
  // استرجاع البيانات المحفوظة من localStorage إن وُجدت وكانت متطابقة بعدد الحقول
  try {
    const savedData = JSON.parse(localStorage.getItem('designer2') || 'null');
    if (savedData && savedData.SL && savedData.SL.length && savedData.SL.every(slide => slide.v.length <= formFields.length)) {
      slides = savedData.SL;
      currentSlideIndex = Math.min(savedData.cur, slides.length - 1);
    }
  } catch (err) {
    console.warn('تعذر قراءة بيانات الشرائح السابقة:', err);
  }

  // إذا لم تكن هناك شرائح سابقة، أنشئ أول شريحة بالقيم الافتراضية
  if (!slides.length) {
    slides = [takeSnapshot()];
  }

  // استرجاع إعدادات الشبكة والمغناطيس
  const savedSnap = localStorage.getItem('snapOn');
  if (savedSnap != null) snapEnabled = savedSnap === '1';
  const savedStep = localStorage.getItem('gridStep');
  if (savedStep) gridStep = +savedStep;
  $('snap').checked = snapEnabled;
  $('gsize').value = String(gridStep);

  applySnapshot(slides[currentSlideIndex]);
  renderSlideTabs();
  refreshLayerControls();
  renderStylePresets();
  draw();

  // التأكد من اكتمال تحميل الخطوط ثم إعادة الرسم بدقة تامة
  Promise.all([
    document.fonts.load('100px FP', 'ابت'),
    document.fonts.load('700 60px CairoB', 'Aa')
  ]).then(draw, draw).then(() => {
    ready = true;
    history = [captureState()];
    historyIndex = 0;
    updateHistoryUI();
  });
})();
