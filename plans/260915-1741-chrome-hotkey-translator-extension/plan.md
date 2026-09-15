---
title: "Chrome Extension dich text boi den bang phim tat"
description: "Extension MV3 dịch đoạn text đang bôi đen bằng phím tắt, hiện tooltip Shadow DOM tại chỗ, dùng Translator API on-device của Chrome 138+, không backend."
status: pending
priority: P2
effort: 22h
tags: [feature, frontend, experimental]
blockedBy: []
blocks: []
work_type: feature
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
created: 2026-09-15
---

# Chrome Extension dịch text bôi đen bằng phím tắt

## Overview

Bôi đen text bất kỳ → bấm tổ hợp phím → tooltip hiện bản dịch ngay tại chỗ. Mỗi tổ hợp ánh xạ một cặp ngôn ngữ cố định. Kiến trúc ba lớp đã chốt tại `reports/brainstorm-260915-chrome-hotkey-translator.md`:

- **Options page** — cửa duy nhất được tải language pack (nơi duy nhất có user gesture hợp lệ).
- **Service worker** — chỉ định tuyến. Không bao giờ gọi Translator (API không tồn tại trong worker).
- **Content script** (`all_frames: true`) — bắt keydown capture phase, đọc Selection, gọi `Translator.translate()`, render tooltip Shadow DOM.

Hotkey đi hai đường (hybrid): 3 lệnh tĩnh qua `chrome.commands` + cặp do user tự thêm qua keydown động.

Stack: TypeScript vanilla + esbuild (bước bundle tối thiểu). Không framework UI, không dependency runtime, không request mạng.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Spike Translator API in isolated world](./phase-01-spike-translator-api-in-isolated-world.md) | ✅ Done — Route A |
| 2 | [Scaffold MV3 skeleton](./phase-02-scaffold-mv3-skeleton.md) | ✅ Done (3 mục chờ kiểm tay) |
| 3 | [Config storage and options page](./phase-03-config-storage-and-options-page.md) | ✅ Done |
| 4 | [Service worker router and commands](./phase-04-service-worker-router-and-commands.md) | ✅ Done |
| 5 | [Content script input layer](./phase-05-content-script-input-layer.md) | ✅ Done |
| 6 | [Tooltip Shadow DOM](./phase-06-tooltip-shadow-dom.md) | ✅ Done |
| 7 | [Translation engine wiring](./phase-07-translation-engine-wiring.md) | Pending |
| 8 | [Integration and test matrix](./phase-08-integration-and-test-matrix.md) | Pending |

## Dependencies

```
01 (spike — CHẶN TẤT CẢ)
 └─> 02 (scaffold: manifest + shared contracts)
      ├─> 03 ─┐
      ├─> 04  │ 03 · 04 · 05 · 06 chạy SONG SONG (file ownership tách bạch)
      ├─> 05  │
      ├─> 06 ─┘
      └─> 07 (cần 01+02+03; bước wiring cuối chờ 05+06 merge)
           └─> 08 (cần tất cả)
```

| Phase | blockedBy | Effort | Ghi chú |
|---|---|---|---|
| 01 | — | 1h | Timebox cứng. Quá giờ chưa kết luận → dừng, báo user |
| 02 | 01 | 2h | Hình dạng manifest phụ thuộc Route A hay B |
| 03 | 02 | 4h | Song song với 04/05/06 |
| 04 | 02 | 2h | Song song với 03/05/06 |
| 05 | 02 | 3h | Song song với 03/04/06 |
| 06 | 02 | 4h | Song song với 03/04/05 — build bằng dữ liệu giả |
| 07 | 01,02,03 | 3h | Bước 1–5 song song được; bước 6 chờ 05+06 |
| 08 | 01–07 | 3h | Test matrix + 5 tiêu chí thành công |

**Rủi ro chặn đường lớn nhất:** Translator có thể không tồn tại trong isolated world → Route B (MAIN world + CustomEvent bridge) làm phase 02 và 07 phình thêm ~2h. Xem phase 01.
