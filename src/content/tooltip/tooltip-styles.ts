// Chuoi CSS nhet vao <style> trong shadow root.
// :host { all: initial } BAT BUOC dau tien: Shadow DOM chan CSS selector cua
// trang nhung KHONG chan thuoc tinh ke thua (font-size, color, line-height,
// direction, visibility van chay qua shadow boundary). all:initial cat dut.
//
// CAI GIA CUA all:initial: no ghi de LUON luat cua trinh duyet
//   [popover]:not(:popover-open) { display: none }
// -> hidePopover() dong popover ve mat logic nhung no VAN HIEN tren man hinh.
// Phai tu tra lai luat do, neu khong tooltip khong bao gio tat duoc.

export const TOOLTIP_STYLES = `
:host {
  all: initial;
  /* all:initial dat color-scheme ve normal -> scrollbar va form control trong
     tooltip khong theo theme. Khai lai de chung theo trinh duyet. */
  color-scheme: light dark;
}

:host(:not(:popover-open)) {
  display: none !important;
}

* {
  box-sizing: border-box;
}

.card {
  --bg: #ffffff;
  --fg: #374151;
  --border: #e2e2e6;
  --muted: #6b7280;
  --accent: #2563eb;
  --danger: #dc2626;

  display: block;
  width: 320px;
  max-width: min(320px, calc(100vw - 16px));
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

@media (prefers-color-scheme: dark) {
  .card {
    --bg: #1f2430;
    --fg: #e5e7eb;
    --border: #3a3f4b;
    --muted: #9ca3af;
    --accent: #60a5fa;
    --danger: #f87171;
  }
}

.header {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 6px 6px 10px;
  border-bottom: 1px solid var(--border);
}

.pair-label {
  font-weight: 600;
  font-size: 12px;
  margin-right: auto;
  color: var(--muted);
  white-space: nowrap;
}

button {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 24px;
  min-height: 24px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--fg);
}

button:hover,
select:hover {
  background: rgba(128, 128, 128, 0.16);
}

button:focus-visible,
select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

button[hidden],
select[hidden] {
  display: none;
}

select {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  font-size: 12px;
  max-width: 84px;
  padding: 2px 4px;
  border-radius: 4px;
  color: var(--fg);
}

.source {
  padding: 6px 10px 0;
  font-size: 12px;
  color: var(--muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.body {
  padding: 8px 10px;
  max-height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
  white-space: pre-wrap;
  word-break: break-word;
}

.body.error {
  color: var(--danger);
}

.body .hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.pending-row {
  display: inline-flex;
  align-items: center;
  color: var(--muted);
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: tkm-spin 0.7s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: tkm-pulse 1.2s ease-in-out infinite;
    border-top-color: var(--border);
  }
}

@keyframes tkm-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes tkm-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

.footer {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px 6px;
  border-top: 1px solid var(--border);
}
`;
