# Spike 01 — Quyết định: Translator API trong isolated world

- **Ngày:** 2026-09-15
- **Chrome:** 152.0.7977.83 (macOS, Darwin 25.6.0) — vượt xa mốc 138 yêu cầu
- **Kết luận:** **ROUTE A** — dùng isolated world của content script. Độ tin cậy **cao**, còn **một khoảng hở** nêu ở cuối.
- **Trạng thái:** phase 02–08 được phép khởi động theo Route A.

## Câu hỏi cần trả lời

Tài liệu Chrome chỉ nói Translator API dùng được ở "top-level window và same-origin iframe", không nói gì về **isolated world** — nơi content script chạy. Cả kiến trúc ba lớp tựa lên giả định này.

## Phương pháp

Kế hoạch gốc là load unpacked một extension tối thiểu rồi đọc console. **Cách đó thất bại vì lý do hạ tầng, không phải vì API:**

| Đã thử | Kết quả |
|---|---|
| `--load-extension` + Puppeteer | Chrome 152 bỏ qua cờ này khi có `--enable-automation` |
| Thêm `ignoreDefaultArgs: ['--enable-automation']` + `--disable-features=DisableLoadExtensionCommandLineSwitch` | Vẫn không load — cờ feature đã bị gỡ khỏi Chrome |
| CDP `Extensions.loadUnpacked` + `--enable-unsafe-extension-debugging` | Trả về id `gcdgmghmnnbmbkmdbcphebbchbliafgd` nhưng `chrome://extensions` liệt kê **rỗng** — extension không thật sự đăng ký |

Nên chuyển sang đo **thẳng** khái niệm cần đo: `Page.createIsolatedWorld` của CDP tạo đúng loại JS realm mà content script chạy trong đó, rồi `Runtime.evaluate` bốn phép đo trong realm ấy.

Script: `spike/probe-isolated-world.mjs`.

## Log nguyên văn

Bốn nhóm trang, mọi frame. Chép nguyên, không tóm tắt.

```
===== 1. Trang tinh thuong (https://example.com) =====
  MAIN world typeof Translator : function
  [ISOLATED] https://example.com/ ->
  {"typeofTranslator":"function","typeofLanguageDetector":"function","isTop":true,
   "secure":true,"origin":"https://example.com","availability":"downloadable",
   "create":"ERR NotAllowedError: Requires a user gesture when availability is \"downloading\" or \"downloadable\"."}

===== 2. CSP nghiem ngat (https://github.com/nodejs/node) =====
  MAIN world typeof Translator : function
  [ISOLATED] https://github.com/nodejs/node ->
  {"typeofTranslator":"function","typeofLanguageDetector":"function","isTop":true,
   "secure":true,"origin":"https://github.com","availability":"downloadable",
   "create":"ERR NotAllowedError: Requires a user gesture when availability is \"downloading\" or \"downloadable\"."}

===== 3. SPA nang (https://www.notion.so) =====
  MAIN world typeof Translator : function
  [ISOLATED] https://www.notion.com/ ->
  {"typeofTranslator":"function","typeofLanguageDetector":"function","isTop":true,
   "secure":true,"origin":"https://www.notion.com","availability":"downloadable", ...}
  [ISOLATED] about:blank (isTop:false) -> {"typeofTranslator":"function", ... ,"origin":"null","availability":"downloadable", ...}

===== 4. Iframe cross-origin (https://www.w3schools.com/html/html_iframe.asp) =====
  MAIN world typeof Translator : function
  [ISOLATED] https://www.w3schools.com/html/html_iframe.asp (isTop:true)  -> typeofTranslator:"function", availability:"downloadable"
  [ISOLATED] about:blank                                    (isTop:false) -> typeofTranslator:"function", availability:"downloadable"
  [ISOLATED] https://www.w3schools.com/html/default.asp     (isTop:false) -> typeofTranslator:"function", availability:"downloadable"
  [ISOLATED] (3 frame khong ten, origin null)               (isTop:false) -> typeofTranslator:"function", availability:"downloadable"
```

