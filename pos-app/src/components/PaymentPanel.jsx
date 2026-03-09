// Import useState, useRef, useEffect hooks từ React
// useState: Quản lý state trong component
// useRef: Tạo reference đến DOM element hoặc giá trị không trigger re-render
// useEffect: Xử lý side effects (sync state, focus, etc.)
import { useState, useRef, useEffect } from 'react';

// Import các component từ Material-UI
import {
  Box,              // Container component tương đương <div>
  Paper,             // Card-like container với shadow
  Typography,        // Text component với các variant
  TextField,         // Input field với label, helper text
  InputAdornment,    // Component để thêm icon/text vào đầu/cuối input
  IconButton,       // Button chỉ chứa icon
  FormControl,      // Container cho form control
  FormLabel,        // Label cho form control
  RadioGroup,       // Group các radio button
  FormControlLabel, // Label cho radio/checkbox
  Radio,            // Radio button component
  Button,           // Button component
  Chip,             // Component hiển thị tag/badge
  MenuItem,         // Option cho select
  Grid,             // Grid layout system
  Dialog,           // Modal dialog
  DialogTitle,      // Tiêu đề dialog
  DialogContent,    // Nội dung dialog
  DialogActions     // Khu vực button trong dialog
} from '@mui/material';

// Import các icon từ Material-UI Icons
import {
  Search as SearchIcon,              // Icon tìm kiếm
  Add as AddIcon,                    // Icon dấu +
  Person as PersonIcon,              // Icon người dùng
  ArrowDropDown as ArrowDropDownIcon, // Icon mũi tên xuống
  GridView as GridIcon,              // Icon grid
  Close as CloseIcon,                // Icon X để xóa khách hàng đã chọn
  QrCode2 as QrCode2Icon,             // Icon mã QR
  Sync as SyncIcon                   // Icon kiểm tra giao dịch
} from '@mui/icons-material';

// Import component CustomerSearchDropdown để hiển thị dropdown tìm kiếm khách hàng
import CustomerSearchDropdown from './CustomerSearchDropdown';

/**
 * Component PaymentPanel: Panel thanh toán bên phải
 * 
 * Props:
 * - customerName: string
 * - customerPhone: string
 * - onCustomerSearch: function()
 * - onAddCustomer: function()
 * - items: Array<{product, qty}>
 * - paymentMethod: 'cash' | 'bank' | 'card' | 'wallet'
 * - onPaymentMethodChange: function(method)
 * - amountPaid: number
 * - onAmountPaidChange: function(amount)
 * - onCheckout: function()
 */
