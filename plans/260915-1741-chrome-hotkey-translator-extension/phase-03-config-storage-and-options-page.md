---
phase: 3
title: "Config storage and options page"
status: pending
effort: 4h
---

# Phase 3: Config storage and options page

## Context Links

- Phụ thuộc: `./phase-02-scaffold-mv3-skeleton.md` (contract `config-schema.ts`, `config-store.ts`, `hotkey-codec.ts` đã có)
- Song song với: phase 04, 05, 06 — **không đụng file nhau**
- Báo cáo nền: `../reports/brainstorm-260915-chrome-hotkey-translator.md` § "Thiết kế đã chốt"
- Mở khoá: phase 07

## Overview

- **Priority:** P1
- **Status:** pending (blockedBy: 02)
- **Effort:** 4h
- **Mô tả:** Trang cài đặt — **cửa duy nhất được tải language pack**. CRUD cặp ngôn ngữ, gán tổ hợp phím, validate xung đột phím ngay tại chỗ, và tải pack có thanh tiến trình.

## Key Insights

- **Language pack là tài sản cấp trình duyệt.** Tải một lần ở options page, mọi context khác dùng được. Đây là nguyên tắc nền của cả kiến trúc — nó cho phép content script chỉ việc gọi dịch mà không lo user gesture.
- **`Translator.create()` đòi user activation khi phải tải model.** Options page là nơi duy nhất có click thật. Content script bị kích bằng phím tắt **không** tính là user activation đủ tin cậy cho download.
- **Xung đột phím phải bắt tại đây, không để lộ lúc runtime.** Có hai đường hotkey (`chrome.commands` tĩnh + keydown động) → user hoàn toàn có thể gán trùng. Runtime mà đụng nhau thì triệu chứng là "bấm phím ra sai ngôn ngữ" — cực khó chẩn đoán.
- **`storage.sync` có quota chặt:** 8KB/item, 100KB tổng, 512 item, 1800 ghi/giờ và 120 ghi/phút. Lưu **toàn bộ config trong MỘT item** → trần thực tế là 8KB. Schema phải gọn: mã ngôn ngữ BCP-47 ngắn, không nhét tên ngôn ngữ đầy đủ, không nhét trạng thái tải pack (thứ đó là cấp máy, không đồng bộ được).
- Ghi vào `storage.sync` phải **debounce** — gõ liên tục trong widget bắt phím mà ghi từng phát là chạm trần 120 ghi/phút.

## Requirements

### Functional

1. Liệt kê cặp ngôn ngữ: nguồn → đích, tổ hợp phím, nút Sửa / Xoá.
2. Thêm cặp mới: chọn nguồn, chọn đích, bắt tổ hợp phím, lưu.
3. Widget bắt tổ hợp: user bấm phím thật, widget hiện chuỗi canonical đã format.
4. Validate **ngay lúc bắt phím**: trùng với cặp khác, trùng với `chrome.commands`, hoặc nằm trong danh sách cấm → chặn lưu + nói rõ lý do.
5. Tải pack: nút "Tải gói ngôn ngữ" mỗi cặp, có thanh tiến trình `%`, huỷ được.
6. Hiện trạng thái pack mỗi cặp: `available` / `downloadable` / `downloading` / `unavailable`.
7. Bảng chỉ đọc liệt kê 3 lệnh `chrome.commands` + link tới `chrome://extensions/shortcuts` (Chrome không cho extension tự đổi).
8. Cảnh báo nếu `typeof Translator === 'undefined'` (Chrome < 138) — nói rõ phải làm gì.

### Non-functional

- Config item ≤ 4KB ở 20 cặp (nửa quota, chừa chỗ).
- Mọi chuỗi hiển thị nằm trong `src/options/options-strings.ts` — sẵn sàng chuyển sang `_locales/` ở v2.
- Mỗi module < 200 dòng.
- Không framework. `document.createElement` + `<template>`.

## Architecture

### Schema `chrome.storage.sync` — nguồn sự thật (phase 02 tạo file theo bảng này)

Một key duy nhất: `STORAGE_KEY = 'cfg'`.

```ts
type LangPair = {
  id: string;          // 6 ký tự, crypto.randomUUID().slice(0,6)
  s: string;           // sourceLanguage, BCP-47 ('vi')
  t: string;           // targetLanguage, BCP-47 ('en')
  k: string | null;    // hotkey canonical ('Ctrl+Shift+KeyE'); null = đi qua chrome.commands
  c?: 1 | 2;           // ràng buộc vào command slot 1|2; vắng mặt = cặp động
};

type AppConfig = {
  v: 1;                // version schema, cho migrate
  pairs: LangPair[];   // trần mềm 20 cặp
  max: number;         // ngưỡng ký tự tối đa, mặc định 2000 (xem phase 05)
};
```

