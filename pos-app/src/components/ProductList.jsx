/**
 * COMPONENT: ProductList.jsx
 * 
 * Component hiển thị danh sách sản phẩm đã thêm vào hóa đơn dạng list
 * Quản lý số lượng, giảm giá từng sản phẩm
 * 
 * Dependencies:
 * - React Hooks: useState, useEffect, useRef
 * - Material-UI: Components cho UI
 * - Material-UI Icons: Icons cho buttons
 */

// React Hooks
// - useState: Quản lý state (local state của component)
// - useEffect: Side effects (đóng popup khi click outside, auto-focus)
// - useRef: Reference đến DOM elements (để focus input)
import { useState, useEffect, useRef } from 'react';

// Material-UI Components
// Ưu điểm: Component library đẹp, responsive, accessible, theme support
// Nhược điểm: Bundle size lớn (~200KB), có thể overkill cho project nhỏ
// Alternative: 
//   - Tailwind CSS: Utility-first, nhẹ hơn nhưng phải tự build components
//   - Chakra UI: Tương tự MUI nhưng nhẹ hơn
//   - Ant Design: Component library khác, phổ biến ở châu Á
import {
  Box,      // Container component, tương đương <div> nhưng có sx prop
  List,     // List container (ul)
  ListItem, // List item (li)
  IconButton, // Button với icon
  Typography, // Text component với variant (h1, h2, body1, etc.)
  TextField,  // Input field với label, helper text, error state
  Paper,      // Card-like container với shadow
  Button      // Button component
} from '@mui/material';

// Material-UI Icons
// Ưu điểm: Icon set đầy đủ, consistent style
// Nhược điểm: Bundle size lớn nếu import nhiều
// Alternative: 
//   - react-icons: Nhiều icon sets, tree-shakeable
//   - Heroicons: Icon set nhẹ, đẹp
import { 
  Add as AddIcon,      // Icon dấu + (tăng số lượng)
  Remove as RemoveIcon, // Icon dấu - (giảm số lượng)
  Delete as DeleteIcon  // Icon thùng rác (xóa sản phẩm)
} from '@mui/icons-material';

/**
 * Component ProductList: Hiển thị danh sách sản phẩm đã thêm vào hóa đơn dạng list
 * 
 * Props:
 * - items: Array<{product, qty, discount?, discountType?}> - Danh sách sản phẩm trong hóa đơn
 * - onUpdateQty: function(productLocalId, newQty)
 * - onUpdateDiscount: function(productLocalId, discount, discountType) - discountType: 'vnd' | 'percent'
 * - onRemove: function(productLocalId)
 * - onAddToCart: function(product) - Thêm sản phẩm vào giỏ
 */
