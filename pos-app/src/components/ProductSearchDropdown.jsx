import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Image as ImageIcon,
  Add as AddIcon
} from '@mui/icons-material';
import db, { generateLocalId, checkBarcodeExists, generateProductCode, checkProductCodeExists } from '../db/posDB';
import { searchProducts, isBarcode } from '../utils/searchUtils';

/**
 * Component ProductSearchDropdown: Dropdown hiển thị kết quả tìm kiếm sản phẩm
 * 
 * Props:
 * - searchTerm: string - Từ khóa tìm kiếm
 * - open: boolean - Hiển thị dropdown
 * - anchorEl: HTMLElement - Element để đặt vị trí dropdown
 * - onClose: function() - Đóng dropdown
 * - onAddToCart: function(product) - Thêm sản phẩm vào giỏ
 */
export default function ProductSearchDropdown({
  searchTerm = '',
  open = false,
  anchorEl = null,
  onClose,
  onAddToCart,
  onProductAdded
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef([]);
  const onAddToCartRef = useRef(onAddToCart);
  const onCloseRef = useRef(onClose);
  
  // State cho dialog thêm sản phẩm
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    productCode: '',
    name: '',
    barcode: '',
    categoryId: '',
    allowPoints: true,
    price: '',
    costPrice: '',
    stock: '',
    unit: 'Cái'
  });
  const [addProductError, setAddProductError] = useState('');
  const [addProductLoading, setAddProductLoading] = useState(false);
  
  // State cho categories và dialog thêm category
  const [categories, setCategories] = useState([]);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    onAddToCartRef.current = onAddToCart;
  }, [onAddToCart]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /**
   * Hàm load products với debounce
   * useCallback: Memoize function để tránh tạo function mới mỗi lần render
   * Dependencies: [onAddToCart, onClose] - Chỉ tạo lại function khi dependencies thay đổi
   * 
   * @param {string} term - Từ khóa tìm kiếm
   * 
   * Logic:
   * 1. Kiểm tra term có giá trị không
   * 2. Nếu không có: Clear products và tắt loading
   * 3. Nếu có: Load products từ database và filter theo term
   */
  const loadProducts = useCallback(async (term) => {
    // Early return: Nếu không có từ khóa hoặc chỉ có khoảng trắng
    if (!term || term.trim().length === 0) {
      setProducts([]);      // Clear danh sách sản phẩm
      setLoading(false);    // Tắt loading state
      return;               // Dừng hàm
    }

    try {
      setLoading(true);
      
      // Đảm bảo database đã được mở
      await db.open().catch(err => {
        if (err.name !== 'DatabaseClosedError') {
          throw err;
        }
      });

      // Lấy tất cả sản phẩm
      const allProducts = await db.products.toArray();
      
      // Filter: chỉ lấy sản phẩm chưa bị xóa
      const activeProducts = allProducts.filter(
        product => !product.deleted || product.deleted === false
      );

      // Loại bỏ duplicate dựa trên barcode (ưu tiên sản phẩm mới nhất)
      const uniqueProductsMap = new Map();
      activeProducts.forEach(product => {
        if (product.barcode) {
          const existing = uniqueProductsMap.get(product.barcode);
          if (!existing || (product.updatedAt && existing.updatedAt && product.updatedAt > existing.updatedAt)) {
            uniqueProductsMap.set(product.barcode, product);
          }
        } else {
          // Nếu không có barcode, dùng localId làm key
          if (!uniqueProductsMap.has(product.localId)) {
            uniqueProductsMap.set(product.localId, product);
          }
        }
      });
      const uniqueProducts = Array.from(uniqueProductsMap.values());

      // Nếu không có sản phẩm nào, return ngay
      if (uniqueProducts.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Tìm kiếm với logic tối ưu
      const filtered = searchProducts(uniqueProducts, term);
      
      // Debug: log để kiểm tra
      console.log('Search term:', term);
      console.log('Total products:', activeProducts.length);
      console.log('Filtered products:', filtered.length);
      if (filtered.length === 0 && activeProducts.length > 0) {
        console.log('Sample product names:', activeProducts.slice(0, 3).map(p => p.name));
        console.log('Sample product barcodes:', activeProducts.slice(0, 3).map(p => p.barcode));
      }
      
      setProducts(filtered);
      
      // Nếu là barcode và chỉ có 1 kết quả chính xác, tự động thêm vào giỏ
      if (isBarcode(term) && filtered.length === 1) {
        const exactMatch = filtered[0].barcode?.toLowerCase() === term.trim().toLowerCase();
        if (exactMatch && onAddToCartRef.current) {
          // Delay một chút để người dùng thấy kết quả
          setTimeout(() => {
            onAddToCartRef.current?.(filtered[0]);
            if (onCloseRef.current) {
              onCloseRef.current();
            }
          }, 200);
        }
      }
    } catch (error) {
      console.error('Lỗi load sản phẩm:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load categories khi component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        await db.open();
        const allCategories = await db.categories.toArray();
        setCategories(allCategories);
      } catch (error) {
        console.error('Lỗi load categories:', error);
      }
    };
    loadCategories();
  }, []);


  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (open && searchTerm.trim()) {
      // Debounce search: chờ 300ms sau khi người dùng ngừng gõ
      debounceTimerRef.current = setTimeout(() => {
        loadProducts(searchTerm);
      }, 300);
    } else {
      setProducts([]);
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, open, loadProducts]);

  useEffect(() => {
    if (products.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(-1);
  }, [products]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!open || products.length === 0) return;
      if (addProductDialogOpen || addCategoryDialogOpen) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, products.length - 1)));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev < 0 ? products.length - 1 : Math.max(prev - 1, 0)));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selected = products[activeIndex];
        if (selected) {
          handleAddProduct(selected);
        }
      } else if (event.key === 'Escape') {
        if (onClose) onClose();
      }
    };

    if (open) {
      document.addEventListener('keyup', handleKeyDown, true);
      return () => {
        document.removeEventListener('keyup', handleKeyDown, true);
      };
    }
    return undefined;
  }, [open, products, activeIndex, addProductDialogOpen, addCategoryDialogOpen, onClose]);

  useEffect(() => {
    const target = itemRefs.current[activeIndex];
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Không đóng nếu đang mở dialog thêm sản phẩm hoặc dialog thêm category
      if (addProductDialogOpen || addCategoryDialogOpen) {
        return;
      }
      
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
  }, [open, anchorEl, onClose, addProductDialogOpen, addCategoryDialogOpen]);

  const handleAddProduct = (product) => {
    if (onAddToCart) {
      onAddToCart(product);
    }
    // Không đóng dropdown sau khi thêm để có thể thêm nhiều sản phẩm
    // Chỉ đóng khi click bên ngoài hoặc ESC
  };

  if (!open || !searchTerm.trim()) {
    return null;
  }

  // Handler thêm category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      return;
    }
    
    try {
      const category = {
        localId: generateLocalId(),
        name: newCategoryName.trim(),
        createdAt: Date.now(),
      };
      
      await db.categories.add(category);
      
      // Reload categories
      const allCategories = await db.categories.toArray();
      setCategories(allCategories);
      
      // Set category mới được chọn
      setNewProduct({ ...newProduct, categoryId: category.localId });
      
      // Đóng dialog
      setAddCategoryDialogOpen(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Lỗi thêm nhóm hàng hóa:', error);
      alert('Có lỗi xảy ra khi thêm nhóm hàng hóa');
    }
  };

  // Tính toán vị trí dropdown
  const getPosition = () => {
    if (!anchorEl) {
      return { top: 0, left: 0, width: '100%' };
    }
    const rect = anchorEl.getBoundingClientRect();
    // Làm dropdown rộng hơn search bar một chút (thêm 100px)
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width + 100,
    };
  };

  const position = getPosition();

  return (
    <Paper
      ref={dropdownRef}
      sx={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        maxWidth: '700px',
        maxHeight: '500px',
        zIndex: 1300,
        boxShadow: 4,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {loading ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Đang tìm kiếm...
          </Typography>
        </Box>
      ) : products.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Không tìm thấy sản phẩm
          </Typography>
        </Box>
      ) : (
        <>
          {/* Danh sách sản phẩm - có thể scroll */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <List sx={{ p: 0 }}>
              {products.map((product, index) => (
                <Box key={product.localId}>
                  <ListItem
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    sx={{
                      py: 1.5,
                      px: 2,
                      bgcolor: activeIndex === index ? 'action.selected' : 'inherit',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      cursor: 'pointer',
                    }}
                    onClick={() => handleAddProduct(product)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: 'grey.200',
                          width: 56,
                          height: 56,
                        }}
                      >
                        <ImageIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.productCode || product.barcode || 'N/A'}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Tồn: {product.stock || 0} | KH đặt: 0
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, minWidth: 100 }}>
                      <Typography
                        variant="body1"
                        color="primary"
                        sx={{ fontWeight: 600 }}
                      >
                        {product.price?.toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                  </ListItem>
                  {index < products.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Box>
        </>
      )}
      
      {/* Nút thêm mới hàng hóa - luôn hiển thị ở dưới cùng */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setAddProductDialogOpen(true);
            setNewProduct({
              productCode: '',
              name: '',
              barcode: '',
              categoryId: '',
              allowPoints: true,
              price: '',
              costPrice: '',
              stock: '',
              unit: 'Cái'
            });
            setAddProductError('');
          }}
        >
          Thêm mới hàng hóa
        </Button>
      </Box>

      {/* Dialog thêm sản phẩm mới */}
      <Dialog 
        open={addProductDialogOpen} 
        onClose={(e, reason) => {
          // Chỉ đóng khi click backdrop hoặc ESC, không đóng khi click vào dialog content
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            setAddProductDialogOpen(false);
          }
        }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={false}
      >
        <DialogTitle onClick={(e) => e.stopPropagation()}>Thêm sản phẩm mới</DialogTitle>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {addProductError && (
              <Alert severity="error" onClose={() => setAddProductError('')}>
                {addProductError}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Mã hàng"
                fullWidth
                value={newProduct.productCode}
                onChange={(e) => setNewProduct({ ...newProduct, productCode: e.target.value })}
                helperText="Để trống để tự động tạo mã (SP0, SP1, SP2...)"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const code = await generateProductCode();
                          setNewProduct({ ...newProduct, productCode: code });
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        title="Tự động tạo mã"
                      >
                        <Typography variant="caption" color="primary">Auto</Typography>
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label="Mã barcode"
                fullWidth
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                helperText={newProduct.barcode ? "Mã barcode tùy chỉnh" : (newProduct.productCode ? `Sẽ dùng mã hàng (${newProduct.productCode}) làm barcode` : "Sẽ dùng mã hàng tự động làm barcode")}
              />
            </Box>
            
            <TextField
              label="Tên sản phẩm *"
              fullWidth
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              required
              autoFocus
            />
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                // label="Chọn nhóm hàng hóa"
                fullWidth
                select
                value={newProduct.categoryId}
                onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                SelectProps={{
                  native: true,
                }}
                sx={{ flexGrow: 1 }}
              >
                <option value="">---Chọn nhóm hàng hoá---</option>
                {categories.map((category) => (
                  <option key={category.localId} value={category.localId}>
                    {category.name}
                  </option>
                ))}
              </TextField>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setAddCategoryDialogOpen(true);
                  setNewCategoryName('');
                }}
                sx={{ 
                  minWidth: 150,
                  height: '56px',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                THÊM NHÓM
              </Button>
            </Box>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={newProduct.allowPoints}
                  onChange={(e) => setNewProduct({ ...newProduct, allowPoints: e.target.checked })}
                />
              }
              label="Tích điểm (50.000đ = 1 điểm)"
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Giá bán *"
                fullWidth
                type="number"
                value={newProduct.price}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                required
                InputProps={{
                  endAdornment: <Typography variant="body2" sx={{ mr: 1 }}>đ</Typography>
                }}
              />
              
              <TextField
                label="Giá vốn"
                fullWidth
                type="number"
                value={newProduct.costPrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                InputProps={{
                  endAdornment: <Typography variant="body2" sx={{ mr: 1 }}>đ</Typography>
                }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Tồn kho *"
                fullWidth
                type="number"
                value={newProduct.stock}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                required
                inputProps={{ min: 0 }}
              />
              
              <TextField
                label="Đơn vị tính"
                fullWidth
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                select
                SelectProps={{
                  native: true,
                }}
              >
                <option value="Cái">Cái</option>
                <option value="Cây">Cây</option>
                <option value="Quyển">Quyển</option>
                <option value="Cục">Cục</option>
                <option value="Bộ">Bộ</option>
                <option value="Hộp">Hộp</option>
                <option value="Thùng">Thùng</option>
                <option value="Kg">Kg</option>
                <option value="Gam">Gam</option>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions onClick={(e) => e.stopPropagation()}>
          <Button onClick={() => setAddProductDialogOpen(false)}>
            Hủy
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              // Xác định productCode: nếu không có thì tự động generate
              let finalProductCode = newProduct.productCode.trim();
              
              if (!finalProductCode) {
                // Tự động generate mã sản phẩm
                finalProductCode = await generateProductCode();
              }
              
              // Kiểm tra productCode trùng
              const productCodeExists = await checkProductCodeExists(finalProductCode);
              if (productCodeExists) {
                setAddProductError('Mã hàng đã tồn tại. Vui lòng nhập mã khác hoặc để trống để tự động tạo.');
                return;
              }
              
              if (!newProduct.name || newProduct.name.trim() === '') {
                setAddProductError('Vui lòng nhập tên sản phẩm');
                return;
              }
              
              const price = parseFloat(newProduct.price);
              if (isNaN(price) || price < 0) {
                setAddProductError('Vui lòng nhập giá bán hợp lệ');
                return;
              }
              
              const stock = parseInt(newProduct.stock);
              if (isNaN(stock) || stock < 0) {
                setAddProductError('Vui lòng nhập tồn kho hợp lệ');
                return;
              }
              
              // Xác định barcode: nếu không nhập thì dùng finalProductCode
              const finalBarcode = newProduct.barcode && newProduct.barcode.trim() !== '' 
                ? newProduct.barcode.trim() 
                : finalProductCode;
              
              // Kiểm tra barcode trùng (có thể là barcode nhập vào hoặc productCode)
              const barcodeExists = await checkBarcodeExists(finalBarcode);
              if (barcodeExists) {
                setAddProductError('Mã barcode đã tồn tại');
                return;
              }
              
              try {
                setAddProductLoading(true);
                setAddProductError('');
                
                const now = Date.now();
                const product = {
                  localId: generateLocalId(),
                  productCode: finalProductCode,
                  name: newProduct.name.trim(),
                  barcode: finalBarcode,
                  categoryId: newProduct.categoryId || null,
                  allowPoints: newProduct.allowPoints || false,
                  price: price,
                  costPrice: newProduct.costPrice ? parseFloat(newProduct.costPrice) : 0,
                  stock: stock,
                  unit: newProduct.unit || 'Cái',
                  createdAt: now,
                  updatedAt: now,
                  synced: false,
                  deleted: false,
                };
                
                await db.products.add(product);
                
                // Gọi callback để refresh danh sách
                if (onProductAdded) {
                  onProductAdded();
                }
                
                // Đóng dialog và reset form
                setAddProductDialogOpen(false);
                const newCode = await generateProductCode();
                setNewProduct({
                  productCode: newCode,
                  name: '',
                  barcode: '',
                  categoryId: '',
                  allowPoints: true,
                  price: '',
                  costPrice: '',
                  stock: '',
                  unit: 'Cái'
                });
                
                // Reload products để hiển thị sản phẩm mới
                if (searchTerm && searchTerm.trim().length > 0) {
                  loadProducts(searchTerm);
                }
              } catch (error) {
                console.error('Lỗi thêm sản phẩm:', error);
                setAddProductError('Có lỗi xảy ra khi thêm sản phẩm. Vui lòng thử lại.');
              } finally {
                setAddProductLoading(false);
              }
            }}
            disabled={addProductLoading}
          >
            {addProductLoading ? 'Đang thêm...' : 'Thêm sản phẩm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog thêm nhóm hàng hóa */}
      <Dialog 
        open={addCategoryDialogOpen} 
        onClose={() => setAddCategoryDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Thêm nhóm hàng hóa</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Tên nhóm hàng hóa *"
              fullWidth
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCategoryName.trim()) {
                  handleAddCategory();
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCategoryDialogOpen(false)}>
            Hủy
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim()}
          >
            Thêm nhóm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
