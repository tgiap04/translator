---
phase: 4
title: "Service worker router and commands"
status: pending
effort: 2h
---

# Phase 4: Service worker router and commands

## Context Links

- Phụ thuộc: `./phase-02-scaffold-mv3-skeleton.md` (contract `messages.ts`, `config-store.ts`)
- Song song với: phase 03, 05, 06
- Báo cáo nền: `../reports/brainstorm-260915-chrome-hotkey-translator.md` § "Ba lớp" → Service worker
- Tiêu thụ ở: phase 05 (content script nhận message)

## Overview

- **Priority:** P1
- **Status:** pending (blockedBy: 02)
- **Effort:** 2h
- **Mô tả:** Service worker **chỉ** làm router. Nhận `chrome.commands`, đọc config, forward xuống content script của tab đang hoạt động. Xử lý trường hợp không có content script (trang hạn chế) bằng badge lỗi.

## Key Insights

> **CẢNH BÁO — quy tắc cứng của phase này:** service worker **TUYỆT ĐỐI KHÔNG** gọi `Translator`. API **không tồn tại** trong MV3 service worker (chỉ có ở top-level window và same-origin iframe). Mọi `typeof Translator` ở đây trả `undefined`. Không thử, không polyfill, không offscreen document (báo cáo tư vấn đã loại `chrome.offscreen`: danh sách `reason` cố định không có mục nào khớp "gọi AI API").

- **Service worker MV3 bị terminate bất cứ lúc nào** — mặc định sau ~30s không hoạt động. Hệ quả cứng: **không giữ state trong biến toàn cục**. Mỗi lần `onCommand` bắn, đọc lại config từ `chrome.storage.sync`. Cache trong biến module sẽ mất, hoặc tệ hơn: sống sót với dữ liệu cũ sau khi user đổi cấu hình.
- Mọi listener (`onCommand`, `onInstalled`, `onClicked`) phải đăng ký ở **top level**, đồng bộ, ngay khi worker khởi động. Đăng ký bên trong một `await` thì Chrome không đánh thức worker đúng lúc sự kiện bắn.
- `chrome.tabs.sendMessage(tabId, msg)` **không** chỉ định `frameId` sẽ gửi tới **mọi frame** của tab. Đúng ý ta: frame nào đang có selection và đang focus thì frame đó xử lý (phase 05 quyết định). Service worker không cần biết frame nào.
- `chrome.runtime.lastError` sau `sendMessage` = **không frame nào có listener** = trang hạn chế (`chrome://`, PDF viewer, Web Store, `file://` chưa cấp quyền). Đây là tín hiệu duy nhất và đáng tin để hiện badge lỗi.
- Truy vấn tab: `chrome.tabs.query({ active: true, lastFocusedWindow: true })`. Dùng `lastFocusedWindow` chứ không `currentWindow` — khi phím tắt bắn từ một cửa sổ popup, `currentWindow` có thể trỏ nhầm.

## Requirements

### Functional

1. `chrome.runtime.onInstalled`: nếu `storage.sync` chưa có config → ghi `DEFAULT_CONFIG`. Nếu có `v` cũ → gọi migrate của `config-store`.
2. `chrome.commands.onCommand`:
   - `open-options` → `chrome.runtime.openOptionsPage()`.
   - `translate-vi-en` / `translate-en-vi` → tra cặp theo trường `c` (1 hoặc 2) trong config → gửi `TRANSLATE_SELECTION` tới tab hoạt động.
3. `chrome.action.onClicked` → mở options page (không có popup ở v1).
4. Không tìm được cặp ứng với slot command (user đã xoá) → badge `!` + mở options page kèm hash `#missing-pair`.
5. `sendMessage` trả `lastError` → badge đỏ `×`, tooltip action nói rõ "Trang này không chạy được extension".
6. Badge tự xoá sau 4 giây, hoặc khi tab đổi URL.

### Non-functional

- `service-worker.ts` < 120 dòng; phần badge tách sang `badge-notifier.ts`.
- Không biến toàn cục có trạng thái. Hằng số thì được.
- Không `setInterval`, không keep-alive hack — để worker chết là đúng.

## Architecture

