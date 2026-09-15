---
phase: 5
title: "Content script input layer"
status: completed
effort: 3h
---

# Phase 5: Content script input layer

## Context Links

- Phụ thuộc: `./phase-02-scaffold-mv3-skeleton.md` (contract `messages.ts`, `hotkey-codec.ts`, `config-store.ts`)
- Song song với: phase 03, 04, 06
- Đường vào từ: phase 04 (`TRANSLATE_SELECTION`)
- Đường ra tới: phase 06 (`tooltip-controller.show`) và phase 07 (`TranslateProvider`)
- Báo cáo nền: `../reports/brainstorm-260915-chrome-hotkey-translator.md` § Rủi ro hàng 2 và 3

## Overview

- **Priority:** P1
- **Status:** pending (blockedBy: 02)
- **Effort:** 3h
- **Mô tả:** Lớp đầu vào trong trang: bắt keydown ở **capture phase** cho cặp động, nhận message từ service worker cho cặp tĩnh, đọc `Selection`/`Range`, áp các quy tắc bảo vệ, rồi giao `{text, rect}` cho tooltip.

## Key Insights

- **Capture phase là bắt buộc.** Gmail, Google Docs, Notion đều gắn listener `keydown` ở bubble phase và `preventDefault` rất nhiều phím. Lắng ở capture (`addEventListener('keydown', h, true)` trên `window`) là cách duy nhất thấy sự kiện trước trang.
- **Nhưng capture phase là con dao hai lưỡi.** Bắt sai là ta cướp phím của trang. Nên: chỉ `preventDefault()` + `stopPropagation()` **sau khi** đã khớp một hotkey đã cấu hình. Không khớp thì im lặng tuyệt đối, không đụng gì vào sự kiện.
- **`all_frames: true` nghĩa là N bản độc lập.** Mỗi frame có `Selection` riêng, `document` riêng, tooltip riêng. Không chia sẻ state giữa các frame — và cũng không cần. Frame nào có selection + đang focus thì frame đó làm việc.
- **`event.code` chứ không `event.key`.** `key` đổi theo layout bàn phím và theo IME (gõ tiếng Việt Telex làm `key` ra ký tự lạ). `code` gắn với vị trí phím vật lý, ổn định.
- **`event.isComposing` phải bỏ qua.** Bộ gõ tiếng Việt (Unikey, bộ gõ macOS) tạo chuỗi keydown trong lúc soạn. Xử lý chúng là sinh hành vi ngẫu nhiên.
- **Selection trong ô nhập liệu là loại khác.** `window.getSelection()` **không** trả text đang bôi đen trong `<input>`/`<textarea>` — phải đọc `el.value.slice(el.selectionStart, el.selectionEnd)`, và `rect` phải lấy từ `el.getBoundingClientRect()` (không có `Range` cho nội dung input).

## Requirements

### Functional

1. Nhận hai đường vào, cùng đổ về một hàm xử lý:
   - `chrome.runtime.onMessage` với `TRANSLATE_SELECTION` (từ phase 04).
   - `keydown` capture khớp `pair.k` của cặp động.
2. Quy tắc bảo vệ ô nhập liệu: con trỏ đang ở `<input>` / `<textarea>` / `[contenteditable]` → **bỏ qua** hotkey, **trừ khi** tổ hợp có **≥2 modifier**.
3. Đọc selection theo 3 nguồn, theo thứ tự: ô nhập liệu đang focus → `window.getSelection()` → không có gì thì trả `NO_SELECTION`.
4. Ngưỡng ký tự: quá `cfg.max` (mặc định **2000**) → hiện **cảnh báo** trong tooltip, **không** cắt, **không** dịch.
5. Guard `document.hasFocus()`: chỉ frame đang focus mới xử lý message broadcast từ service worker.
6. Đường keydown: chỉ `preventDefault` khi đã khớp hotkey.
7. Bỏ qua: `event.repeat`, `event.isComposing`, sự kiện phát từ trong Shadow DOM của tooltip mình.
8. Có cặp khớp → gọi `tooltipController.show(rect, { state: 'PENDING' })` rồi gọi `provider.translate(...)`.