export default function ProductList({ 
  items = [], 
  onUpdateQty, 
  onUpdateDiscount,
  onRemove,
  minQty = 1,
  getMaxQty,
  showQtyHint = false,
  disableDiscount = false
}) {
  const [qtyInputs, setQtyInputs] = useState({});
  const [discountPopup, setDiscountPopup] = useState(null); // { productLocalId, anchorEl }
  const [discountInputs, setDiscountInputs] = useState({}); // { productLocalId: { value, type } }
  const discountInputRefs = useRef({}); // Refs cho các TextField giảm giá
  const discountTimerRef = useRef(null); // Ref để lưu timer cho cleanup
  const discountInputsRef = useRef({}); // Ref giữ giá trị mới nhất để listener click-outside đọc đúng

  /**
   * HANDLER: Xử lý thay đổi số lượng trong input
   * 
   * @param {string} productLocalId - ID của sản phẩm
   * @param {string} value - Giá trị mới (string vì từ input)
   * 
   * Logic:
   * - Lưu giá trị vào local state (qtyInputs)
   * - Không update ngay lên parent (chờ blur hoặc Enter)
   * - Cho phép user xóa và nhập lại tự do
   * 
   * Tại sao dùng functional update (prev => {...}):
   * - Đảm bảo lấy state mới nhất
   * - Tránh closure stale state
   * - Best practice với React
   */
  const handleQtyInputChange = (productLocalId, value) => {
    // Functional update: Lấy state hiện tại và merge với giá trị mới
    // Spread operator (...prev): Giữ nguyên các giá trị khác
    // [productLocalId]: value: Update hoặc thêm mới key
    setQtyInputs(prev => ({
      ...prev,
      [productLocalId]: value
    }));
  };

  /**
   * HANDLER: Xử lý khi blur khỏi input số lượng
   * 
   * @param {string} productLocalId - ID của sản phẩm
   * 
   * Logic:
   * 1. Lấy giá trị từ local state
   * 2. Nếu không có (undefined): Không làm gì (user không thay đổi)
   * 3. Parse sang number
   * 4. Validate: Phải là số hợp lệ và >= 1
   * 5. Nếu hợp lệ: Update lên parent và xóa local state
   * 6. Nếu không hợp lệ: Khôi phục giá trị cũ từ items
   * 
   * Tại sao validate ở đây:
   * - User có thể nhập bất kỳ gì trong input
   * - Validate khi blur để đảm bảo data integrity
   * - UX tốt: Khôi phục nếu nhập sai
   */
  const handleQtyBlur = (productLocalId) => {
    // Lấy giá trị từ local state
    const inputValue = qtyInputs[productLocalId];
    
    // Early return: Nếu không có inputValue, user không thay đổi gì
    // Giữ nguyên giá trị hiện tại từ items
    if (inputValue === undefined) {
      return;
    }
    
    // Parse string sang number
    // parseInt(): Parse số nguyên, bỏ phần thập phân
    // VD: "123" -> 123, "123.45" -> 123, "abc" -> NaN
    const qty = parseInt(inputValue);
    
    const item = items.find(i => i.product.localId === productLocalId);
    const maxQty = typeof getMaxQty === 'function' && item ? getMaxQty(item) : null;

    // Validation: Kiểm tra hợp lệ
    // isNaN(): Kiểm tra có phải NaN không
    // qty < minQty: Số lượng phải >= minQty
    // inputValue === '': Không được để trống
    if (
      isNaN(qty) ||
      qty < minQty ||
      inputValue === '' ||
      (typeof maxQty === 'number' && qty > maxQty)
    ) {
      // Invalid: Khôi phục giá trị cũ
      // Tìm item trong items để lấy qty cũ
      if (item) {
        // Khôi phục giá trị cũ vào local state
        setQtyInputs(prev => ({
          ...prev,
          [productLocalId]: item.qty.toString()
        }));
      }
    } else {
      // Valid: Update lên parent
      // Kiểm tra callback có tồn tại không (optional)
      if (onUpdateQty) {
        onUpdateQty(productLocalId, qty);
      }
      // Xóa local state sau khi update
      // Tại sao xóa: Để lần sau blur không trigger lại nếu user không thay đổi
      setQtyInputs(prev => {
        const newState = { ...prev };
        delete newState[productLocalId]; // Xóa key khỏi object
        return newState;
      });
    }
  };

  const handleIncreaseQty = (productLocalId) => {
    const item = items.find(i => i.product.localId === productLocalId);
    if (item && onUpdateQty) {
      const maxQty = typeof getMaxQty === 'function' ? getMaxQty(item) : null;
      if (typeof maxQty === 'number' && item.qty >= maxQty) return;
      onUpdateQty(productLocalId, item.qty + 1);
    }
  };

  const handleDecreaseQty = (productLocalId) => {
    const item = items.find(i => i.product.localId === productLocalId);
    if (item && onUpdateQty) {
      if (item.qty > minQty) {
        onUpdateQty(productLocalId, item.qty - 1);
      } else if (onRemove) {
        onRemove(productLocalId);
      }
    }
  };

  // Xử lý mở popup giảm giá
  const handlePriceClick = (event, item) => {
    if (disableDiscount) return;
    const productLocalId = item.product.localId;
    setDiscountPopup({ productLocalId, anchorEl: event.currentTarget });
    
    // Khởi tạo giá trị discount nếu chưa có
    if (!discountInputs[productLocalId]) {
      const discount = item.discount || 0;
      const discountType = item.discountType || 'vnd';
      setDiscountInputs(prev => ({
        ...prev,
        [productLocalId]: { value: discount.toString(), type: discountType }
      }));
    }
    
    // Tự động focus và select text sau khi popup mở
    // Sử dụng requestAnimationFrame để đảm bảo DOM đã render xong, sau đó setTimeout để đảm bảo input đã sẵn sàng
    requestAnimationFrame(() => {
      setTimeout(() => {
        const inputElement = discountInputRefs.current[productLocalId];
        if (inputElement) {
          inputElement.focus();
          // Sử dụng setTimeout nhỏ để đảm bảo focus đã hoàn tất trước khi select
          setTimeout(() => {
            inputElement.select();
          }, 10);
        }
      }, 200); // Delay 200ms để đảm bảo popup đã render xong
    });
  };

  // Đóng popup giảm giá
  const handleDiscountClose = () => {
    setDiscountPopup(null);
  };

  // Xử lý thay đổi discount input
  const handleDiscountInputChange = (productLocalId, value) => {
    setDiscountInputs(prev => ({
      ...prev,
      [productLocalId]: {
        ...prev[productLocalId],
        value: value === '' ? '' : value.replace(/[^\d.]/g, '')
      }
    }));
  };

  // Xử lý thay đổi discount type (VND hoặc %)
  const handleDiscountTypeChange = (productLocalId, type) => {
    setDiscountInputs(prev => ({
      ...prev,
      [productLocalId]: {
        ...prev[productLocalId],
        type
      }
    }));
  };

  // Luôn đồng bộ ref với state để listener click-outside đọc được giá trị mới nhất
  discountInputsRef.current = discountInputs;

  // Áp dụng discount khi blur hoặc enter (hoặc khi click ra ngoài)
  const handleDiscountBlur = (productLocalId) => {
    const input = discountInputsRef.current[productLocalId];
    if (input && onUpdateDiscount) {
      const discount = parseFloat(input.value) || 0;
      onUpdateDiscount(productLocalId, discount, input.type);
    }
    // Không đóng popup ngay, để người dùng có thể chỉnh sửa tiếp
  };

  // Tính giá bán sau khi giảm giá
  const calculateFinalPrice = (item) => {
    const basePrice = item.product.price;
    const discount = item.discount || 0;
    const discountType = item.discountType || 'vnd';
    
    if (discountType === 'percent') {
      return basePrice * (1 - discount / 100);
    } else {
      return Math.max(0, basePrice - discount);
    }
  };

  // Tự động focus và select text khi mở popup giảm giá
  // useEffect này đảm bảo focus và select ngay cả khi popup được mở từ nơi khác
  useEffect(() => {
    if (discountPopup) {
      const productLocalId = discountPopup.productLocalId;
      
      // Hàm helper để focus và select
      const focusAndSelect = () => {
        const inputElement = discountInputRefs.current[productLocalId];
        if (inputElement) {
          // Sử dụng requestAnimationFrame để đảm bảo DOM đã sẵn sàng
          requestAnimationFrame(() => {
            inputElement.focus();
            // Sử dụng setTimeout nhỏ để đảm bảo focus đã hoàn tất trước khi select
            setTimeout(() => {
              inputElement.select();
            }, 10);
          });
          return true;
        }
        return false;
      };
      
      // Thử focus ngay lập tức (nếu ref đã được set)
      if (focusAndSelect()) {
        return; // Nếu thành công, không cần retry
      }
      
      // Nếu chưa có ref, thử lại sau một khoảng thời gian ngắn
      // Điều này xảy ra khi popup vừa mở và ref chưa được set
      const timer1 = setTimeout(() => {
        if (!focusAndSelect()) {
          // Nếu vẫn chưa có, thử lại lần nữa với delay dài hơn
          discountTimerRef.current = setTimeout(() => {
            focusAndSelect();
            discountTimerRef.current = null;
          }, 300);
        }
      }, 150);
      
      // Cleanup function: Xóa các timer khi component unmount hoặc discountPopup thay đổi
      return () => {
        clearTimeout(timer1);
        if (discountTimerRef.current) {
          clearTimeout(discountTimerRef.current);
          discountTimerRef.current = null;
        }
      };
    }
  }, [discountPopup]);

  // Đóng popup khi click bên ngoài — trước khi đóng, áp dụng giảm giá đang nhập (như khi blur)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (discountPopup && 
          discountPopup.anchorEl && 
          !discountPopup.anchorEl.contains(event.target) &&
          !event.target.closest('.discount-popup')) {
        handleDiscountBlur(discountPopup.productLocalId);
        handleDiscountClose();
      }
    };

    if (discountPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [discountPopup]);

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Danh sách sản phẩm */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Chưa có sản phẩm nào trong hóa đơn
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {items.map((item, index) => (
              <ListItem
                key={item.product.localId}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 2,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    '& .qty-controls': {
                      opacity: 1,
                      visibility: 'visible',
                    },
                    '& .delete-button': {
                      opacity: 1,
                      visibility: 'visible',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                  {/* STT */}
                  <Typography
                    variant="body2"
                    sx={{ minWidth: 30, textAlign: 'center', fontWeight: 500 }}
                  >
                    {items.length - index}
                  </Typography>

                  {/* Thông tin sản phẩm */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      {item.product.productCode || item.product.barcode || item.product.localId.slice(0, 8)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.product.name}
                    </Typography>
                  </Box>

                  {/* Số lượng */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, minWidth: 90 }}>
                    <IconButton
                      className="qty-controls"
                      size="small"
                      onClick={() => handleDecreaseQty(item.product.localId)}
                      sx={{ 
                        padding: '4px',
                        opacity: 0,
                        visibility: 'hidden',
                        transition: 'opacity 0.2s, visibility 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        }
                      }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <TextField
                        type="text"
                        value={qtyInputs[item.product.localId] !== undefined ? qtyInputs[item.product.localId] : item.qty}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Chỉ cho phép số hoặc chuỗi rỗng
                          if (value === '' || /^\d+$/.test(value)) {
                            handleQtyInputChange(item.product.localId, value);
                          }
                        }}
                        onBlur={() => handleQtyBlur(item.product.localId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                        size="small"
                        inputProps={{
                          style: { 
                            textAlign: 'center',
                            padding: '4px 8px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            width: '50px',
                            height: '28px',
                            lineHeight: '20px'
                          }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            height: '28px',
                            '& fieldset': {
                              border: 'none',
                              borderBottom: '1px solid',
                              borderColor: 'text.secondary',
                              borderRadius: 0,
                            },
                            '&:hover fieldset': {
                              borderColor: 'primary.main',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'primary.main',
                              borderWidth: '1px',
                            },
                          },
                          '& input': {
                            textAlign: 'center',
                            height: '28px',
                            padding: '4px 8px !important',
                            color: item.product.stock <= 0 ? 'error.main' : 'inherit'
                          },
                          width: '50px',
                        }}
                      />
                      {showQtyHint && typeof getMaxQty === 'function' && typeof getMaxQty(item) === 'number' && (
                        <Typography variant="caption" color="text.secondary">
                          / {getMaxQty(item)}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      className="qty-controls"
                      size="small"
                      onClick={() => handleIncreaseQty(item.product.localId)}
                      sx={{ 
                        padding: '4px',
                        opacity: 0,
                        visibility: 'hidden',
                        transition: 'opacity 0.2s, visibility 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        }
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Đơn giá */}
                  <Box sx={{ minWidth: 100, textAlign: 'right', position: 'relative' }}>
                    <Box sx={{ position: 'relative' }}>
                    <TextField
                      type="text"
                      value={calculateFinalPrice(item).toLocaleString('vi-VN')}
                      onClick={(e) => handlePriceClick(e, item)}
                      size="small"
                      autoFocus
                      inputProps={{
                        readOnly: true,
                        style: { 
                          textAlign: 'right',
                          padding: '4px 8px',
                          fontSize: '0.875rem',
                          cursor: disableDiscount ? 'default' : 'pointer',
                          height: '28px',
                          lineHeight: '20px'
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          height: '28px',
                          '& fieldset': {
                            border: 'none',
                            borderBottom: '1px solid',
                            borderColor: 'text.secondary',
                            borderRadius: 0,
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                        '& input': {
                          height: '28px',
                          padding: '4px 8px !important',
                        },
                        width: '90px',
                      }}
                    />
                    {item.discount && item.discount > 0 && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'error.main',
                          display: 'block',
                          fontWeight: 500,
                          mt: 0.25,
                          textAlign: 'right',
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.discountType === 'percent' 
                          ? `- ${item.discount}%`
                          : `- ${item.discount.toLocaleString('vi-VN')}`
                        }
                      </Typography>
                    )}
                    </Box>
                    {/* Popup giảm giá */}
                    {!disableDiscount && discountPopup && discountPopup.productLocalId === item.product.localId && (
                      <Paper
                        className="discount-popup"
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          mt: 0.5,
                          p: 1.5,
                          minWidth: 250,
                          zIndex: 1300,
                          boxShadow: 4,
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">Đơn giá:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.product.price.toLocaleString('vi-VN')}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>Giảm giá:</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <TextField
                                inputRef={(el) => {
                                  if (el) {
                                    // Lưu reference đến input element
                                    const inputElement = el.querySelector('input');
                                    if (inputElement) {
                                      discountInputRefs.current[item.product.localId] = inputElement;
                                      
                                      // Nếu popup vừa mở cho sản phẩm này, tự động focus và select ngay
                                      // Kiểm tra xem popup có đang mở cho sản phẩm này không
                                      if (discountPopup && discountPopup.productLocalId === item.product.localId) {
                                        // Sử dụng requestAnimationFrame và setTimeout để đảm bảo element đã được mount hoàn toàn
                                        requestAnimationFrame(() => {
                                          setTimeout(() => {
                                            inputElement.focus();
                                            // Sử dụng setTimeout nhỏ để đảm bảo focus đã hoàn tất trước khi select
                                            setTimeout(() => {
                                              inputElement.select();
                                            }, 10);
                                          }, 50);
                                        });
                                      }
                                    }
                                  }
                                }}
                                size="small"
                                value={discountInputs[item.product.localId]?.value || ''}
                                onChange={(e) => handleDiscountInputChange(item.product.localId, e.target.value)}
                                onFocus={(e) => {
                                  // Tự động select toàn bộ text khi focus
                                  // Sử dụng setTimeout nhỏ để đảm bảo focus đã hoàn tất trước khi select
                                  setTimeout(() => {
                                    e.target.select();
                                  }, 10);
                                }}
                                onBlur={() => handleDiscountBlur(item.product.localId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                placeholder="0"
                                inputProps={{
                                  style: { 
                                    padding: '4px 8px',
                                    fontSize: '0.875rem'
                                  }
                                }}
                                sx={{
                                  flexGrow: 1,
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                      borderColor: 'primary.main',
                                    },
                                  },
                                }}
                              />
                              <Button
                                size="small"
                                variant={discountInputs[item.product.localId]?.type === 'vnd' ? 'contained' : 'outlined'}
                                onClick={() => handleDiscountTypeChange(item.product.localId, 'vnd')}
                                sx={{ minWidth: 60, fontSize: '0.75rem' }}
                              >
                                VND
                              </Button>
                              <Button
                                size="small"
                                variant={discountInputs[item.product.localId]?.type === 'percent' ? 'contained' : 'outlined'}
                                onClick={() => handleDiscountTypeChange(item.product.localId, 'percent')}
                                sx={{ minWidth: 60, fontSize: '0.75rem' }}
                              >
                                %
                              </Button>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Giá bán:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {(() => {
                                const input = discountInputs[item.product.localId];
                                if (!input || !input.value || input.value === '') {
                                  return item.product.price.toLocaleString('vi-VN');
                                }
                                const discount = parseFloat(input.value) || 0;
                                if (input.type === 'percent') {
                                  const finalPrice = item.product.price * (1 - discount / 100);
                                  return Math.round(finalPrice).toLocaleString('vi-VN');
                                } else {
                                  const finalPrice = Math.max(0, item.product.price - discount);
                                  return finalPrice.toLocaleString('vi-VN');
                                }
                              })()}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    )}
                  </Box>

                  {/* Thành tiền */}
                  <Box sx={{ minWidth: 120, textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, cursor: 'pointer' }} onClick={(e) => handlePriceClick(e, item)}>
                      {(calculateFinalPrice(item) * item.qty).toLocaleString('vi-VN')} đ
                    </Typography>
                  </Box>

                  {/* Button xóa sản phẩm */}
                  <IconButton
                    className="delete-button"
                    size="small"
                    onClick={() => {
                      if (window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi hóa đơn?')) {
                        if (onRemove) {
                          onRemove(item.product.localId);
                        }
                      }
                    }}
                    sx={{
                      color: 'error.main',
                      padding: '4px',
                      opacity: 0,
                      visibility: 'hidden',
                      transition: 'opacity 0.2s, visibility 0.2s',
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'error.dark',
                      },
                    }}
                    title="Xóa sản phẩm"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