Tên field viết tắt **có chủ đích** — 20 cặp × ~60 byte ≈ 1.2KB, thoải mái dưới 8KB. Không lưu tên ngôn ngữ (tra từ `src/options/language-catalog.ts`, dữ liệu tĩnh, không đồng bộ). Không lưu trạng thái pack (hỏi `Translator.availability()` mỗi lần mở options — nó là trạng thái của **máy này**, sync sang máy khác là sai).

`DEFAULT_CONFIG`:
```ts
{ v: 1, max: 2000, pairs: [
  { id: 'vi2en0', s: 'vi', t: 'en', k: null, c: 1 },
  { id: 'en2vi0', s: 'en', t: 'vi', k: null, c: 2 },
]}
```

### Luồng dữ liệu

```
mở options page
  → getConfig()  ──(rỗng)──> DEFAULT_CONFIG, ghi lại
  → render danh sách
  → với mỗi pair: Translator.availability({s,t}) → gắn badge trạng thái

user bấm "Ghi phím"
  → hotkey-capture-widget bắt keydown (capture, preventDefault mọi phím)
  → hotkey-codec.fromEvent(e) → canonical | null
  → hotkey-conflict-validator.check(canonical, config, editingId)
       ├─ FORBIDDEN      → hiện lỗi, KHÔNG lưu
       ├─ DUP_PAIR       → hiện lỗi + chỉ đích danh cặp đang chiếm
       ├─ DUP_COMMAND    → hiện lỗi + nhắc đổi ở chrome://extensions/shortcuts
       └─ OK             → cho lưu
  → setConfig() (debounce 400ms)

user bấm "Tải gói"
  → Translator.create({ s, t, monitor(m){ m.addEventListener('downloadprogress', ...) } })
  → cập nhật <progress> theo e.loaded / e.total
  → xong: session.destroy() ngay (chỉ cần pack, không giữ session ở options)
  → lỗi: hiện err.name + gợi ý
```

### Ma trận xung đột phím — validate đủ 3 hướng

| Hướng | Kiểm gì | Thông điệp |
|---|---|---|
| Trùng cặp động khác | `k` trùng canonical với pair khác (bỏ qua chính nó khi sửa) | "Tổ hợp này đang dùng cho vi → en" |
| Trùng `chrome.commands` | Đọc `chrome.commands.getAll()` **lúc runtime** — user có thể đã đổi ở `chrome://extensions/shortcuts`. So sánh sau khi chuẩn hoá về canonical | "Trùng lệnh Dịch vi→en. Đổi tại chrome://extensions/shortcuts" |
| Danh sách cấm | Bảng dưới | "Tổ hợp này thuộc về trình duyệt/hệ điều hành" |

`chrome.commands.getAll()` trả `shortcut` dạng `"Alt+Shift+1"` — phải chuẩn hoá về canonical (`event.code`) trước khi so. Ánh xạ `"1" → "Digit1"`, `"T" → "KeyT"`, `"Command" → "Meta"`.

### Danh sách tổ hợp cấm (`FORBIDDEN` trong `hotkey-codec.ts`)

| Nhóm | Tổ hợp | Vì sao |
|---|---|---|
| Không modifier | mọi phím đơn không có Ctrl/Alt/Meta | Gõ chữ là đụng ngay |
| Chỉ Shift | `Shift+<phím>` | Vẫn là gõ chữ hoa |
| Tab trình duyệt | `Ctrl/Meta + KeyT, KeyW, KeyN, Digit1–9, Tab` | Mở/đóng/chuyển tab |
| Điều hướng | `Ctrl/Meta + KeyL, KeyR, KeyD, KeyH, KeyJ` | Thanh địa chỉ, tải lại, bookmark, lịch sử, tải xuống |
| Sửa văn bản | `Ctrl/Meta + KeyC, KeyV, KeyX, KeyZ, KeyY, KeyA, KeyS, KeyP, KeyF` | Phá thao tác cơ bản |
| DevTools | `F12`, `Ctrl+Shift+KeyI/KeyJ/KeyC`, `Meta+Alt+KeyI` | Chặn công cụ gỡ lỗi |
| Hệ điều hành | `Meta+KeyQ`, `Meta+Space`, `Meta+Tab`, `Alt+Tab`, `Alt+F4` | OS nuốt trước, extension không thấy |
| Phím chức năng trơ | `Escape`, `Enter`, `Space` (kể cả có modifier đơn) | Dùng cho dismiss tooltip / submit form |

Khuyến nghị hiển thị cho user: **≥2 modifier** (ví dụ `Ctrl+Shift+KeyE`). Lý do thực dụng: phase 05 chỉ cho hotkey hoạt động trong ô nhập liệu khi có ≥2 modifier — tổ hợp 1 modifier sẽ chết trong Gmail/Notion.