### Non-functional

- Bundle content script càng nhỏ càng tốt — nó nạp vào **mọi frame của mọi trang**. Mục tiêu < 25KB sau minify (gồm cả tooltip của phase 06).
- Chi phí lúc nghỉ ≈ 0: **một** listener `keydown` cho mỗi frame. Không `MutationObserver`, không polling.
- Mỗi module < 200 dòng.

## Architecture

```
       ┌── chrome.runtime.onMessage (từ SW) ──┐
       │     guard: document.hasFocus()       │
       │                                      ▼
window keydown (capture) ──► hotkey-listener ──► handleTranslateRequest(pair)
       guard: repeat / isComposing                    │
       guard: trong tooltip của mình                  │
       guard: ô nhập liệu && modifier < 2             ▼
                                            selection-reader.read()
                                              ├─ input/textarea đang focus
                                              │    → value.slice(selStart, selEnd)
                                              │    → rect = el.getBoundingClientRect()
                                              ├─ window.getSelection().rangeCount > 0
                                              │    → range.toString()
                                              │    → rect = range.getBoundingClientRect()
                                              └─ không có → NO_SELECTION
                                                       │
                                            ┌──────────┴──────────┐
                                     len > cfg.max          hợp lệ
                                            │                    │
                                   tooltip.show(TOO_LONG)  tooltip.show(PENDING)
                                                                 │
                                                        provider.translate(...)   ← phase 07
                                                                 │
                                                        tooltip.update(OK | ERR)
```

### Bảng quy tắc bảo vệ

| Điều kiện | Hành động | Vì sao |
|---|---|---|
| `event.repeat` | bỏ qua | Giữ phím không được bắn nhiều lần dịch |
| `event.isComposing` \|\| `keyCode === 229` | bỏ qua | IME tiếng Việt/Nhật đang soạn |
| Chỉ bấm modifier trơ | bỏ qua | Chưa phải tổ hợp |
| `target` nằm trong host tooltip của mình | bỏ qua | Không tự kích lại chính mình |
| Ô nhập liệu **và** số modifier < 2 | bỏ qua | Chặn rủi ro "Cao" — đụng phím Gmail/Docs/Notion |
| Ô nhập liệu **và** số modifier ≥ 2 | xử lý | Tổ hợp hiếm, khả năng trang chiếm dụng rất thấp |
| Ngoài ô nhập liệu, khớp hotkey | xử lý + `preventDefault` + `stopPropagation` | Đã là phím của ta |
| Không khớp hotkey nào | **không đụng sự kiện** | Cướp phím của trang là lỗi tệ nhất lớp này gây ra |

Đếm modifier: `[ctrlKey, altKey, shiftKey, metaKey].filter(Boolean).length`.

### Ngưỡng ký tự — chọn 2000, vì sao

| Cân nhắc | Số liệu |
|---|---|
| Tooltip đọc được | ~2000 ký tự ≈ 300 từ ≈ một hộp cao 400px sau khi cuộn. Hơn nữa thì tooltip không còn là tooltip |
| Ngân sách độ trễ | Tiêu chí #1 đòi < 300ms. Dịch on-device tuyến tính theo độ dài; 2000 ký tự là ranh giới thực tế giữ được mốc đó |
| Hạn mức đầu vào Translator | API có input quota; đoạn quá dài ném lỗi quota — thà chặn trước với thông điệp rõ còn hơn nhận lỗi khó hiểu |
| Chống tai nạn | `Ctrl+A` rồi bấm hotkey là thao tác nhầm rất hay gặp; ngưỡng biến nó thành cảnh báo thay vì treo máy |

