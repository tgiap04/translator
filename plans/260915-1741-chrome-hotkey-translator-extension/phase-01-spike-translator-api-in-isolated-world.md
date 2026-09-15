---
phase: 1
title: "Spike Translator API in isolated world"
status: pending
effort: 1h
---

# Phase 1: Spike Translator API in isolated world

## Context Links

- Nguồn sự thật: `/Users/tgiap.dev/devs/translator/plans/260915-1741-chrome-hotkey-translator-extension/reports/brainstorm-260915-chrome-hotkey-translator.md` — mục "Giả định lớn nhất"
- Đầu ra bắt buộc: `/Users/tgiap.dev/devs/translator/plans/260915-1741-chrome-hotkey-translator-extension/reports/spike-01-translator-context-decision.md`
- Phase kế: `./phase-02-scaffold-mv3-skeleton.md`

## Overview

- **Priority:** P0 — **CHẶN TẤT CẢ**. Không phase nào khởi động trước khi phase này ra kết quả.
- **Status:** pending
- **Effort:** 1h (timebox cứng)
- **Mô tả:** Trả lời dứt điểm một câu hỏi: `Translator` có tồn tại và dùng được trong **isolated world** của content script không? Tài liệu Chrome chỉ nói "top-level window và same-origin iframe", không nói gì về isolated world. Cả kiến trúc ba lớp đang tựa lên giả định này.

## Key Insights

- Đây là **spike**, không phải sản phẩm. Code viết ra là code vứt đi (throwaway), **không** đưa vào `src/`. Đặt riêng tại `spike/`.
- Isolated world dùng chung DOM với trang nhưng **khác JS realm**. Một số Web API gắn với realm có thể không được expose sang isolated world. Đây chính là điều chưa ai xác nhận.
- Translator API có khả năng phụ thuộc **secure context** và **top-level document**. Cross-origin iframe có thể fail kể cả khi Route A chạy được ở top frame — phải đo riêng.
- `Translator.create()` **yêu cầu user activation khi phải tải model**. Trong spike, nếu `availability()` trả `downloadable`, tải pack một lần qua trang options thủ công (hoặc bất kỳ trang nào có click) rồi đo lại — nếu không sẽ nhầm "không dùng được" với "chưa tải pack".
- Kết quả spike quyết định **hình dạng manifest** (phase 02) và **vị trí module engine** (phase 07). Đó là lý do nó chặn tất cả.

## Requirements

### Functional

- Extension tối thiểu: **chỉ** `manifest.json` + 1 content script. Không build step, không TypeScript, không bundler — JS thuần, load unpacked chạy ngay.
- Content script log ra console bốn phép đo, theo đúng thứ tự:
  1. `typeof Translator` và `typeof self.Translator`
  2. `await Translator.availability({ sourceLanguage: 'vi', targetLanguage: 'en' })`
  3. `await Translator.create({ sourceLanguage: 'vi', targetLanguage: 'en' })`
  4. `await session.translate('Xin chào thế giới')`
- Mỗi phép đo bọc try/catch riêng, log cả `err.name` + `err.message` — thông điệp lỗi chính là dữ liệu quyết định.
- Ghi thêm: `navigator.userAgent` (chốt version Chrome), `window.top === window` (top-level hay iframe), `location.origin`, `isSecureContext`.

### Non-functional

- Toàn bộ spike hoàn tất trong **1 giờ**.
- Log phải **copy nguyên văn** vào file quyết định — không tóm tắt, không diễn giải lại.

## Architecture

```
spike/
├── manifest.json          # MV3, content_scripts matches <all_urls>, all_frames: true, run_at: document_idle
└── probe-translator.js    # ~60 dòng, 4 phép đo + dump context
```

Luồng dữ liệu (một chiều, không có gì phức tạp):

```
trang web tải xong
   → content script (isolated world) chạy
      → đo typeof Translator
      → đo availability()
      → đo create()  ──(nếu 'downloadable' và không có gesture)──> lỗi NotAllowedError (dự kiến)
      → đo translate()
   → console.table(kết quả) + window.__SPIKE_RESULT = kết quả
```

`window.__SPIKE_RESULT` đặt ở isolated world để tự đọc lại từ DevTools console (nhớ chuyển context selector sang extension).

## Related Code Files

