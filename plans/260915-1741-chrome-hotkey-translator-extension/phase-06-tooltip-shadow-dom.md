---
phase: 6
title: "Tooltip Shadow DOM"
status: pending
effort: 4h
---

# Phase 6: Tooltip Shadow DOM

## Context Links

- Phụ thuộc: `./phase-02-scaffold-mv3-skeleton.md` (interface `TooltipController` trong `src/shared/translate-contract.ts`)
- Song song với: phase 03, 04, 05
- Đường vào từ: phase 05 (`tooltip.show(rect, state)` / `tooltip.update(state)`)
- Đường ra tới: phase 07 (callback `onRetryWithPair` khi user đổi chiều / đổi ngôn ngữ đích)
- Báo cáo nền: `../reports/brainstorm-260915-chrome-hotkey-translator.md` § Thiết kế đã chốt, § Rủi ro hàng 4

## Overview

- **Priority:** P1
- **Status:** pending (blockedBy: 02)
- **Effort:** 4h
- **Mô tả:** Toàn bộ phần nhìn thấy được của extension. Shadow DOM `closed` neo vào `document.body`, định vị từ `rect` của selection, kẹp trong viewport, và ba nút: copy · đổi chiều · đổi ngôn ngữ đích. **Build bằng dữ liệu giả** — không phụ thuộc engine dịch, nên chạy song song được với phase 07.

## Key Insights

- **Shadow DOM không phải tuỳ chọn.** Không có nó, CSS của trang chủ nhà sẽ phá layout tooltip — và chuyện này xảy ra ngay trên trang thứ hai, không phải ca hiếm. `mode: 'closed'` để script của trang không với tới được nội dung người dùng đang dịch.
- **Shadow DOM chặn CSS, KHÔNG chặn thuộc tính kế thừa.** `font-size`, `color`, `line-height`, `direction`, `visibility` vẫn chảy qua shadow boundary vào host. Phải `all: initial` trên host để cắt đứt.
- **`popover` giải quyết được cuộc chiến z-index.** Chrome 138+ chắc chắn có Popover API. Phần tử `popover` render ở **top layer** — nằm trên mọi thứ bất kể `z-index`, và **không bị cắt** bởi `overflow: hidden` hay `transform` của tổ tiên. Đây là câu trả lời đúng cho rủi ro "tooltip bị trang che", tốt hơn hẳn việc đấu `z-index: 2147483647`.
- **Toạ độ trang, không phải toạ độ viewport.** `position: absolute` + `rect + scrollX/scrollY` làm tooltip **tự trôi theo scroll** mà không cần listener `scroll` nào. Dùng `fixed` thì phải reposition mỗi khung hình — tốn và giật.
- **Một host duy nhất cho mỗi frame, tái dùng.** Tạo/huỷ host mỗi lần dịch là rác DOM và nhấp nháy. Tạo một lần, `showPopover()`/`hidePopover()`.
- **Tooltip phải KHÔNG cướp focus.** Cướp focus là mất selection — mà mất selection thì nút "đổi chiều" không còn gì để dịch lại. Giữ text gốc trong state của controller, đừng đọc lại từ `Selection` khi user bấm nút.

## Requirements

### Functional

1. Năm trạng thái hiển thị: `PENDING` (spinner) · `OK` (bản dịch) · `ERROR` (thông điệp + gợi ý) · `TOO_LONG` (nêu số ký tự thật) · `NO_SELECTION`.
2. Ba hành động: **copy** bản dịch · **đổi chiều** (hoán vị src↔tgt) · **đổi ngôn ngữ đích** (dropdown các cặp đã cấu hình).
3. Dismiss theo đúng ba đường đã chốt: mất vùng bôi đen (`selectionchange`) · `pointerdown` ngoài tooltip · phím `Esc`.
4. Định vị dưới selection; không đủ chỗ thì lật lên trên; kẹp trong cả bốn mép viewport.
5. Trôi theo scroll của trang mà không cần listener.
6. Hiện text gốc (rút gọn) phía trên bản dịch, để user biết mình đang dịch cái gì.
7. Nhãn cặp ngôn ngữ luôn hiển thị (`VI → EN`) — user cần biết chiều nào đang chạy.

