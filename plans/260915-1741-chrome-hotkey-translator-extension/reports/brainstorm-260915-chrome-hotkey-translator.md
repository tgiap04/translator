# Tư vấn: Chrome Extension dịch text bôi đen bằng phím tắt

- **Ngày:** 2026-09-15
- **Lens:** CTO (mặc định)
- **Trạng thái:** Thiết kế đã chốt — chuyển sang lập kế hoạch
- **Codebase:** trống (greenfield, chưa phải git repo)

## Commission

Chrome extension. Bôi đen text bất kỳ trên trình duyệt → bấm tổ hợp phím → hiện tooltip ngay tại chỗ chứa bản dịch. Mỗi tổ hợp ánh xạ một cặp ngôn ngữ chỉ định (phím A = vi→en, phím B = en→vi). Người dùng tự thêm được tổ hợp cho cặp ngôn ngữ khác.

## Ràng buộc nền tảng đã xác minh

Ba phát hiện dưới đây định hình toàn bộ thiết kế. Không phát hiện nào suy ra được từ mô tả ban đầu.

1. **`chrome.commands` không cho thêm phím tắt động.** Tối đa 4 suggested key, khai báo tĩnh trong manifest, không có API runtime để tạo/sửa binding. → Yêu cầu "user tự thêm tổ hợp" **không thể** làm bằng `chrome.commands`; bắt buộc phải có đường keydown trong content script.
2. **Chrome có Translator API on-device, stable từ Chrome 138+, có tiếng Việt, ~40 ngôn ngữ.** Miễn phí, offline, không API key, không backend. Chi phí vận hành bằng 0.
3. **Translator API không chạy trong MV3 service worker** — chỉ top-level window và same-origin iframe. → Service worker không được đụng vào việc dịch; nó chỉ làm router.

## Các đường đã cân nhắc

### Cơ chế phím tắt

| Đường | Ưu | Nhược | Kết quả |
|---|---|---|---|
| Chỉ `chrome.commands` | Ổn định nhất, Chrome tự xử xung đột | Tối đa 4 phím, **bỏ hẳn** tính năng user tự thêm cặp | Loại |
| Chỉ content-script keydown | Không giới hạn, cấu hình động, code gọn | Chết trên `chrome://`, PDF, Web Store; đụng phím Gmail/Docs/Notion; iframe Gmail compose không bắt được | Loại |
| **Hybrid** | Cặp mặc định đi đường ổn định; cặp user thêm đi đường động | Hai code path, phải dedupe khi user gán trùng | **Chọn** |

### Engine dịch

| Đường | Ưu | Nhược | Kết quả |
|---|---|---|---|
| **Translator API on-device** | Miễn phí, offline, riêng tư, không backend | Chrome 138+ desktop; chất lượng dưới DeepL/LLM; phải tải pack | **Chọn** |
| On-device + fallback cloud | Linh hoạt nhất | Kéo theo màn hình quản lý key, lỗi mạng, quota, host_permissions rộng | Loại (v1) |
| Chỉ cloud | Chất lượng cao nhất | Mỗi user cần API key, hoặc phải nuôi backend proxy trả tiền theo lượt | Loại |

### Cách xác định chiều dịch

| Đường | Kết quả |
|---|---|
| **Cặp chỉ định cứng cho từng phím** | **Chọn** — đoán trước được, không bao giờ nhận diện sai |
| Một phím auto-detect + phím chỉ định | Loại — user muốn hành vi tường minh |
| Chỉ một phím auto-detect | Loại — bỏ mất tính năng nhiều cặp ngôn ngữ |

## Thiết kế đã chốt

Nguyên tắc nền: **language pack là tài sản cấp trình duyệt** — tải một lần, mọi context dùng được. Nhờ đó trang cài đặt gánh việc tải (nơi duy nhất có user gesture hợp lệ), còn content script chỉ việc gọi dịch.

### Ba lớp

**Options page** — cửa duy nhất được phép tải pack. Thêm/xoá cặp ngôn ngữ, gán tổ hợp phím, `Translator.create()` kèm thanh tiến trình.

**Service worker** — chỉ định tuyến. Nhận sự kiện `chrome.commands` (≤4), đọc config từ `chrome.storage.sync`, forward xuống tab. **Không bao giờ gọi Translator** (API không tồn tại trong worker).

**Content script** (`all_frames: true`) — bắt keydown ở capture phase cho các cặp động, đọc `Selection`/`Range`, gọi `Translator.translate()`, render tooltip.

