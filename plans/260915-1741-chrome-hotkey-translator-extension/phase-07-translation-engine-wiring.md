---
phase: 7
title: "Translation engine wiring"
status: pending
effort: 3h
---

# Phase 7: Translation engine wiring

## Context Links

- Phụ thuộc: `./phase-01-spike-translator-api-in-isolated-world.md` (**Route A hay B** — quyết định hình dạng toàn bộ phase này), `./phase-02-scaffold-mv3-skeleton.md` (`translate-contract.ts`, `translator-api.d.ts`), `./phase-03-config-storage-and-options-page.md` (schema cặp ngôn ngữ, trạng thái pack)
- Ghép cuối với: phase 05 (`content-entry.ts`, **một dòng**), phase 06 (`onRetryWithPair`)
- Quyết định nền: `../reports/brainstorm-260915-chrome-hotkey-translator.md` § "Báo lỗi rõ ràng, không fallback"

## Overview

- **Priority:** P1
- **Status:** pending (blockedBy: 01, 02, 03)
- **Effort:** 3h (Route A) · **+2h nếu Route B**
- **Mô tả:** Module bọc Translator API: kiểm khả dụng, tái dùng session theo cặp ngôn ngữ, huỷ đúng lúc, và **phân loại lỗi thành thông điệp người đọc hiểu được**. Nối vào tooltip thay dữ liệu giả. Tuyệt đối không có đường ra mạng.

## Key Insights

- **Tái dùng session là khác biệt giữa 300ms và 3s.** `Translator.create()` nạp model vào bộ nhớ. Tạo mới mỗi lần dịch là trả lại toàn bộ chi phí khởi tạo mỗi lần. Cache theo khoá `${src}→${tgt}`.
- **Nhưng session giữ bộ nhớ.** Mỗi session sống là một model nằm trong RAM của tab. Giới hạn cache (đề xuất **3**, LRU) và `destroy()` phần bị đẩy ra. Content script chạy trên **mọi frame của mọi tab** — không giới hạn là ăn RAM tuyến tính theo số tab.
- **`availability()` có bốn giá trị, không phải hai.** `available` · `downloadable` · `downloading` · `unavailable`. Gộp bốn thành "lỗi" là vứt đi thông tin mà người dùng cần: `downloadable` có cách sửa (vào options tải), `unavailable` thì không.
- **Phase này KHÔNG được tải pack.** Tải cần user gesture, và cửa duy nhất có gesture hợp lệ là options page (phase 03). Gặp `downloadable` → chỉ đường sang options, không tự tải.
- **`translateStreaming()` mua được cảm giác nhanh.** Trả `ReadableStream`, chữ hiện dần. Với tiêu chí < 300ms thì token đầu tiên tới sớm hơn hẳn bản dịch đầy đủ. Dùng streaming làm chính, `translate()` làm nhánh lùi.
- **Huỷ phải thật sự huỷ.** User bấm hotkey liên tiếp hoặc đổi chiều giữa chừng → request cũ phải chết, không được về sau đè lên kết quả mới. `AbortSignal` từ phase 05 phải xuyên suốt tới đây.

## Requirements

### Functional

1. `TranslateProvider.translate(text, pair, signal)` → stream hoặc chuỗi, theo contract phase 02.
2. Kiểm `availability()` trước mỗi lần dịch **một cặp chưa có session**; có session rồi thì bỏ qua (đã chắc chắn khả dụng).
3. Cache session: tối đa **3**, LRU, `destroy()` khi bị đẩy ra và khi trang `pagehide`.
4. Phân loại lỗi đầy đủ theo bảng dưới, mỗi loại một thông điệp tiếng Việt + **một** gợi ý hành động.
5. Nối `onRetryWithPair` của tooltip (phase 06) vào provider.
6. Đổi **một dòng** trong `content-entry.ts`: provider no-op → provider thật.
7. **Route B (nếu spike kết luận vậy):** thêm cầu `CustomEvent` hai chiều giữa isolated world và MAIN world.

### Non-functional

- **Zero request mạng.** Không `fetch`, không `XMLHttpRequest`, không `WebSocket`, không `<img>` ngoài. Có ca kiểm riêng ở phase 08.
- Thời gian tới chữ đầu tiên < 300ms khi pack đã sẵn sàng và text < 200 ký tự.
- Mỗi file < 200 dòng.

## Architecture

### Route A — isolated world chạy được (đường mong đợi)

```
content/request-handler.ts  (phase 05)
        │ translate(text, pair, signal)
        ▼
engine/translate-provider.ts
        ├─ availability.ts ── Translator.availability({src,tgt})
        │                      └─ 4 giá trị → available | cần tải | không hỗ trợ
        ├─ session-cache.ts ── Map<"vi→en", Translator>  (LRU, max 3)
        │                      └─ Translator.create({src,tgt})
        └─ translateStreaming(text) ──► chunk ──► tooltip.update(OK, partial)
                                                          (phase 06)
        lỗi bất kỳ ──► errors.ts phân loại ──► tooltip.update(ERROR, msg, gợi ý)
```

