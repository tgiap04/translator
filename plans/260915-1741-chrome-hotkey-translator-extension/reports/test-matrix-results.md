# Phase 08 — Kết quả ma trận kiểm

- **Ngày:** 2026-09-15
- **Chrome:** 152.0.7977.83 (macOS)
- **Trạng thái:** **CHƯA ĐÓNG** — phần tự động hoá được đã xanh; phần cần trình duyệt thật còn chờ.

## Tóm tắt trung thực

Ma trận kiểm của phase 08 chia làm hai nửa. Nửa tĩnh chạy hết và xanh. Nửa runtime **không chạy được trong môi trường này** vì Chrome 152 chặn nạp extension trong phiên tự động hoá.

Đã thử ba cách, đều tắc:

| Cách | Kết quả |
|---|---|
| `--load-extension` + Puppeteer | Chrome bỏ qua cờ khi có `--enable-automation` |
| Thêm `ignoreDefaultArgs` + `--disable-features=DisableLoadExtensionCommandLineSwitch` | Cờ feature đã bị gỡ khỏi Chrome |
| CDP `Extensions.loadUnpacked` (+ profile bền, 2 lần khởi động) | Trả về extension id nhưng `chrome://extensions` liệt kê rỗng; `chrome.runtime` undefined trong trang |

Đây là giới hạn công cụ, không phải dấu hiệu code sai. Nhưng nó có nghĩa: **5 tiêu chí thành công của dự án chưa được chứng minh.**

## Đã kiểm — tự động, xanh

| Ca | Kết quả |
|---|---|
| `npm run build` | ✅ 18ms, `dist/` đầy đủ |
| `npm run typecheck` | ✅ exit 0, `strict: true` |
| `npm test` | ✅ **62/62** |
| **Không gọi mạng — nguồn** | ✅ `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` đều trống trong `src/` |
| **Không gọi mạng — bundle đã build** | ✅ 0 kết quả trong cả 3 file `dist/*.js` |
| URL ngoài trong bundle | ✅ không có |
| `dist/` lẫn file dev | ✅ sạch — không có harness, không có `.map` |
| Bundle content script | ✅ 20.1 KB < ngân sách 25 KB |
| Bundle options | 15.4 KB |
| Bundle service worker | 2.7 KB |
| Quyền khai báo | ✅ chỉ `storage`, `activeTab` |
| `host_permissions` | ✅ không khai |
| `web_accessible_resources` | ✅ không khai — không rò đường dẫn extension |
| CSP override | ✅ không có, giữ mặc định MV3 |
| `innerHTML` trong nguồn | ✅ không có (chỉ xuất hiện trong comment cảnh báo) |
| `any` / `@ts-ignore` | ✅ không có |
| Trần 200 dòng/file | ✅ lớn nhất 180 (`tooltip-controller.ts`) |
| Command slots | ✅ dùng 3, chừa 1 |

**Ca quan trọng nhất đã đạt:** không một request mạng nào tồn tại, xác minh ở cả mã nguồn lẫn bundle đã build. Đây là bằng chứng cho lời hứa cốt lõi on-device.

## Chưa kiểm — cần trình duyệt thật

Toàn bộ bảng A (5 tiêu chí thành công), B (5 trang CSS nặng), C (ma trận phím tắt), D (trạng thái lỗi), E (tooltip).

Checklist bàn giao nằm ở cuối tài liệu này.

## Kiểm tay — thứ tự để phát hiện lỗi sớm nhất

Cài: `chrome://extensions` → Developer mode → Load unpacked → `dist/`

### Bước 1 — đóng nốt khoảng hở của phase 01 (30 giây)
Mở `example.com`, F12 → Console. Phải thấy:
```
[HT] content script ready (top) — Translator: function
```
`function` → Route A xác nhận tuyệt đối trong content script thật.
`undefined` → **DỪNG**, Route B, báo lại. Mọi bước sau vô nghĩa.

### Bước 2 — đường sống (2 phút)
1. `chrome://extensions/shortcuts` → phải thấy đúng **3** lệnh.
2. Mở cài đặt (`Alt+Shift+0`) → tải gói `vi → en`, xem thanh tiến trình chạy tới 100%.
3. Về `example.com`, bôi đen một câu tiếng Anh, bấm `Alt+Shift+2` → tooltip hiện bản dịch.

Qua được bước 3 là **toàn bộ kiến trúc đã thông** — service worker → content script → engine → tooltip.

### Bước 3 — năm tiêu chí thành công
| # | Làm gì | Đạt khi |
|---|---|---|
| A1 | Dịch một câu, pack đã tải | Chữ đầu hiện dưới ~300ms |
| A2 | Thêm cặp thứ ba (vd `ja → vi`) với phím tự chọn, tải pack, dùng thử | Ra kết quả đúng chiều |
| A3 | Thử tooltip trên github.com, notion.so, mail.google.com, x.com, docs.google.com | 5/5 không vỡ hình, không bị cắt |
| A4 | Bấm phím trên `chrome://settings` và một file PDF | Có badge `×`, không im lặng |
| A5 | F12 → Network → xoá log → dịch 10 lần | **Network trống tuyệt đối** |

### Bước 4 — các ca dễ hỏng nhất
| Ca | Kỳ vọng |
|---|---|
| Gõ tiếng Việt Telex trong Gmail, ≥200 ký tự | Không lần nào kích nhầm phím tắt |
| `Ctrl+B` trên Google Docs (chưa cấu hình) | Vẫn in đậm bình thường |
| Bôi đen trong `<textarea>`, tổ hợp 1 phím bổ trợ | Không phản ứng |
| Cùng chỗ, tổ hợp 2 phím bổ trợ | Dịch |
| `Ctrl+A` trên trang dài rồi bấm phím | Cảnh báo nêu **số ký tự thật**, không đơ |
| Bấm phím 5 lần rất nhanh | Chỉ kết quả **cuối** hiện |
| Bôi đen sát 4 mép màn hình | Tooltip luôn nằm trọn trong viewport |
| Cuộn trang khi tooltip mở | Tooltip bám theo đoạn text |
| Nút ⇄ đổi chiều | Dịch lại đúng chiều ngược, dùng text gốc |
| Bấm `Esc` / click ra ngoài / bỏ bôi đen | Tooltip đóng |
| Dịch cặp chưa tải pack | Báo "Chưa tải gói ngôn ngữ", nút mở cài đặt chạy đúng |

## Cách đóng sổ

Ca nào fail thì phân loại:
- **Trong phạm vi v1** → sửa, kiểm lại ca đó.
- **Giới hạn nền tảng** → thêm vào `docs/known-limitations.md`, có dẫn chứng.

Không ghi một ca thành "giới hạn" chỉ để cho xong — chỉ khi nguyên nhân thật sự nằm ở nền tảng.

**Cổng cuối:** cả 5 tiêu chí bảng A đạt. Chưa đủ 5 thì v1 chưa xong.
