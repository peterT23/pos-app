// Import useState hook từ React để quản lý state trong component
import { useState } from 'react';

// Import các component từ Material-UI để xây dựng UI
import {
  Box,              // Component container tương đương <div>, hỗ trợ sx prop để styling
  Typography,       // Component hiển thị text với các variant (h1, h2, body1, etc.)
  Paper,            // Component container có shadow và background, giống card
  List,             // Component container cho danh sách (ul)
  ListItem,         // Component item trong list (li)
  ListItemText,     // Component hiển thị text trong ListItem với primary và secondary
  IconButton,       // Button chỉ chứa icon, không có text
  Button,           // Button component với nhiều variant (contained, outlined, text)
  Divider,          // Component đường kẻ ngang để phân cách
  TextField,        // Input field với label, helper text, error state
  Dialog,           // Modal dialog component
  DialogTitle,      // Tiêu đề của dialog
  DialogContent,    // Nội dung của dialog
  DialogActions,    // Khu vực chứa các button action của dialog
  RadioGroup,       // Group các radio button
  FormControlLabel, // Label cho form control (radio, checkbox)
  Radio,            // Radio button component
  FormControl,     // Container cho form control với label
  InputLabel,       // Label cho input/select
  Select,           // Dropdown select component
  MenuItem,         // Item trong dropdown select
} from '@mui/material';

// Import các icon từ Material-UI Icons
import {
  Add as AddIcon,              // Icon dấu + để tăng số lượng
  Remove as RemoveIcon,        // Icon dấu - để giảm số lượng
  Delete as DeleteIcon,        // Icon thùng rác để xóa sản phẩm
  ShoppingCart as CartIcon,    // Icon giỏ hàng
  Payment as PaymentIcon,      // Icon thanh toán
} from '@mui/icons-material';

/**
 * Component Cart: Giỏ hàng với các chức năng:
 * - Hiển thị sản phẩm đã thêm
 * - Tăng/giảm số lượng
 * - Xóa sản phẩm
 * - Tính tổng tiền
 * - Thanh toán
 * 
 * Props:
 * - items: Array<{product, qty}> - Danh sách sản phẩm trong giỏ
 * - onUpdateQty: function(productLocalId, newQty) - Cập nhật số lượng
 * - onRemove: function(productLocalId) - Xóa sản phẩm
 * - onCheckout: function(orderData) - Thanh toán
 */
