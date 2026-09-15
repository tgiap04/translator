---
phase: 2
title: "Scaffold MV3 skeleton"
status: pending
effort: 2h
---

# Phase 2: Scaffold MV3 skeleton

## Context Links

- Phụ thuộc: `./phase-01-spike-translator-api-in-isolated-world.md` — **cần giá trị ROUTE**
- Quyết định spike: `../reports/spike-01-translator-context-decision.md`
- Schema config: `./phase-03-config-storage-and-options-page.md` § Architecture (phase 02 tạo file theo bảng đó)
- Mở khoá: phase 03, 04, 05, 06

## Overview

- **Priority:** P0
- **Status:** pending (blockedBy: 01)
- **Effort:** 2h (+0.5h nếu Route B)
- **Mô tả:** Dựng bộ khung MV3 chạy được: cấu trúc thư mục, `manifest.json`, build bằng esbuild, và **các file contract dùng chung** — đây là thứ cho phép phase 03/04/05/06 chạy song song mà không đụng file nhau.

## Key Insights

- **Vì sao cần bundler:** content script MV3 **không nạp ES module trực tiếp** (`"js": [...]` chỉ nhận script cổ điển, không có `type="module"`). Muốn chia code thành module nhỏ (<200 dòng/file như quy ước) thì bắt buộc có một bước bundle. esbuild là bước nhỏ nhất làm được việc đó: một file cấu hình ~40 dòng, không plugin, không config framework, build < 100ms.
- **Vì sao không thêm framework UI:** options page là một bảng CRUD và tooltip là một hộp ~200×120px. React/Vue thêm 40–140KB runtime, một build pipeline, và một lớp trạng thái — đổi lại không có gì. Vanilla TS + `document.createElement` đủ, và giữ bundle content script nhỏ (quan trọng: nó nạp vào **mọi** frame của **mọi** trang). Đây là lựa chọn KISS có chủ đích, không phải thiếu sót.
- **Contract phải ra đời ở đây.** Nếu để phase 03 định nghĩa `config-schema.ts` thì phase 04 và 05 (đọc config) bị chặn → mất tính song song. Nên phase 02 tạo các file contract theo đặc tả viết ở phase 03/06, rồi **đóng băng** chúng.
- `chrome.commands` tối đa **4** suggested key. Ta khai báo 3, chừa 1.

## Requirements

### Functional

- `npm run build` sinh `dist/` load unpacked được, không lỗi ở `chrome://extensions`.
- `npm run typecheck` (`tsc --noEmit`) xanh.
- Manifest khai báo đúng 3 `commands` + chừa 1 slot.
- Ba entry bundle: service worker, content script, options page (+ entry thứ tư nếu Route B).
- Git repo được khởi tạo (hiện **chưa** là git repo).

### Non-functional

- Mọi file mã nguồn < 200 dòng.
- Zero dependency runtime. devDependencies chỉ: `esbuild`, `typescript`, `@types/chrome`.
- Build từ sạch < 3 giây.

## Architecture

### Cây thư mục

```
/Users/tgiap.dev/devs/translator/
├── package.json
├── tsconfig.json
├── build.mjs                       # esbuild, ~50 dòng
├── .gitignore                      # dist/, node_modules/, spike/
├── public/                         # copy nguyên văn sang dist/
│   ├── manifest.json
│   ├── options.html                # ← phase 03 sở hữu
│   └── icons/{16,48,128}.png
├── src/
│   ├── types/translator-api.d.ts   # khai báo ambient cho Translator
│   ├── shared/                     # ← CONTRACT, đóng băng sau phase 02
│   │   ├── config-schema.ts
│   │   ├── config-store.ts
│   │   ├── messages.ts
│   │   ├── hotkey-codec.ts
│   │   └── translate-contract.ts
│   ├── background/service-worker.ts   # ← phase 04 sở hữu
│   ├── content/content-entry.ts       # ← phase 05 sở hữu
│   ├── content/tooltip/               # ← phase 06 sở hữu
│   ├── options/options-entry.ts       # ← phase 03 sở hữu
│   └── engine/                        # ← phase 07 sở hữu
├── dev/tooltip-harness.html        # ← phase 06 sở hữu (dev-only)
└── tests/                          # mỗi phase một file riêng
```

