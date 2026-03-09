/**
 * Utility functions cho tìm kiếm sản phẩm
 */

/**
 * Kiểm tra xem input có phải là barcode không
 * Barcode: chỉ chứa số, chữ cái, gạch ngang (-), không có khoảng trống
 * 
 * @param {string} input - Input từ người dùng
 * @returns {boolean} - true nếu là barcode
 */
export function isBarcode(input) {
  if (!input || input.trim().length === 0) {
    return false;
  }

  const trimmed = input.trim();
  
  // Barcode không được có khoảng trống
  if (trimmed.includes(' ')) {
    return false;
  }

  // Barcode chỉ chứa: số, chữ cái (a-z, A-Z), gạch ngang (-)
  // Pattern: ^[a-zA-Z0-9-]+$
  const barcodePattern = /^[a-zA-Z0-9-]+$/;

  // Nếu chỉ là chữ cái thì coi là tìm theo tên, không phải barcode
  const hasDigit = /\d/.test(trimmed);
  
  return barcodePattern.test(trimmed) && hasDigit;
}

/**
 * Tìm kiếm sản phẩm với logic tối ưu
 * - Nếu là barcode: tìm chính xác barcode trước, sau đó tìm gần đúng
 * - Nếu là tên: tìm theo tên sản phẩm
 * 
 * @param {Array} products - Danh sách sản phẩm
 * @param {string} searchTerm - Từ khóa tìm kiếm
 * @returns {Array} - Danh sách sản phẩm tìm được (sắp xếp theo độ ưu tiên)
 */
export function searchProducts(products, searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const trimmed = searchTerm.trim();
  const isBarcodeSearch = isBarcode(trimmed);
  const searchLower = trimmed.toLowerCase();

  if (isBarcodeSearch) {
    // Tìm kiếm theo barcode - sử dụng Map để loại bỏ duplicate
    const uniqueProductsMap = new Map();
    
    products.forEach(product => {
      if (!product.barcode) return;
      
      // Chỉ thêm nếu chưa có trong map (dựa trên localId)
      if (!uniqueProductsMap.has(product.localId)) {
        // Ưu tiên tìm chính xác
        if (product.barcode.toLowerCase() === searchLower) {
          uniqueProductsMap.set(product.localId, product);
        }
        // Sau đó tìm chứa
        else if (product.barcode.toLowerCase().includes(searchLower)) {
          uniqueProductsMap.set(product.localId, product);
        }
      }
    });

    // Chuyển Map thành Array và sắp xếp: chính xác trước, sau đó là chứa
    return Array.from(uniqueProductsMap.values()).sort((a, b) => {
      const aExact = a.barcode.toLowerCase() === searchLower;
      const bExact = b.barcode.toLowerCase() === searchLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Nếu cả hai đều chính xác hoặc không chính xác, sắp xếp theo độ dài barcode
      return a.barcode.length - b.barcode.length;
    });
  } else {
    // Tìm kiếm theo tên sản phẩm - sử dụng Map để loại bỏ duplicate
    const uniqueProductsMap = new Map();
    const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);
    
    products.forEach(product => {
      // Chỉ thêm nếu chưa có trong map (dựa trên localId)
      if (!uniqueProductsMap.has(product.localId)) {
        const productNameLower = product.name.toLowerCase();
        
        // Nếu chỉ có 1 từ, tìm đơn giản
        if (searchWords.length === 1) {
          const word = searchWords[0];
          if (productNameLower.includes(word)) {
            uniqueProductsMap.set(product.localId, product);
          }
        } else {
          // Nếu có nhiều từ, yêu cầu tên chứa tất cả từ khóa
          if (searchWords.every(word => productNameLower.includes(word))) {
            uniqueProductsMap.set(product.localId, product);
          }
        }
      }
    });
    
    // Chuyển Map thành Array và sắp xếp
    const results = Array.from(uniqueProductsMap.values());
    
    if (searchWords.length === 1) {
      const word = searchWords[0];
      return results.sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(word);
        const bStarts = b.name.toLowerCase().startsWith(word);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return a.name.length - b.name.length;
      });
    }
    
    // Nếu có nhiều từ, sắp xếp theo số từ khóa khớp
    return results.sort((a, b) => {
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      
      // Đếm số từ khóa có trong tên
      const aMatchCount = searchWords.filter(word => aNameLower.includes(word)).length;
      const bMatchCount = searchWords.filter(word => bNameLower.includes(word)).length;
      
      // Sắp xếp theo số từ khóa khớp (nhiều hơn = ưu tiên hơn)
      if (aMatchCount !== bMatchCount) {
        return bMatchCount - aMatchCount;
      }
      
      // Nếu cùng số từ khóa, ưu tiên tên bắt đầu bằng từ khóa đầu tiên
      const firstWord = searchWords[0];
      const aStarts = aNameLower.startsWith(firstWord);
      const bStarts = bNameLower.startsWith(firstWord);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.name.length - b.name.length;
    });
  }
}

/**
 * Debounce function để tránh search quá nhiều lần
 * 
 * @param {Function} func - Function cần debounce
 * @param {number} wait - Thời gian chờ (ms)
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
