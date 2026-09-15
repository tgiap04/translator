---
phase: 8
title: "Integration and test matrix"
status: pending
effort: 3h
---

# Phase 8: Integration and test matrix

## Context Links

- Phụ thuộc: **tất cả** phase 01–07
- Tiêu chí gốc: `../reports/brainstorm-260915-chrome-hotkey-translator.md` § "Đo thế nào là thành công"
- Phạm vi v1 (để biết cái gì **không** kiểm): cùng báo cáo, § "Phạm vi v1"

## Overview

- **Priority:** P1
- **Status:** pending (blockedBy: 01–07)
- **Effort:** 3h
- **Mô tả:** Ghép mọi mảnh lại và kiểm bằng ma trận thật trên trang thật. Phase này **không viết tính năng mới** — nó chứng minh cái đã xây chạy được, và ghi lại chỗ nào không.

## Key Insights

- **Năm tiêu chí trong báo cáo tư vấn là hợp đồng.** Không đạt đủ năm thì v1 chưa xong, bất kể code đã viết bao nhiêu.
- **"Không request mạng" phải được chứng minh, không phải được tin.** Đây là lời hứa cốt lõi của sản phẩm (on-device, riêng tư). Một ca kiểm DevTools Network trống là bằng chứng; đọc code không phải.
- **Trang CSS nặng là nơi tooltip chết.** Kiểm trên trang tĩnh sạch thì không nói lên gì. Danh sách trang phải gồm các trang thực sự hung hãn về CSS và về phím tắt.
- **Ghi lại thất bại, đừng vá vội.** Lỗi tìm ra ở phase này mà thuộc phạm vi v1 → sửa. Thuộc giới hạn đã biết (chrome://, PDF, Shadow DOM closed của trang) → ghi vào docs, **không** kéo scope.

## Requirements

### Functional

1. Chạy đủ ma trận kiểm dưới đây, ghi kết quả pass/fail có bằng chứng.
2. Xác nhận cả 5 tiêu chí thành công của báo cáo tư vấn.
3. Viết `docs/known-limitations.md` từ các ca fail thuộc giới hạn nền tảng.
4. Viết `README.md` mức tối thiểu: cài đặt, cấu hình, yêu cầu Chrome 138+.
5. Đóng gói kiểm thử: `npm run build` ra thư mục `dist/` load unpacked được sạch.

### Non-functional

- Không thêm dependency mới ở phase này.
- Mọi ca fail đều có kết luận: **sửa** hoặc **ghi nhận là giới hạn** — không để treo.

## Architecture

Không có kiến trúc mới. Đây là phase xác minh.

```
build → load unpacked → ma trận kiểm → phân loại fail
                                        ├─ lỗi trong phạm vi v1 → sửa, kiểm lại
                                        └─ giới hạn nền tảng   → docs/known-limitations.md
```

## Ma trận kiểm

### A. Năm tiêu chí thành công (hợp đồng v1)

| # | Tiêu chí | Cách đo | Đạt khi |
|---|---|---|---|
| A1 | Dịch nhanh trên trang thường | Bôi đen 1 câu trên Wikipedia, bấm phím mặc định, đo bằng `performance.now()` từ keydown tới chunk đầu | Trung vị 20 lần < 300ms (pack sẵn sàng) |
| A2 | Thêm được cặp thứ ba | Vào options, thêm `ja → vi` với tổ hợp tự chọn, tải pack, dùng thử | Dịch ra kết quả đúng chiều |
| A3 | Tooltip không vỡ trên trang CSS nặng | Bảng B dưới đây | 5/5 trang render đúng |
| A4 | Trang không dùng được thì báo rõ | Mở `chrome://settings` và một file PDF, bấm phím tĩnh | Có badge/thông báo, **không** im lặng |
| A5 | Không có request mạng | DevTools → Network, filter All, xoá log, dịch 10 lần | Network **trống tuyệt đối** |

### B. Năm trang CSS nặng (cho A3)

| Trang | Vì sao chọn |
|---|---|
| `github.com` (file view) | CSP nghiêm ngặt, CSS reset mạnh, nhiều `overflow:hidden` lồng nhau |
| `notion.so` | Chiếm rất nhiều phím tắt, contenteditable khắp nơi, `transform` trên container |
| `mail.google.com` | iframe compose, phím tắt dày đặc, `z-index` cao |
| `x.com` hoặc `reddit.com` | Cuộn vô tận, virtualized list — rect thay đổi liên tục |
| `docs.google.com` | Canvas render, chiếm gần hết tổ hợp phím — ca khắc nghiệt nhất |

Mỗi trang kiểm: tooltip có hiện · không vỡ hình · không bị cắt · phím **chưa** cấu hình vẫn về đúng trang.

### C. Đường phím tắt

| Ca | Kỳ vọng |
|---|---|
| Phím tĩnh (`chrome.commands`) trên trang thường | Dịch |
| Phím động (keydown) trên trang thường | Dịch |
| Phím động trong `<textarea>`, 1 modifier | **Bỏ qua** |
| Phím động trong `<textarea>`, 2 modifier | Dịch |
| Gõ tiếng Việt Telex trong Gmail compose | **Không** kích nhầm lần nào |
| `Ctrl+B` trên Google Docs (chưa cấu hình) | Vẫn in đậm bình thường |
| Bấm 5 lần rất nhanh | Chỉ kết quả cuối hiện |
| Bôi đen trong iframe cross-origin | Frame đó tự xử lý |

### D. Trạng thái lỗi

| Ca | Kỳ vọng |
|---|---|
| Cặp chưa tải pack | "Chưa tải gói ngôn ngữ…" + nút mở cài đặt, nút chạy đúng |
| Cặp `unavailable` | Thông điệp **không hỗ trợ**, khác ca trên |
| `Ctrl+A` trên trang dài | Cảnh báo nêu **số ký tự thật**, trang không đơ |
| Bấm phím không bôi đen gì (đường lệnh tĩnh) | Thông báo ngắn "Chưa bôi đen đoạn nào" |
| `chrome://settings`, PDF viewer | Badge lỗi rõ ràng |
| Chrome < 138 (nếu có máy để thử) | "Trình duyệt chưa hỗ trợ…" |

### E. Tooltip

| Ca | Kỳ vọng |
|---|---|
| Bôi đen sát 4 mép viewport | Luôn nằm trọn trong màn hình |
| Cuộn khi tooltip mở | Bám theo text (hoặc theo nhánh lùi đã chốt ở phase 06) |
| Nút copy | Clipboard đúng bản dịch |
| Nút ⇄ | Dịch lại đúng chiều ngược, dùng text gốc |
| Đổi ngôn ngữ đích | Dịch lại sang ngôn ngữ mới |
| 3 đường dismiss | Đều đóng |
| Chế độ tối hệ thống | Tooltip đổi màu theo |

### F. Đóng gói & hồi quy

| Ca | Kỳ vọng |
|---|---|
| `npm run build` | Xanh, ra `dist/` |
| Load unpacked từ `dist/` | Không lỗi trong `chrome://extensions` |
| `node --test` toàn bộ | Tất cả xanh |
| `grep -rE 'fetch\(\|XMLHttpRequest\|WebSocket\|sendBeacon' src/` | **Trống** |
| Kích thước bundle content script | < 25KB minify |
| Gỡ rồi cài lại | Config mất đúng như mong đợi, không lỗi |

## Related Code Files

| Đường dẫn tuyệt đối | Thao tác |
|---|---|
| `/Users/tgiap.dev/devs/translator/docs/known-limitations.md` | create — từ các ca fail thuộc giới hạn nền tảng |
| `/Users/tgiap.dev/devs/translator/README.md` | create — cài đặt, cấu hình, yêu cầu Chrome 138+ |
| `/Users/tgiap.dev/devs/translator/plans/260915-1741-chrome-hotkey-translator-extension/reports/test-matrix-results.md` | create — kết quả có bằng chứng |
| *(các file sửa lỗi phát sinh)* | modify — theo ca fail |

Phase này **không tạo file nguồn mới**. Mọi thay đổi trong `src/` đều là sửa lỗi ma trận tìm ra.

## Implementation Steps

1. `npm run build`, load unpacked từ `dist/`, xác nhận `chrome://extensions` không lỗi.
2. Cấu hình: tải pack `vi→en` và `en→vi` qua options page.
3. Chạy bảng **A** (5 tiêu chí). A1 đo bằng script `performance.now()` 20 lần, lấy trung vị.
4. Chạy bảng **B** trên đủ 5 trang. Chụp màn hình từng trang, lưu vào `reports/`.
5. Chạy bảng **C** (phím tắt). Ca IME tiếng Việt phải gõ thật ít nhất 200 ký tự.
6. Chạy bảng **D** (lỗi). Ca "cặp unavailable": chọn một cặp Chrome không hỗ trợ để ép trạng thái.
7. Chạy bảng **E** (tooltip).
8. Chạy bảng **F** (đóng gói + hồi quy).
9. Phân loại mọi fail: **trong phạm vi v1** → sửa rồi kiểm lại ca đó; **giới hạn nền tảng** → ghi vào `docs/known-limitations.md`.
10. Viết `README.md`.
11. Viết `reports/test-matrix-results.md`: từng ca, pass/fail, bằng chứng (số đo, ảnh, log).
12. **Cổng cuối:** cả 5 tiêu chí bảng A đạt. Không đạt → v1 chưa xong, báo người dùng kèm lý do.

## Todo List

- [ ] Build + load unpacked sạch
- [ ] Tải pack vi↔en qua options
- [ ] Bảng A — 5 tiêu chí thành công
- [ ] A1: đo 20 lần, trung vị < 300ms
- [ ] Bảng B — 5 trang CSS nặng, có ảnh chụp
- [ ] Bảng C — ma trận phím tắt, gõ IME thật 200 ký tự
- [ ] Bảng D — mọi trạng thái lỗi
- [ ] Bảng E — tooltip 4 mép + 3 đường dismiss
- [ ] Bảng F — build, test, grep mạng, kích thước bundle
- [ ] Phân loại và xử lý mọi fail
- [ ] `docs/known-limitations.md`
- [ ] `README.md`
- [ ] `reports/test-matrix-results.md`
- [ ] Cổng cuối: 5/5 tiêu chí A

## Success Criteria

- [ ] **Cả 5 tiêu chí bảng A đạt, có bằng chứng ghi lại.**
- [ ] Ma trận B–F chạy hết, mọi ca có kết luận (pass / đã sửa / ghi nhận là giới hạn). Không ca nào treo.
- [ ] `reports/test-matrix-results.md` đầy đủ, ca fail có số đo hoặc ảnh.
- [ ] `docs/known-limitations.md` liệt kê đúng những gì thật sự không làm được, không giấu bớt.
- [ ] `README.md` đủ để người khác tự cài và dùng.
- [ ] `node --test` toàn bộ xanh.
- [ ] Grep mạng trống.
- [ ] Bundle content script < 25KB minify.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Chặn thế nào |
|---|---|---|---|
| A1 không đạt 300ms | Trung bình | Trung bình | Streaming (phase 07) mua phần lớn; không đạt thì ghi số thật và điều chỉnh tiêu chí có lý do, **không** im lặng bỏ qua |
| Tooltip vỡ trên 1–2 trang trong bảng B | Trung bình | Cao | Ba lớp cô lập của phase 06; fail thì chẩn đoán lớp nào thủng |
| Phát hiện muộn: xung đột phím trên Docs/Notion | Trung bình | Cao | Đã chặn từ phase 05 (≥2 modifier); phase này chỉ xác nhận |
| Cám dỗ kéo scope khi thấy thiếu tính năng | **Cao** | Trung bình | Danh sách "hoãn sang v2" trong báo cáo tư vấn là ranh giới cứng |
| Ca fail bị ghi thành "giới hạn" cho xong | Trung bình | Cao | Chỉ ghi là giới hạn khi nguyên nhân là **nền tảng**, có dẫn chứng; còn lại phải sửa |

**Rollback:** phase này không đổi kiến trúc. Fix phát sinh revert độc lập theo từng commit.

## Security Considerations

- **A5 (Network trống) là ca kiểm bảo mật quan trọng nhất của cả dự án.** Nó chứng minh lời hứa on-device. Chạy với filter "All", không chỉ "Fetch/XHR".
- Xác nhận `chrome://extensions` hiển thị đúng bộ quyền tối thiểu đã khai — quyền phình ra là dấu hiệu có gì đó lọt vào.
- Xác nhận không có `console.log` nào in text người dùng ở bản build phát hành.
- **Nếu Route B:** `docs/known-limitations.md` **bắt buộc** nêu rõ trang có thể đọc được text đang dịch. Không được bỏ qua mục này.
- Kiểm `dist/` không lẫn source map hay file dev (`__dev__/tooltip-demo.html` không được vào bundle phát hành).

## Next Steps

- **Bị chặn bởi:** toàn bộ 01–07.
- **Sau phase này:** v1 hoàn tất. Việc tiếp theo là quyết định có đưa lên Chrome Web Store không — khi đó mở lại mục "Phát hành" trong báo cáo tư vấn (privacy policy, screenshot, onboarding).
- **Hoãn sang v2 (không đụng ở đây):** thay thế tại chỗ trong ô nhập liệu · lịch sử dịch · ghim tooltip · auto-detect ngôn ngữ nguồn · engine cloud.