### Luồng dữ liệu tổng (để các phase sau bám vào)

```
[chrome.commands] ──onCommand──> service-worker
                                    │ đọc chrome.storage.sync
                                    │ tabs.query(active)
                                    ▼
                          tabs.sendMessage → MỌI frame của tab
                                    │
   [keydown động] ──────────────────┤ (đường thứ hai, không qua SW)
                                    ▼
                          content-entry (mỗi frame một bản)
                            guard: hasFocus() && selection không rỗng
                                    ▼
                          selection-reader → {text, rect}
                                    ▼
                          tooltip-controller.show(rect, PENDING)
                                    ▼
                          TranslateProvider.translate(text, src, tgt)   ← phase 07
                                    ▼
                          tooltip-controller.update(OK|ERR)
```

### Contract đóng băng (tạo tại phase 02, không phase nào sửa)

| File | Nội dung | Ai đọc |
|---|---|---|
| `src/shared/config-schema.ts` | `type LangPair`, `type AppConfig`, `DEFAULT_CONFIG`, `STORAGE_KEY`. Hình dạng lấy từ bảng schema ở phase 03 § Architecture | 03, 04, 05 |
| `src/shared/config-store.ts` | `getConfig()`, `setConfig()`, `onConfigChanged(cb)` — bọc `chrome.storage.sync`, ~50 dòng | 03, 04, 05 |
| `src/shared/messages.ts` | Kiểu message SW↔CS + type guard | 04, 05 |
| `src/shared/hotkey-codec.ts` | Chuẩn hoá `KeyboardEvent` → chuỗi canonical; parse/format; danh sách phím cấm | 03 (validate), 05 (match) |
| `src/shared/translate-contract.ts` | `interface TranslateProvider`, `type TranslateError`, enum mã lỗi | 06 (nhận inject), 07 (hiện thực) |
| `src/types/translator-api.d.ts` | `declare global { const Translator: {...} }` — TS chưa biết API này | 01n/a, 07 |

**Contract message (đóng băng):**

```ts
type TranslateSelectionMsg = {
  type: 'TRANSLATE_SELECTION';
  pairId: string;
  sourceLanguage: string;   // BCP-47
  targetLanguage: string;
  requestId: string;
};
type PingMsg = { type: 'PING' };
type FrameAck = { handled: boolean; reason?: 'NO_SELECTION' | 'NO_FOCUS' | 'TOO_LONG' };
```

**Chuỗi canonical của hotkey (đóng băng):** `Ctrl+Shift+KeyT` — modifier theo thứ tự cố định `Ctrl → Alt → Shift → Meta`, nối bằng `+`, kết thúc bằng `event.code` (không phải `event.key` — `code` không đổi theo layout bàn phím và theo IME).

**Contract provider (đóng băng):**

```ts
interface TranslateProvider {
  translate(text: string, source: string, target: string,
            signal: AbortSignal): Promise<string>;   // throw TranslateError
}
```

### Permissions — quyết định và hệ quả

Khai báo:

```jsonc
"permissions": ["storage", "activeTab"],
// "scripting" CHỈ thêm nếu spike chốt Route B2
"content_scripts": [{ "matches": ["<all_urls>"], "all_frames": true, ... }]
```

**Vì sao tránh `host_permissions: ["<all_urls>"]`:** trường `host_permissions` là quyền thường trực cho `fetch`/`cookies`/`tabs.executeScript` — extension này **không cần** thứ nào trong đó. Không khai = giảm bề mặt tấn công và giảm điểm soi của store review.

**Hệ quả buộc phải chấp nhận — nói thẳng:** `content_scripts[].matches` **chính là** một dạng xin quyền host. Khai `<all_urls>` ở đó, Chrome vẫn hiện cảnh báo cài đặt *"Đọc và thay đổi tất cả dữ liệu của bạn trên mọi trang web"*. Không có cách nào né được, vì:

- `activeTab` **không** kích hoạt content script khai báo tĩnh — nó chỉ cấp quyền sau một gesture, cho `scripting.executeScript`.
- Đường hotkey **động** cần một listener `keydown` **thường trực** trong trang. Không có script nằm sẵn thì không bắt được phím. → `activeTab` đơn thuần **không làm nổi** tính năng "user tự thêm cặp".

**Đường giảm quyền cho v2 (ghi lại, không làm ở v1):** bỏ `content_scripts` tĩnh; dùng `optional_host_permissions: ["*://*/*"]` + `chrome.permissions.request()` từ options page + `chrome.scripting.registerContentScripts()` sau khi được cấp. Cài đặt sạch cảnh báo, user opt-in trong app. Cái giá: phase 05/06 không test được nếu chưa qua phase 03 → **phá vỡ tính song song của v1**. Vì vậy hoãn.

### 4 slot `chrome.commands`

| Slot | Name | Suggested key (mac / win-linux) | Trạng thái |
|---|---|---|---|
| 1 | `translate-vi-en` | `Alt+Shift+1` / `Alt+Shift+1` | Khai báo |
| 2 | `translate-en-vi` | `Alt+Shift+2` / `Alt+Shift+2` | Khai báo |
| 3 | `open-options` | `Alt+Shift+0` / `Alt+Shift+0` | Khai báo |
| 4 | — | — | **Chừa trống** |

**Vì sao chừa 1 slot:** slot `commands` **không thể thêm sau khi cài** mà không update extension, và cũng không có API runtime nào tạo thêm. Slot thứ tư là chỗ nâng cấp duy nhất cho cặp ngôn ngữ thứ ba nếu đường keydown động hỏng trên nhiều trang thực tế (rủi ro "phím động đụng phím Gmail/Docs/Notion" ở mức **Cao** trong báo cáo tư vấn). Dùng hết 4 slot ngay bây giờ là tự bịt lối thoát duy nhất.

Không đặt suggested key trùng phím Chrome hay dùng: `Ctrl/Cmd+T/W/N/L/R/F/D`. `Alt+Shift+<số>` hiếm va chạm trên cả 3 OS.

## Related Code Files

| Đường dẫn tuyệt đối | Thao tác |
|---|---|
| `/Users/tgiap.dev/devs/translator/package.json` | create |
| `/Users/tgiap.dev/devs/translator/tsconfig.json` | create |
| `/Users/tgiap.dev/devs/translator/build.mjs` | create (~50 dòng) |
| `/Users/tgiap.dev/devs/translator/.gitignore` | create |
| `/Users/tgiap.dev/devs/translator/public/manifest.json` | create |
| `/Users/tgiap.dev/devs/translator/public/icons/icon-16.png` | create (placeholder) |
| `/Users/tgiap.dev/devs/translator/public/icons/icon-48.png` | create (placeholder) |
| `/Users/tgiap.dev/devs/translator/public/icons/icon-128.png` | create (placeholder) |
| `/Users/tgiap.dev/devs/translator/src/types/translator-api.d.ts` | create (~40 dòng) |
| `/Users/tgiap.dev/devs/translator/src/shared/config-schema.ts` | create (~45 dòng) |
| `/Users/tgiap.dev/devs/translator/src/shared/config-store.ts` | create (~50 dòng) |
| `/Users/tgiap.dev/devs/translator/src/shared/messages.ts` | create (~40 dòng) |
| `/Users/tgiap.dev/devs/translator/src/shared/hotkey-codec.ts` | create (~90 dòng) |
| `/Users/tgiap.dev/devs/translator/src/shared/translate-contract.ts` | create (~35 dòng) |
| `/Users/tgiap.dev/devs/translator/src/background/service-worker.ts` | create — bản tối thiểu (log onInstalled), phase 04 tiếp quản |
| `/Users/tgiap.dev/devs/translator/src/content/content-entry.ts` | create — bản tối thiểu (log một dòng), phase 05 tiếp quản |
| `/Users/tgiap.dev/devs/translator/src/options/options-entry.ts` | create — bản tối thiểu, phase 03 tiếp quản |
| `/Users/tgiap.dev/devs/translator/public/options.html` | create — khung rỗng, phase 03 tiếp quản |