Cho chỉnh trong config (`cfg.max`) nhưng mặc định 2000. **Cảnh báo, không âm thầm cắt** — cắt giữa câu sinh bản dịch sai mà người dùng không biết. Thông điệp phải nêu số thật: "Đoạn dài 5.240 ký tự, vượt mức 2.000. Hãy bôi đen đoạn ngắn hơn."

### Giới hạn đã biết — ghi rõ để phase 07 viết thông điệp lỗi

| Nơi | Triệu chứng | Nguyên nhân | Đối phó |
|---|---|---|---|
| `chrome://*`, Chrome Web Store | Không gì xảy ra | Content script bị chặn theo chính sách | Badge `×` từ phase 04 (đường lệnh tĩnh). Đường keydown **không** báo được gì — không có script để báo |
| Chrome PDF viewer | Không gì xảy ra | PDF render trong extension nội bộ, không inject được | Như trên |
| `file://` | Không gì xảy ra | Cần bật "Allow access to file URLs" thủ công | Ghi trong options page phần trợ giúp |
| Gmail compose | Có thể không bắt được phím | Compose là iframe (thường same-origin → `all_frames` phủ được), nhưng Gmail chiếm nhiều tổ hợp | Quy tắc ≥2 modifier; khuyên user chọn `Ctrl+Shift+<chữ>` |
| Cross-origin iframe | Tooltip hiện trong frame, có thể bị cắt ở mép frame | Frame không vẽ ra ngoài biên của nó | Chấp nhận ở v1; phase 06 kẹp tooltip theo viewport **của frame** |
| Shadow DOM `closed` của trang | `getSelection()` không xuyên qua | Giới hạn nền tảng | Chấp nhận; báo `NO_SELECTION` |

## Related Code Files

| Đường dẫn tuyệt đối | Thao tác | Dòng ước tính |
|---|---|---|
| `/Users/tgiap.dev/devs/translator/src/content/content-entry.ts` | modify (phase 02 tạo tối thiểu) | ~90 — lắp ráp + đăng ký listener |
| `/Users/tgiap.dev/devs/translator/src/content/hotkey-listener.ts` | create | ~120 |
| `/Users/tgiap.dev/devs/translator/src/content/selection-reader.ts` | create | ~110 |
| `/Users/tgiap.dev/devs/translator/src/content/input-guard.ts` | create | ~70 — hàm thuần: có phải ô nhập liệu, đếm modifier |
| `/Users/tgiap.dev/devs/translator/src/content/request-handler.ts` | create | ~100 — hợp nhất hai đường vào |
| `/Users/tgiap.dev/devs/translator/src/content/content-strings.ts` | create | ~30 |
| `/Users/tgiap.dev/devs/translator/tests/input-guard.test.mjs` | create | ~80 |

**Đọc, KHÔNG sửa:** `src/shared/**`.
**Không chạm:** `src/content/tooltip/**` (phase 06 sở hữu) — phase này gọi qua interface, dùng bản no-op cho tới khi 06 merge.

> **Điểm giao nhau có chủ đích:** phase 07 sẽ sửa **đúng một dòng** trong `content-entry.ts` (đổi provider no-op sang provider thật). Đây là merge point duy nhất của toàn plan và nó chỉ có một dòng. Phase 07 thực hiện nó **sau khi** phase 05 merge.

## Implementation Steps

1. `input-guard.ts` — hàm thuần, không đụng `window`:
   - `isEditable(el: Element | null): boolean` — tag `INPUT` (loại các `type` không phải text: checkbox/radio/range/color/file), `TEXTAREA`, hoặc `el.closest('[contenteditable=""],[contenteditable="true"]')`.
   - `modifierCount(e: KeyboardEvent): number`.
   - `shouldIgnore(e, activeEl): boolean` theo đúng bảng quy tắc bảo vệ.