### Non-functional

- Bundle phần tooltip < 12KB sau minify (ngân sách chung với phase 05 là 25KB).
- Thời gian dựng khung < 16ms (một khung hình) — `PENDING` phải hiện gần như tức thì.
- Mỗi file < 200 dòng.
- Hỗ trợ `prefers-color-scheme` sáng/tối và `prefers-reduced-motion`.
- Font stack phải render dấu tiếng Việt sạch — dùng system stack, không tải webfont (tải font là request mạng, vi phạm ràng buộc "không mạng").

## Architecture

```
document.body
 └─ <tkm-translate-host popover="manual">      ← top layer, không bị overflow/z-index cắt
      #shadow-root (closed)
       ├─ <style>  …all: initial trên :host…
       └─ <div class="card">
            ├─ header:  [VI → EN]  [⇄ đổi chiều]  [▾ ngôn ngữ đích]  [× đóng]
            ├─ source:  "đoạn gốc rút gọn…"
            ├─ body:    spinner | bản dịch | thông điệp lỗi
            └─ footer:  [⧉ copy]
```

### Luồng trạng thái

```
show(rect, PENDING) ──► dựng host nếu chưa có ──► định vị ──► showPopover()
                                                       │
        phase 07 gọi update(...) ──────────────────────┤
                                                       ├─ OK       → render bản dịch + bật nút copy
                                                       ├─ ERROR    → thông điệp + gợi ý hành động
                                                       └─ TOO_LONG → nêu số ký tự thật

user bấm ⇄ hoặc chọn ngôn ngữ ──► onRetryWithPair(pairMới, textGốcĐãGiữ) ──► phase 07
                                   (KHÔNG đọc lại Selection — có thể đã mất)

dismiss ◄── selectionchange (collapsed) | pointerdown ngoài | Esc ──► hidePopover()
```

### Toán định vị (`tooltip-position.ts`)

Đầu vào: `rect` (toạ độ viewport, từ phase 05), kích thước tooltip `tw × th`, viewport `vw × vh`, `scrollX/scrollY`, lề `M = 8`.

```
// trục dọc: ưu tiên dưới, không đủ chỗ thì lật lên
spaceBelow = vh - rect.bottom
top = (spaceBelow >= th + M) ? rect.bottom + M
    : (rect.top >= th + M)   ? rect.top - th - M
    : clamp(rect.bottom + M, M, vh - th - M)   // cả hai phía đều chật → nhét vừa

// trục ngang: căn giữa theo selection rồi kẹp
left = clamp(rect.left + rect.width/2 - tw/2, M, vw - tw - M)

// đổi sang toạ độ trang để trôi theo scroll
return { top: top + scrollY, left: left + scrollX }
```

`tw × th` phải đo **sau khi** đã gắn nội dung (dùng `getBoundingClientRect()` trên card, với host đã `showPopover()` nhưng `visibility: hidden` ở khung đầu) — đo trước là ra 0 và tooltip nhảy.

### Bảng trạng thái → giao diện

| State | Thân tooltip | Nút copy | Nút ⇄ / dropdown |
|---|---|---|---|
| `PENDING` | spinner + "Đang dịch…" | ẩn | bật |
| `OK` | bản dịch, cuộn được, `max-height: 320px` | bật | bật |
| `ERROR` | thông điệp + một gợi ý hành động | ẩn | bật (đổi cặp có thể cứu được) |
| `TOO_LONG` | "Đoạn dài 5.240 ký tự, vượt mức 2.000. Hãy bôi đen đoạn ngắn hơn." | ẩn | ẩn |
| `NO_SELECTION` | "Chưa bôi đen đoạn nào." — tự tắt sau 2s | ẩn | ẩn |

