document.getElementById('go').addEventListener('click', () => {
  const p = document.getElementById('src');
  const r = document.createRange();
  r.selectNodeContents(p);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
  window.__harness.translate();
});