| Đường dẫn tuyệt đối | Thao tác | Ghi chú |
|---|---|---|
| `/Users/tgiap.dev/devs/translator/spike/manifest.json` | create | MV3 tối thiểu, ~15 dòng |
| `/Users/tgiap.dev/devs/translator/spike/probe-translator.js` | create | ~60 dòng, JS thuần |
| `/Users/tgiap.dev/devs/translator/spike/probe-main-world.js` | create | Chỉ tạo nếu Route A fail — dùng thử Route B |
| `/Users/tgiap.dev/devs/translator/plans/.../reports/spike-01-translator-context-decision.md` | create | **Đầu ra bắt buộc** |

Thư mục `spike/` **không** đi vào bản phát hành. Phase 02 thêm nó vào `.gitignore` hoặc giữ lại làm chứng cứ — tuỳ, nhưng không bundle.

## Implementation Steps

1. **Chốt version Chrome trước tiên.** Mở `chrome://version`. Nếu < 138 → dừng ngay, không đo được gì, báo user cập nhật. Ghi version vào file quyết định.
2. Tạo `spike/manifest.json`:
   ```json
   { "manifest_version": 3, "name": "Spike Translator Probe", "version": "0.0.1",
     "content_scripts": [{ "matches": ["<all_urls>"], "all_frames": true,
       "js": ["probe-translator.js"], "run_at": "document_idle" }] }
   ```
3. Tạo `spike/probe-translator.js` — 4 phép đo, mỗi phép một try/catch, kết quả gom vào một object rồi `console.table`. Prefix mọi log bằng `[SPIKE]` để lọc dễ.
4. Load unpacked `spike/` tại `chrome://extensions` (bật Developer mode).
5. **Chạy lần lượt trên 5 nhóm trang** (bảng dưới). Với mỗi trang: mở DevTools → Console → đổi context selector sang "Spike Translator Probe" → copy nguyên log.
6. Nếu bước 2 trả `downloadable`: mở một trang bất kỳ, chạy `Translator.create(...)` từ console **trang** (có user activation) để tải pack, đợi xong, rồi **đo lại toàn bộ 5 nhóm trang**. Không bỏ qua bước này — nó phân biệt "isolated world không có API" với "pack chưa tải".
7. Nếu `typeof Translator === 'undefined'` ở **mọi** trang → chuyển sang thử **Route B** (mục dưới), vẫn trong timebox.
8. Viết `reports/spike-01-translator-context-decision.md` theo khung ở mục "Success Criteria".
9. **Nếu hết 1 giờ mà chưa kết luận được:** DỪNG. Ghi lại những gì đã đo được, báo user, **không tự ý chọn route**.

### Ma trận trang phải thử (tối thiểu 5 nhóm)

| # | Nhóm | Trang cụ thể | Đang kiểm điều gì |
|---|---|---|---|
| 1 | Trang tĩnh thường | `https://example.com` | Đường cơ sở (baseline). Chạy được ở đây mà thôi thì chưa đủ |
| 2 | CSP nghiêm ngặt | `https://github.com` | CSP trang có chặn isolated world không (về lý thuyết là không — cần bằng chứng) |
| 3 | SPA nặng | `https://notion.so` hoặc `https://mail.google.com` | Trang can thiệp global, service worker riêng, DOM động |
| 4 | Iframe cross-origin | `https://www.w3schools.com/html/html_iframe.asp` hoặc trang tự dựng có `<iframe src="https://example.com">` | Đo riêng trong frame con: `window.top !== window` |
| 5 | Trang hạn chế | `chrome://extensions`, một file PDF (`file:///…pdf` hoặc PDF online), Chrome Web Store | **Xác nhận giới hạn đã biết** — content script không chạy. Đây là dữ liệu cho thông báo lỗi phase 07 |

Kỳ vọng nhóm 5: **không có log nào cả**. Ghi lại đúng như vậy — sự im lặng chính là kết quả.

### Route B — Plan B đầy đủ (chỉ dựng nếu Route A fail)

Nếu `Translator` không có trong isolated world, chạy engine ở **MAIN world** rồi bắc cầu.

**Cách inject.** Hai đường, chọn một:

