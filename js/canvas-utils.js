/**
 * ============================================================================
 * مصمم الصور - دوال وأدوات الرسم على الكانفاس (Canvas Utilities)
 * ============================================================================
 */

// الأرقام العربية المشرقية للاستخدام في القوائم والترقيم
const ARABIC_DIGITS = '١٢٣٤٥٦٧٨٩';

/**
 * تحويل لون Hex مع نسبة شفافية إلى RGBA
 * @param {string} hex كود اللون بصيغة سداسية عشرية مثل #7F0025
 * @param {number} alpha الشفافية من 0 إلى 1
 * @returns {string} كود rgba(...)
 */
function hexToRgba(hex, alpha) {
  const num = parseInt(hex.slice(1), 16);
  const r = num >> 16;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * رسم مسار مستطيل بحواف دائرية (Rounded Rectangle Path)
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * رسم دائرة ممتلئة
 */
function drawCircle(ctx, x, y, radius, fillColor) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
}

/**
 * حساب حجم الخط المناسب ليتسع النص ضمن العرض المحدد دون تجاوز الحجم الأقصى
 */
function calculateFitFontSize(ctx, text, maxFontSize, maxWidth, fontConfig) {
  ctx.font = `${fontConfig.weight} ${maxFontSize}px ${fontConfig.family}`;
  const measuredWidth = ctx.measureText(text).width;
  if (measuredWidth > maxWidth && measuredWidth > 0) {
    return (maxFontSize * maxWidth) / measuredWidth;
  }
  return maxFontSize;
}

/**
 * ============================================================================
 * إعدادات النص العامة (تُحدَّث من app.js عند كل عملية رسم)
 * ============================================================================
 */
const TXT = {
  lh: 1.05,        // مضاعف مسافة الأسطر
  align: 'center', // محاذاة النص: center / right / left
  ox: 0,           // إزاحة أفقية للعنوان
  oy: 0,           // إزاحة رأسية للعنوان
  accent: '#D3AE3A', // لون الكلمات المميزة بين قوسين { }
  rich: true
};

/**
 * تحليل النص إلى مقاطع ملوّنة حسب الأقواس المجعّدة {كلمة}
 * @returns {Array<{t:string,c:string}>} مقاطع النص مع لون كل مقطع
 */
function parseRich(text, baseColor, accentColor) {
  const segments = [];
  let buffer = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      const end = text.indexOf('}', i + 1);
      if (end !== -1) {
        if (buffer) { segments.push({ t: buffer, c: baseColor }); buffer = ''; }
        const inner = text.slice(i + 1, end);
        if (inner) segments.push({ t: inner, c: accentColor });
        i = end;
        continue;
      }
    }
    buffer += text[i];
  }
  if (buffer) segments.push({ t: buffer, c: baseColor });
  return segments;
}

/**
 * رسم نص (يدعم تلوين كلمة أو أكثر داخل الجملة عبر {كلمة})
 */
function drawRichText(ctx, text, x, y, size, baseColor, align, shadowColor, shadowMode, shadowStrength, fontConfig) {
  const segments = parseRich(text, baseColor, TXT.accent).filter(s => s.t.length);
  if (!segments.length) return;

  ctx.font = `${fontConfig.weight} ${size}px ${fontConfig.family}`;
  ctx.direction = 'rtl';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const widths = segments.map(s => ctx.measureText(s.t).width);
  const total = widths.reduce((a, b) => a + b, 0);

  // نحسب موضع الحدّ الأيمن للنص بالكامل حسب المحاذاة، ثم نرتّب الكلمات من اليمين للشمال
  let rightEdge = align === 'left' ? x + total : align === 'center' ? x + total / 2 : x;
  const lefts = [];
  segments.forEach((_, i) => { rightEdge -= widths[i]; lefts.push(rightEdge); });

  const offset = Math.max(4, size * 0.04) * (shadowStrength / 100);
  const paint = (color, dx, dy) => {
    ctx.fillStyle = color;
    segments.forEach((s, i) => ctx.fillText(s.t, lefts[i] + dx, y + dy));
  };

  if (shadowColor && shadowMode !== 'none' && offset > 0) {
    if (shadowMode === 'long') {
      for (let i = offset * 2.2; i > 0; i -= 2) paint(shadowColor, i, i);
    } else if (shadowMode === 'soft') {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = offset * 3;
      ctx.shadowOffsetX = offset;
      ctx.shadowOffsetY = offset;
      segments.forEach((s, i) => { ctx.fillStyle = s.c; ctx.fillText(s.t, lefts[i], y); });
      ctx.restore();
      return;
    } else {
      paint(shadowColor, offset, offset);
    }
  }

  segments.forEach((s, i) => { ctx.fillStyle = s.c; ctx.fillText(s.t, lefts[i], y); });
}