// Component PaymentPanel: Panel thanh toán bên phải
// Props:
//   - cashierName: Tên nhân viên thu ngân, mặc định 'Duy Thắng'
//   - customerName: Tên khách hàng, mặc định chuỗi rỗng
//   - customerPhone: Số điện thoại khách hàng, mặc định chuỗi rỗng
//   - customerLocalId: LocalId khách hàng đã chọn
//   - customerSearchTerm: Từ khóa tìm kiếm khách hàng
//   - customerDebt: Số tiền nợ của khách hàng, mặc định 0
//   - customerPoints: Số điểm tích lũy của khách hàng, mặc định 0
//   - onCustomerSearchChange: Callback khi user nhập tìm kiếm khách hàng
//   - onAddCustomer: Callback khi user click nút thêm khách hàng
//   - onCustomerSelect: Callback khi user chọn khách hàng từ dropdown
//   - onCustomerClear: Callback khi user xóa khách hàng đã chọn
//   - items: Mảng sản phẩm trong giỏ hàng
//   - paymentMethod: Phương thức thanh toán ('cash', 'bank', 'card', 'wallet')
//   - onPaymentMethodChange: Callback khi thay đổi phương thức thanh toán
//   - amountPaid: Số tiền khách trả, mặc định 0
//   - onAmountPaidChange: Callback khi thay đổi số tiền trả
//   - discount: Giảm giá chung, mặc định 0
//   - discountType: Loại giảm giá ('vnd' hoặc 'percent'), mặc định 'vnd'
//   - onDiscountChange: Callback khi thay đổi giảm giá
//   - onCheckout: Callback khi user click nút thanh toán
export default function PaymentPanel({
  cashierName = 'Duy Thắng',  // Tên nhân viên thu ngân
  customerName = '',  // Tên khách hàng đã chọn
  customerPhone = '',
  customerLocalId = '',
  customerSearchTerm = '',
  customerDebt = 0,            // Số tiền nợ của khách hàng
  customerPoints = 0,           // Số điểm tích lũy của khách hàng
  onCustomerSearchChange,
  onCustomerEdit,
  onAddCustomer,
  onCustomerSelect,
  onCustomerClear,              // Callback để xóa khách hàng đã chọn
  items = [],
  paymentMethod = 'cash',
  onPaymentMethodChange,
  amountPaid = 0,
  onAmountPaidChange,
  discount = 0,
  discountType = 'vnd',
  onDiscountChange,
  onCheckout
}) {
  // State quản lý việc mở/đóng dropdown tìm kiếm khách hàng
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  
  // State lưu anchor element (element để đặt vị trí dropdown)
  const [customerSearchAnchor, setCustomerSearchAnchor] = useState(null);
  
  // Ref đến TextField tìm kiếm khách hàng
  const customerSearchRef = useRef(null);
  
  // State quản lý việc mở/đóng modal giảm giá
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  
  // State lưu giá trị giảm giá đang nhập (string để cho phép nhập tự do)
  const [discountInput, setDiscountInput] = useState(discount.toString());
  
  // Ref đến TextField giảm giá để auto-focus và select text
  const discountInputRef = useRef(null);

  // State quản lý tài khoản ngân hàng cho chuyển khoản
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [addBankDialogOpen, setAddBankDialogOpen] = useState(false);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState({
    bankName: '',
    bankCode: '',
    accountNumber: '',
    accountName: ''
  });

  // useEffect: Sync discountInput với discount prop
  // Chạy mỗi khi discount prop thay đổi
  // Mục đích: Đảm bảo discountInput luôn đồng bộ với discount từ parent
  useEffect(() => {
    // Convert discount (number) sang string để hiển thị trong input
    setDiscountInput(discount.toString());
  }, [discount]); // Dependency: Chỉ chạy khi discount thay đổi

  // Load tài khoản ngân hàng từ localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pos_bank_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setBankAccounts(parsed);
          if (parsed.length > 0) {
            setSelectedBankAccountId(parsed[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Lỗi đọc tài khoản ngân hàng:', error);
    }
  }, []);

  const saveBankAccounts = (accounts) => {
    setBankAccounts(accounts);
    localStorage.setItem('pos_bank_accounts', JSON.stringify(accounts));
  };

  const selectedBankAccount =
    bankAccounts.find((account) => account.id === selectedBankAccountId) || null;

  const handleBankAccountChange = (event) => {
    const value = event.target.value;
    if (value === '__add__') {
      setAddBankDialogOpen(true);
      return;
    }
    setSelectedBankAccountId(value);
  };

  const getBankQrUrl = (account, amount, note) => {
    if (!account?.bankCode || !account?.accountNumber) return '';
    const cleanAmount = Math.max(0, Math.round(amount || 0));
    const addInfo = encodeURIComponent(note || '');
    const accountName = encodeURIComponent(account.accountName || '');
    return `https://img.vietqr.io/image/${account.bankCode}-${account.accountNumber}-compact2.png?amount=${cleanAmount}&addInfo=${addInfo}&accountName=${accountName}`;
  };

  // useEffect: Tự động focus và select text khi modal giảm giá mở
  // Chạy mỗi khi discountModalOpen thay đổi
  useEffect(() => {
    // Chỉ focus nếu modal đang mở VÀ ref tồn tại
    if (discountModalOpen && discountInputRef.current) {
      // setTimeout: Delay 100ms để đảm bảo modal đã render xong
      // Nếu không delay, có thể focus vào element chưa render
      setTimeout(() => {
        // Optional chaining (?.) để tránh lỗi nếu ref.current là null
        discountInputRef.current?.focus();  // Focus vào input
        discountInputRef.current?.select();  // Select toàn bộ text (bôi đen)
      }, 100);
    }
  }, [discountModalOpen]); // Dependency: Chỉ chạy khi discountModalOpen thay đổi
  // Hàm tính giá bán sau giảm giá cho từng sản phẩm
  // item: Object chứa product, qty, discount, discountType
  // Trả về: Giá bán cuối cùng sau khi áp dụng giảm giá
  const calculateItemFinalPrice = (item) => {
    // Lấy giá gốc của sản phẩm
    const basePrice = item.product.price;
    // Lấy giảm giá của sản phẩm, mặc định 0 nếu không có
    const discount = item.discount || 0;
    // Lấy loại giảm giá, mặc định 'vnd' nếu không có
    const discountType = item.discountType || 'vnd';
    
    // Nếu giảm giá theo phần trăm
    if (discountType === 'percent') {
      // Giá sau giảm = giá gốc * (1 - phần trăm giảm / 100)
      // VD: 100.000 - 10% = 100.000 * (1 - 10/100) = 90.000
      return basePrice * (1 - discount / 100);
    } else {
      // Nếu giảm giá theo VND: Giá sau giảm = giá gốc - số tiền giảm
      // Math.max(0, ...): Đảm bảo giá không âm (không được < 0)
      return Math.max(0, basePrice - discount);
    }
  };

  // Tính tổng tiền hàng (sau giảm giá từng sản phẩm)
  // reduce: Duyệt qua mảng items và tính tổng
  // sum: Giá trị tích lũy, bắt đầu từ 0
  // item: Từng sản phẩm trong giỏ
  // Trả về: Tổng tiền = tổng của (giá sau giảm * số lượng) của tất cả sản phẩm
  const subtotalAmount = items.reduce((sum, item) => {
    // Tính giá sau giảm giá của sản phẩm
    const finalPrice = calculateItemFinalPrice(item);
    // Cộng dồn: tổng + (giá sau giảm * số lượng)
    return sum + (finalPrice * item.qty);
  }, 0);

  // Hàm tính giảm giá chung (áp dụng cho toàn bộ đơn hàng)
  // Trả về: Số tiền được giảm
  const calculateOrderDiscount = () => {
    // Nếu không có giảm giá hoặc giảm giá = 0, trả về 0
    if (!discount || discount === 0) return 0;
    
    // Nếu giảm giá theo phần trăm
    if (discountType === 'percent') {
      // Số tiền giảm = tổng tiền hàng * (phần trăm / 100)
      // VD: Tổng 100.000, giảm 10% = 100.000 * 10/100 = 10.000
      return subtotalAmount * (discount / 100);
    } else {
      // Nếu giảm giá theo VND
      // Math.min: Đảm bảo không giảm quá tổng tiền hàng
      // VD: Tổng 50.000, giảm 100.000 → chỉ giảm 50.000
      return Math.min(discount, subtotalAmount);
    }
  };

  // Tính số tiền giảm giá chung
  const orderDiscount = calculateOrderDiscount();
  
  // Tính tổng tiền cuối cùng = tổng tiền hàng - giảm giá chung
  // Math.max(0, ...): Đảm bảo tổng tiền không âm
  const totalAmount = Math.max(0, subtotalAmount - orderDiscount);

  // Số tiền khách cần trả = tổng tiền cuối cùng
  const needToPay = totalAmount;

  // Mảng các số tiền nhanh để user click chọn
  // Bao gồm: số tiền cần trả, số tiền cần trả + 3k, + 8k, và các mốc cố định
  const quickAmounts = [
    needToPay,           // Số tiền cần trả (để trả đúng)
    needToPay + 3000,    // Số tiền cần trả + 3.000đ
    needToPay + 8000,    // Số tiền cần trả + 8.000đ
    60000,               // 60.000đ
    100000,              // 100.000đ
    200000,              // 200.000đ
    500000               // 500.000đ
  ]
    .filter(amount => amount > 0)  // Lọc bỏ các số <= 0
    .slice(0, 7);                  // Chỉ lấy tối đa 7 số tiền

  // Format ngày giờ hiện tại để hiển thị
  const now = new Date();
  // Tạo chuỗi ngày giờ: DD/MM/YYYY HH:mm
  // getDate(): Lấy ngày (1-31)
  // getMonth(): Lấy tháng (0-11), cần +1 để có tháng đúng
  // getFullYear(): Lấy năm đầy đủ (2024)
  // getHours(): Lấy giờ (0-23)
  // getMinutes(): Lấy phút (0-59)
  // padStart(2, '0'): Thêm số 0 ở đầu nếu < 10 (VD: 5 → "05")
  const dateTimeStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Return JSX để render component
  return (
    // Box container với height 100%, flex layout dọc, gap 1.5 đơn vị giữa các children
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Paper component chứa thông tin khách hàng */}
      <Paper sx={{ p: 1.5 }}>
          {/* Box hiển thị tên nhân viên thu ngân và ngày giờ */}
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Box chứa tên nhân viên thu ngân và icon dropdown */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {cashierName}
              </Typography>
              <ArrowDropDownIcon fontSize="small" color="action" />
            </Box>
            {/* Typography hiển thị ngày giờ hiện tại */}
            <Typography variant="caption" color="text.secondary">
              {dateTimeStr}
            </Typography>
          </Box>

          {/* TextField tìm kiếm/hiển thị khách hàng */}
          <TextField
            // ref callback: Lưu reference đến element và set anchor cho dropdown
            ref={(el) => {
              customerSearchRef.current = el;  // Lưu ref để có thể access sau
              if (el) {
                setCustomerSearchAnchor(el);   // Set anchor element để đặt vị trí dropdown
              }
            }}
            fullWidth              // Chiếm toàn bộ chiều rộng
            size="small"           // Kích thước nhỏ
          placeholder="Tìm khách hàng (F4)"  // Placeholder text
            value={(customerName || customerPhone)
              ? [customerName, customerPhone].filter(Boolean).join(' ')
              : customerSearchTerm}  // Hiển thị tên + SĐT khi đã chọn
            onClick={() => {
              if (customerName || customerPhone) {
                if (onCustomerEdit && customerLocalId) {
                  onCustomerEdit(customerLocalId);
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {(customerName || customerPhone) ? (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCustomerClear) onCustomerClear();
                        if (onCustomerSearchChange) onCustomerSearchChange('');
                        setCustomerSearchOpen(false);
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton size="small" onClick={onAddCustomer}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
              readOnly: Boolean(customerName || customerPhone)
            }}
            sx={{
              '& .MuiInputBase-input': {
                cursor: (customerName || customerPhone) ? 'pointer' : 'text',
                textDecoration: (customerName || customerPhone) ? 'underline' : 'none'
              }
            }}
            onChange={(e) => {
              if (customerName || customerPhone) return;
              const value = e.target.value;
              if (onCustomerSearchChange) onCustomerSearchChange(value);
              // Mở dropdown nếu có text (trim để bỏ khoảng trắng)
              setCustomerSearchOpen(value.trim().length > 0);
            }}
            onFocus={() => {
              // Khi focus vào input, mở dropdown nếu đã có số điện thoại
              if (!(customerName || customerPhone) && customerSearchTerm.trim().length > 0) {
                setCustomerSearchOpen(true);
              }
            }}
          />

          {(customerName || customerPhone) && (
            <>
              {/* Box hiển thị số nợ và điểm tích lũy */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', mt: 1 }}>
                {/* Số nợ - Hiển thị màu đỏ nếu khác 0 */}
                <Box
                  sx={{
                    bgcolor: customerDebt !== 0 ? 'error.light' : 'action.selected',
                    color: customerDebt !== 0 ? 'error.main' : 'text.secondary',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Nợ: {customerDebt !== 0 ? `- ${Math.abs(customerDebt).toLocaleString('vi-VN')}` : '0'}
                  </Typography>
                </Box>
                {/* Số điểm tích lũy - Hiển thị màu xanh */}
                <Box
                  sx={{
                    bgcolor: customerPoints > 0 ? 'success.light' : 'action.selected',
                    color: customerPoints > 0 ? 'success.main' : 'text.secondary',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Điểm: {customerPoints > 0 ? customerPoints : 0}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
          {/* CustomerSearchDropdown: Component hiển thị kết quả tìm kiếm */}
          <CustomerSearchDropdown
            searchTerm={customerSearchTerm}        // Từ khóa tìm kiếm
            open={customerSearchOpen}         // Control mở/đóng dropdown
            anchorEl={customerSearchAnchor}   // Element để đặt vị trí dropdown
            onClose={() => setCustomerSearchOpen(false)}  // Callback khi đóng
            onSelectCustomer={(customer) => {
              // Callback khi user chọn khách hàng từ dropdown
              if (onCustomerSelect) {
                onCustomerSelect(customer);
              }
              // Đóng dropdown sau khi chọn
              setCustomerSearchOpen(false);
            }}
          />
      </Paper>

      {/* Tóm tắt đơn hàng và thanh toán */}
      <Paper sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">
            Tổng tiền hàng
          </Typography>
          <Chip label={items.reduce((sum, item) => sum + item.qty, 0)} />
          {/* <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {items.reduce((sum, item) => sum + item.qty, 0)}
            </Typography> */}
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {totalAmount.toLocaleString('vi-VN')}
            </Typography>
          </Box>
        </Box>

        {/* Box chứa phần giảm giá - Clickable để mở modal */}
        <Box sx={{ mb: 1 }}>
          {/* Box clickable để mở modal giảm giá */}
          <Box 
            sx={{ 
              display: 'flex',              // Layout ngang
              justifyContent: 'space-between', // 2 phần tử ở 2 đầu
              alignItems: 'center',         // Căn giữa theo chiều dọc
              cursor: 'pointer',            // Con trỏ pointer khi hover
              p: 1,                        // Padding 1 đơn vị
              borderRadius: 1,              // Bo góc 1 đơn vị
              '&:hover': {                 // Style khi hover
                bgcolor: 'action.hover',   // Background màu hover
              }
            }}
            onClick={() => setDiscountModalOpen(true)}  // Mở modal khi click
          >
            {/* Text "Giảm giá:" */}
            <Typography variant="body2">Giảm giá:</Typography>
            {/* Text hiển thị số tiền giảm giá với format VN */}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {orderDiscount.toLocaleString('vi-VN')} đ
            </Typography>
          </Box>
        </Box>

        {/* Modal giảm giá */}
        <Dialog 
          open={discountModalOpen} 
          onClose={() => setDiscountModalOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Giảm giá</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Nhập số tiền giảm giá:</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <TextField
                    inputRef={discountInputRef}
                    autoFocus
                    fullWidth
                    size="small"
                    value={discountInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Chỉ cho phép số và dấu chấm
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setDiscountInput(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const discountValue = parseFloat(discountInput) || 0;
                        if (onDiscountChange) {
                          onDiscountChange(discountValue, discountType);
                        }
                        setDiscountModalOpen(false);
                      }
                    }}
                    placeholder="0"
                    onFocus={(e) => {
                      // Tự động select toàn bộ text khi focus
                      // Sử dụng setTimeout nhỏ để đảm bảo focus đã hoàn tất trước khi select
                      setTimeout(() => {
                        e.target.select();
                      }, 10);
                    }}
                  />
                  <Button
                    size="small"
                    variant={discountType === 'vnd' ? 'contained' : 'outlined'}
                    onClick={() => {
                      const discountValue = parseFloat(discountInput) || 0;
                      if (onDiscountChange) {
                        onDiscountChange(discountValue, 'vnd');
                      }
                    }}
                    sx={{ minWidth: 60, fontSize: '0.75rem' }}
                  >
                    VND
                  </Button>
                  <Button
                    size="small"
                    variant={discountType === 'percent' ? 'contained' : 'outlined'}
                    onClick={() => {
                      const discountValue = parseFloat(discountInput) || 0;
                      if (onDiscountChange) {
                        onDiscountChange(discountValue, 'percent');
                      }
                    }}
                    sx={{ minWidth: 60, fontSize: '0.75rem' }}
                  >
                    %
                  </Button>
                </Box>
              </Box>
              {discountInput && parseFloat(discountInput) > 0 && (
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" >
                    Giảm giá: {(() => {
                      const discountValue = parseFloat(discountInput) || 0;
                      if (discountType === 'percent') {
                        const discountAmount = subtotalAmount * (discountValue / 100);
                        return `${discountAmount.toLocaleString('vi-VN')} đ (${discountValue}%)`;
                      } else {
                        return `${discountValue.toLocaleString('vi-VN')} đ`;
                      }
                    })()}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDiscountModalOpen(false)}>Hủy</Button>
            <Button 
              variant="contained" 
              onClick={() => {
                const discountValue = parseFloat(discountInput) || 0;
                if (onDiscountChange) {
                  onDiscountChange(discountValue, discountType);
                }
                setDiscountModalOpen(false);
              }}
            >
              Áp dụng
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Khách cần trả:
          </Typography>
          <Typography variant="body1" color="primary" sx={{ fontWeight: 700 }}>
            {needToPay.toLocaleString('vi-VN')} đ
          </Typography>
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Khách thanh toán
            </Typography>
            <GridIcon fontSize="small" color="action" />
          </Box>
          <TextField
            fullWidth
            size="small"
            value={amountPaid || needToPay}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              onAmountPaidChange && onAmountPaidChange(value);
            }}
            type="number"
          />
        </Box>

        {paymentMethod !== 'bank' && (
          <>
            {/* Grid container chứa các nút số tiền nhanh */}
            {/* spacing: Khoảng cách giữa các item là 0.5 đơn vị */}
            <Grid container spacing={0.5} sx={{ mb: 1.5 }}>
              {/* Map qua mảng quickAmounts để render các Chip */}
              {quickAmounts.map((amount, index) => (
                // Grid item chiếm 4/12 cột (xs={4}) = 33.33% chiều rộng
                <Grid item xs={4} key={index}>
                  {/* Chip component: Tag/badge có thể click */}
                  <Chip
                    // label: Text hiển thị trên chip (số tiền với format VN)
                    label={amount.toLocaleString('vi-VN')}
                    // onClick: Khi click, set số tiền trả = amount
                    onClick={() => onAmountPaidChange && onAmountPaidChange(amount)}
                    // color: Màu primary nếu đang được chọn, default nếu không
                    color={amountPaid === amount ? 'primary' : 'default'}
                    sx={{
                      width: '100%',           // Chiếm toàn bộ chiều rộng của Grid item
                      cursor: 'pointer',        // Con trỏ pointer khi hover
                      // Font weight đậm nếu đang được chọn, bình thường nếu không
                      fontWeight: amountPaid === amount ? 600 : 400,
                      fontSize: '0.75rem',     // Font size nhỏ
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* FormControl: Container cho radio group phương thức thanh toán */}
        <FormControl component="fieldset" fullWidth>
          {/* FormLabel: Label cho radio group */}
          <FormLabel component="legend" sx={{ mb: 0.5, fontSize: '0.875rem', fontWeight: 600 }}>
            Phương thức thanh toán
          </FormLabel>
          {/* RadioGroup: Group các radio button */}
          <RadioGroup
            value={paymentMethod}  // Giá trị đang được chọn
            // onChange: Cập nhật phương thức thanh toán khi user chọn
            onChange={(e) => onPaymentMethodChange && onPaymentMethodChange(e.target.value)}
            row                    // Layout ngang (các radio button nằm ngang)
            sx={{ gap: 1 }}        // Khoảng cách giữa các radio button
          >
            {/* FormControlLabel: Radio button "Tiền mặt" */}
            <FormControlLabel value="cash" control={<Radio size="small" />} label="Tiền mặt" sx={{ m: 0 }} />
            {/* FormControlLabel: Radio button "Chuyển khoản" */}
            <FormControlLabel value="bank" control={<Radio size="small" />} label="Chuyển khoản" sx={{ m: 0 }} />
            {/* FormControlLabel: Radio button "Thẻ" */}
            {/* <FormControlLabel value="card" control={<Radio size="small" />} label="Thẻ" sx={{ m: 0 }} /> */}
            {/* FormControlLabel: Radio button "Ví" */}
            {/* <FormControlLabel value="wallet" control={<Radio size="small" />} label="Ví" sx={{ m: 0 }} /> */}
          </RadioGroup>
        </FormControl>

        {paymentMethod === 'bank' && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.25,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}
          >
            <TextField
              select
              size="small"
              fullWidth
              value={selectedBankAccountId}
              onChange={handleBankAccountChange}
              disabled={bankAccounts.length === 0}
              SelectProps={{
                displayEmpty: true,
                renderValue: (value) => {
                  const account = bankAccounts.find((item) => item.id === value);
                  if (!account) {
                    return (
                      <Typography variant="body2" color="text.secondary">
                        Chọn tài khoản ngân hàng
                      </Typography>
                    );
                  }
                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {account.bankName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {`${account.accountNumber}${account.accountName ? ` • ${account.accountName}` : ''}`}
                      </Typography>
                    </Box>
                  );
                }
              }}
            >
              {bankAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {account.bankName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`${account.accountNumber}${account.accountName ? ` • ${account.accountName}` : ''}`}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
              <MenuItem value="__add__">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  + Thêm tài khoản ngân hàng
                </Typography>
              </MenuItem>
            </TextField>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
              <Box
                sx={{
                  width: 96,
                  minWidth: 96,
                  height: 96,
                  bgcolor: 'common.white',
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                {selectedBankAccount ? (
                  <img
                    src={getBankQrUrl(
                      selectedBankAccount,
                      needToPay,
                      customerName || customerPhone || ''
                    )}
                    alt="QR chuyển khoản"
                    style={{ width: '88px', height: '88px' }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary" align="center">
                    Chưa có tài khoản
                  </Typography>
                )}
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 2,
                    alignItems: 'center'
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton
                      size="small"
                      disabled={!selectedBankAccount}
                      onClick={() => setQrPreviewOpen(true)}
                      sx={{ bgcolor: 'common.white', border: '1px solid', borderColor: 'divider' }}
                    >
                      <QrCode2Icon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                      Hiện mã QR
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton
                      size="small"
                      disabled={!selectedBankAccount}
                      sx={{ bgcolor: 'common.white', border: '1px solid', borderColor: 'divider' }}
                    >
                      <SyncIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                      Kiểm tra
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Button thanh toán - Button chính để hoàn tất đơn hàng */}
      <Button
        variant="contained"        // Style filled (nền đầy màu)
        fullWidth                  // Chiếm toàn bộ chiều rộng
        size="large"               // Kích thước lớn
        onClick={onCheckout}       // Gọi callback khi click
        // disabled: Vô hiệu hóa nếu giỏ hàng trống HOẶC tổng tiền <= 0
        disabled={items.length === 0 || needToPay <= 0}
        sx={{
          py: 1.5,                 // Padding dọc 1.5 đơn vị
          fontSize: '1rem',        // Font size 1rem
          fontWeight: 700,         // Font weight rất đậm
          textTransform: 'uppercase', // Chuyển text thành chữ hoa
        }}
      >
        THANH TOÁN
      </Button>

      {/* Dialog thêm tài khoản ngân hàng */}
      <Dialog open={addBankDialogOpen} onClose={() => setAddBankDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Thêm tài khoản ngân hàng</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <TextField
              label="Tên ngân hàng"
              size="small"
              value={newBankAccount.bankName}
              onChange={(e) => setNewBankAccount({ ...newBankAccount, bankName: e.target.value })}
            />
            <TextField
              label="Mã ngân hàng (VD: VCB, ACB)"
              size="small"
              value={newBankAccount.bankCode}
              onChange={(e) => setNewBankAccount({ ...newBankAccount, bankCode: e.target.value.toUpperCase() })}
            />
            <TextField
              label="Số tài khoản"
              size="small"
              value={newBankAccount.accountNumber}
              onChange={(e) => setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })}
            />
            <TextField
              label="Chủ tài khoản"
              size="small"
              value={newBankAccount.accountName}
              onChange={(e) => setNewBankAccount({ ...newBankAccount, accountName: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddBankDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={
              !newBankAccount.bankName.trim() ||
              !newBankAccount.bankCode.trim() ||
              !newBankAccount.accountNumber.trim()
            }
            onClick={() => {
              const newAccount = {
                id: `${Date.now()}`,
                bankName: newBankAccount.bankName.trim(),
                bankCode: newBankAccount.bankCode.trim(),
                accountNumber: newBankAccount.accountNumber.trim(),
                accountName: newBankAccount.accountName.trim()
              };
              const updated = [...bankAccounts, newAccount];
              saveBankAccounts(updated);
              setSelectedBankAccountId(newAccount.id);
              setNewBankAccount({
                bankName: '',
                bankCode: '',
                accountNumber: '',
                accountName: ''
              });
              setAddBankDialogOpen(false);
            }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog hiển thị mã QR lớn */}
      <Dialog open={qrPreviewOpen} onClose={() => setQrPreviewOpen(false)} maxWidth="xs">
        <DialogTitle>Mã QR chuyển khoản</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            {selectedBankAccount && (
              <img
                src={getBankQrUrl(
                  selectedBankAccount,
                  needToPay,
                  customerName || customerPhone || ''
                )}
                alt="QR chuyển khoản"
                style={{ width: 240, height: 240 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrPreviewOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