| Đường | Cách làm | Ưu | Nhược |
|---|---|---|---|
| B1 — khai báo tĩnh | `content_scripts` thêm một mục thứ hai `"world": "MAIN"` trong manifest | Chạy sớm, không cần `scripting` permission, không có race | Không truyền được tham số động vào script |
| B2 — inject động | `chrome.scripting.executeScript({ world: 'MAIN', target: { tabId, allFrames: true }, files: [...] })` từ service worker | Truyền được tham số, inject theo yêu cầu | Cần permission `scripting`; có race "bridge chưa sẵn sàng"; SW phải biết tabId |

**Khuyến nghị: B1.** Đơn giản hơn, không có race, giữ service worker đúng vai trò router thuần.

**Bắc cầu hai chiều bằng `CustomEvent`:**

```
isolated world                         MAIN world
──────────────                         ──────────
dispatchEvent(new CustomEvent(
  `${PFX}:req`, {detail:{id, text, src, tgt}}))
                          ──────────>  addEventListener(`${PFX}:req`)
                                          → Translator.create/translate
addEventListener(`${PFX}:res`)  <──────  dispatchEvent(new CustomEvent(
  → resolve promise theo id                 `${PFX}:res`, {detail:{id, ok, result|error}}))
```

- Mỗi request mang `id` tăng dần; isolated world giữ `Map<id, {resolve, reject}>`; timeout 10 giây thì reject.
- `detail` chỉ chứa dữ liệu structured-clonable (string/number/plain object). Không truyền hàm, không truyền session object.

**Cảnh báo bắt buộc ghi vào file quyết định:**

1. **MAIN world chịu CSP của trang.** Script inject vào MAIN world phải vượt qua CSP của trang chủ nhà. File-based injection (`"js": [...]`) thường qua được vì có `chrome-extension://` origin, nhưng CSP `script-src` cực gắt vẫn có thể chặn — **phải đo lại nhóm trang #2 (github.com) với Route B**.
2. **Biến toàn cục có thể bị trang can thiệp.** Trang có thể ghi đè `Translator`, ghi đè `CustomEvent`, hoặc nghe trộm event của ta. Chống:
   - Tiền tố event **ngẫu nhiên theo phiên**: `const PFX = 'tx_' + crypto.randomUUID().slice(0, 8)` — sinh ở isolated world rồi truyền sang MAIN world qua một thuộc tính DOM data (`document.documentElement.dataset[...]`), đọc xong **xoá ngay**.
   - MAIN world chụp tham chiếu gốc **ngay khi khởi động**, trước khi trang kịp sửa: `const T = globalThis.Translator; const CE = globalThis.CustomEvent;`
   - Không tin dữ liệu từ MAIN world: kiểm `typeof detail.result === 'string'` trước khi render.
3. **Rò rỉ nội dung.** Text bôi đen đi qua MAIN world → trang **đọc được** nội dung người dùng đang dịch. Với v1 nội bộ thì chấp nhận được, nhưng phải ghi rõ và hiện cảnh báo trong options page nếu Route B được chọn.

**Nếu Route B thì phase 02 và 07 phải điều chỉnh gì — ghi rõ:**

| Phase | Điều chỉnh khi Route B |
|---|---|
| 02 | `manifest.json` thêm mục `content_scripts` thứ hai với `"world": "MAIN"`, `all_frames: true`, `run_at: document_start` (phải sớm hơn trang). `build.mjs` thêm entry thứ tư `main-world-engine`. `web_accessible_resources` **không** cần (file-based injection không cần). Effort +0.5h |
| 07 | Module engine tách đôi: `src/engine/main-world-engine.ts` (chạy MAIN world, gọi Translator thật) + `src/engine/isolated-bridge.ts` (proxy promise theo id). `translate-service.ts` giữ nguyên interface `TranslateProvider` — **contract không đổi**, chỉ đổi implementation bên dưới. Thêm mã lỗi `BRIDGE_TIMEOUT`, `BRIDGE_UNAVAILABLE`. Effort +1.5h |
| 03 | Options page thêm cảnh báo quyền riêng tư (mục 3 ở trên). Effort +0.25h |
| 08 | Thêm 1 hàng test: xác nhận event prefix đổi mỗi phiên; xác nhận trang không đọc được event bằng listener đặt tên cố định |

Phase 04, 05, 06 **không đổi** dù Route A hay B — đó là lý do chúng chạy song song được.

