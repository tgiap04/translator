# Giới hạn đã biết

Những điều dưới đây là **giới hạn của nền tảng**, không phải lỗi sẽ được sửa. Ghi ra để bạn không mất thời gian truy.

## Trang extension không chạy được

Chrome cấm content script trên một số trang. Ở đó, bấm phím tắt sẽ không có gì xảy ra.

| Nơi | Vì sao |
|---|---|
| `chrome://*` (settings, extensions, history…) | Chính sách bảo mật của Chrome |
| Chrome Web Store | Chính sách bảo mật của Chrome |
| Trình xem PDF của Chrome | PDF render trong extension nội bộ, không inject được |
| `file://` | Cần bật thủ công "Allow access to file URLs" trong trang extension |

Với **phím tắt cố định** (`Alt+Shift+1/2`), extension hiện badge `×` báo cho bạn biết.
Với **phím tắt tự thêm**, không báo được gì — vì không có script nào chạy để báo.

## Xung đột phím với ứng dụng web

Gmail, Google Docs, Notion chiếm rất nhiều tổ hợp phím. Extension bắt phím ở capture phase để thấy sự kiện trước trang, nhưng chỉ chiếm phím **sau khi** khớp một tổ hợp bạn đã cấu hình — phím không khớp luôn được trả nguyên vẹn cho trang.

Khi con trỏ đang ở trong ô nhập liệu, extension **bỏ qua** tổ hợp có dưới 2 phím bổ trợ. Đây là chủ ý: `Ctrl+E` trong Gmail là phím của Gmail, không phải của bạn.

**Khuyến nghị:** dùng `Ctrl+Shift+<chữ>` hoặc `Alt+Shift+<chữ>`.

## Bộ gõ tiếng Việt

Extension bỏ qua mọi sự kiện phím phát ra trong lúc bộ gõ đang soạn (`isComposing`, `keyCode 229`). Gõ Telex/VNI sẽ không bao giờ kích nhầm phím tắt.

## Vùng chọn không đọc được

| Trường hợp | Kết quả |
|---|---|
| Shadow DOM `closed` của trang | Không đọc được vùng chọn — giới hạn nền tảng |
| iframe khác nguồn gốc | Đọc được, nhưng tooltip bị giới hạn trong khung của iframe đó |
| Ô soạn thư của Gmail | Là iframe cùng nguồn gốc nên thường chạy được, nhưng Gmail chiếm nhiều phím |

## Ngưỡng độ dài

Mặc định **2.000 ký tự**. Vượt ngưỡng, extension hiện cảnh báo kèm số ký tự thật thay vì âm thầm cắt — cắt giữa câu sinh ra bản dịch sai mà bạn không biết. Đổi được trong cài đặt.

## Chất lượng dịch

Model on-device của Chrome nhẹ hơn các dịch vụ đám mây. Đổi lại: miễn phí, chạy offline, và text không rời khỏi máy. Đây là đánh đổi có chủ ý, ghi trong báo cáo thiết kế.

## Gói ngôn ngữ

Mỗi cặp ngôn ngữ cần tải gói riêng, vài chục MB. Chrome **bắt buộc** phải có thao tác người dùng thật mới cho tải, nên việc tải chỉ làm được ở trang cài đặt — không thể tải ngầm khi bạn bấm phím tắt lần đầu.