## Related Code Files

| Đường dẫn tuyệt đối | Thao tác | Dòng ước tính |
|---|---|---|
| `/Users/tgiap.dev/devs/translator/public/options.html` | modify (phase 02 tạo khung) | ~70 |
| `/Users/tgiap.dev/devs/translator/src/options/options-entry.ts` | modify (phase 02 tạo tối thiểu) | ~90 — chỉ khởi tạo + nối module |
| `/Users/tgiap.dev/devs/translator/src/options/pair-list-view.ts` | create | ~150 |
| `/Users/tgiap.dev/devs/translator/src/options/pair-editor-view.ts` | create | ~140 |
| `/Users/tgiap.dev/devs/translator/src/options/hotkey-capture-widget.ts` | create | ~110 |
| `/Users/tgiap.dev/devs/translator/src/options/hotkey-conflict-validator.ts` | create | ~100 |
| `/Users/tgiap.dev/devs/translator/src/options/pack-download-progress.ts` | create | ~110 |
| `/Users/tgiap.dev/devs/translator/src/options/language-catalog.ts` | create | ~60 — danh sách ~40 mã BCP-47 + tên |
| `/Users/tgiap.dev/devs/translator/src/options/options-strings.ts` | create | ~60 |
| `/Users/tgiap.dev/devs/translator/src/options/options.css` | create | ~120 (copy sang dist qua build) |
| `/Users/tgiap.dev/devs/translator/tests/hotkey-conflict-validator.test.mjs` | create | ~80 |

Chia nhỏ như trên vì gộp lại sẽ vượt 200 dòng — `options-entry.ts` chỉ làm nhiệm vụ lắp ráp.

**Đọc, KHÔNG sửa:** `src/shared/config-schema.ts`, `config-store.ts`, `hotkey-codec.ts`.

## Implementation Steps

1. `options.html`: khung ngữ nghĩa — `<header>`, `<section id="pairs">`, `<section id="commands">`, `<section id="status">`, `<template id="pair-row">`. Không inline script, không inline style.
2. `language-catalog.ts`: ~40 cặp mã BCP-47 + tên hiển thị của Translator API (`en`, `vi`, `ja`, `zh`, `ko`, `fr`, `de`, `es`, `pt`, `ru`, `th`, …). Dữ liệu tĩnh, cứ để cứng.
3. `options-strings.ts`: gom mọi chuỗi UI. Xuất một object phẳng `S.pairAddButton`, `S.errDupPair`… Chuỗi có tham số dùng hàm: `S.errDupPair(pairLabel)`.
4. `pair-list-view.ts`: render từ `AppConfig.pairs`; mỗi hàng có badge trạng thái pack, nút Sửa/Xoá/Tải. Cặp có `c` (ràng buộc command) thì **khoá** ô hotkey và chú thích "đặt tại chrome://extensions/shortcuts".
5. `hotkey-capture-widget.ts`: vào chế độ bắt → `keydown` capture trên `window`, `preventDefault()` + `stopPropagation()` **mọi** sự kiện; bỏ qua khi chỉ có modifier; `Escape` = huỷ bắt; gọi `hotkey-codec.fromEvent`.
6. `hotkey-conflict-validator.ts`: hàm thuần `check(canonical, config, editingId, commandShortcuts)` → `{ ok: true } | { ok: false, code, message }`. Thuần → test được bằng `node --test`.
7. `pair-editor-view.ts`: form thêm/sửa. Chặn nút Lưu khi validator fail. Chặn cặp `s === t`.
8. `pack-download-progress.ts`:
   ```ts
   const session = await Translator.create({
     sourceLanguage: s, targetLanguage: t,
     monitor(m) { m.addEventListener('downloadprogress', e => onPct(e.loaded / e.total)); },
     signal: abortController.signal,
   });
   session.destroy();
   ```
   Xử lý đủ: `NotSupportedError` (cặp không hỗ trợ), `NotAllowedError` (thiếu user activation), `AbortError` (user huỷ), `NotReadableError` (tải hỏng). Mỗi mã một thông điệp riêng.
9. `options-entry.ts`: nạp config → render → lắng `onConfigChanged` → ghi có debounce 400ms. Kiểm `typeof Translator === 'undefined'` ngay đầu, hiện banner chặn nếu thiếu.
10. Đọc `chrome.commands.getAll()` lúc mở trang, render bảng chỉ đọc + nuôi validator.
11. Viết `tests/hotkey-conflict-validator.test.mjs` — phủ 3 hướng xung đột + trường hợp sửa chính nó.
12. Kiểm thủ công quota: tạo 20 cặp, đo `JSON.stringify(cfg).length` < 4096.

## Todo List