2. `selection-reader.ts` — `read(): { text, rect } | { error: 'NO_SELECTION' }`:
   - Nhánh ô nhập liệu: `document.activeElement` là input/textarea và `selectionStart !== selectionEnd` → cắt từ `value`; rect lấy từ phần tử.
   - Nhánh Range: `getSelection()`, bỏ khi `isCollapsed`, `range.toString().trim()`, rect từ `range.getBoundingClientRect()`.
   - `rect` rỗng (width=0 và height=0, hay gặp khi selection nằm trong phần tử ẩn) → dựa vào `range.getClientRects()[0]`, vẫn không có thì `NO_SELECTION`.
   - Trả `text` đã `trim()`; rỗng → `NO_SELECTION`.
3. `hotkey-listener.ts`:
   - Nạp config một lần lúc khởi động, đăng ký `onConfigChanged` để làm mới. Giữ trong biến module là **được** ở đây — content script sống theo vòng đời trang, không bị terminate như service worker.
   - `window.addEventListener('keydown', h, { capture: true })`.
   - Trong handler: chạy guard → `hotkeyCodec.fromEvent(e)` → tìm pair có `k` trùng → khớp thì `preventDefault()` + `stopPropagation()` + gọi `requestHandler`.
4. `request-handler.ts`:
   - `handle({ pair, origin })`: gọi `selection-reader`; `NO_SELECTION` → nếu `origin === 'command'` thì hiện tooltip lỗi ngắn ở giữa viewport, nếu `origin === 'hotkey'` thì im lặng (tránh nhiễu).
   - Kiểm ngưỡng `cfg.max` → `TOO_LONG` với số thật.
   - Gọi `tooltip.show(rect, PENDING)` rồi `provider.translate(...)` với `AbortController`.
   - Request mới huỷ request cũ (`abort()`), tránh kết quả cũ về sau đè kết quả mới.
5. `content-entry.ts`:
   - Đăng ký `chrome.runtime.onMessage`: kiểm `sender.id === chrome.runtime.id`, kiểm `msg.type`, kiểm `document.hasFocus()` → không focus thì `sendResponse({handled:false, reason:'NO_FOCUS'})` và dừng.
   - Khởi tạo `hotkey-listener`, `tooltip-controller`, `provider` (no-op ở phase này).
6. `content-strings.ts`: gom chuỗi `NO_SELECTION`, `TOO_LONG`.
7. `tests/input-guard.test.mjs`: phủ ma trận `isEditable` × `modifierCount` bằng object giả hình dạng `KeyboardEvent` (hàm thuần nên không cần DOM thật).
8. Kiểm thủ công theo bảng "Giới hạn đã biết".

## Todo List

- [ ] `input-guard.ts` — hàm thuần
- [ ] `selection-reader.ts` — 3 nhánh + xử lý rect rỗng
- [ ] `hotkey-listener.ts` — capture phase + làm mới config
- [ ] `request-handler.ts` — hợp nhất 2 đường vào + AbortController
- [ ] `content-entry.ts` — onMessage guard (`sender.id`, `hasFocus`)
- [ ] Ngưỡng 2000 ký tự + thông điệp có số thật
- [ ] `content-strings.ts`
- [ ] `tests/input-guard.test.mjs`
- [ ] Kiểm: bôi đen ngoài ô nhập liệu → chạy
- [ ] Kiểm: trong ô nhập liệu 1 modifier → bỏ qua; 2 modifier → chạy
- [ ] Kiểm: gõ tiếng Việt bằng IME → không kích nhầm
- [ ] Kiểm: trong iframe cross-origin → frame đó tự xử lý
- [ ] Kiểm: `Ctrl+A` trên trang dài → cảnh báo TOO_LONG, không treo

## Success Criteria