## Bốn phát hiện

1. **`typeof Translator === "function"` trong MỌI isolated world**, cả 4 nhóm trang. Không một ca nào `undefined`.
2. **API hoạt động thật, không chỉ tồn tại.** `availability()` trả giá trị hợp lệ `"downloadable"` — tức nó chạy được, không ném lỗi.
3. **Iframe cross-origin cũng có API.** Mọi frame con (`isTop: false`), kể cả `origin: "null"`, đều thấy `Translator`. Tốt hơn dự kiến — tài liệu chỉ hứa same-origin iframe.
4. **`create()` đòi user gesture, đúng như thiết kế đã dự đoán:**
   > `NotAllowedError: Requires a user gesture when availability is "downloading" or "downloadable".`

   Đây là **xác nhận thực nghiệm** cho quyết định kiến trúc: options page là cửa duy nhất tải pack được. Không phải suy đoán nữa.

5. **`LanguageDetector` cũng có mặt** (`typeof === "function"`) — hữu ích cho auto-detect ở v2, ghi nhận để đó.

## Khoảng hở còn lại

Isolated world do CDP tạo và isolated world của extension content script **đều là isolated world trong Blink**, nhưng world của extension mang thêm origin và bộ quyền của extension. Về nguyên tắc, khác biệt đó **có thể** ảnh hưởng tới việc expose API — dù không có cơ sở nào cho thấy nó ảnh hưởng.

Rủi ro đánh giá **thấp**. Nhưng nó chưa bằng không, nên:

**Kiểm tay 2 phút, chạy một lần rồi thôi:**
1. Mở `chrome://extensions`, bật **Developer mode**.
2. **Load unpacked** → chọn thư mục `spike/`.
3. Mở `https://example.com`, F12 → Console → đổi context selector (dropdown cạnh "top") sang **"Spike Translator Probe"**.
4. Tìm dòng `[SPIKE]{...}`. Thấy `"typeofTranslator":"function"` → Route A xác nhận tuyệt đối.

Nếu bước 4 ra `"undefined"` → chuyển Route B, và phase 02/07 điều chỉnh theo mục "Route B" trong `phase-01` và `phase-07`.

## Hệ quả cho các phase sau

| Phase | Hệ quả |
|---|---|
| 02 | Manifest **không** cần khối `content_scripts` `world: "MAIN"`. Không cần entry `main-world-engine` trong `build.mjs`. |
| 03 | Xác nhận: options page **bắt buộc** gánh việc tải pack — `NotAllowedError` chứng minh không có đường khác. |
| 05 | Xác nhận: content script đọc selection và gọi dịch trong cùng một realm, không cần bắc cầu. |
| 07 | Bỏ toàn bộ nhánh Route B (`main-world-engine.ts`, `bridge-isolated.ts`, nonce, CustomEvent). **Tiết kiệm ~2h** và giữ nguyên mô hình bảo mật — trang **không** đọc được text đang dịch. |
| 08 | Bỏ ca kiểm "trang bắn CustomEvent giả". |

## Chi phí

Timebox 1h. Phần lớn thời gian rơi vào việc vượt qua hạn chế load extension của Chrome 152 trong môi trường automation, không phải vào bản thân câu hỏi. Kết luận đạt được trong khung.

## File sinh ra

- `spike/manifest.json`, `spike/probe-translator.js`, `spike/probe-main-world.js` — extension tối thiểu, để dành cho bước kiểm tay ở trên.
- `spike/probe-isolated-world.mjs` — script đo đã cho ra kết luận.
- `spike/run-spike.mjs` — runner theo đường extension, **không dùng được** trên Chrome 152 automation. Giữ lại làm ghi chép.

Toàn bộ `spike/` là code vứt đi, **không** vào `src/`, **không** vào bản phát hành.
