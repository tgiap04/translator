// [SPIKE] Doi chung — cung phep do nhung chay o MAIN world (Route B).
// Chay song song de mot lan load tra loi duoc ca hai route.
(async () => {
  const r = {
    world: 'MAIN',
    href: location.href.slice(0, 80),
    isTop: window.top === window,
    typeofTranslator: typeof Translator,
    typeofLanguageDetector: typeof LanguageDetector,
  };
  try {
    r.availability = await Translator.availability({ sourceLanguage: 'vi', targetLanguage: 'en' });
  } catch (e) {
    r.availability = `ERR ${e.name}: ${e.message}`;
  }
  document.documentElement.setAttribute('data-spike-main', JSON.stringify(r));
  console.log('[SPIKE]' + JSON.stringify(r));
})();
