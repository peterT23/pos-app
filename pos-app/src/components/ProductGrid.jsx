import { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Chip,
  Button
} from '@mui/material';
import { AddShoppingCart as AddCartIcon } from '@mui/icons-material';
import db from '../db/posDB';

/**
 * Component ProductGrid: Hiển thị danh sách sản phẩm dạng grid
 * 
 * Props:
 * - searchTerm: string - Từ khóa tìm kiếm
 * - onAddToCart: function(product) - Callback khi click thêm vào giỏ
 * - refreshTrigger: any - Trigger để reload danh sách sản phẩm
 */
export default function ProductGrid({ searchTerm = '', onAddToCart, refreshTrigger }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load sản phẩm từ IndexedDB
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, refreshTrigger]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      let productList = [];

      // Đảm bảo database đã được mở
      await db.open().catch(err => {
        if (err.name !== 'DatabaseClosedError') {
          throw err;
        }
      });

      // Lấy tất cả sản phẩm từ database
      const allProducts = await db.products.toArray();
      
      // Filter: chỉ lấy sản phẩm chưa bị xóa (deleted !== true hoặc không có field deleted)
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

      if (searchTerm.trim()) {
        // Tìm kiếm theo tên hoặc barcode
        const searchLower = searchTerm.toLowerCase();
        productList = uniqueProducts.filter(product => {
          return (
            product.name.toLowerCase().includes(searchLower) ||
            (product.barcode && product.barcode.includes(searchTerm))
          );
        });
      } else {
        // Lấy tất cả sản phẩm active (đã loại bỏ duplicate)
        productList = uniqueProducts;
      }

      setProducts(productList);
      console.log(`Đã load ${productList.length} sản phẩm`);
    } catch (error) {
      console.error('Lỗi load sản phẩm:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Đang tải sản phẩm...</Typography>
      </Box>
    );
  }

  if (products.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          {searchTerm ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Thêm sản phẩm mới để bắt đầu bán hàng'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
      <Grid container spacing={2}>
        {products.map((product) => (
          <Grid item xs={6} sm={4} md={3} key={product.localId}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
                border: product.stock <= 0 ? '2px solid #f44336' : 'none',
              }}
              onClick={() => handleAddToCart(product)}
            >
              <CardContent sx={{ flexGrow: 1, p: 2 }}>
                {/* Tên sản phẩm */}
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    mb: 1,
                    minHeight: '48px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {product.name}
                </Typography>

                {/* Giá */}
                <Typography
                  variant="h5"
                  color="primary"
                  sx={{
                    fontWeight: 'bold',
                    mb: 1,
                    fontSize: '1.3rem',
                  }}
                >
                  {product.price?.toLocaleString('vi-VN')} đ
                </Typography>

                {/* Tồn kho */}
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={`Tồn: ${product.stock || 0}`}
                    size="small"
                    color={product.stock > 0 ? 'success' : 'error'}
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>

                {/* Barcode (nếu có) */}
                {product.barcode && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1 }}
                  >
                    Mã: {product.barcode}
                  </Typography>
                )}

                {/* Button thêm vào giỏ */}
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<AddCartIcon />}
                  disabled={product.stock <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  sx={{
                    mt: 1,
                    py: 1.5,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  Thêm vào giỏ
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
