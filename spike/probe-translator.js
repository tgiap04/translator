// [SPIKE] Phase 01 — do Translator API co ton tai trong ISOLATED world khong?
// Code vut di. Khong dua vao src/.
(async () => {
  const W = 'ISOLATED';
  const r = {
    world: W,
    href: location.href.slice(0, 80),
    origin: location.origin,
    isTop: window.top === window,
    secure: isSecureContext,
    ua: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] ?? 'n/a',
  };

  // Phep do 1 — ton tai
  r.typeofTranslator = typeof Translator;
  r.typeofSelfTranslator = typeof self.Translator;
  r.typeofLanguageDetector = typeof LanguageDetector;

  // Phep do 2 — availability
  try {
    r.availability = await Translator.availability({ sourceLanguage: 'vi', targetLanguage: 'en' });
  } catch (e) {
    r.availability = `ERR ${e.name}: ${e.message}`;
  }

  // Phep do 3 — create
  let session = null;
  try {
    session = await Translator.create({ sourceLanguage: 'vi', targetLanguage: 'en' });
    r.create = 'OK';
  } catch (e) {
    r.create = `ERR ${e.name}: ${e.message}`;
  }

  // Phep do 4 — translate
  try {
    r.translate = session ? await session.translate('Xin chào thế giới') : 'SKIP (no session)';
  } catch (e) {
    r.translate = `ERR ${e.name}: ${e.message}`;
  }

  window.__SPIKE_RESULT = r;
  // DOM la vung chung giua isolated world va main world -> dung lam cau.
  document.documentElement.setAttribute('data-spike-isolated', JSON.stringify(r));
  console.log('[SPIKE]' + JSON.stringify(r));
})();