Ba file "bản tối thiểu" là **thật, không phải stub**: chúng chạy, chúng log, chúng làm build xanh và load unpacked xanh. Quyền sở hữu chuyển giao khi phase 02 kết thúc.

**Nếu Route B:** thêm `/Users/tgiap.dev/devs/translator/src/engine/main-world-engine.ts` vào danh sách entry của `build.mjs`, và thêm mục `content_scripts` thứ hai (`"world": "MAIN"`, `run_at: "document_start"`) vào manifest.

## Implementation Steps

1. `git init` tại `/Users/tgiap.dev/devs/translator`, tạo `.gitignore` (`node_modules/`, `dist/`, `.DS_Store`, `spike/`). **Repo chưa tồn tại — bước này không bỏ được.**
2. `npm init -y`; cài devDeps: `esbuild`, `typescript`, `@types/chrome`. Scripts: `build`, `watch`, `typecheck`, `test`.
3. `tsconfig.json`: `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `noEmit: true`, `lib: ["ES2022","DOM","DOM.Iterable"]`, `types: ["chrome"]`.
4. `build.mjs`: ba entry (`src/background/service-worker.ts`, `src/content/content-entry.ts`, `src/options/options-entry.ts`) → `dist/*.js`, `format: 'iife'`, `bundle: true`, `target: 'chrome138'`, `sourcemap` khi dev. Thêm bước copy `public/**` → `dist/`. Cờ `--watch` bật rebuild.
   - Chọn `iife` cho **cả ba** entry: đồng nhất, và content script không có cách nạp ESM.
5. Tạo `public/manifest.json` (MV3): `manifest_version: 3`, `minimum_chrome_version: "138"`, `background.service_worker: "service-worker.js"`, `content_scripts` (matches `<all_urls>`, `all_frames: true`, `run_at: document_idle`, `js: ["content-entry.js"]`), `options_ui.page: "options.html"` + `open_in_tab: true`, `action` (icon + badge, không popup), `commands` (3 mục theo bảng trên), `permissions: ["storage","activeTab"]`, `icons`.
6. Tạo 3 icon placeholder (khối màu đặc, PNG 16/48/128). Không cần đẹp ở phase này.
7. Viết `src/types/translator-api.d.ts`: khai báo `Translator.availability(opts)`, `Translator.create(opts)`, `TranslatorSession.translate(text)`, `.destroy()`, tuỳ chọn `monitor` với event `downloadprogress` (`{loaded, total}`), `signal: AbortSignal`.
8. Viết 5 file contract trong `src/shared/` theo bảng § Architecture. Hình dạng `AppConfig` đọc từ phase 03 § Architecture — **không tự chế**.
9. Viết `hotkey-codec.ts`: `fromEvent(e): string | null`, `format(canonical): string` (hiển thị đẹp cho người), `parse(str)`, `FORBIDDEN: readonly string[]`. Thuần, không đụng DOM API ngoài `KeyboardEvent` → test được bằng `node --test`.
10. Viết 3 file entry tối thiểu + `public/options.html` khung rỗng.
11. `npm run build && npm run typecheck` → xanh.
12. Load unpacked `dist/` tại `chrome://extensions`. Kiểm: không có error badge; `chrome://extensions/shortcuts` hiện đúng 3 lệnh; mở options page ra khung rỗng; console content script in được một dòng trên `https://example.com`.
13. Commit: `chore: scaffold MV3 extension skeleton with esbuild build`.

## Todo List

- [ ] `git init` + `.gitignore`
- [ ] `package.json` + devDeps (esbuild, typescript, @types/chrome)
- [ ] `tsconfig.json` strict
- [ ] `build.mjs` — 3 entry + copy `public/`
- [ ] `public/manifest.json` MV3 đầy đủ
- [ ] 3 icon placeholder
- [ ] `src/types/translator-api.d.ts`
- [ ] `src/shared/config-schema.ts` (theo bảng phase 03)
- [ ] `src/shared/config-store.ts`
- [ ] `src/shared/messages.ts`
- [ ] `src/shared/hotkey-codec.ts`
- [ ] `src/shared/translate-contract.ts`
- [ ] 3 entry tối thiểu + `options.html` khung
- [ ] Build xanh + typecheck xanh
- [ ] Load unpacked chạy, 3 shortcut hiện ở `chrome://extensions/shortcuts`
- [ ] (Route B) entry `main-world-engine` + mục `content_scripts` MAIN world
- [ ] Commit

## Success Criteria

- [ ] `npm run build` xong < 3s, sinh `dist/` có: `manifest.json`, `service-worker.js`, `content-entry.js`, `options-entry.js`, `options.html`, `icons/`.
- [ ] `npm run typecheck` exit 0.
- [ ] Load unpacked **không** báo lỗi ở `chrome://extensions`.
- [ ] `chrome://extensions/shortcuts` liệt kê đúng **3** lệnh, slot thứ tư trống.
- [ ] Content script in log trên `https://example.com` cả ở top frame và trong iframe.
- [ ] Mọi file `src/**` < 200 dòng (`find src -name '*.ts' | xargs wc -l`).
- [ ] 5 file contract tồn tại và được import thử thành công từ cả ba entry (kiểm bằng typecheck).

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Chặn thế nào |
|---|---|---|---|
| Contract định sai hình dạng → phase 03–06 phải sửa lại, phá song song | Trung bình | Cao | Contract bám sát bảng schema phase 03 và interface phase 06/07 đã viết sẵn ở blueprint này. Ai cần sửa contract phải báo — coi như breaking change |
| Cảnh báo quyền `<all_urls>` làm user ngại cài | Trung bình | Thấp (v1 nội bộ) | Đã ghi đường giảm quyền cho v2. Với v1 chấp nhận |
| esbuild output IIFE va chạm biến toàn cục của trang | Thấp | Trung bình | IIFE của esbuild tự đóng scope; không gán gì lên `window` ngoài chủ đích |
| `minimum_chrome_version` chặn user Chrome cũ khỏi cài luôn | Thấp | Thấp | Đúng ý muốn — thà không cài được còn hơn cài rồi im lặng hỏng |
| Route B làm manifest phình, `document_start` chạy trước trang gây lỗi | Trung bình (chỉ khi B) | Trung bình | MAIN world script chỉ đăng ký listener, không đụng DOM lúc `document_start` |

**Rollback:** `git reset --hard` về commit trước + xoá `dist/`. Không có dữ liệu người dùng nào tồn tại ở giai đoạn này.

## Security Considerations

- `permissions` tối thiểu: `storage`, `activeTab`. **Không** `tabs`, **không** `host_permissions`, **không** `cookies`, **không** `webRequest`.
- Không có `content_security_policy` nới lỏng. MV3 mặc định cấm `eval` và inline script — giữ nguyên mặc định.
- `options.html` **không** có inline `<script>` (MV3 CSP chặn). Nạp qua `<script src="options-entry.js">`.
- Không `web_accessible_resources` nào ở Route A — không rò đường dẫn extension cho trang dò.
- `.gitignore` phải chặn `node_modules/` và `dist/`; không có secret nào trong dự án này, nhưng giữ thói quen.

## Next Steps

- **Bị chặn bởi:** phase 01 (cần ROUTE).
- **Mở khoá:** phase 03, 04, 05, 06 — chạy **song song** ngay khi phase 02 merge. Ranh giới file:
  - 03 → `src/options/**` + `public/options.html`
  - 04 → `src/background/**`
  - 05 → `src/content/*.ts` (không vào `tooltip/`)
  - 06 → `src/content/tooltip/**` + `dev/**`
  - 07 → `src/engine/**` (+ **một** dòng sửa `content-entry.ts` ở bước wiring, sau khi 05 merge)
- **Bàn giao:** 5 contract đã đóng băng + `dist/` load unpacked chạy được.