```
┌──────────────────────── service-worker (ephemeral) ────────────────────────┐
│ top-level, đăng ký đồng bộ:                                                │
│   chrome.runtime.onInstalled  → seedConfig()                               │
│   chrome.commands.onCommand   → routeCommand()                             │
│   chrome.action.onClicked     → openOptionsPage()                          │
│   chrome.tabs.onUpdated       → clearBadge(tabId)                          │
└────────────────────────────────────────────────────────────────────────────┘

routeCommand(name):
  name === 'open-options' → openOptionsPage(); return
  cfg   = await getConfig()                       # đọc lại MỖI LẦN
  slot  = name === 'translate-vi-en' ? 1 : 2
  pair  = cfg.pairs.find(p => p.c === slot)
  pair chưa có → badge('!') + openOptionsPage('#missing-pair'); return
  [tab] = await tabs.query({active:true, lastFocusedWindow:true})
  tab chưa có / tab.id vô hiệu → badge('×'); return
  try  await tabs.sendMessage(tab.id, {type:'TRANSLATE_SELECTION', pairId, s, t, requestId})
  catch(lastError) → badge('×', tab.id)           # trang hạn chế
```

### Bảng trạng thái badge

| Tình huống | Badge | Màu | Title | Tự xoá |
|---|---|---|---|---|
| Bình thường | (rỗng) | — | tên extension | — |
| Không có content script | `×` | `#c0392b` | "Extension không chạy được trên trang này" | 4s hoặc khi tab đổi URL |
| Thiếu cặp cho slot command | `!` | `#d68910` | "Chưa gán cặp ngôn ngữ cho phím này" | 4s |

Badge đặt **theo tab** (`chrome.action.setBadgeText({ text, tabId })`) để không dây sang tab khác.

### Ranh giới không được vượt

| Việc | Ở đây? | Ở đâu |
|---|---|---|
| Gọi `Translator.*` | **KHÔNG BAO GIỜ** | phase 07, trong content script |
| Đọc `Selection` | Không (worker không có DOM) | phase 05 |
| Render tooltip | Không | phase 06 |
| Bắt keydown động | Không (worker không nhận keydown của trang) | phase 05 |
| Đọc/ghi config | Có (chỉ đọc khi route; ghi chỉ lúc `onInstalled`) | — |

## Related Code Files

| Đường dẫn tuyệt đối | Thao tác | Dòng ước tính |
|---|---|---|
| `/Users/tgiap.dev/devs/translator/src/background/service-worker.ts` | modify (phase 02 tạo tối thiểu) | ~110 |
| `/Users/tgiap.dev/devs/translator/src/background/command-router.ts` | create | ~80 |
| `/Users/tgiap.dev/devs/translator/src/background/badge-notifier.ts` | create | ~70 |
| `/Users/tgiap.dev/devs/translator/src/background/background-strings.ts` | create | ~25 |
| `/Users/tgiap.dev/devs/translator/tests/command-router.test.mjs` | create | ~70 |

`command-router.ts` viết dưới dạng hàm thuần nhận vào `{ cfg, commandName }` → trả `{ action: 'send'|'badge'|'options', payload }`. Tách quyết định khỏi tác dụng phụ → test được không cần Chrome.

**Đọc, KHÔNG sửa:** `src/shared/messages.ts`, `src/shared/config-schema.ts`, `src/shared/config-store.ts`.

## Implementation Steps

1. `service-worker.ts`: đăng ký 4 listener ở top level, mỗi listener gọi một hàm async đặt ở module khác. Bản thân file này chỉ là bảng nối dây.
2. `onInstalled`: `reason === 'install'` → ghi `DEFAULT_CONFIG` nếu `storage.sync` rỗng. `reason === 'update'` → gọi migrate (v1 chưa có gì để migrate; để sẵn chỗ).
3. `command-router.ts`: hàm thuần `decide(commandName, cfg)` theo sơ đồ § Architecture. Trả về mô tả hành động, **không** tự gọi `chrome.*`.
4. `service-worker.ts` thi hành kết quả của `decide`: `openOptionsPage` / `tabs.query` + `tabs.sendMessage` / `badge`.
5. `badge-notifier.ts`: `showError(tabId)`, `showWarn(tabId)`, `clear(tabId)`. Hẹn xoá bằng `chrome.alarms`? **Không** — alarm tối thiểu 30 giây. Dùng `setTimeout` 4s và chấp nhận việc worker chết sớm làm badge dính lại; bù bằng `tabs.onUpdated` xoá badge khi tab điều hướng. Ghi rõ đánh đổi này trong comment.
6. Bắt `chrome.runtime.lastError` **đúng cách**: gọi `chrome.tabs.sendMessage` dạng callback hoặc bọc promise + `.catch()`. Không đọc `lastError` là Chrome sẽ log "Unchecked runtime.lastError" ra console — bẩn và che lỗi thật.
7. `background-strings.ts`: gom chuỗi badge title.
8. `tests/command-router.test.mjs`: phủ 4 nhánh — open-options, slot có cặp, slot thiếu cặp, tên lệnh lạ.
9. Kiểm thủ công: bấm `Alt+Shift+1` trên `https://example.com` → thấy message tới content script (log tạm ở phase 05 bản tối thiểu). Bấm trên `chrome://extensions` → badge `×`.