// Component Cart: Hiển thị giỏ hàng và xử lý thanh toán
// Props:
//   - items: Mảng các sản phẩm trong giỏ, mặc định là mảng rỗng
//   - onUpdateQty: Callback function để cập nhật số lượng sản phẩm
//   - onRemove: Callback function để xóa sản phẩm khỏi giỏ
//   - onCheckout: Callback function để xử lý thanh toán
export default function Cart({ items = [], onUpdateQty, onRemove, onCheckout }) {
  // State quản lý việc mở/đóng dialog thanh toán, mặc định là false (đóng)
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  
  // State lưu phương thức thanh toán, mặc định là 'cash' (tiền mặt)
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // State lưu số điện thoại khách hàng, mặc định là chuỗi rỗng
  const [customerPhone, setCustomerPhone] = useState('');

  // Hàm tính tổng tiền của tất cả sản phẩm trong giỏ
  // Sử dụng reduce để duyệt qua mảng items và tính tổng
  // total: giá trị tích lũy, bắt đầu từ 0
  // item: từng sản phẩm trong giỏ
  // item.product.price: giá của sản phẩm
  // item.qty: số lượng sản phẩm
  // Trả về: tổng tiền = tổng của (giá * số lượng) của tất cả sản phẩm
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (item.product.price * item.qty);
    }, 0);
  };

  // Tính tổng số lượng sản phẩm (tổng số đơn vị, không phải số loại)
  // sum: giá trị tích lũy, bắt đầu từ 0
  // item.qty: số lượng của từng sản phẩm
  // Trả về: tổng số lượng = tổng của tất cả qty
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  // Hàm xử lý khi user click nút tăng số lượng
  // productLocalId: ID của sản phẩm cần tăng số lượng
  const handleIncreaseQty = (productLocalId) => {
    // Tìm sản phẩm trong giỏ theo localId
    // find() trả về item đầu tiên thỏa mãn điều kiện, hoặc undefined nếu không tìm thấy
    const item = items.find(i => i.product.localId === productLocalId);
    
    // Nếu tìm thấy sản phẩm
    if (item) {
      // Tính số lượng mới = số lượng hiện tại + 1
      const newQty = item.qty + 1;
      
      // Kiểm tra tồn kho: số lượng mới không được vượt quá số lượng tồn kho
      if (newQty > item.product.stock) {
        // Hiển thị cảnh báo nếu vượt quá tồn kho
        alert(`Chỉ còn ${item.product.stock} sản phẩm trong kho!`);
        // Dừng hàm, không cập nhật số lượng
        return;
      }
      
      // Nếu callback onUpdateQty tồn tại, gọi nó để cập nhật số lượng lên parent component
      if (onUpdateQty) {
        onUpdateQty(productLocalId, newQty);
      }
    }
  };

  // Hàm xử lý khi user click nút giảm số lượng
  // productLocalId: ID của sản phẩm cần giảm số lượng
  const handleDecreaseQty = (productLocalId) => {
    // Tìm sản phẩm trong giỏ theo localId
    const item = items.find(i => i.product.localId === productLocalId);
    
    // Chỉ giảm nếu tìm thấy sản phẩm VÀ số lượng hiện tại > 1
    // Nếu số lượng = 1, không giảm nữa (để tránh số lượng = 0)
    if (item && item.qty > 1) {
      // Nếu callback onUpdateQty tồn tại, gọi nó với số lượng mới = số lượng hiện tại - 1
      if (onUpdateQty) {
        onUpdateQty(productLocalId, item.qty - 1);
      }
    }
  };

  // Hàm xử lý khi user click nút xóa sản phẩm
  // productLocalId: ID của sản phẩm cần xóa
  const handleRemove = (productLocalId) => {
    // Hiển thị dialog xác nhận trước khi xóa
    // window.confirm() trả về true nếu user click OK, false nếu click Cancel
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      // Nếu user xác nhận VÀ callback onRemove tồn tại, gọi nó để xóa sản phẩm
      if (onRemove) {
        onRemove(productLocalId);
      }
    }
  };

  // Hàm xử lý khi user click nút thanh toán
  const handleCheckout = () => {
    // Kiểm tra nếu giỏ hàng trống (không có sản phẩm nào)
    if (items.length === 0) {
      // Hiển thị cảnh báo và dừng hàm
      alert('Giỏ hàng trống!');
      return;
    }
    
    // Nếu giỏ hàng có sản phẩm, mở dialog thanh toán
    setOpenPaymentDialog(true);
  };

  // Hàm xử lý khi user xác nhận thanh toán trong dialog
  const handleConfirmPayment = () => {
    // Tạo object chứa dữ liệu đơn hàng
    const orderData = {
      // items: map qua mảng items để tạo mảng mới chỉ chứa product và qty
      // Mục đích: Chỉ gửi dữ liệu cần thiết, không gửi toàn bộ object
      items: items.map(item => ({
        product: item.product,  // Thông tin sản phẩm
        qty: item.qty,          // Số lượng
      })),
      // totalAmount: Tổng tiền của đơn hàng, tính bằng hàm calculateTotal()
      totalAmount: calculateTotal(),
      // paymentMethod: Phương thức thanh toán đã chọn
      paymentMethod,
      // customerPhone: Số điện thoại khách hàng
      // trim(): Xóa khoảng trắng đầu cuối
      // || null: Nếu sau khi trim là chuỗi rỗng thì set thành null
      customerPhone: customerPhone.trim() || null,
    };

    // Nếu callback onCheckout tồn tại, gọi nó với dữ liệu đơn hàng
    if (onCheckout) {
      onCheckout(orderData);
    }

    // Đóng dialog thanh toán
    setOpenPaymentDialog(false);
    // Reset phương thức thanh toán về mặc định (tiền mặt)
    setPaymentMethod('cash');
    // Reset số điện thoại về chuỗi rỗng
    setCustomerPhone('');
  };

  // Return JSX để render component
  return (
    // Box container với height 100%, flex layout dọc (column)
    // sx prop: Styling với Material-UI theme system
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header giỏ hàng - Paper component với background màu primary và text màu trắng */}
      <Paper sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        {/* Box container với flex layout ngang, căn giữa items theo chiều dọc, gap 1 đơn vị */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Icon giỏ hàng */}
          <CartIcon />
          {/* Typography hiển thị text "Giỏ hàng" với số lượng sản phẩm */}
          {/* variant="h6": Style giống heading 6 */}
          {/* sx={{ fontWeight: 'bold' }}: Font weight đậm */}
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Giỏ hàng ({totalItems})
          </Typography>
        </Box>
      </Paper>

      {/* Danh sách sản phẩm - Box với flexGrow để chiếm không gian còn lại, overflow auto để scroll */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {/* Conditional rendering: Nếu giỏ hàng trống thì hiển thị empty state */}
        {items.length === 0 ? (
          // Empty state: Box căn giữa với padding dọc 4 đơn vị
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {/* Icon giỏ hàng lớn, màu secondary, margin bottom 2 */}
            <CartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            {/* Text "Giỏ hàng trống" */}
            <Typography variant="h6" color="text.secondary">
              Giỏ hàng trống
            </Typography>
            {/* Text hướng dẫn */}
            <Typography variant="body2" color="text.secondary">
              Thêm sản phẩm để bắt đầu
            </Typography>
          </Box>
        ) : (
          // Nếu có sản phẩm: Hiển thị List
          <List>
            {/* Map qua mảng items để render từng sản phẩm */}
            {/* key={item.product.localId}: React cần key để optimize re-render */}
            {items.map((item, index) => (
              // Box wrapper cho mỗi item
              <Box key={item.product.localId}>
                {/* ListItem: Item trong danh sách */}
                <ListItem
                  sx={{
                    bgcolor: 'background.paper',  // Background màu paper
                    mb: 1,                        // Margin bottom 1 đơn vị
                    borderRadius: 1,              // Bo góc 1 đơn vị
                    border: '1px solid',          // Border 1px solid
                    borderColor: 'divider',       // Màu border là divider color
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {item.product.name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {item.product.price.toLocaleString('vi-VN')} đ
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          {/* Button giảm số lượng */}
                          <IconButton
                            size="small"
                            onClick={() => handleDecreaseQty(item.product.localId)}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>

                          {/* Số lượng */}
                          <Typography
                            variant="body1"
                            sx={{
                              minWidth: '40px',
                              textAlign: 'center',
                              fontWeight: 600,
                            }}
                          >
                            {item.qty}
                          </Typography>

                          {/* Button tăng số lượng */}
                          <IconButton
                            size="small"
                            onClick={() => handleIncreaseQty(item.product.localId)}
                            disabled={item.qty >= item.product.stock}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>

                          {/* Thành tiền */}
                          <Typography
                            variant="body1"
                            color="primary"
                            sx={{ ml: 'auto', fontWeight: 600 }}
                          >
                            {(item.product.price * item.qty).toLocaleString('vi-VN')} đ
                          </Typography>

                          {/* Button xóa */}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemove(item.product.localId)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {/* Divider: Đường kẻ ngang phân cách giữa các item */}
                {/* Chỉ hiển thị divider nếu không phải item cuối cùng */}
                {index < items.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* Footer: Tổng tiền và button thanh toán - Paper component */}
      <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ mb: 2 }}>
          {/* Box hiển thị tổng tiền với flex layout, space-between để 2 text ở 2 đầu */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            {/* Text "Tổng cộng" */}
            <Typography variant="h6">Tổng cộng:</Typography>
            {/* Text hiển thị tổng tiền với màu primary, font đậm */}
            <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
              {calculateTotal().toLocaleString('vi-VN')} đ
            </Typography>
          </Box>
        </Box>

        {/* Button thanh toán */}
        <Button
          variant="contained"      // Variant filled (nền đầy màu)
          fullWidth               // Chiếm toàn bộ chiều rộng
          size="large"            // Kích thước lớn
          startIcon={<PaymentIcon />}  // Icon ở đầu button
          onClick={handleCheckout}     // Gọi hàm khi click
          disabled={items.length === 0}  // Vô hiệu hóa nếu giỏ hàng trống
          sx={{
            py: 2,                // Padding dọc 2 đơn vị
            fontSize: '1.1rem',   // Font size 1.1rem
            fontWeight: 600,      // Font weight đậm
          }}
        >
          Thanh toán
        </Button>
      </Paper>

      {/* Dialog thanh toán */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thanh toán</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tổng tiền: {calculateTotal().toLocaleString('vi-VN')} đ
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Phương thức thanh toán</InputLabel>
            <Select
              value={paymentMethod}
              label="Phương thức thanh toán"
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <MenuItem value="cash">Tiền mặt</MenuItem>
              <MenuItem value="bank">Chuyển khoản</MenuItem>
              <MenuItem value="mix">Hỗn hợp</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Số điện thoại khách hàng (tùy chọn)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Nhập số điện thoại để tích điểm"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Hủy</Button>
          <Button onClick={handleConfirmPayment} variant="contained" autoFocus>
            Xác nhận thanh toán
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
