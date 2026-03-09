import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon
} from '@mui/icons-material';
import db from '../db/posDB';

/**
 * Component CustomerSearchDropdown: Dropdown hiển thị kết quả tìm kiếm khách hàng
 * 
 * Props:
 * - searchTerm: string - Từ khóa tìm kiếm (số điện thoại hoặc tên)
 * - open: boolean - Hiển thị dropdown
 * - anchorEl: HTMLElement - Element để đặt vị trí dropdown
 * - onClose: function() - Đóng dropdown
 * - onSelectCustomer: function(customer) - Chọn khách hàng
 */
export default function CustomerSearchDropdown({
  searchTerm = '',
  open = false,
  anchorEl = null,
  onClose,
  onSelectCustomer
}) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const itemRefs = useRef([]);

  // Tìm kiếm khách hàng
  const searchCustomers = (customersList, term) => {
    if (!term || term.trim().length === 0) {
      return [];
    }

    const trimmed = term.trim().toLowerCase();
    
    // Sử dụng Map để loại bỏ duplicate dựa trên localId
    const uniqueCustomersMap = new Map();
    
    customersList.forEach(customer => {
      // Chỉ thêm nếu chưa có trong map
      if (!uniqueCustomersMap.has(customer.localId)) {
        // Tìm theo số điện thoại
        const phoneMatch = customer.phone && customer.phone.toLowerCase().includes(trimmed);
        
        // Tìm theo tên
        const nameMatch = customer.name && customer.name.toLowerCase().includes(trimmed);
        
        // Tìm theo biệt danh
        const nicknameMatch = customer.nickname && customer.nickname.toLowerCase().includes(trimmed);
        
        if (phoneMatch || nameMatch || nicknameMatch) {
          uniqueCustomersMap.set(customer.localId, customer);
        }
      }
    });
    
    // Chuyển Map thành Array và sắp xếp
    return Array.from(uniqueCustomersMap.values()).sort((a, b) => {
      // Ưu tiên số điện thoại khớp chính xác
      const aPhoneExact = a.phone?.toLowerCase() === trimmed;
      const bPhoneExact = b.phone?.toLowerCase() === trimmed;
      
      if (aPhoneExact && !bPhoneExact) return -1;
      if (!aPhoneExact && bPhoneExact) return 1;
      
      // Sau đó ưu tiên số điện thoại bắt đầu bằng term
      const aPhoneStarts = a.phone?.toLowerCase().startsWith(trimmed);
      const bPhoneStarts = b.phone?.toLowerCase().startsWith(trimmed);
      
      if (aPhoneStarts && !bPhoneStarts) return -1;
      if (!aPhoneStarts && bPhoneStarts) return 1;
      
      return 0;
    });
  };

  // Load customers với debounce
  const loadCustomers = useCallback(async (term) => {
    if (!term || term.trim().length === 0) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Đảm bảo database đã được mở
      await db.open().catch(err => {
        if (err.name !== 'DatabaseClosedError') {
          throw err;
        }
      });

      // Lấy tất cả khách hàng
      const allCustomers = await db.customers.toArray();
      
      // Loại bỏ duplicate dựa trên số điện thoại (ưu tiên khách hàng mới nhất)
      const uniqueCustomersMap = new Map();
      allCustomers.forEach(customer => {
        if (customer.phone) {
          const existing = uniqueCustomersMap.get(customer.phone);
          if (!existing || (customer.createdAt && existing.createdAt && customer.createdAt > existing.createdAt)) {
            uniqueCustomersMap.set(customer.phone, customer);
          }
        } else {
          // Nếu không có phone, dùng localId làm key
          if (!uniqueCustomersMap.has(customer.localId)) {
            uniqueCustomersMap.set(customer.localId, customer);
          }
        }
      });
      const uniqueCustomers = Array.from(uniqueCustomersMap.values());
      
      // Tìm kiếm
      const filtered = searchCustomers(uniqueCustomers, term);
      
      setCustomers(filtered);
    } catch (error) {
      console.error('Lỗi load khách hàng:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (open && searchTerm.trim()) {
      // Debounce search: chờ 300ms sau khi người dùng ngừng gõ
      debounceTimerRef.current = setTimeout(() => {
        loadCustomers(searchTerm);
      }, 300);
    } else {
      setCustomers([]);
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, open, loadCustomers]);

  useEffect(() => {
    if (!open || customers.length === 0) {
      setHighlightIndex(-1);
      return;
    }
    setHighlightIndex(0);
  }, [customers, open]);

  useEffect(() => {
    if (!open || !anchorEl) return;
    const handleKeyDown = (event) => {
      if (!open || customers.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, customers.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter') {
        if (highlightIndex >= 0 && customers[highlightIndex]) {
          event.preventDefault();
          handleSelectCustomer(customers[highlightIndex]);
        }
      } else if (event.key === 'Escape') {
        if (onClose) onClose();
      }
    };

    anchorEl.addEventListener('keydown', handleKeyDown);
    return () => {
      anchorEl.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, anchorEl, customers, highlightIndex, onClose]);

  useEffect(() => {
    const current = itemRefs.current[highlightIndex];
    if (current && dropdownRef.current) {
      current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        open &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        anchorEl &&
        !anchorEl.contains(event.target)
      ) {
        if (onClose) {
          onClose();
        }
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open, anchorEl, onClose]);

  const handleSelectCustomer = (customer) => {
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
    if (onClose) {
      onClose();
    }
  };

  // Tính toán vị trí dropdown
  const getDropdownPosition = () => {
    if (!anchorEl) return { top: 0, left: 0, width: 0 };
    
    const rect = anchorEl.getBoundingClientRect();
    return {
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    };
  };

  if (!open || !anchorEl) return null;

  const position = getDropdownPosition();

  return (
    <Paper
      ref={dropdownRef}
      sx={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 1300,
        boxShadow: 4,
        mt: 0.5,
      }}
    >
      {loading ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Đang tìm kiếm...
          </Typography>
        </Box>
      ) : customers.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Không tìm thấy khách hàng
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {customers.map((customer, index) => (
            <Box key={customer.localId}>
              <ListItem disablePadding>
                <ListItemButton
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  selected={index === highlightIndex}
                  onClick={() => handleSelectCustomer(customer)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                    },
                    '&.Mui-selected:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={(() => {
                      const name = String(customer.name || '').trim();
                      const nickname = String(customer.nickname || '').trim();
                      if (name && nickname) return `${name} (${nickname})`;
                      return name || nickname || 'Khách hàng';
                    })()}
                    secondary={customer.phone || 'Chưa có số điện thoại'}
                  />
                </ListItemButton>
              </ListItem>
              {index < customers.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Paper>
  );
}