### Route B — phải chạy ở MAIN world (nhánh dự phòng, +2h)

```
MAIN world                          isolated world
──────────                          ──────────────
main-world-engine.ts                bridge-isolated.ts
  lắng CustomEvent   ◄──── request ──── gửi CustomEvent
  gọi Translator                        (tên event có nonce phiên)
  gửi CustomEvent    ──── response ──►  khớp theo requestId
```

**Ràng buộc riêng của Route B — ghi rõ vì nó đổi cả mô hình bảo mật:**

| Vấn đề | Hệ quả | Đối phó |
|---|---|---|
| MAIN world chia sẻ global với trang | Trang **đọc được** text đang dịch | Ghi vào docs như giới hạn đã biết. Nonce chỉ chống nhiễu ngẫu nhiên, **không** chống trang cố tình nghe |
| Tên event cố định → trang giả mạo phản hồi | Bơm bản dịch sai | Nonce sinh mỗi lần tải trang: `__tkm_${crypto.randomUUID()}` |
| MAIN world chịu CSP của trang | Vài trang có thể chặn | `content_scripts` khai trong manifest (không bị CSP chặn như inline script), `run_at: document_start` |
| Trang ghi đè `window.Translator` | Kết quả bị điều khiển | Chụp tham chiếu gốc ngay `document_start`, trước script của trang |
| Stream không đi qua `CustomEvent` được | Mất streaming | Route B chuyển sang `translate()` thường, chấp nhận chậm hơn; hoặc gửi chunk thành nhiều event |

### Bảng phân loại lỗi → thông điệp

| Nguyên nhân | Phát hiện bằng | Thông điệp | Gợi ý hành động |
|---|---|---|---|
| Chrome < 138 / không có API | `typeof Translator === 'undefined'` | "Trình duyệt chưa hỗ trợ dịch on-device." | "Cần Chrome 138 trở lên trên máy tính." |
| Cặp chưa tải pack | `availability() === 'downloadable'` | "Chưa tải gói ngôn ngữ VI → EN." | Nút **"Mở cài đặt để tải"** |
| Đang tải | `availability() === 'downloading'` | "Đang tải gói ngôn ngữ, thử lại sau ít phút." | — |
| Cặp không hỗ trợ | `availability() === 'unavailable'` | "Chrome không hỗ trợ dịch VI → KM." | "Chọn cặp ngôn ngữ khác." |
| `create()` ném lỗi | try/catch | "Không khởi tạo được bộ dịch." | "Thử lại, hoặc khởi động lại trình duyệt." |
| `translate()` ném quota | tên lỗi / message | "Đoạn văn vượt giới hạn của bộ dịch." | "Bôi đen đoạn ngắn hơn." |
| Bị huỷ | `signal.aborted` | *(không hiện gì)* | — |
| Không rõ | fallback | "Dịch thất bại." | "Thử lại." |

Mọi thông điệp nằm trong `engine-strings.ts`, tách sẵn cho i18n. **Không** có nhánh nào mở tab ngoài hay gọi API cloud — quyết định "báo lỗi rõ ràng, không fallback" là ràng buộc cứng của phase này.

## Related Code Files

| Đường dẫn tuyệt đối | Thao tác | Dòng ước tính |
|---|---|---|
| `/Users/tgiap.dev/devs/translator/src/engine/translate-provider.ts` | create | ~120 — điểm vào, điều phối |
| `/Users/tgiap.dev/devs/translator/src/engine/session-cache.ts` | create | ~90 — LRU max 3 + destroy |
| `/Users/tgiap.dev/devs/translator/src/engine/availability.ts` | create | ~70 — 4 giá trị → phân loại |
| `/Users/tgiap.dev/devs/translator/src/engine/errors.ts` | create | ~90 — lỗi thô → loại + thông điệp |
| `/Users/tgiap.dev/devs/translator/src/engine/engine-strings.ts` | create | ~45 |
| `/Users/tgiap.dev/devs/translator/src/content/content-entry.ts` | **modify — ĐÚNG MỘT DÒNG** | +1/−1 |
| `/Users/tgiap.dev/devs/translator/tests/errors.test.mjs` | create | ~90 |
| `/Users/tgiap.dev/devs/translator/tests/session-cache.test.mjs` | create | ~80 |

**Chỉ khi Route B:**