- [ ] Bôi đen một câu trên trang thường + bấm hotkey động → `request-handler` nhận đúng text và rect (đo bằng log).
- [ ] Bôi đen trong `<textarea>` + tổ hợp 1 modifier → **không** phản ứng; cùng vị trí với 2 modifier → phản ứng.
- [ ] Gõ tiếng Việt (Telex) trong Gmail compose → không lần nào kích nhầm hotkey.
- [ ] Bôi đen trong cross-origin iframe → frame con xử lý (log có `window.top !== window`).
- [ ] `Ctrl+A` trên trang > 2000 ký tự → cảnh báo nêu **số ký tự thật**, trang không đơ.
- [ ] Bấm tổ hợp **chưa** cấu hình → trang nhận phím bình thường (kiểm trên Google Docs: `Ctrl+B` vẫn in đậm).
- [ ] Message từ SW tới nhiều frame → **đúng một** frame xử lý (frame đang focus).
- [ ] `node --test tests/input-guard.test.mjs` xanh.
- [ ] Mọi file < 200 dòng.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Chặn thế nào |
|---|---|---|---|
| Cướp phím của trang (Gmail/Docs/Notion) | **Cao** | **Cao** — user bỏ extension ngay | Capture phase + chỉ `preventDefault` khi đã khớp; quy tắc ≥2 modifier trong ô nhập liệu; danh sách cấm ở phase 03 |
| IME tiếng Việt kích nhầm hotkey | Trung bình | Cao — hỏng trải nghiệm gõ | `isComposing` + `keyCode === 229`; dùng `event.code` |
| Nhiều frame cùng xử lý một message → nhiều tooltip | Trung bình | Trung bình | Guard `document.hasFocus()` + selection không rỗng |
| `getBoundingClientRect()` trả rect rỗng | Trung bình | Trung bình — tooltip hiện sai chỗ | Lùi về `getClientRects()[0]`; vẫn không có → `NO_SELECTION` |
| Listener capture làm chậm trang gõ nhiều | Thấp | Trung bình | Handler thoát sớm: kiểm `repeat`/`isComposing` trước, chưa đụng config |
| Selection trong Shadow DOM closed của trang | Trung bình | Thấp | Giới hạn nền tảng; báo `NO_SELECTION`, ghi vào docs |
| Nhiều request chồng nhau, kết quả cũ về sau | Trung bình | Trung bình | `AbortController`, request mới huỷ cũ |

**Rollback:** revert commit. Đường lệnh tĩnh (phase 04) vẫn tới content script nhưng không có ai xử lý → về trạng thái phase 02. Không mất dữ liệu người dùng.

## Security Considerations

- `chrome.runtime.onMessage` **bắt buộc** kiểm `sender.id === chrome.runtime.id`. Không kiểm là extension khác gọi vào được.
- Text bôi đen **không** log ra console ở bản phát hành. Lúc dev thì che bớt (chỉ in độ dài + 20 ký tự đầu).
- Text đi thẳng từ `Selection` sang `Translator` — **không** qua service worker, **không** qua `storage`, **không** ra mạng.
- Content script chạy ở isolated world → trang không đọc được biến của ta (trừ khi Route B — xem cảnh báo quyền riêng tư ở phase 01).
- Không gán gì lên `window` của trang. Không `postMessage` ra ngoài.
- Không tin `pair.k` từ config: `hotkeyCodec.parse` fail → bỏ qua cặp đó, không ném lỗi vào keydown handler (ném ở đó là phá trang).

## Next Steps

- **Bị chặn bởi:** phase 02.
- **Chạy song song với:** phase 03, 04, 06. File ownership: phase này **chỉ** đụng `src/content/*.ts` ở mức thư mục gốc. **Không** vào `src/content/tooltip/**`.
- **Ghép với phase 06:** gọi qua interface `TooltipController` (khai trong `src/shared/translate-contract.ts`). Cho tới khi 06 merge, dùng bản no-op ghi log.
- **Ghép với phase 07:** phase 07 sửa **một dòng** ở `content-entry.ts` để đổi provider. Không sửa gì khác.
- **Mở khoá:** phase 08.