### Cô lập CSS — ba lớp phòng thủ

| Lớp | Làm gì | Chặn được gì |
|---|---|---|
| Shadow DOM `closed` | CSS selector của trang không với vào | `.card { display:none }` của trang |
| `:host { all: initial }` | Cắt mọi thuộc tính kế thừa | `body { font-size: 8px }`, `* { color: red }` |
| `popover` (top layer) | Thoát khỏi luồng bố cục | `overflow:hidden`, `transform`, `filter`, `z-index` của tổ tiên |

> **Cần xác minh trong 15 phút đầu phase:** phần tử ở top layer có containing block là initial containing block, nên `position: absolute` + toạ độ trang **có thể** không trôi theo scroll như mong đợi. Kiểm ngay trên demo harness. Nếu không trôi → lùi về `position: fixed` + toạ độ viewport + một listener `scroll` (passive, `requestAnimationFrame` gộp khung). Ghi kết quả vào phase file này.

## Related Code Files

| Đường dẫn tuyệt đối | Thao tác | Dòng ước tính |
|---|---|---|
| `/Users/tgiap.dev/devs/translator/src/content/tooltip/tooltip-controller.ts` | create | ~130 — vòng đời, state, dismiss |
| `/Users/tgiap.dev/devs/translator/src/content/tooltip/tooltip-view.ts` | create | ~150 — dựng DOM trong shadow root |
| `/Users/tgiap.dev/devs/translator/src/content/tooltip/tooltip-position.ts` | create | ~80 — hàm thuần, không đụng DOM |
| `/Users/tgiap.dev/devs/translator/src/content/tooltip/tooltip-styles.ts` | create | ~140 — chuỗi CSS, sáng/tối |
| `/Users/tgiap.dev/devs/translator/src/content/tooltip/tooltip-strings.ts` | create | ~40 — chuỗi tiếng Việt, tách sẵn cho i18n |
| `/Users/tgiap.dev/devs/translator/src/content/tooltip/__dev__/tooltip-demo.html` | create | ~60 — harness dữ liệu giả, mở trực tiếp bằng trình duyệt |
| `/Users/tgiap.dev/devs/translator/tests/tooltip-position.test.mjs` | create | ~110 — phủ 4 mép + ca chật cả hai phía |

**Đọc, KHÔNG sửa:** `src/shared/translate-contract.ts` (interface do phase 02 định nghĩa).
**Không chạm:** `src/content/*.ts` ở thư mục gốc (phase 05 sở hữu), `src/engine/**` (phase 07 sở hữu).

## Implementation Steps