/**
 * رسم نص على الكانفاس مع دعم كامل لتأثيرات الظلال (حاد، طويل 3D، ناعم، وبدون)
 */
function renderText(ctx, text, x, y, size, color, shadowColor, align = 'center', shadowMode = 'hard', shadowStrength = 100, fontConfig) {
  drawRichText(ctx, text, x, y, size, color, align, shadowColor, shadowMode, shadowStrength, fontConfig);
}

/**
 * رسم صورة لتملأ المساحة المحددة مع المحافظة على النسبة والتناسب (Cover Mode)
 */
function drawCoverImage(ctx, img, width, height) {
  const scale = Math.max(width / img.width, height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

/**
 * رسم خلفية التصميم (الأنماط: خطوط، نقط، شبكة، تدرج، أشعة، أو سادة + صورة الخلفية)
 */
function drawBackground(ctx, v, bgImage) {
  const { W, H, pat } = v;

  // اللون الأساسي للخلفية
  ctx.fillStyle = v.c1;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.strokeStyle = v.c2;

  // أنماط الخلفية الهندسية
  if (pat === 'stripes') {
    // خطوط مائلة
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.PI / 4);
    const diagonal = Math.hypot(W, H);
    for (let x = -diagonal; x < diagonal; x += 60) {
      ctx.fillRect(x, -diagonal, 30, 2 * diagonal);
    }
    ctx.restore();
  } else if (pat === 'dots') {
    // شبكة نقاط
    for (let y = 30, row = 0; y < H; y += 52, row++) {
      for (let x = row % 2 ? 56 : 30; x < W; x += 52) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pat === 'grid') {
    // مربعات / شبكة
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else if (pat === 'gradient') {
    // تدرج لوني خطي
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, v.c1);
    grad.addColorStop(1, v.c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (pat === 'radial') {
    // تدرج لوني دائري
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
    grad.addColorStop(0, v.c2);
    grad.addColorStop(1, v.c1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (pat === 'rays') {
    // أشعة شمسية من المركز
    ctx.save();
    ctx.translate(W / 2, H / 2);
    const rayCount = 28;
    const rayLength = Math.hypot(W, H);
    for (let i = 0; i < rayCount; i += 2) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rayLength, (i * 2 * Math.PI) / rayCount, ((i + 1) * 2 * Math.PI) / rayCount);
      ctx.fill();
    }
    ctx.restore();
  }

  // رسم صورة الخلفية مع طبقة الشفافية إذا كانت متوفرة
  if (bgImage) {
    drawCoverImage(ctx, bgImage, W, H);
    ctx.fillStyle = hexToRgba(v.c1, v.ov);
    ctx.fillRect(0, 0, W, H);
  }

  // دواير الديكور بالزوايا
  if (v.circ) {
    drawCircle(ctx, W * 0.96, H * 0.07, W * 0.22, hexToRgba(v.gold, 0.16));
    drawCircle(ctx, W * 0.03, H * 0.94, W * 0.17, hexToRgba(v.gold, 0.16));
  }
}

/**
 * رسم شكل سهم ديكوري
 */
function drawChevron(ctx, x, y, w, h, color, isRight) {
  ctx.beginPath();
  const points = [[0.55, 0], [1, 0], [0.45, 0.5], [1, 1], [0.55, 1], [0, 0.5]];
  points.forEach(([px, py], i) => {
    const finalX = x + (isRight ? 1 - px : px) * w;
    const finalY = y + py * h;
    ctx[i ? 'lineTo' : 'moveTo'](finalX, finalY);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * رسم العناصر السفلية التزيينية (الأسهم أو أيقونة التحميل)
 * ترجع الحد العلوي المتاح للمحتوى (fb)
 */
function drawDeco(ctx, v) {
  let bottomLimit = v.H - 50 - (v.wm && v.wpos === 'b' ? 60 : 0);

  // الأسهم الديكورية
  if (v.chev) {
    const arrowHeight = 120;
    const arrowWidth = 96;
    const gap = 26;
    const totalWidth = 3 * arrowWidth + 2 * gap;
    const startX = v.W / 2 - totalWidth / 2;
    const isRight = v.cd === 'r';

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (arrowWidth + gap);
      drawChevron(ctx, x + 8, bottomLimit - arrowHeight + 8, arrowWidth, arrowHeight, '#000000', isRight);
      drawChevron(ctx, x, bottomLimit - arrowHeight, arrowWidth, arrowHeight, v.gold, isRight);
    }
    bottomLimit -= arrowHeight + 30;
  }

  // أيقونة التحميل الدائرية
  if (v.icon) {
    const iconSize = 200;
    const x = v.W / 2 - iconSize / 2;
    const topY = bottomLimit - iconSize;

    // ظل وخلفية الأيقونة
    drawRoundedRect(ctx, x + 10, topY + 10, iconSize, iconSize, 46);
    ctx.fillStyle = '#000000';
    ctx.fill();

    drawRoundedRect(ctx, x, topY, iconSize, iconSize, 46);
    ctx.fillStyle = v.dark;
    ctx.fill();

    // شكل سهم التحميل الداخلي
    ctx.beginPath();
    const arrowPoints = [
      [0.34, 0], [0.66, 0], [0.66, 0.52], [1, 0.52],
      [0.5, 1], [0, 0.52], [0.34, 0.52]
    ];
    arrowPoints.forEach(([px, py], i) => {
      const pxAbs = x + iconSize * 0.28 + px * iconSize * 0.44;
      const pyAbs = topY + iconSize * 0.16 + py * iconSize * 0.5;
      ctx[i ? 'lineTo' : 'moveTo'](pxAbs, pyAbs);
    });
    ctx.closePath();
    ctx.fillStyle = v.gold;
    ctx.fill();

    // شريط سفلي للأيقونة
    drawRoundedRect(ctx, x + iconSize * 0.25, topY + iconSize * 0.76, iconSize * 0.5, iconSize * 0.07, iconSize * 0.035);
    ctx.fill();

    bottomLimit = topY - 30;
  }

  return bottomLimit;
}

/**
 * مصفوفة أسطر نصية متراكمة عمودياً مع توسيط تلقائي وتعديل الحجم
 */
function stackText(ctx, items, centerX, topY, bottomY, maxWidth, shadowColor, fontConfig, shadowMode, shadowStrength) {
  const lh = TXT.lh;
  const plain = text => String(text).replace(/[{}]/g, '');
  const sizes = items.map(item => calculateFitFontSize(ctx, plain(item[0]), item[2], maxWidth, fontConfig));
  const totalHeight = sizes.reduce((acc, curr) => acc + curr * lh, 0);
  const scale = Math.min(1, (bottomY - topY) / totalHeight);

  let currentY = topY + (bottomY - topY - totalHeight * scale) / 2;

  // حساب نقطة الارتكاز الأفقية حسب المحاذاة المختارة
  const align = TXT.align;
  const anchorX = align === 'right' ? centerX + maxWidth / 2
    : align === 'left' ? centerX - maxWidth / 2
    : centerX;

  items.forEach((item, i) => {
    const finalSize = sizes[i] * scale;
    renderText(ctx, item[0], anchorX + TXT.ox, currentY + finalSize / 2 + TXT.oy, finalSize, item[1], shadowColor, align, shadowMode, shadowStrength, fontConfig);
    currentY += finalSize * lh;
  });
}

/**
 * رسم العنوان الرئيسي وأسطره الملونة
 */
function drawTitle(ctx, v, tpl, topY, isMiddle, bottomY, fontConfig, shadowMode, shadowStrength) {
  const isCover = tpl === 'cover';
  const baseScale = (isCover ? 1 : 0.52) * v.k;
  const lines = [];

  if (v.t1) {
    lines.push([v.t1, v.tc, 230 * baseScale]);
  }

  const secondLines = isCover ? v.t2 : [v.t2.join(' ')];
  secondLines.filter(Boolean).forEach(text => {
    lines.push([text, v.gold, 250 * baseScale]);
  });

  const maxWidth = v.W - 120;
  const plain = text => String(text).replace(/[{}]/g, '');
  const sizes = lines.map(line => calculateFitFontSize(ctx, plain(line[0]), line[2], maxWidth, fontConfig));
  const totalHeight = sizes.reduce((acc, curr) => acc + curr * TXT.lh, 0);
  let currentY = isMiddle ? topY + (bottomY - topY - totalHeight) / 2 : topY;

  const align = TXT.align;
  const anchorX = align === 'right' ? v.W - 60
    : align === 'left' ? 60
    : v.W / 2;

  lines.forEach((line, i) => {
    renderText(ctx, line[0], anchorX + TXT.ox, currentY + sizes[i] / 2 + TXT.oy, sizes[i], line[1], v.dark, align, shadowMode, shadowStrength, fontConfig);
    currentY += sizes[i] * TXT.lh;
  });

  return currentY + TXT.oy;
}

/**
 * رسم الطبقات العلوية الإضافية (الإطارات، الشارة، الترقيم، العلامة المائية، الشعار)
 */
function drawOverlays(ctx, v, logoImage, fontConfig) {
  const { W, H } = v;

  // الشريطين العلوي والسفلي
  if (v.bars) {
    ctx.fillStyle = v.gold;
    ctx.fillRect(0, 0, W, 16);
    ctx.fillRect(0, H - 16, W, 16);
  }

  // إطار الصورة
  if (v.fr !== 'none') {
    ctx.strokeStyle = v.gold;
    const isDouble = v.fr === 'dbl';
    ctx.lineWidth = v.fr === 'thick' ? 16 : isDouble ? 8 : 5;
    drawRoundedRect(ctx, 36, 36, W - 72, H - 72, 30);
    ctx.stroke();

    if (isDouble) {
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 58, 58, W - 116, H - 116, 22);
      ctx.stroke();
    }
  }

  // الشارة (مثل "جديد")
  if (v.badge) {
    const radius = 105;
    const badgeX = v.bpos === 'l' ? 150 : W - 150;
    const badgeY = 150;

    ctx.save();
    ctx.translate(badgeX, badgeY);
    ctx.rotate(v.bpos === 'l' ? -0.2 : 0.2);

    // ظل ودائرة الشارة
    drawCircle(ctx, 8, 8, radius, '#000000');
    drawCircle(ctx, 0, 0, radius, v.gold);

    const badgeFontSize = calculateFitFontSize(ctx, v.badge, 70, radius * 1.55, fontConfig);
    renderText(ctx, v.badge, 0, -badgeFontSize * 0.05, badgeFontSize, v.dark, null, 'center', 'none', 0, fontConfig);
    ctx.restore();
  }

  // ترقيم الشريحة (مثلاً 1/4)
  if (v.cnt) {
    ctx.font = '700 38px CairoB';
    const textWidth = ctx.measureText(v.cnt).width + 50;
    drawRoundedRect(ctx, 40, H - 104, textWidth, 64, 32);
    ctx.fillStyle = hexToRgba(v.dark, 0.75);
    ctx.fill();

    ctx.fillStyle = v.gold;
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.cnt, 40 + textWidth / 2, H - 71);
  }

  // اسم الحساب أو العلامة المائية
  if (v.wm) {
    ctx.font = '700 38px CairoB, FP';
    ctx.fillStyle = v.tc;
    ctx.globalAlpha = 0.9;
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.wm, W / 2, v.wpos === 'b' ? H - 60 : 60);
    ctx.globalAlpha = 1;
  }

  // الشعار (Logo)
  if (logoImage) {
    const scale = Math.min(130 / logoImage.width, 130 / logoImage.height);
    const logoW = logoImage.width * scale;
    const logoH = logoImage.height * scale;
    const posX = v.lgpos[1] === 'l' ? 50 : W - 50 - logoW;
    const posY = v.lgpos[0] === 't' ? 50 : H - 50 - logoH;

    ctx.save();
    drawRoundedRect(ctx, posX, posY, logoW, logoH, 16);
    ctx.clip();
    ctx.drawImage(logoImage, posX, posY, logoW, logoH);
    ctx.restore();
  }
}

/**
 * ============================================================================
 * العناصر الجاهزة والطبقات (Stickers, Icons & Layers)
 * ============================================================================
 */

/**
 * رسم أيقونة متجهية داخل مربع بمقاس size (اللون قابل للتغيير)
 */
function drawIcon(ctx, name, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  const u = size / 24;
  const X = n => (n - 12) * u;
  const Y = n => (n - 12) * u;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2 * u;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const poly = pts => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => ctx[i ? 'lineTo' : 'moveTo'](X(px), Y(py)));
    ctx.closePath();
  };

  switch (name) {
    case 'mobile':
      drawRoundedRect(ctx, X(7), Y(2.5), 10 * u, 19 * u, 2.6 * u);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(X(12), Y(18.4), 1.1 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'arrow':
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(X(3), Y(12));
      ctx.lineTo(X(16), Y(12));
      ctx.stroke();
      poly([[16, 6], [22, 12], [16, 18]]);
      ctx.fill();
      break;
    case 'star':
      (() => {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 4.6 : 10;
          const a = -Math.PI / 2 + i * Math.PI / 5;
          pts.push([12 + r * Math.cos(a), 12 + r * Math.sin(a)]);
        }
        poly(pts);
        ctx.fill();
      })();
      break;
    case 'check':
      ctx.lineWidth = 3.4 * u;
      ctx.beginPath();
      ctx.moveTo(X(4), Y(12.5));
      ctx.lineTo(X(9.5), Y(18));
      ctx.lineTo(X(20), Y(6.5));
      ctx.stroke();
      break;
    case 'heart':
      ctx.beginPath();
      ctx.moveTo(0, Y(20));
      ctx.bezierCurveTo(X(2), Y(13), X(4), Y(9), X(8), Y(7.2));
      ctx.bezierCurveTo(X(11), Y(6), X(12), Y(9), X(12), Y(9.5));
      ctx.bezierCurveTo(X(12), Y(9), X(13), Y(6), X(16), Y(7.2));
      ctx.bezierCurveTo(X(20), Y(9), X(22), Y(13), X(24), Y(20));
      ctx.bezierCurveTo(X(18), Y(15.5), X(16), Y(19), X(12), Y(19));
      ctx.bezierCurveTo(X(8), Y(19), X(6), Y(15.5), X(0), Y(20));
      ctx.closePath();
      ctx.fill();
      break;
    case 'location':
      ctx.beginPath();
      ctx.moveTo(0, Y(21));
      ctx.bezierCurveTo(X(6), Y(14), X(7), Y(11), X(7), Y(9.5));
      ctx.arc(X(12), Y(9.5), 5 * u, Math.PI, 0, true);
      ctx.bezierCurveTo(X(17), Y(11), X(18), Y(14), X(24), Y(21));
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(X(12), Y(9.5), 2 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'phone':
      ctx.lineWidth = 3.6 * u;
      ctx.beginPath();
      ctx.moveTo(X(6), Y(4));
      ctx.bezierCurveTo(X(4), Y(4), X(3), Y(7), X(5), Y(12));
      ctx.bezierCurveTo(X(7), Y(18), X(13), Y(21), X(18), Y(20));
      ctx.bezierCurveTo(X(21), Y(19.5), X(21), Y(16), X(18), Y(14));
      ctx.bezierCurveTo(X(16), Y(13), X(15), Y(14), X(14), Y(15));
      ctx.bezierCurveTo(X(12), Y(15), X(9), Y(12), X(9), Y(10));
      ctx.bezierCurveTo(X(10), Y(9), X(11), Y(8), X(10), Y(6));
      ctx.bezierCurveTo(X(9), Y(4), X(8), Y(4), X(6), Y(4));
      ctx.closePath();
      ctx.fill();
      break;
    case 'fire':
      ctx.beginPath();
      ctx.moveTo(X(12), Y(2));
      ctx.bezierCurveTo(X(15), Y(7), X(19), Y(9), X(19), Y(15));
      ctx.bezierCurveTo(X(19), Y(20), X(15.5), Y(22), X(12), Y(22));
      ctx.bezierCurveTo(X(8.5), Y(22), X(5), Y(20), X(5), Y(15));
      ctx.bezierCurveTo(X(5), Y(11), X(8), Y(10), X(9.5), Y(6));
      ctx.bezierCurveTo(X(11), Y(9), X(11.5), Y(11), X(12), Y(13));
      ctx.bezierCurveTo(X(13), Y(10), X(13), Y(6), X(12), Y(2));
      ctx.closePath();
      ctx.fill();
      break;
    case 'bulb':
      ctx.beginPath();
      ctx.arc(X(12), Y(10), 6 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(X(9), Y(16), 6 * u, 1.8 * u);
      ctx.fillRect(X(9.8), Y(19), 4.4 * u, 1.6 * u);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(X(12) + 8 * u * Math.cos(a), Y(10) + 8 * u * Math.sin(a));
        ctx.lineTo(X(12) + 10.5 * u * Math.cos(a), Y(10) + 10.5 * u * Math.sin(a));
        ctx.stroke();
      }
      break;
    default:
      ctx.beginPath();
      ctx.arc(X(12), Y(12), 8 * u, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

/**
 * رسم طبقة ملصق/أيقونة
 */
function drawSticker(ctx, l) {
  ctx.save();
  ctx.globalAlpha = (l.op == null ? 100 : l.op) / 100;
  ctx.translate(l.x, l.y);
  ctx.rotate((l.rot || 0) * Math.PI / 180);
  if (String(l.icon).startsWith('e:')) {
    ctx.font = `${l.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    ctx.fillText(l.icon.slice(2), 0, 0);
  } else {
    drawIcon(ctx, l.icon, 0, 0, l.size, l.color || '#D3AE3A');
  }
  ctx.restore();
}

/**
 * رسم الصورة داخل مساحة مع الحفاظ على النسبة (cover / contain / fill)
 */
function drawImageFit(ctx, img, x, y, w, h, fit) {
  const iw = img.width, ih = img.height;
  let dw, dh, dx, dy;
  if (fit === 'contain') {
    const s = Math.min(w / iw, h / ih);
    dw = iw * s; dh = ih * s;
  } else if (fit === 'fill') {
    dw = w; dh = h;
  } else {
    const s = Math.max(w / iw, h / ih);
    dw = iw * s; dh = ih * s;
  }
  dx = x + (w - dw) / 2;
  dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * رسم طبقة صورة (مع قص الحواف والإضاءة والحدّة والتشبّع)
 */
function drawImageLayer(ctx, l) {
  const img = l.img;
  const w = l.w;
  const h = l.w * (img.height / img.width);
  ctx.save();
  ctx.globalAlpha = (l.op == null ? 100 : l.op) / 100;
  ctx.translate(l.x, l.y);
  ctx.rotate((l.rot || 0) * Math.PI / 180);

  if (l.shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
  }

  if (l.fit === 'circle') {
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else {
    const radius = Math.min(l.rad || 0, w / 2, h / 2);
    drawRoundedRect(ctx, -w / 2, -h / 2, w, h, radius);
  }
  ctx.save();
  ctx.clip();
  ctx.shadowColor = 'transparent';

  const filters = [];
  if (l.br != null) filters.push(`brightness(${l.br / 100})`);
  if (l.co != null) filters.push(`contrast(${l.co / 100})`);
  if (l.sat != null) filters.push(`saturate(${l.sat / 100})`);
  if (filters.length) ctx.filter = filters.join(' ');

  drawImageFit(ctx, img, -w / 2, -h / 2, w, h, l.fit === 'contain' ? 'contain' : 'cover');
  ctx.restore();

  if (l.frame) {
    ctx.strokeStyle = hexToRgba(l.color || '#D3AE3A', 0.9);
    ctx.lineWidth = 6;
    if (l.fit === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) / 2 - 3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const radius = Math.min(l.rad || 0, w / 2, h / 2);
      drawRoundedRect(ctx, -w / 2, -h / 2, w, h, radius);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * حساب أبعاد الطبقة (لأجل التحديد وسحب الاختيار)
 */
function layerBounds(l) {
  if (l.type === 'image' && l.img) {
    return { w: l.w, h: l.w * (l.img.height / l.img.width) };
  }
  return { w: l.size, h: l.size };
}

/**
 * رسم الطبقات كلها من الأقدم للأحدث + إطار التحديد (لا يُصدَّر)
 */
function drawLayers(ctx, layers, selectedId, exportMode) {
  (layers || []).forEach(l => {
    if (l.type === 'image' && l.img) drawImageLayer(ctx, l);
    else if (l.type === 'sticker') drawSticker(ctx, l);
  });

  if (!exportMode && selectedId) {
    const l = (layers || []).find(x => x.id === selectedId);
    if (l) {
      const b = layerBounds(l);
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate((l.rot || 0) * Math.PI / 180);
      ctx.setLineDash([16, 12]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0, 160, 255, 0.95)';
      ctx.strokeRect(-b.w / 2 - 6, -b.h / 2 - 6, b.w + 12, b.h + 12);
      ctx.restore();
    }
  }
}

/**
 * ============================================================================
 * شبكة التصميم وخطوط المغناطيس (Design Grid & Magnetic Guides)
 * ============================================================================
 */

/**
 * رسم شبكة مساعدة (للعرض فقط — لا تُصدَّر)
 */
function drawGrid(ctx, v, step) {
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0, 170, 255, 0.16)';
  ctx.beginPath();
  for (let x = step; x < v.W; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, v.H);
  }
  for (let y = step; y < v.H; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(v.W, y);
  }
  ctx.stroke();

  // خطوط المنتصف
  ctx.strokeStyle = 'rgba(0, 170, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(v.W / 2, v.H * 0.15);
  ctx.lineTo(v.W / 2, v.H * 0.85);
  ctx.moveTo(v.W * 0.15, v.H / 2);
  ctx.lineTo(v.W * 0.85, v.H / 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * رسم خطوط المغناطيس النشطة أثناء السحب
 */
function drawGuides(ctx, v, guides) {
  if (!guides) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 60, 120, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([18, 12]);
  (guides.v || []).forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, v.H);
    ctx.stroke();
  });
  (guides.h || []).forEach(y => {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(v.W, y);
    ctx.stroke();
  });
  ctx.restore();
}