### Quyết định chi tiết

- **4 slot `commands`:** vi→en, en→vi, mở options. **Chừa 1 slot dự phòng.**
- **Tooltip:** Shadow DOM `mode: closed` neo vào `document.body`, vị trí từ `range.getBoundingClientRect()`. Không dùng Shadow DOM thì CSS trang chủ nhà sẽ phá layout — chuyện này xảy ra sớm, không hiếm.
- **Tooltip có:** copy bản dịch; đổi chiều / đổi ngôn ngữ đích tại chỗ.
- **Dismiss:** mất vùng bôi đen (`selectionchange`), `pointerdown` ngoài tooltip, hoặc `Esc`.
- **Tải pack:** tại options page khi user thêm cặp, có tiến trình.
- **Không dịch được:** báo lỗi rõ ràng, **không fallback**. Không mở tab dịch vụ ngoài, không nhận API key cloud.
- **Phát hành:** cá nhân/nội bộ trước, nhưng kiến trúc sẵn cho store — quyền tối thiểu, chuỗi tách sẵn cho i18n, xử lý đủ trạng thái lỗi ngay từ đầu.
- **Không dùng offscreen document:** `chrome.offscreen` bắt khai báo `reason` từ danh sách cố định, không lý do nào khớp với "gọi AI API" → rủi ro bị store review vặn.

## Giả định lớn nhất — spike trước khi lập kế hoạch

Tài liệu Chrome nói Translator API dùng được ở "top-level window và same-origin iframe", **không nói rõ về isolated world của content script**. Cả kiến trúc đang tựa lên giả định này.

**Spike (~30 phút):** extension rỗng, content script in `typeof Translator`, gọi thử một câu trên vài trang khác nhau.

- Chạy được → theo đúng sơ đồ ba lớp.
- **Plan B:** inject vào `world: "MAIN"`, bắc cầu bằng `CustomEvent`. Thêm một lớp, nhưng có đường đi — không phải ngõ cụt.

## Rủi ro

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| Translator không có trong isolated world | **Cao** | Spike trước mọi thứ; Plan B MAIN world |
| Phím động đụng phím Gmail/Docs/Notion | **Cao** | Capture phase; bỏ qua khi con trỏ trong ô nhập liệu trừ khi tổ hợp có ≥2 modifier; cho tắt theo domain |
| Selection trong cross-origin iframe | Trung bình | `all_frames: true`; frame nào render tooltip của frame đó |
| Bôi đen quá dài → dịch cả trang | Trung bình | Chặn ngưỡng ký tự, cảnh báo thay vì âm thầm cắt |
| Chrome < 138 / Edge / Brave chưa có API | Thấp | Badge báo lỗi rõ ràng |
| User gán trùng phím giữa hai code path | Thấp | Validate ngay tại options page, không để lỗi lộ ra lúc runtime |

## Phạm vi v1

**Có:** 2 phím mặc định qua `commands` · cặp tự thêm qua keydown · tooltip Shadow DOM (copy, đổi chiều, đổi ngôn ngữ đích) · options page có tải pack · `storage.sync` · chuỗi tách sẵn i18n · quyền tối thiểu (`activeTab`, `storage`, `scripting`; tránh `<all_urls>` nếu được).

**Hoãn sang v2:** thay thế tại chỗ trong ô nhập liệu · lịch sử dịch · ghim tooltip · auto-detect ngôn ngữ nguồn · mọi engine cloud.

Hai mục đầu của danh sách hoãn là thứ dễ bị kéo ngược vào giữa chừng nhất. Chúng vào v2 nguyên vẹn, không chen ngang.

## Đo thế nào là thành công

1. Bôi đen text trên một trang thường + bấm phím mặc định → tooltip hiện bản dịch dưới 300ms (pack đã tải sẵn).
2. Thêm được một cặp ngôn ngữ thứ ba với tổ hợp tự chọn, và nó chạy.
3. Tooltip không vỡ layout trên 5 trang có CSS nặng khác nhau.
4. Trên trang không chạy được (`chrome://`, PDF), user nhận thông báo rõ ràng chứ không phải im lặng.
5. Không có request mạng nào phát ra trong lúc dịch — kiểm bằng DevTools Network.

## Bước tiếp

`/tkm:create-plan` — bóc thành các phase có thứ tự phụ thuộc. Phase đầu tiên **phải** là spike Translator; mọi phase còn lại phụ thuộc kết quả của nó.