| Đường dẫn tuyệt đối | Thao tác | Dòng ước tính |
|---|---|---|
| `/Users/tgiap.dev/devs/translator/src/engine/main-world-engine.ts` | create | ~110 |
| `/Users/tgiap.dev/devs/translator/src/engine/bridge-isolated.ts` | create | ~100 |
| `/Users/tgiap.dev/devs/translator/public/manifest.json` | modify | + khối `content_scripts` world MAIN |
| `/Users/tgiap.dev/devs/translator/build.mjs` | modify | + entry `main-world-engine` |

**Không chạm:** `src/content/tooltip/**` (phase 06), `src/options/**` (phase 03), `src/background/**` (phase 04).

> **Merge point duy nhất của cả plan:** một dòng trong `content-entry.ts`. Thực hiện **sau khi** phase 05 và 06 đã merge.

## Implementation Steps

1. **Đọc kết luận spike trước tiên.** Mở `../reports/spike-01-translator-context-decision.md`. Route A → bỏ qua bước 8. Route B → làm cả bước 8 và cộng 2h.
2. `availability.ts` — `check(pair): 'ready' | 'needs-download' | 'downloading' | 'unsupported' | 'no-api'`. Ánh xạ thẳng 4 giá trị của API + ca `typeof Translator === 'undefined'`.
3. `errors.ts` — `classify(raw: unknown): { kind, message, action? }` theo đúng bảng trên. Hàm thuần, dễ test. Ca `signal.aborted` trả `kind: 'aborted'` để tầng trên biết mà **im lặng**.
4. `session-cache.ts`:
   - `Map` giữ thứ tự chèn → LRU tự nhiên (xoá + chèn lại khi truy cập).
   - `get(pair)`: có thì trả; không thì `Translator.create({sourceLanguage, targetLanguage})`, chèn vào, vượt 3 thì `destroy()` cái cũ nhất.
   - Đăng ký `window.addEventListener('pagehide', destroyAll)` — giải phóng model khi rời trang.
   - `create()` đang chạy dở mà bị gọi lại cùng cặp → trả chung một Promise (chống tạo trùng).
5. `translate-provider.ts`:
   - `translate(text, pair, signal)`:
     a. `signal.aborted` → thoát ngay.
     b. Chưa có session cho cặp → `availability.check()`; không `ready` → ném lỗi đã phân loại.
     c. `sessionCache.get(pair)`.
     d. Có `translateStreaming` → đọc stream, mỗi chunk gọi `onPartial`; kiểm `signal.aborted` mỗi vòng, aborted thì thoát và **không** gọi update nữa.
     e. Không có streaming → `await session.translate(text)`.
   - Bọc toàn bộ trong try/catch → `errors.classify()`.
6. `engine-strings.ts` — toàn bộ thông điệp + gợi ý, một chỗ.
7. **Nối dây:**
   - `content-entry.ts`: đổi `createNoopProvider()` → `createTranslateProvider()`. Một dòng.
   - Nối `tooltipController.callbacks.onRetryWithPair` → gọi lại `requestHandler` với cặp mới và `sourceText` đã giữ.
   - Gợi ý "Mở cài đặt để tải": tooltip gửi message `OPEN_OPTIONS` cho service worker (phase 04 đã có lệnh này) — content script **không** tự mở tab được.
8. **CHỈ Route B:**
   - `main-world-engine.ts`: chạy `document_start`, chụp `const T = window.Translator` ngay lập tức. Lắng `CustomEvent` tên `__tkm_<nonce>_req`, xử lý, trả `__tkm_<nonce>_res` kèm `requestId`.
   - `bridge-isolated.ts`: cùng API như `translate-provider` để tầng trên không biết mình đang ở route nào; bên trong thì gửi/nhận CustomEvent, có timeout 10s cho mỗi request.
   - Nonce sinh ở `document_start` và truyền sang MAIN world qua thuộc tính `data-*` trên `<html>`, xoá ngay sau khi đọc.
   - Cập nhật manifest + `build.mjs`.
   - **Ghi vào `docs/` giới hạn quyền riêng tư của Route B** — trang đọc được text đang dịch. Đây là thay đổi mô hình bảo mật, phải công bố.
9. `tests/errors.test.mjs` + `tests/session-cache.test.mjs` với `Translator` giả.
10. Đo thời gian tới chữ đầu tiên trên 20 lần dịch, ghi số vào phase 08.

## Todo List

- [ ] Đọc `reports/spike-01-translator-context-decision.md`, xác định Route
- [ ] `availability.ts` — 4 giá trị + ca không có API
- [ ] `errors.ts` — bảng phân loại đầy đủ, ca `aborted` im lặng
- [ ] `session-cache.ts` — LRU max 3, destroy, chống tạo trùng
- [ ] `pagehide` → `destroyAll()`
- [ ] `translate-provider.ts` — streaming + nhánh lùi + kiểm abort mỗi chunk
- [ ] `engine-strings.ts`
- [ ] Đổi một dòng trong `content-entry.ts`
- [ ] Nối `onRetryWithPair`
- [ ] Nút "Mở cài đặt để tải" → message `OPEN_OPTIONS`
- [ ] **Route B:** `main-world-engine.ts` + `bridge-isolated.ts` + nonce + manifest + build
- [ ] **Route B:** ghi giới hạn quyền riêng tư vào `docs/`
- [ ] `tests/errors.test.mjs`, `tests/session-cache.test.mjs`
- [ ] Đo thời gian tới chữ đầu tiên (20 lần)

