/**
 * ============================================================================
 * مصمم الصور - قوالب التصميم (Design Templates)
 * ============================================================================
 * يحتوي هذا الملف على جميع منطق رسم القوالب التسعة:
 * 1. غلاف (cover)
 * 2. فقاعة (bubble)
 * 3. شمس (sun)
 * 4. قطري (diag)
 * 5. رقم كبير (stat)
 * 6. سكرين شوت (shot)
 * 7. بطاقات (cards)
 * 8. شرايط (bands)
 * 9. قايمة ✓ (check)
 */

window.TEMPLATES = {
  /**
   * 1. قالب الغلاف (Cover):
   * عنوان رئيسي كبير في منتصف التصميم
   */
  cover(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    drawTitle(ctx, v, 'cover', 60, true, fb, fontConfig, shadowMode, shadowStrength);
  },

  /**
   * 2. قالب الفقاعة (Bubble):
   * صندوق محادثة / فقاعة كلامية بداخلها السطر الأول، وأسطر ملونة أسفلها
   */
  bubble(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    const bubbleHeight = (fb - 70) * 0.4;
    const scale = v.k;

    // جسم الفقاعة
    drawRoundedRect(ctx, 60, 70, v.W - 120, bubbleHeight, 70);
    ctx.fillStyle = v.tc;
    ctx.fill();

    // ذيل الفقاعة
    ctx.beginPath();
    ctx.moveTo(v.W * 0.6, 70 + bubbleHeight - 2);
    ctx.lineTo(v.W * 0.6 + 100, 70 + bubbleHeight - 2);
    ctx.lineTo(v.W * 0.6 + 30, 70 + bubbleHeight + 75);
    ctx.closePath();
    ctx.fill();

    // نص داخل الفقاعة
    stackText(
      ctx,
      [[v.t1, v.dark, 240 * scale]],
      v.W / 2,
      90,
      70 + bubbleHeight - 20,
      v.W - 260,
      null,
      fontConfig,
      shadowMode,
      shadowStrength
    );

    // نص أسفل الفقاعة
    stackText(
      ctx,
      v.t2.map(line => [line, v.gold, 270 * scale]),
      v.W / 2,
      70 + bubbleHeight + 90,
      fb,
      v.W - 100,
      v.dark,
      fontConfig,
      shadowMode,
      shadowStrength
    );
  },

  /**
   * 3. قالب الشمس (Sun):
   * دائرة ذهبية كبيرة في المنتصف تبرز النص بداخلها
   */
  sun(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    const radius = Math.min((v.W - 80) / 2, (fb - 80) / 2);
    const centerY = (80 + fb) / 2;

    // ظل الدائرة
    drawCircle(ctx, v.W / 2 + 12, centerY + 12, radius, '#000000');
    // الدائرة الذهبية
    drawCircle(ctx, v.W / 2, centerY, radius, v.gold);

    const items = [
      [v.t1, v.dark, 230 * v.k],
      ...v.t2.map(line => [line, v.c1, 240 * v.k])
    ].filter(line => line[0]);

    stackText(
      ctx,
      items,
      v.W / 2,
      centerY - radius * 0.68,
      centerY + radius * 0.68,
      radius * 1.6,
      v.dark,
      fontConfig,
      shadowMode,
      shadowStrength
    );
  },

  /**
   * 4. قالب قطري (Diagonal):
   * شريط مائل بزاوية يملأ الخلفية مع تقسيم النصوص
   */
  diag(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    const { W, H } = v;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.12);

    // النصف العلوي الغامق
    ctx.fillStyle = v.dark;
    ctx.fillRect(-W, -H, 2 * W, H);

    // النصف السفلي الذهبي
    ctx.fillStyle = v.gold;
    ctx.fillRect(-W, 0, 2 * W, H);

    // النصوص في النصفين
    stackText(
      ctx,
      [[v.t1, v.gold, 270 * v.k]].filter(line => line[0]),
      0,
      -H * 0.38,
      -H * 0.04,
      W * 0.95,
      v.c1,
      fontConfig,
      shadowMode,
      shadowStrength
    );

    stackText(
      ctx,
      v.t2.map(line => [line, v.dark, 260 * v.k]),
      0,
      H * 0.05,
      H * 0.38,
      W * 0.95,
      v.tc,
      fontConfig,
      shadowMode,
      shadowStrength
    );

    ctx.restore();
  },

  /**
   * 5. قالب الرقم الكبير (Stat):
   * إبراز نسبة مئوية أو إحصائية ضخمة في المنتصف
   */
  stat(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    const items = [
      [v.t1, v.tc, 110 * v.k],
      [v.big, v.gold, 520 * v.k],
      ...v.t2.map(line => [line, v.tc, 120 * v.k])
    ].filter(line => line[0]);

    stackText(
      ctx,
      items,
      v.W / 2,
      60,
      fb,
      v.W - 120,
      v.dark,
      fontConfig,
      shadowMode,
      shadowStrength
    );
  },

  /**
   * 6. قالب لقطة الشاشة (Screenshot):
   * إطار للصورة الملتقطة أو المرفوعة مع ظل وزاوية إمالة ورابط للموقع
   */
  shot(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    let topLimit = drawTitle(ctx, v, 'shot', 70, false, fb, fontConfig, shadowMode, shadowStrength) + 30;

    // نحفظ مكان زر الرابط لأجل سحبه بالماوس من المعاينة
    window.__linkRect = null;

    // زر الرابط أسفل الصورة إذا تم تحديده
    if (v.link) {
      const linkFontSize = 56 * Math.min(v.k, 1.2);
      ctx.font = `700 ${linkFontSize}px CairoB`;
      const linkWidth = ctx.measureText(v.link).width + 100;
      const linkHeight = linkFontSize * 1.7;
      const linkX = (v.W - linkWidth) / 2 + (v.lkx || 0);
      const linkTop = fb - linkHeight + (v.lky || 0);
      window.__linkRect = { x: linkX, y: linkTop, w: linkWidth, h: linkHeight };

      // ظل الزر
      drawRoundedRect(ctx, linkX + 8, linkTop + 8, linkWidth, linkHeight, linkHeight / 2);
      ctx.fillStyle = '#000000';
      ctx.fill();

      // جسم الزر
      drawRoundedRect(ctx, linkX, linkTop, linkWidth, linkHeight, linkHeight / 2);
      ctx.fillStyle = v.gold;
      ctx.fill();

      // نص الرابط
      ctx.fillStyle = v.dark;
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(v.link, linkX + linkWidth / 2, linkTop + linkHeight / 2 + 2);

      fb = linkTop - 40 + (v.lky || 0);
    }

    const padding = v.sfr ? 20 : 0;
    const boxWidth = v.W - 80;
    const boxHeight = fb - topLimit;
    let imageWidth = boxWidth - 2 * padding;
    let imageHeight = boxHeight - 2 * padding;

    if (assets.screenshot) {
      const ratio = Math.min(imageWidth / assets.screenshot.width, imageHeight / assets.screenshot.height);
      imageWidth = assets.screenshot.width * ratio;
      imageHeight = assets.screenshot.height * ratio;
    }

    // تطبيق مقياس الحجم المخصص
    imageWidth *= v.isc;
    imageHeight *= v.isc;

    const frameWidth = imageWidth + 2 * padding;
    const frameHeight = imageHeight + 2 * padding;
    const cornerRadius = v.sfr ? 44 : 26;

    ctx.save();
    ctx.translate(v.W / 2 + v.ix, topLimit + boxHeight / 2 + v.iy);
    ctx.rotate((v.ir * Math.PI) / 180);

    // ظل الإطار
    if (v.ssd) {
      for (let i = 16; i > 0; i--) {
        drawRoundedRect(ctx, -frameWidth / 2 + i, -frameHeight / 2 + i, frameWidth, frameHeight, cornerRadius);
        ctx.fillStyle = '#000000';
        ctx.fill();
      }
    }

    // رسم الإطار الخارجي
    if (v.sfr) {
      drawRoundedRect(ctx, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight, cornerRadius);
      ctx.fillStyle = hexToRgba(v.gold, 0.3);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(v.gold, 0.8);
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // قص ورسم الصورة أو النص التوضيحي
    ctx.save();
    drawRoundedRect(ctx, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight, 26);
    ctx.clip();

    if (assets.screenshot) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(assets.screenshot, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
    } else {
      ctx.fillStyle = v.dark;
      ctx.fillRect(-imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      renderText(ctx, 'ارفع سكرين شوت', 0, 0, 70, v.gold, null, 'center', 'none', 0, fontConfig);
    }

    ctx.restore();
    ctx.restore();
  },

  /**
   * 7. قالب البطاقات (Cards):
   * بطاقات مرقمة أفقية لكل خطوة أو فكرة
   */
  cards(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    let currentY = drawTitle(ctx, v, 'cards', 70, false, fb, fontConfig, shadowMode, shadowStrength) + 40;
    const stepsList = v.steps.length ? v.steps : ['اكتب النقط هنا'];
    const count = stepsList.length;
    const gap = 26;
    const cardHeight = Math.min(210, (fb - currentY - gap * (count - 1)) / count);

    stepsList.forEach((stepText, i) => {
      const top = currentY + i * (cardHeight + gap);
      const x = 50;
      const cardWidth = v.W - 100;

      // جسم البطاقة
      drawRoundedRect(ctx, x, top, cardWidth, cardHeight, 30);
      ctx.fillStyle = hexToRgba(v.dark, 0.5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // دائرة الرقم
      const numRadius = Math.min(64, cardHeight * 0.32);
      const numCenterX = x + cardWidth - 34 - numRadius;
      const numCenterY = top + cardHeight / 2;

      drawCircle(ctx, numCenterX, numCenterY, numRadius, v.gold);
      renderText(ctx, ARABIC_DIGITS[i] || `${i + 1}`, numCenterX, numCenterY - numRadius * 0.08, numRadius * 1.5, v.dark, null, 'center', 'none', 0, fontConfig);

      // نص الخطوة
      const fontSize = calculateFitFontSize(ctx, stepText, cardHeight * 0.56 * v.k, cardWidth - 34 * 3 - 2 * numRadius, fontConfig);
      renderText(ctx, stepText, numCenterX - numRadius - 30, numCenterY - fontSize * 0.08, fontSize, v.tc, v.dark, 'right', shadowMode, shadowStrength, fontConfig);
    });
  },

  /**
   * 8. قالب الشرايط (Bands):
   * أشرطة ملونة متتالية بعرض التصميم مع أرقام جانبية
   */
  bands(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    let currentY = drawTitle(ctx, v, 'bands', 70, false, fb, fontConfig, shadowMode, shadowStrength) + 30;
    const stepsList = v.steps.length ? v.steps : ['اكتب النقط هنا'];
    const count = stepsList.length;
    const bandHeight = Math.min(240, (fb - currentY) / count);
    const startY = currentY + (fb - currentY - bandHeight * count) / 2;

    const bgColors = [v.gold, v.dark, 'rgba(0,0,0,0.5)'];
    const textColors = [v.dark, v.tc, v.gold];
    const numColors = [v.c1, v.gold, v.tc];

    stepsList.forEach((stepText, i) => {
      const top = startY + i * bandHeight;
      const colorIndex = i % 3;

      // شريط الخلفية
      ctx.fillStyle = bgColors[colorIndex];
      ctx.fillRect(0, top, v.W, bandHeight);

      // رقم الخطوة
      const numWidth = bandHeight * 0.6;
      renderText(ctx, ARABIC_DIGITS[i] || `${i + 1}`, v.W - 60 - numWidth / 2, top + bandHeight / 2 - bandHeight * 0.04, bandHeight * 0.75, numColors[colorIndex], null, 'center', 'none', 0, fontConfig);

      // نص الخطوة
      const fontSize = calculateFitFontSize(ctx, stepText, bandHeight * 0.52 * v.k, v.W - 120 - numWidth - 30, fontConfig);
      renderText(ctx, stepText, v.W - 60 - numWidth - 30, top + bandHeight / 2 - fontSize * 0.08, fontSize, textColors[colorIndex], null, 'right', 'none', 0, fontConfig);
    });
  },

  /**
   * 9. قالب القائمة (Checklist):
   * قائمة بنود مع علامة الصح ✓ الذهبية
   */
  check(ctx, v, fb, assets, fontConfig, shadowMode, shadowStrength) {
    let currentY = drawTitle(ctx, v, 'check', 70, false, fb, fontConfig, shadowMode, shadowStrength) + 40;
    const stepsList = v.steps.length ? v.steps : ['اكتب النقط هنا'];
    const count = stepsList.length;
    const itemHeight = Math.min(200, (fb - currentY) / count);

    stepsList.forEach((stepText, i) => {
      const centerY = currentY + i * itemHeight + itemHeight / 2;
      const radius = Math.min(52, itemHeight * 0.3);
      const centerX = v.W - 70 - radius;

      // دائرة علامة الصح مع ظلها
      drawCircle(ctx, centerX + 7, centerY + 7, radius, '#000000');
      drawCircle(ctx, centerX, centerY, radius, v.gold);

      // رسم علامة الصح ✓
      ctx.strokeStyle = v.dark;
      ctx.lineWidth = radius * 0.28;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX - radius * 0.42, centerY);
      ctx.lineTo(centerX - radius * 0.1, centerY + radius * 0.34);
      ctx.lineTo(centerX + radius * 0.46, centerY - radius * 0.32);
      ctx.stroke();

      // نص البند
      const fontSize = calculateFitFontSize(ctx, stepText, itemHeight * 0.6 * v.k, v.W - 140 - 2 * radius - 30, fontConfig);
      renderText(ctx, stepText, centerX - radius - 30, centerY - fontSize * 0.08, fontSize, v.tc, v.dark, 'right', shadowMode, shadowStrength, fontConfig);
    });
  }
};