## Todo List

- [ ] Kiểm `chrome://version` ≥ 138, ghi lại
- [ ] Tạo `spike/manifest.json`
- [ ] Tạo `spike/probe-translator.js` (4 phép đo + dump context)
- [ ] Load unpacked, xác nhận extension chạy
- [ ] Đo nhóm 1 — trang tĩnh (example.com)
- [ ] Đo nhóm 2 — CSP nghiêm (github.com)
- [ ] Đo nhóm 3 — SPA nặng (notion.so / gmail)
- [ ] Đo nhóm 4 — iframe cross-origin
- [ ] Đo nhóm 5 — chrome:// + PDF + Web Store (xác nhận im lặng)
- [ ] Nếu `downloadable`: tải pack qua user gesture rồi đo lại toàn bộ
- [ ] Nếu Route A fail: dựng `probe-main-world.js`, đo lại nhóm 1–4
- [ ] Viết `reports/spike-01-translator-context-decision.md` kèm log nguyên văn
- [ ] Ghi ROUTE=A hay ROUTE=B ở dòng đầu file quyết định

## Success Criteria

Phase xong khi tồn tại file `reports/spike-01-translator-context-decision.md` chứa **đủ** các mục:

1. Dòng đầu: `ROUTE: A` hoặc `ROUTE: B` — không mơ hồ, không "có lẽ".
2. Version Chrome + OS đã đo.
3. Bảng kết quả 5 nhóm trang × 4 phép đo. Ô nào lỗi ghi `err.name: err.message` nguyên văn.
4. **Log console thật, copy nguyên văn** — không tóm tắt. Đây là chứng cứ, không phải ghi chú.
5. Nếu ROUTE B: chốt B1 hay B2, kèm kết quả đo lại github.com (CSP) ở MAIN world.
6. Một câu kết luận độ trễ: `create()` mất bao lâu lần đầu, `translate()` mất bao lâu khi session đã ấm — số liệu này nuôi tiêu chí "<300ms" của phase 08.

Đo được là xong. **Không** viết code sản phẩm trong phase này.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Chặn thế nào |
|---|---|---|---|
| Translator không có ở isolated world | Cao | Cao — thêm cả một lớp | Route B đã mô tả đủ ở trên; +2.25h tổng |
| Cả A và B đều fail (CSP chặn MAIN world) | Thấp | **Nghiêm trọng** — kiến trúc chết | Dừng ngay, báo user. Đường còn lại chỉ là cloud engine — mà báo cáo tư vấn đã loại. Cần quyết định lại từ đầu |
| Nhầm "chưa tải pack" với "không có API" | Trung bình | Cao — chọn sai route | Bước 6 bắt buộc: tải pack qua gesture rồi đo lại |
| Máy đang chạy Chrome < 138 | Thấp | Chặn | Kiểm ở bước 1, trước mọi thứ khác |
| Quá timebox 1h | Trung bình | Trung bình | Dừng cứng, báo user, không đoán |

**Rollback:** xoá thư mục `spike/` và gỡ extension khỏi `chrome://extensions`. Không có tác động nào lan ra ngoài.

## Security Considerations

- Spike **không** gửi dữ liệu đi đâu. Chuỗi thử dịch là `'Xin chào thế giới'` — không dùng dữ liệu thật của người dùng.
- Khi đo trên gmail/notion, **không** bôi đen nội dung riêng tư. Dùng nội dung công khai.
- `matches: ["<all_urls>"]` trong spike là quyền rộng nhưng chỉ tồn tại trong lúc đo. Gỡ extension ngay sau khi xong.
- Nếu Route B: text người dùng đi qua MAIN world → trang đọc được. Ghi thành mục cảnh báo trong file quyết định (xem mục 3 phần Route B).

## Next Steps

- **Chặn:** phase 02, 03, 04, 05, 06, 07, 08 — toàn bộ.
- **Mở khoá tiếp theo:** phase 02 (scaffold). Hình dạng `manifest.json` và số entry của esbuild phụ thuộc trực tiếp vào ROUTE.
- **Bàn giao cho phase 02:** giá trị ROUTE, và (nếu B) chọn B1 hay B2.
- **Bàn giao cho phase 07:** số liệu độ trễ `create()` / `translate()`, để đặt ngưỡng timeout hợp lý.