## Success Criteria

- [ ] Bôi đen một câu + hotkey → bản dịch hiện trong tooltip. Đường đi đầu-cuối chạy thật.
- [ ] Thời gian tới **chữ đầu tiên** < 300ms với text < 200 ký tự, pack sẵn sàng (trung vị của 20 lần).
- [ ] Dịch cặp **chưa tải pack** → thông điệp "Chưa tải gói ngôn ngữ VI → EN" + nút mở cài đặt, và nút đó mở đúng options page.
- [ ] Dịch cặp `unavailable` → thông điệp nói **không hỗ trợ**, khác hẳn thông điệp chưa tải.
- [ ] Bấm hotkey 5 lần liên tiếp rất nhanh → chỉ kết quả **cuối cùng** hiện; không có kết quả cũ đè lên.
- [ ] Bấm ⇄ giữa lúc đang dịch → request cũ bị huỷ, kết quả cặp mới hiện đúng.
- [ ] Dịch 4 cặp khác nhau liên tiếp → cache giữ đúng 3, cái thứ 4 đẩy cái cũ nhất ra (kiểm bằng log `destroy`).
- [ ] **DevTools → Network trống hoàn toàn** trong suốt phiên dịch. Không một request nào.
- [ ] Rời trang → `destroyAll()` chạy (log xác nhận).
- [ ] Cả hai file test xanh.
- [ ] Mọi file < 200 dòng.
- [ ] **Route B (nếu có):** trang cố tình bắn `CustomEvent` giả với `requestId` sai → bị bỏ qua.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Chặn thế nào |
|---|---|---|---|
| Route B kích hoạt → +2h và đổi mô hình bảo mật | Trung bình | **Cao** | Spike phase 01 trả lời sớm; nhánh B đã đặc tả đầy đủ ở đây nên không phải thiết kế lại giữa chừng |
| Session cache ăn RAM theo số tab | Trung bình | Cao | Max 3/frame + `destroy()` + `pagehide` |
| Kết quả cũ về sau đè kết quả mới | **Cao** nếu không xử lý | Trung bình | `AbortSignal` xuyên suốt + kiểm `aborted` mỗi chunk |
| `translateStreaming` không có hoặc lỗi | Trung bình | Thấp | Nhánh lùi `translate()` thường |
| Lỗi thô của API đổi hình dạng giữa các bản Chrome | Trung bình | Trung bình | `classify()` có nhánh fallback "Dịch thất bại"; không parse chuỗi lỗi cứng nhắc |
| Tạo session trùng khi bấm phím dồn | Trung bình | Thấp | Chia sẻ Promise đang chạy |
| Lỡ tay thêm `fetch` khi debug | Thấp | **Cao** — phá cam kết cốt lõi | Ca kiểm Network trống ở phase 08; grep `fetch\|XMLHttpRequest` trong CI |

**Rollback:** revert commit + hoàn lại một dòng trong `content-entry.ts` về provider no-op. Phase 05 và 06 vẫn chạy với dữ liệu giả.

## Security Considerations

- **Zero mạng là ràng buộc cứng**, không phải mục tiêu. Grep `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon` trong `src/` phải trống.
- Text người dùng **không** đi qua service worker, **không** vào `chrome.storage`, **không** ghi log ở bản phát hành.
- Không có API key nào tồn tại trong dự án → không có gì để rò.
- **Route A:** isolated world, trang không chạm được vào text.
- **Route B:** MAIN world chia sẻ global với trang → **trang về nguyên tắc đọc được text đang dịch**. Nonce chống nhiễu, không chống nghe lén chủ đích. Nếu Route B kích hoạt, phải ghi rõ giới hạn này trong `docs/` và trong mô tả extension. Đây là lý do Route A được ưu tiên.
- Thông điệp lỗi không nhả chi tiết nội bộ (stack, đường dẫn file) ra giao diện.

## Next Steps

- **Bị chặn bởi:** phase 01 (route), 02 (contract), 03 (schema + trạng thái pack).
- **Bước 1–6 chạy song song được** với 05/06. **Bước 7 (nối dây) phải chờ** 05 và 06 merge xong.
- **Mở khoá:** phase 08.
- **Nợ kỹ thuật ghi nhận:** nếu Route B, mục "giới hạn quyền riêng tư" phải vào `docs/` trước khi tính chuyện đưa lên Chrome Web Store.
