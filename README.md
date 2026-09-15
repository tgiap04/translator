# Hotkey Translator

Bôi đen text bất kỳ trên trình duyệt, bấm phím tắt, bản dịch hiện ngay tại chỗ dưới dạng tooltip.

Dịch **on-device** bằng Translator API có sẵn của Chrome. Không backend, không API key, **không một request mạng nào**. Text bạn dịch không rời khỏi máy.

## Yêu cầu

- **Chrome 138 trở lên**, trên máy tính (Windows / macOS / Linux)
- Chrome trên di động và các trình duyệt khác chưa có Translator API

## Cài đặt

```bash
npm install
npm run build
```

Rồi trong Chrome:

1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc trên bên phải)
3. Bấm **Load unpacked**, chọn thư mục `dist/`

## Dùng

**Phím tắt mặc định** (đổi được tại `chrome://extensions/shortcuts`):

| Tổ hợp | Việc |
|---|---|
| `Alt+Shift+1` | Dịch Việt → Anh |
| `Alt+Shift+2` | Dịch Anh → Việt |
| `Alt+Shift+0` | Mở cài đặt |

**Lần đầu dùng phải tải gói ngôn ngữ:** mở cài đặt → bấm "Tải gói" ở cặp bạn cần. Chrome bắt buộc phải có thao tác bấm chuột thật mới cho tải, nên không thể tải ngầm.

**Thêm cặp ngôn ngữ riêng:** trong cài đặt, thêm cặp mới và tự gán tổ hợp phím. Nên dùng **từ 2 phím bổ trợ trở lên** (ví dụ `Ctrl+Shift+E`) — tổ hợp một phím bổ trợ sẽ bị các trang như Gmail, Google Docs, Notion chiếm mất.

## Phát triển

```bash
npm run build      # build vào dist/
npm run watch      # build lại khi đổi file
npm run typecheck  # tsc --noEmit
npm test           # node --test
```

Xem `docs/known-limitations.md` cho những chỗ extension không chạy được.