- [ ] `options.html` khung ngữ nghĩa + `<template>`
- [ ] `language-catalog.ts` (~40 ngôn ngữ)
- [ ] `options-strings.ts` (gom hết chuỗi)
- [ ] `options.css`
- [ ] `pair-list-view.ts`
- [ ] `hotkey-capture-widget.ts`
- [ ] `hotkey-conflict-validator.ts` (hàm thuần)
- [ ] `pair-editor-view.ts`
- [ ] `pack-download-progress.ts` + xử lý 4 mã lỗi
- [ ] `options-entry.ts` lắp ráp + debounce ghi
- [ ] Bảng `chrome.commands` chỉ đọc + link shortcuts
- [ ] Banner Chrome < 138
- [ ] `tests/hotkey-conflict-validator.test.mjs`
- [ ] Đo kích thước config ở 20 cặp

## Success Criteria

- [ ] Thêm được cặp ngôn ngữ thứ ba với tổ hợp tự chọn, tải pack xong, cặp hiện `available` — **tiêu chí #2 của báo cáo tư vấn**.
- [ ] Thanh tiến trình chạy từ 0→100% khi tải pack mới; huỷ giữa chừng không để lại trạng thái kẹt.
- [ ] Gán phím trùng cặp khác → chặn, thông điệp gọi đích danh cặp đang chiếm.
- [ ] Gán phím trùng `chrome.commands` → chặn, thông điệp chỉ đúng chỗ đổi.
- [ ] Gán `Ctrl+KeyC` → chặn (danh sách cấm).
- [ ] 20 cặp → `JSON.stringify(cfg).length` < 4096 byte.
- [ ] Reload options page giữ nguyên toàn bộ cấu hình.
- [ ] `node --test tests/hotkey-conflict-validator.test.mjs` xanh.
- [ ] Mọi file < 200 dòng.
- [ ] Không chuỗi hiển thị nào nằm cứng ngoài `options-strings.ts`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Chặn thế nào |
|---|---|---|---|
| Chạm quota ghi `storage.sync` (120/phút) | Trung bình | Trung bình — ghi im lặng thất bại | Debounce 400ms; kiểm `chrome.runtime.lastError` sau mỗi `set`; hiện lỗi thật cho user |
| `chrome.commands.getAll()` trả chuỗi không map được về canonical | Trung bình | Trung bình — lọt xung đột | Map không ra thì coi là **xung đột** (fail-safe), kèm cảnh báo mềm |
| `Translator.create()` ném `NotAllowedError` dù đã có click | Thấp | Cao — không tải được pack | Gắn `create()` trực tiếp vào handler click, không qua `await` nào trước đó (user activation hết hạn sau await) |
| Vượt quota 8KB/item khi user thêm quá nhiều cặp | Thấp | Trung bình | Trần mềm 20 cặp, chặn ở UI kèm giải thích |
| Trạng thái pack sync nhầm sang máy khác | — | — | Đã chặn từ thiết kế: **không lưu** trạng thái pack vào config |
| Widget bắt phím nuốt luôn phím của chính options page | Trung bình | Thấp | Chỉ gắn listener khi ở chế độ bắt; `Escape` thoát; gỡ listener khi rời chế độ |

**Rollback:** revert commit của phase. Config người dùng đã ghi vẫn hợp lệ (`v: 1`) — không cần migrate ngược. Nếu phải đổi schema về sau: `v` tăng lên 2, `config-store.getConfig()` nhận diện `v` cũ và nâng cấp tại chỗ.

## Security Considerations

- **Không** gửi text người dùng đi đâu. Options page chỉ tải model của Chrome, không gọi mạng của ta.
- Chuỗi từ config **luôn** render bằng `textContent`, không bao giờ `innerHTML` — config đồng bộ qua tài khoản Google, coi như dữ liệu không tin cậy.
- Xác thực khi đọc config: `s`/`t` phải nằm trong `language-catalog`; `k` phải parse được; hỏng thì bỏ qua cặp đó và cảnh báo, không sập trang.
- `options_ui.open_in_tab: true` — trang riêng, tránh iframe nhúng bị trang khác dò.
- Không lưu lịch sử dịch (v1 không có tính năng này) → không có dữ liệu nhạy cảm nào nằm trong `storage.sync`.

## Next Steps

- **Bị chặn bởi:** phase 02.
- **Chạy song song với:** phase 04, 05, 06. File ownership: phase này **chỉ** đụng `src/options/**` + `public/options.html`. Không chạm `src/content/**`, `src/background/**`, `src/engine/**`, `src/shared/**`.
- **Mở khoá:** phase 07 (engine cần biết cặp ngôn ngữ nào đã có pack + hình dạng config thật).
- **Bàn giao cho phase 07:** cách đọc `availability()`, tập mã lỗi đã xử lý ở options (dùng lại cùng bộ mã, đừng đặt bộ thứ hai).