## Todo List

- [ ] 4 listener đăng ký top-level, đồng bộ
- [ ] `onInstalled` seed `DEFAULT_CONFIG`
- [ ] `command-router.ts` — hàm `decide` thuần
- [ ] Thi hành hành động: openOptionsPage / sendMessage / badge
- [ ] `badge-notifier.ts` + bảng trạng thái badge
- [ ] Bắt `lastError` đúng cách (không để "Unchecked")
- [ ] `tabs.onUpdated` xoá badge
- [ ] `background-strings.ts`
- [ ] `tests/command-router.test.mjs`
- [ ] Kiểm thủ công trên trang thường + trang hạn chế
- [ ] Grep xác nhận không có chuỗi `Translator` nào trong `src/background/**`

## Success Criteria

- [ ] Bấm `Alt+Shift+1` trên trang thường → content script nhận đúng `TRANSLATE_SELECTION` với `s='vi'`, `t='en'`.
- [ ] Bấm `Alt+Shift+0` → options page mở.
- [ ] Bấm phím dịch trên `chrome://extensions` → badge `×` + title rõ ràng, **không** im lặng — **tiêu chí #4 của báo cáo tư vấn**.
- [ ] Badge chỉ hiện ở tab gây lỗi, không dây sang tab khác.
- [ ] Đợi worker terminate (`chrome://serviceworker-internals` hoặc chờ 30s+) rồi bấm phím → vẫn chạy đúng.
- [ ] Đổi config ở options → bấm phím ngay → dùng config **mới** (chứng minh không cache).
- [ ] `grep -r "Translator" src/background/` → **0 kết quả**.
- [ ] Console service worker sạch, không có "Unchecked runtime.lastError".
- [ ] `node --test tests/command-router.test.mjs` xanh.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Chặn thế nào |
|---|---|---|---|
| Có người thêm lời gọi Translator vào worker | Trung bình | Cao — lỗi khó hiểu, mất thời gian | Cảnh báo in đậm ở đầu phase; tiêu chí grep = 0; comment ngay đầu file |
| Giữ state trong biến toàn cục, worker chết → mất/ôi | Cao (dễ mắc) | Trung bình | Đọc lại config mỗi lần route; tiêu chí "đổi config → hiệu lực ngay" |
| `setTimeout` xoá badge chết theo worker → badge dính | Trung bình | Thấp | `tabs.onUpdated` xoá bù; badge dính là phiền chứ không sai |
| `tabs.query` trả tab của cửa sổ DevTools tách rời | Thấp | Thấp | Dùng `lastFocusedWindow: true`; tab không hợp lệ → badge |
| Không phân biệt được "trang hạn chế" với "content script lỗi" | Trung bình | Trung bình | Cả hai đều cho `lastError`; thông điệp viết chung đủ đúng cho cả hai |
| Listener đăng ký sau `await` → mất sự kiện | Trung bình | Cao | Bắt buộc top-level đồng bộ; review checklist |

**Rollback:** revert commit. Content script vẫn chạy được đường keydown động (không qua worker) → tính năng suy giảm chứ không chết. Đây là lợi thế có sẵn của thiết kế hybrid.

## Security Considerations

- Không nới quyền nào ở phase này. `tabs.sendMessage` dùng được với `activeTab` sau gesture phím tắt.
- **Không** thêm `chrome.runtime.onMessageExternal` — không cho trang web hay extension khác gọi vào.
- `chrome.runtime.onMessage` (nếu cần cho ping từ options) phải kiểm `sender.id === chrome.runtime.id` trước khi xử lý.
- Không log nội dung text người dùng ở service worker — worker không nhận text (chỉ nhận mã ngôn ngữ), giữ nguyên như vậy.
- `requestId` sinh bằng `crypto.randomUUID()`, chỉ dùng để khớp request/response, không chứa dữ liệu.

## Next Steps

- **Bị chặn bởi:** phase 02.
- **Chạy song song với:** phase 03, 05, 06. File ownership: phase này **chỉ** đụng `src/background/**`. Không chạm `src/content/**`, `src/options/**`, `src/shared/**`, `src/engine/**`.
- **Tiêu thụ ở:** phase 05 (listener `chrome.runtime.onMessage` phía content script) và phase 08 (test đường lệnh tĩnh).
- **Bàn giao:** hình dạng message đúng contract `src/shared/messages.ts` — không mở rộng, không thêm field.