1. **Xác minh popover + scroll (15 phút, làm trước tiên).** Demo harness: host `popover="manual"`, `position:absolute`, toạ độ trang, cuộn trang xem tooltip có bám không. Ghi kết quả vào mục Architecture ở trên. Không đạt → dùng nhánh lùi `fixed` + listener scroll.
2. `tooltip-position.ts` — hàm thuần `place(rect, size, viewport, scroll, margin)` theo đúng công thức trên. Không import gì.
3. `tooltip-styles.ts` — xuất một chuỗi CSS:
   - `:host { all: initial; }` rồi mới khai báo lại font/màu.
   - Font stack: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif` — render dấu tiếng Việt sạch, không tải font.
   - `@media (prefers-color-scheme: dark)` đảo bảng màu.
   - `@media (prefers-reduced-motion: reduce)` tắt fade và spinner xoay (đổi sang nhấp nháy opacity nhẹ).
   - `.body { max-height: 320px; overflow-y: auto; overscroll-behavior: contain; }` — `overscroll-behavior` để cuộn hết tooltip không kéo theo trang.
4. `tooltip-view.ts`:
   - `createHost()`: tạo `<tkm-translate-host>`, `attachShadow({mode:'closed'})`, nhét `<style>`, gắn vào `document.body`, đặt `popover="manual"`.
   - `render(state)`: cập nhật trong shadow root. Dùng `textContent`, **không** `innerHTML`, cho mọi nội dung đến từ trang hoặc từ engine.
   - Nút dùng `<button type="button">`, có `aria-label` tiếng Việt.
   - Thân kết quả: `aria-live="polite"` để trình đọc màn hình đọc bản dịch khi nó tới.
   - Chặn `mousedown` trên card bằng `preventDefault()` — giữ selection của trang không bị mất khi user bấm nút.
5. `tooltip-controller.ts`:
   - Giữ state: `{ pair, sourceText, rect, view }`. **`sourceText` là nguồn sự thật cho retry**, không đọc lại `Selection`.
   - `show(rect, state)` / `update(state)` / `hide()` đúng interface `TooltipController`.
   - Dismiss: `document.addEventListener('selectionchange')` (debounce 100ms, chỉ tắt khi selection collapsed **và** con trỏ không ở trong tooltip), `pointerdown` capture trên `window` (bỏ qua nếu `composedPath()` chứa host), `keydown` Esc.
   - Gỡ sạch listener trong `hide()` — đăng ký lại ở `show()`. Không để listener sống khi tooltip đóng.
   - Nút copy: `navigator.clipboard.writeText()` trong handler click (có user gesture), đổi nhãn thành "Đã copy" 1.5s. Catch lỗi → hiện "Không copy được".
   - Nút ⇄ và dropdown: gọi `callbacks.onRetryWithPair(pairMới, state.sourceText)`. Controller tự chuyển về `PENDING`.
6. `tooltip-strings.ts` — gom toàn bộ chuỗi tiếng Việt vào một chỗ. Không rải literal trong view.
7. `__dev__/tooltip-demo.html` — trang tĩnh dựng tooltip với **dữ liệu giả** cho cả 5 state, có nút chuyển state và ô chỉnh `rect`. Đây là công cụ làm việc chính của phase này; nó cho phép hoàn thiện giao diện mà **không cần** engine dịch.
8. `tests/tooltip-position.test.mjs` — `node --test`, phủ: đủ chỗ dưới · chật dưới → lật lên · chật cả hai → kẹp · tràn trái · tràn phải · selection rộng hơn tooltip · selection rộng hơn viewport.
9. Kiểm thủ công trên 5 trang CSS nặng (danh sách ở phase 08).

## Todo List

- [ ] Xác minh popover + `position:absolute` có trôi theo scroll không (15 phút, làm đầu tiên)
- [ ] `tooltip-position.ts` — hàm thuần
- [ ] `tooltip-styles.ts` — `all: initial`, sáng/tối, reduced-motion
- [ ] `tooltip-view.ts` — shadow closed, `textContent` mọi chỗ, `aria-live`
- [ ] `tooltip-controller.ts` — state + 3 đường dismiss + gỡ listener
- [ ] Giữ `sourceText` trong state để retry không cần Selection
- [ ] `preventDefault` trên `mousedown` của card (không mất selection)
- [ ] Nút copy + phản hồi "Đã copy"
- [ ] Nút ⇄ và dropdown ngôn ngữ đích → `onRetryWithPair`
- [ ] `tooltip-strings.ts` — tách sẵn cho i18n
- [ ] `__dev__/tooltip-demo.html` — harness 5 state
- [ ] `tests/tooltip-position.test.mjs`
- [ ] Kiểm mắt trên 5 trang CSS nặng

## Success Criteria

- [ ] Cả 5 state render đúng trong `tooltip-demo.html`.
- [ ] Bôi đen sát **mép phải** viewport → tooltip kẹp vào trong, không sinh thanh cuộn ngang.
- [ ] Bôi đen sát **đáy** viewport → tooltip lật lên trên selection.
- [ ] Bôi đen sát **đỉnh** và đáy cùng chật → tooltip vẫn nằm trọn trong viewport.
- [ ] Cuộn trang khi tooltip đang mở → tooltip bám theo đoạn text (hoặc theo nhánh lùi đã ghi ở bước 1).
- [ ] Trên trang đặt `body { font-size: 8px }` và `* { box-sizing: content-box }` → tooltip không đổi hình.
- [ ] Trong một `div` có `overflow:hidden` + `transform: translateZ(0)` → tooltip **không** bị cắt.
- [ ] Bấm nút ⇄ → `onRetryWithPair` nhận đúng `sourceText` gốc, kể cả khi selection đã mất.
- [ ] Ba đường dismiss đều hoạt động; sau `hide()` không còn listener nào sót (kiểm bằng DevTools → Event Listeners trên `window`/`document`).
- [ ] Bấm nút copy → clipboard có đúng bản dịch.
- [ ] Bật `prefers-reduced-motion` → không có animation xoay.
- [ ] `node --test tests/tooltip-position.test.mjs` xanh.
- [ ] Mọi file < 200 dòng. Bundle tooltip < 12KB minify.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Chặn thế nào |
|---|---|---|---|
| Popover top-layer làm hỏng toán định vị theo scroll | Trung bình | Trung bình | Xác minh ở bước 1; nhánh lùi `fixed` + scroll listener đã định sẵn |
| Trang đặt CSS lên custom element (`tkm-translate-host { display:none !important }`) | Thấp | Cao | Tên thẻ có tiền tố ngẫu nhiên theo phiên, sinh lúc khởi tạo; không dùng tên cố định dễ đoán |
| Bấm nút làm mất selection → retry không có text | **Cao** nếu không xử lý | Cao | `preventDefault` trên `mousedown` **và** giữ `sourceText` trong state — hai lớp |
| Thuộc tính kế thừa lọt qua shadow boundary | Cao nếu quên | Trung bình | `:host { all: initial }` — có ca kiểm riêng |
| Tooltip che mất chính đoạn đang dịch | Trung bình | Thấp | Lề 8px + lật lên khi chật dưới |
| Cuộn trong tooltip kéo theo trang | Trung bình | Thấp | `overscroll-behavior: contain` |
| Listener dismiss sót lại sau khi đóng | Trung bình | Trung bình — rò bộ nhớ trên SPA | Gỡ trong `hide()`; có ca kiểm DevTools |

**Rollback:** revert commit. Phase 05 quay về dùng `TooltipController` bản no-op ghi log — luồng đầu vào vẫn chạy, chỉ là không thấy gì.

## Security Considerations

- **`textContent` cho mọi nội dung, tuyệt đối không `innerHTML`.** Text đến từ trang web bất kỳ. Một lần `innerHTML` ở đây là một lỗ XSS trong chính extension.
- `mode: 'closed'` — script của trang không lấy được `shadowRoot`, nên không đọc trộm được đoạn user đang dịch.
- Tên custom element có tiền tố ngẫu nhiên theo phiên → trang không thể nhắm CSS hay selector vào nó.
- Không gắn gì lên `window` của trang, không `postMessage`.
- Nút copy chỉ ghi clipboard, không đọc (`readText` cần quyền, và ta không cần).
- Không tải webfont, không ảnh ngoài, không `<iframe>` — mọi tài nguyên nằm trong bundle. Zero request mạng.
- Text gốc hiển thị ở phần "source" phải rút gọn (~120 ký tự) — tránh in nguyên đoạn nhạy cảm lên màn hình lâu hơn cần thiết.

## Next Steps

- **Bị chặn bởi:** phase 02.
- **Chạy song song với:** phase 03, 04, 05. File ownership: phase này sở hữu **duy nhất** `src/content/tooltip/**`.
- **Ghép với phase 05:** phase 05 gọi qua interface `TooltipController`; khi phase này merge thì đổi bản no-op sang bản thật trong `content-entry.ts` (một dòng, do phase 05 hoặc 07 thực hiện khi merge).
- **Ghép với phase 07:** phase 07 nối `onRetryWithPair` vào provider thật.
- **Mở khoá:** phase 08.
