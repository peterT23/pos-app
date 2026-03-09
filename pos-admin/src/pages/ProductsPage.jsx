import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  Popover,
  Menu,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Tab,
  Tabs,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { apiRequest, apiRequestFormData, API_BASE_URL } from '../utils/apiClient';
import { getStoredToken, getStoredStoreId } from '../utils/authStorage';

const PRODUCT_COLUMN_OPTIONS = [
  { id: 'image', label: 'Hình ảnh' },
  { id: 'productCode', label: 'Mã hàng' },
  { id: 'barcode', label: 'Mã vạch' },
  { id: 'name', label: 'Tên hàng' },
  { id: 'category', label: 'Nhóm hàng' },
  { id: 'productType', label: 'Loại hàng' },
  { id: 'price', label: 'Giá bán' },
  { id: 'cost', label: 'Giá vốn' },
  { id: 'brand', label: 'Thương hiệu' },
  { id: 'stock', label: 'Tồn kho' },
  { id: 'position', label: 'Vị trí' },
  { id: 'createdAt', label: 'Thời gian tạo' },
  { id: 'minStock', label: 'Định mức tồn ít nhất' },
  { id: 'maxStock', label: 'Định mức tồn nhiều nhất' },
  { id: 'earnPoints', label: 'Tích điểm' },
];

const DEFAULT_VISIBLE_COLUMNS = {
  productCode: true,
  name: true,
  price: true,
  cost: true,
  stock: true,
  createdAt: true,
};

function loadVisibleColumns() {
  try {
    const raw = localStorage.getItem('pos_admin_product_visible_columns');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_VISIBLE_COLUMNS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_VISIBLE_COLUMNS };
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [expandedProductId, setExpandedProductId] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [searchNavigated, setSearchNavigated] = useState(false);
  const [listFilterTerm, setListFilterTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [categoryAnchorEl, setCategoryAnchorEl] = useState(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => new Set());
  const [categoryDraftIds, setCategoryDraftIds] = useState(() => new Set());
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(() => new Set());
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', parentId: '' });
  const [brands, setBrands] = useState([]);
  const [_brandLoading, setBrandLoading] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: '' });
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'instock' | 'out'
  const [createMenuAnchor, setCreateMenuAnchor] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(loadVisibleColumns);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogMode, setProductDialogMode] = useState('create');
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingProductLocalId, setEditingProductLocalId] = useState(null);
  const [productDialogType, setProductDialogType] = useState('Hàng hóa');
  const [productDialogTab, setProductDialogTab] = useState(0);
  const [productCodeError, setProductCodeError] = useState('');
  const [productFormCategoryError, setProductFormCategoryError] = useState(''); // lỗi bắt buộc chọn nhóm hàng trong form
  const [productCodeSource, setProductCodeSource] = useState(null); // 'user' | 'auto' | null: mã do user nhập hay hệ thống tự gán
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [attributeOptions, setAttributeOptions] = useState(['Màu sắc', 'Kích cỡ', 'Chất liệu', 'Đặc điểm']);
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [attributeValueInput, setAttributeValueInput] = useState('');
  const [attributeValues, setAttributeValues] = useState([]);
  const [variantRows, setVariantRows] = useState([]);
  const [productForm, setProductForm] = useState({
    type: 'Hàng hóa',
    id: '',
    barcode: '',
    name: '',
    category: '',
    brand: '',
    cost: 0,
    price: 0,
    stock: 0,
    minStock: 0,
    maxStock: 999999999,
    position: '',
    weight: '',
    unit: 'g',
    sellDirect: true,
    earnPoints: true,
    attributeName: '',
    attributeValues: [],
    variants: [],
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printTargets, setPrintTargets] = useState([]);
  const [printForm, setPrintForm] = useState({
    quantity: 1,
    codeType: 'Mã hàng',
    priceList: 'Bảng giá chung',
    priceDisplay: 'Giá kèm VND',
    unitDisplay: 'Giá không kèm đơn vị tính',
    storeName: 'Không in tên cửa hàng',
    paperSize: 'Mẫu giấy cuộn 3 nhãn (104x22mm)',
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importOptions, setImportOptions] = useState({
    duplicateCodeName: 'error',
    duplicateBarcodeCode: 'error',
    updateStock: false,
    updateCost: false,
    updateDescription: false,
  });
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const importFileInputRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchItemRefs = useRef([]);
  const _searchKeyGuardRef = useRef({ key: '', time: 0 });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiRequest('/api/products');
      const items = Array.isArray(response?.products) ? response.products : [];
      const mapped = items.map((item, index) => {
        const id = item.productCode || item.barcode || item.localId || `tmp-${index}`;
        return {
          id,
          key: item.localId || item.productCode || item.barcode || id,
          name: item.name || '',
          price: Number(item.price) || 0,
          cost: Number(item.costPrice) || 0,
          stock: Number(item.stock) || 0,
          createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '',
          barcode: item.barcode || '',
          category: item.categoryId || '',
          brand: item.brandId || '',
          supplier: '',
          isGroup: false,
          parentId: item.parentId || '',
          attributeName: item.attributeName || '',
          attributeValue: item.attributeValue || '',
          raw: item,
        };
      });

      const unique = [];
      const seen = new Set();
      mapped.forEach((item) => {
        const key = item.id;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      });

      // Không tạo hàng "group" ảo: mỗi biến thể là một sản phẩm riêng, chỉ hiển thị danh sách sản phẩm.
      setProducts(unique);
      if (unique.length > 0 && !selectedProductId) {
        setSelectedProductId(unique[0].id);
        setExpandedProductId('');
      }
    } catch (error) {
      setLoadError(error.message || 'Không thể tải danh sách hàng hóa');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const loadCategories = async () => {
      setCategoryLoading(true);
      setCategoryError('');
      try {
        const response = await apiRequest('/api/categories');
        const items = Array.isArray(response?.categories) ? response.categories : [];
        setCategories(items);
      } catch (error) {
        setCategoryError(error.message || 'Không thể tải nhóm hàng');
        setCategories([]);
      } finally {
        setCategoryLoading(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadBrands = async () => {
      setBrandLoading(true);
      try {
        const response = await apiRequest('/api/brands');
        const items = Array.isArray(response?.brands) ? response.brands : [];
        setBrands(items);
      } catch {
        setBrands([]);
      } finally {
        setBrandLoading(false);
      }
    };
    loadBrands();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return products.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(term);
      const idMatch = item.id.toLowerCase().includes(term);
      const barcodeMatch = (item.barcode || '').toLowerCase().includes(term);
      return (
        nameMatch ||
        idMatch ||
        barcodeMatch
      );
    });
  }, [searchTerm, products]);

  const listProducts = useMemo(() => {
    const term = listFilterTerm.trim().toLowerCase();
    return products.filter((item) => {
      if (item.isGroup) return false;
      const nameMatch = item.name.toLowerCase().includes(term);
      const idMatch = item.id.toLowerCase().includes(term);
      const barcodeMatch = (item.barcode || '').toLowerCase().includes(term);
      const matchesTerm = !term || nameMatch || idMatch || barcodeMatch;
      const matchesCategory =
        selectedCategoryIds.size === 0 || selectedCategoryIds.has(item.category);
      const matchesBrand = !selectedBrandId || item.brand === selectedBrandId;
      const stockNum = Number(item.stock);
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'instock' && stockNum > 0) ||
        (stockFilter === 'out' && (item.stock === '' || item.stock == null || !Number.isFinite(stockNum) || stockNum <= 0));
      return matchesTerm && matchesCategory && matchesBrand && matchesStock;
    });
  }, [listFilterTerm, products, selectedCategoryIds, selectedBrandId, stockFilter]);

  const visibleColumnIds = useMemo(
    () => PRODUCT_COLUMN_OPTIONS.filter((c) => visibleColumns[c.id]).map((c) => c.id),
    [visibleColumns]
  );

  useEffect(() => {
    if (!searchOpen || filteredProducts.length === 0) {
      setActiveSearchIndex(-1);
      return;
    }
    setActiveSearchIndex(-1);
  }, [filteredProducts, searchOpen]);

  const handleSearchKeyUp = useCallback(
    (event) => {
      if (!searchTerm.trim()) return;
      if (filteredProducts.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSearchOpen(true);
        setSearchNavigated(true);
        setActiveSearchIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, filteredProducts.length - 1)));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSearchOpen(true);
        setSearchNavigated(true);
        setActiveSearchIndex((prev) =>
          prev < 0 ? filteredProducts.length - 1 : Math.max(prev - 1, 0)
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = filteredProducts[Math.max(activeSearchIndex, 0)];
        if (searchNavigated && item) {
          handlePickSearchItem(item);
        } else if (searchTerm.trim()) {
          setListFilterTerm(searchTerm.trim());
          setSearchOpen(false);
          setActiveSearchIndex(-1);
          setSearchNavigated(false);
        }
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
        setSearchNavigated(false);
      }
    },
    [filteredProducts, activeSearchIndex, searchTerm, searchNavigated]
  );

  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return undefined;
    const handler = (event) => handleSearchKeyUp(event);
    input.addEventListener('keyup', handler);
    return () => input.removeEventListener('keyup', handler);
  }, [handleSearchKeyUp]);

  useEffect(() => {
    const target = searchItemRefs.current[activeSearchIndex];
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [activeSearchIndex]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const buildFormFromItem = (item) => ({
    type: productDialogType,
    id: item.id || '',
    barcode: item.barcode || '',
    name: item.name || '',
    category: item.category || '',
    brand: item.brand || '',
    cost: Number(item.cost) || 0,
    price: Number(item.price) || 0,
    stock: Number(item.stock) || 0,
    minStock: Number(item.minStock) || 0,
    maxStock: Number(item.maxStock) || 999999999,
    position: item.position || '',
    weight: item.weight || '',
    unit: item.unit || 'g',
    sellDirect: item.sellDirect ?? true,
    earnPoints: item.earnPoints ?? true,
  });

  const openCreateDialog = (typeLabel) => {
    setProductDialogMode('create');
    setEditingProductId(null);
    setEditingProductLocalId(null);
    setProductDialogType(typeLabel);
    setProductDialogTab(0);
    setProductCodeSource(null);
    setProductFormCategoryError('');
    setSelectedAttribute('');
    setAttributeValues([]);
    setVariantRows([]);
    setProductForm((prev) => ({
      ...prev,
      type: typeLabel,
      id: '',
      barcode: '',
      name: '',
      category: '',
      brand: '',
      cost: 0,
      price: 0,
      stock: 0,
      minStock: 0,
      maxStock: 999999999,
      position: '',
      weight: '',
      unit: 'g',
      sellDirect: true,
      earnPoints: true,
      attributeName: '',
      attributeValues: [],
      variants: [],
    }));
    setProductDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setProductDialogMode('edit');
    setEditingProductId(item.raw?._id || null);
    setEditingProductLocalId(item.raw?.localId || null);
    setProductDialogType('Hàng hóa');
    setProductForm(buildFormFromItem(item));
    setProductDialogTab(0);
    setProductCodeSource('user');
    setProductFormCategoryError('');
    setProductDialogOpen(true);
  };

  const openCopyDialog = (item) => {
    setProductDialogMode('copy');
    setEditingProductId(null);
    setEditingProductLocalId(null);
    setProductDialogType('Hàng hóa');
    const form = buildFormFromItem(item);
    setProductForm({ ...form, id: '', barcode: '' });
    setProductDialogTab(0);
    setProductCodeSource(null);
    setProductFormCategoryError('');
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      return;
    }
    if (!productForm.category || !String(productForm.category).trim()) {
      setProductFormCategoryError('Vui lòng chọn nhóm hàng');
      return;
    }
    setProductFormCategoryError('');
    const now = new Date().toLocaleDateString('vi-VN');
    const hasVariants = productForm.attributeValues?.length > 0;
    const userProvidedCode =
      productCodeSource === 'user' ? String(productForm.id || '').trim() : '';
    const variantRowsFinal =
      hasVariants ? ensureVariantRows(productForm.attributeValues, userProvidedCode || 'AUTO', productCodeSource === 'auto') : [];
    const variantCount = variantRowsFinal.length;

    // Mã hàng: không dùng khái niệm cha-con. Tự động thì mỗi biến thể 1 mã SP tuần tự; user nhập thì BASE, BASE-1, BASE-2...
    let baseCode = '';
    let variantCodes = [];

    if (userProvidedCode) {
      baseCode = userProvidedCode;
      variantCodes = variantRowsFinal.map((_, index) => (index === 0 ? baseCode : `${baseCode}-${index}`));
    } else {
      const count = hasVariants ? variantCount : 1;
      try {
        const response = await apiRequest(`/api/products/next-codes?count=${count}`);
        const codes = response?.codes || [];
        if (hasVariants) {
          variantCodes = codes;
          baseCode = ''; // không có mã cha khi tự động
          // Không gán productForm.id (không mã cha)
        } else {
          baseCode = codes[0] || '';
          if (baseCode) {
            setProductForm((prev) => ({ ...prev, id: baseCode }));
          }
        }
      } catch {
        baseCode = '';
      }
    }

    const canSave = hasVariants ? variantCodes.length > 0 : Boolean(baseCode);
    if (!canSave) {
      return;
    }

    // Không dùng mã group: mỗi biến thể là sản phẩm độc lập với mã riêng (SP tuần tự hoặc BASE, BASE-1, BASE-2...).
    const variantItems = hasVariants
      ? variantRowsFinal.map((row, index) => ({
          id: variantCodes[index] ?? `${baseCode}-${index}`,
          key: variantCodes[index] ?? `${baseCode}-${index}`,
          name: `${productForm.name} - ${row.value}`,
          price: Number(row.price) || 0,
          cost: Number(row.cost) || 0,
          stock: Number(row.stock) || 0,
          createdAt: now,
          barcode: row.barcode || productForm.barcode,
          category: productForm.category,
          supplier: '',
          earnPoints: productForm.earnPoints,
          parentId: '',
          attributeName: productForm.attributeName,
          attributeValue: row.value,
          isGroup: false,
        }))
      : [];

    const isEditMode = productDialogMode === 'edit' && (editingProductId || editingProductLocalId);
    const payload = hasVariants
      ? variantItems.map((item) => ({
          productCode: item.id,
          name: item.name,
          barcode: item.barcode,
          price: item.price,
          costPrice: item.cost,
          stock: item.stock,
          unit: productForm.unit,
          categoryId: productForm.category,
          brandId: productForm.brand || '',
          allowPoints: productForm.earnPoints,
          parentId: '',
          attributeName: productForm.attributeName,
          attributeValue: item.attributeValue,
          localId: `local-${item.id}-${Date.now()}`,
        }))
      : [
          {
            ...(isEditMode
              ? {
                  _id: editingProductId || undefined,
                  localId: editingProductLocalId || undefined,
                }
              : {}),
            productCode: baseCode,
            name: productForm.name,
            barcode: productForm.barcode,
            price: Number(productForm.price) || 0,
            costPrice: Number(productForm.cost) || 0,
            stock: Number(productForm.stock) || 0,
            unit: productForm.unit,
            categoryId: productForm.category,
            brandId: productForm.brand || '',
            allowPoints: productForm.earnPoints,
            localId: isEditMode ? (editingProductLocalId || `local-${baseCode}-${Date.now()}`) : `local-${baseCode}-${Date.now()}`,
          },
        ];

    (async () => {
      await apiRequest('/api/products', {
        method: 'POST',
        body: JSON.stringify({ products: payload }),
      });
      await loadProducts();
      setEditingProductId(null);
      setEditingProductLocalId(null);
      setProductForm((prev) => ({
        ...prev,
        id: '',
        barcode: '',
        name: '',
        category: '',
        brand: '',
        cost: 0,
        price: 0,
        stock: 0,
        minStock: 0,
        maxStock: 999999999,
        position: '',
        weight: '',
        unit: 'g',
        sellDirect: true,
        earnPoints: true,
        attributeName: '',
        attributeValues: [],
        variants: [],
      }));
      setSelectedAttribute('');
      setAttributeValues([]);
      setVariantRows([]);
      setProductCodeSource(null);
      setProductDialogOpen(false);
    })();
  };

  const handleOpenDelete = (item) => {
    setDeleteTarget({
      id: item.id,
      ids: [item.id],
      _ids: [item.raw?._id].filter(Boolean),
    });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const idsToDelete = deleteTarget.ids ? deleteTarget.ids : [deleteTarget.id];
    const _idsToDelete = deleteTarget._ids && deleteTarget._ids.length > 0
      ? deleteTarget._ids
      : products.filter((p) => idsToDelete.includes(p.id)).map((p) => p.raw?._id).filter(Boolean);
    if (_idsToDelete.length === 0) {
      setProducts((prev) => prev.filter((item) => !idsToDelete.includes(item.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      return;
    }
    try {
      for (const _id of _idsToDelete) {
        await apiRequest(`/api/products/${_id}`, { method: 'DELETE' });
      }
      setProducts((prev) => prev.filter((item) => !idsToDelete.includes(item.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
      if (idsToDelete.includes(expandedProductId)) setExpandedProductId('');
      if (idsToDelete.includes(selectedProductId)) setSelectedProductId('');
    } catch (err) {
      console.error(err);
      setLoadError(err?.data?.message || err?.message || 'Xóa hàng hóa thất bại');
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleOpenPrint = (ids) => {
    setPrintTargets(ids);
    setPrintDialogOpen(true);
  };

  const handlePickSearchItem = (item) => {
    setSelectedProductId(item.id);
    setExpandedProductId(item.id);
    setSearchOpen(false);
    setSearchTerm(item.name || item.id);
    setListFilterTerm(item.name || item.id);
    setActiveSearchIndex(-1);
    setSearchNavigated(false);
  };

  const quickAttributeValues = useMemo(() => {
    if (!selectedAttribute) return [];
    const normalized = selectedAttribute.toLowerCase();
    if (normalized.includes('màu')) return ['đỏ', 'xanh', 'vàng', 'đen', 'trắng'];
    if (normalized.includes('kích') || normalized.includes('size')) return ['S', 'M', 'L', 'XL', '2XL'];
    return [];
  }, [selectedAttribute]);

  const ensureVariantRows = (values, base, autoPlaceholder = false) => {
    const baseCode = base || 'AUTO';
    return values.map((value, index) => {
      const existing = variantRows.find((row) => row.value === value);
      if (existing) return existing;
      const code =
        autoPlaceholder ? 'Tự động' : (index === 0 ? baseCode : `${baseCode}-${index}`);
      return {
        value,
        conversion: 1,
        code,
        barcode: productForm.barcode || '',
        cost: productForm.cost || 0,
        price: productForm.price || 0,
        stock: 0,
      };
    });
  };

  const handleAddAttributeValue = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return;
    setAttributeValues((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setVariantRows(ensureVariantRows(next, productForm.id || 'AUTO', productCodeSource === 'auto'));
      return next;
    });
    setAttributeValueInput('');
  };

  const handleRemoveAttributeValue = (value) => {
    setAttributeValues((prev) => {
      const next = prev.filter((item) => item !== value);
      setVariantRows((rows) => rows.filter((row) => row.value !== value));
      return next;
    });
  };

  const handleOpenAttributeDialog = () => {
    setSelectedAttribute(productForm.attributeName || '');
    setAttributeValues(productForm.attributeValues || []);
    let rows = productForm.variants || [];
    if (productCodeSource === 'auto' && rows.length > 0) {
      rows = rows.map((row) => ({
        ...row,
        code: /^SP\d{6}-\d+$/.test(String(row.code || '')) ? 'Tự động' : row.code,
      }));
    }
    setVariantRows(rows);
    setAttributeDialogOpen(true);
  };

  const handleCheckProductCode = async () => {
    const code = String(productForm.id || '').trim();
    if (!code) {
      try {
        const response = await apiRequest('/api/products/next-code');
        if (response?.code) {
          setProductForm((prev) => ({ ...prev, id: response.code }));
          setProductCodeSource('auto');
          setProductCodeError('');
        }
      } catch {
        setProductCodeError('');
      }
      return;
    }
    if (productDialogMode === 'edit' && code === productForm.id) {
      setProductCodeError('');
      return;
    }
    try {
      const response = await apiRequest(`/api/products/check-code?code=${encodeURIComponent(code)}`);
      if (response?.exists) {
        setProductCodeError('Mã hàng đã tồn tại');
      } else {
        setProductCodeError('');
      }
    } catch {
      setProductCodeError('');
    }
  };

  const handleApplyAttributes = () => {
    const rows = ensureVariantRows(attributeValues, productForm.id || 'AUTO', productCodeSource === 'auto');
    setVariantRows(rows);
    setProductForm((prev) => ({
      ...prev,
      attributeName: selectedAttribute,
      attributeValues,
      variants: rows,
    }));
    setAttributeDialogOpen(false);
  };

  const categoryTree = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      map.set(cat._id, { ...cat, children: [] });
    });
    const roots = [];
    map.forEach((cat) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(cat);
      } else {
        roots.push(cat);
      }
    });
    return roots;
  }, [categories]);

  const filteredCategoryTree = useMemo(() => {
    const term = categorySearchTerm.trim().toLowerCase();
    if (!term) return categoryTree;
    const filterNodes = (nodes) => {
      const result = [];
      nodes.forEach((node) => {
        const nameMatch = node.name.toLowerCase().includes(term);
        const children = filterNodes(node.children || []);
        if (nameMatch || children.length > 0) {
          result.push({ ...node, children });
        }
      });
      return result;
    };
    return filterNodes(categoryTree);
  }, [categorySearchTerm, categoryTree]);

  const categoryOptions = useMemo(() => {
    const result = [];
    const walk = (nodes, depth) => {
      nodes.forEach((node) => {
        result.push({
          id: node._id,
          label: `${'—'.repeat(depth)} ${node.name}`.trim(),
        });
        if (node.children?.length) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(categoryTree, 0);
    return result;
  }, [categoryTree]);

  const getProductCellValue = useCallback(
    (item, columnId) => {
      switch (columnId) {
        case 'image':
          return null;
        case 'productCode':
          return item.id;
        case 'barcode':
          return item.barcode || '';
        case 'name':
          return item.name;
        case 'category':
          return categoryOptions.find((o) => o.id === item.category)?.label || item.category || '';
        case 'productType':
          return item.raw?.type || item.attributeName || '';
        case 'price':
          return item.price != null ? item.price.toLocaleString('vi-VN') : '';
        case 'cost':
          return item.cost != null ? item.cost.toLocaleString('vi-VN') : '';
        case 'brand':
          return brands.find((b) => b._id === item.brand)?.name || '';
        case 'stock':
          return item.stock !== '' && item.stock != null ? String(item.stock) : '';
        case 'position':
          return item.raw?.position || '';
        case 'createdAt':
          return item.createdAt || '';
        case 'minStock':
          return item.raw?.minStock != null ? String(item.raw.minStock) : '';
        case 'maxStock':
          return item.raw?.maxStock != null ? String(item.raw.maxStock) : '';
        case 'earnPoints':
          return item.raw?.allowPoints !== false ? 'Có' : 'Không';
        default:
          return '';
      }
    },
    [categoryOptions, brands]
  );

  const toggleCategoryDraft = (id) => {
    setCategoryDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCategoryExpand = (id) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenCategoryPopover = (event) => {
    setCategoryDraftIds(new Set(selectedCategoryIds));
    setCategoryAnchorEl(event.currentTarget);
  };

  const handleApplyCategories = () => {
    setSelectedCategoryIds(new Set(categoryDraftIds));
    setCategoryAnchorEl(null);
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return;
    await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: categoryForm.name.trim(),
        parentId: categoryForm.parentId || '',
      }),
    });
    setCategoryDialogOpen(false);
    setCategoryForm({ name: '', parentId: '' });
    const response = await apiRequest('/api/categories');
    const items = Array.isArray(response?.categories) ? response.categories : [];
    setCategories(items);
  };

  const handleCreateBrand = async () => {
    if (!brandForm.name.trim()) return;
    await apiRequest('/api/brands', {
      method: 'POST',
      body: JSON.stringify({ name: brandForm.name.trim() }),
    });
    setBrandDialogOpen(false);
    setBrandForm({ name: '' });
    const response = await apiRequest('/api/brands');
    const items = Array.isArray(response?.brands) ? response.brands : [];
    setBrands(items);
  };

  const parseImportFilePreview = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (!raw.length) {
            resolve([]);
            return;
          }
          const headers = raw[0].map((h) => String(h ?? '').trim().toLowerCase());
          const col = (names) => {
            const i = headers.findIndex((h) => names.some((n) => (h || '').includes(n)));
            return i >= 0 ? i : -1;
          };
          const rows = [];
          for (let r = 1; r < raw.length; r++) {
            const row = raw[r];
            const name = (col(['tên hàng']) >= 0 ? row[col(['tên hàng'])] : '') != null ? String(row[col(['tên hàng'])]).trim() : '';
            if (!name) continue;
            const get = (key) => {
              const i = col(key);
              return i >= 0 && row[i] != null ? row[i] : '';
            };
            rows.push({
              productCode: get(['mã hàng']),
              barcode: get(['mã vạch']),
              name,
              brand: get(['thương hiệu']),
              category: get(['nhóm hàng']),
              price: get(['giá bán']),
              costPrice: get(['giá vốn']),
              stock: get(['tồn kho']),
              unit: get(['đvt', 'đơn vị']),
            });
          }
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Không đọc được file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDownloadImportTemplate = async () => {
    try {
      const token = getStoredToken();
      const storeId = getStoredStoreId() || 'default';
      const res = await fetch(`${API_BASE_URL}/api/products/import-template`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'X-Store-Id': storeId,
          'X-Client-App': 'pos-admin',
        },
      });
      if (!res.ok) throw new Error('Không tải được file mẫu');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MauFileSanPham.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setImportError(e.message || 'Không tải được file mẫu');
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Vui lòng chọn file dữ liệu');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportResult(null);
    try {
      const form = new FormData();
      form.append('file', importFile);
      form.append('importOptions', JSON.stringify(importOptions));
      const data = await apiRequestFormData('/api/products/import', {
        method: 'POST',
        body: form,
      });
      setImportResult(data);
      setImportPreviewRows([]);
      await loadProducts();
      if (data.imported > 0) {
        setImportFile(null);
        setTimeout(() => setImportDialogOpen(false), 1500);
      }
    } catch (err) {
      setImportError(err.message || 'Import thất bại');
      if (err.data?.errors) setImportResult({ errors: err.data.errors });
    } finally {
      setImportLoading(false);
    }
  };

  const renderCategoryNodes = (nodes, depth = 0) =>
    nodes.map((node) => {
      const hasChildren = node.children?.length > 0;
      const isExpanded = expandedCategoryIds.has(node._id);
      return (
        <Box key={node._id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: depth * 2, py: 0.5 }}>
            {hasChildren ? (
              <IconButton size="small" onClick={() => toggleCategoryExpand(node._id)}>
                <ExpandMoreIcon
                  sx={{
                    transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s ease',
                  }}
                  fontSize="small"
                />
              </IconButton>
            ) : (
              <Box sx={{ width: 32 }} />
            )}
            <Checkbox
              size="small"
              checked={categoryDraftIds.has(node._id)}
              onChange={() => toggleCategoryDraft(node._id)}
            />
            <Typography variant="body2">{node.name}</Typography>
          </Box>
          {hasChildren && isExpanded && renderCategoryNodes(node.children, depth + 1)}
        </Box>
      );
    });

  return (
    <Layout maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Hàng hóa
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
          gap: 2,
        }}
      >
        <Card sx={{ height: 'fit-content' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Nhóm hàng
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  sx={{ textTransform: 'none' }}
                  onClick={() => setCategoryDialogOpen(true)}
                >
                  Tạo mới
                </Button>
              </Box>
              <TextField
                size="small"
                placeholder="Chọn nhóm hàng"
                fullWidth
                value={
                  selectedCategoryIds.size > 0
                    ? `Đã chọn ${selectedCategoryIds.size} nhóm`
                    : ''
                }
                onClick={handleOpenCategoryPopover}
                InputProps={{ readOnly: true }}
              />
            </Box>

            <Divider />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Thương hiệu
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  sx={{ textTransform: 'none' }}
                  onClick={() => setBrandDialogOpen(true)}
                >
                  Tạo mới
                </Button>
              </Box>
              <TextField
                size="small"
                select
                fullWidth
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (v) => (!v ? 'Chọn thương hiệu' : brands.find((b) => b._id === v)?.name || v),
                }}
              >
                <MenuItem value="">Chọn thương hiệu</MenuItem>
                {brands.map((b) => (
                  <MenuItem key={b._id} value={b._id}>
                    {b.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Tồn kho
              </Typography>
              <TextField
                size="small"
                select
                fullWidth
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="instock">Còn hàng</MenuItem>
                <MenuItem value="out">Hết hàng</MenuItem>
              </TextField>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Dự kiến hết hàng
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="outlined" size="small" sx={{ justifyContent: 'space-between' }}>
                  Toàn thời gian
                </Button>
                <Button variant="outlined" size="small" sx={{ justifyContent: 'space-between' }}>
                  Tùy chỉnh
                </Button>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Thời gian tạo
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="outlined" size="small" sx={{ justifyContent: 'space-between' }}>
                  Toàn thời gian
                </Button>
                <Button variant="outlined" size="small" sx={{ justifyContent: 'space-between' }}>
                  Tùy chỉnh
                </Button>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Thuộc tính
              </Typography>
              <TextField size="small" placeholder="SIZE" fullWidth sx={{ mb: 1 }} />
              <TextField size="small" placeholder="MÀU" fullWidth sx={{ mb: 1 }} />
              <TextField size="small" placeholder="KIỂU" fullWidth />
            </Box>
          </CardContent>
        </Card>

        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
              <Box sx={{ position: 'relative', flex: 1, minWidth: 260 }} ref={searchRef}>
                <TextField
                  size="small"
                  placeholder="Theo mã, tên hàng"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setSearchOpen(event.target.value.trim().length > 0);
                    setActiveSearchIndex(-1);
                    setSearchNavigated(false);
                    if (!event.target.value.trim()) {
                      setListFilterTerm('');
                    }
                  }}
                  onFocus={() => setSearchOpen(searchTerm.trim().length > 0)}
                  inputRef={searchInputRef}
                  InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
                  fullWidth
                />
                {searchOpen && (
                  <Paper
                    sx={{
                      position: 'absolute',
                      top: 42,
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      p: 1,
                      maxHeight: 320,
                      overflow: 'auto',
                    }}
                  >
                    {filteredProducts.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                        Không tìm thấy sản phẩm phù hợp.
                      </Typography>
                    ) : (
                      filteredProducts.map((item, index) => (
                        <Box
                          key={item.key}
                          ref={(el) => {
                            searchItemRefs.current[index] = el;
                          }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1,
                            borderRadius: 1,
                            cursor: 'pointer',
                            bgcolor: index === activeSearchIndex ? 'action.selected' : 'transparent',
                            '&:hover': { bgcolor: 'grey.100' },
                          }}
                          onMouseEnter={() => {
                            setActiveSearchIndex(index);
                            setSearchNavigated(true);
                          }}
                          onClick={() => handlePickSearchItem(item)}
                        >
                          <Box
                            sx={{
                              width: 38,
                              height: 38,
                              borderRadius: 1,
                              bgcolor: 'grey.200',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <SearchIcon fontSize="small" color="action" />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.id} · Giá bán: {item.price.toLocaleString('vi-VN')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Tồn: {item.stock} · Khách đặt: 0
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                  </Paper>
                )}
              </Box>
              {selectedIds.size > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    bgcolor: 'primary.50',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Đã chọn {selectedIds.size}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedIds(new Set())}
                    sx={{ p: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              {selectedIds.size > 0 && (
                <Button
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  onClick={() => handleOpenPrint([...selectedIds])}
                >
                  In tem mã
                </Button>
              )}
              {selectedIds.size > 0 && (
                <>
                  <IconButton
                    title="Khác"
                    onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                    sx={{ bgcolor: moreMenuAnchor ? 'action.selected' : 'transparent' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                  <Menu
                    anchorEl={moreMenuAnchor}
                    open={Boolean(moreMenuAnchor)}
                    onClose={() => setMoreMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ sx: { minWidth: 200 } }}
                  >
                    <MenuItem onClick={() => { setMoreMenuAnchor(null); }}>
                      Đặt hàng nhập
                    </MenuItem>
                    <MenuItem onClick={() => { setMoreMenuAnchor(null); }}>
                      Đổi nhóm hàng
                    </MenuItem>
                    <MenuItem onClick={() => { setMoreMenuAnchor(null); }}>
                      Liên kết kênh bán
                    </MenuItem>
                    <MenuItem
                      onClick={() => { setMoreMenuAnchor(null); }}
                      sx={{ color: 'error.main' }}
                    >
                      Ngừng kinh doanh
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setMoreMenuAnchor(null);
                        const ids = [...selectedIds];
                        const _ids = products.filter((p) => selectedIds.has(p.id)).map((p) => p.raw?._id).filter(Boolean);
                        setDeleteTarget({ ids, _ids });
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      Xóa
                    </MenuItem>
                  </Menu>
                </>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ textTransform: 'none' }}
                onClick={(event) => setCreateMenuAnchor(event.currentTarget)}
              >
                Tạo mới
              </Button>
              <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} sx={{ textTransform: 'none' }}>
                Xuất file
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                sx={{ textTransform: 'none' }}
                onClick={() => {
                  setImportDialogOpen(true);
                  setImportError('');
                  setImportResult(null);
                  setImportFile(null);
                  setImportPreviewRows([]);
                }}
              >
                Import file
              </Button>
              <IconButton
                title="Ẩn hiện cột"
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                sx={{ bgcolor: columnMenuAnchor ? 'action.selected' : 'transparent' }}
              >
                <ViewColumnOutlinedIcon />
              </IconButton>
              <Menu
                anchorEl={columnMenuAnchor}
                open={Boolean(columnMenuAnchor)}
                onClose={() => setColumnMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { minWidth: 320, maxHeight: 400 } }}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Ẩn hiện cột
                  </Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, px: 1, py: 1 }}>
                  {PRODUCT_COLUMN_OPTIONS.map((col) => (
                    <FormControlLabel
                      key={col.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={visibleColumns[col.id] === true}
                          onChange={() => {
                            setVisibleColumns((prev) => {
                              const next = { ...prev, [col.id]: !prev[col.id] };
                              try {
                                localStorage.setItem('pos_admin_product_visible_columns', JSON.stringify(next));
                              } catch {
                                // ignore
                              }
                              return next;
                            });
                          }}
                        />
                      }
                      label={<Typography variant="body2">{col.label}</Typography>}
                      sx={{ m: 0 }}
                    />
                  ))}
                </Box>
              </Menu>
              <IconButton>
                <SettingsOutlinedIcon />
              </IconButton>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `48px ${visibleColumnIds.map((id) => (id === 'name' ? '1.5fr' : '1fr')).join(' ')}`,
                gap: 2,
                pb: 1,
              }}
            >
              <Checkbox
                size="small"
                checked={selectedIds.size > 0 && selectedIds.size === products.length}
                indeterminate={selectedIds.size > 0 && selectedIds.size < products.length}
                onChange={() => {
                  if (selectedIds.size === products.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(products.map((item) => item.id)));
                  }
                }}
              />
              {visibleColumnIds.map((id) => (
                <Typography key={id} variant="caption" color="text.secondary">
                  {PRODUCT_COLUMN_OPTIONS.find((c) => c.id === id)?.label || id}
                </Typography>
              ))}
            </Box>
            <Divider sx={{ my: 1 }} />
            {loading ? (
              <Typography variant="body2" color="text.secondary">
                Đang tải dữ liệu...
              </Typography>
            ) : loadError ? (
              <Typography variant="body2" color="error">
                {loadError}
              </Typography>
            ) : (
              listProducts.map((item) => (
                  <Box key={item.key}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: `48px ${visibleColumnIds.map((id) => (id === 'name' ? '1.5fr' : '1fr')).join(' ')}`,
                        gap: 2,
                        py: 1,
                        alignItems: 'center',
                        borderBottom: expandedProductId === item.id ? 'none' : '1px solid',
                        borderColor: 'divider',
                        bgcolor: expandedProductId === item.id ? 'primary.50' : 'transparent',
                        cursor: 'pointer',
                        borderLeft: expandedProductId === item.id ? '3px solid' : '3px solid transparent',
                        borderLeftColor: expandedProductId === item.id ? 'primary.main' : 'transparent',
                      }}
                      onClick={() => {
                        setSelectedProductId(item.id);
                        setExpandedProductId((prev) => (prev === item.id ? '' : item.id));
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(item.id)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleSelect(item.id)}
                      />
                      {visibleColumnIds.map((colId) => (
                        <Box key={colId} sx={{ minWidth: 0 }}>
                          {colId === 'image' ? (
                            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'grey.200' }} />
                          ) : (
                            <Typography variant="body2" noWrap>{getProductCellValue(item, colId)}</Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                    {expandedProductId === item.id && (
                      <Box sx={{ border: '1px solid', borderColor: 'primary.main', borderTop: 'none', p: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          {visibleColumns.image && (
                            <Box
                              sx={{
                                width: 120,
                                height: 120,
                                borderRadius: 2,
                                bgcolor: 'grey.200',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <SearchIcon color="action" />
                            </Box>
                          )}
                          <Box sx={{ flex: 1 }}>
                            {visibleColumns.name && (
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {item.name}
                              </Typography>
                            )}
                            {visibleColumns.category && (
                              <Typography variant="body2" color="text.secondary">
                                Nhóm hàng: {categoryOptions.find((o) => o.id === item.category)?.label || item.category || 'Chưa có'}
                              </Typography>
                            )}
                            {visibleColumns.brand && (
                              <Typography variant="body2" color="text.secondary">
                                Thương hiệu: {brands.find((b) => b._id === item.brand)?.name || 'Chưa có'}
                              </Typography>
                            )}
                            {visibleColumns.earnPoints && (
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{ bgcolor: 'grey.200', px: 1, py: 0.5, borderRadius: 1 }}>
                                  Hàng hóa thường
                                </Typography>
                                <Typography variant="caption" sx={{ bgcolor: 'grey.200', px: 1, py: 0.5, borderRadius: 1 }}>
                                  Bán trực tiếp
                                </Typography>
                                {item.raw?.allowPoints !== false && (
                                  <Typography variant="caption" sx={{ bgcolor: 'grey.200', px: 1, py: 0.5, borderRadius: 1 }}>
                                    Tích điểm
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                        {visibleColumnIds.some((id) => ['productCode', 'barcode', 'stock', 'cost', 'price', 'minStock', 'maxStock', 'position', 'productType', 'createdAt'].includes(id)) && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2 }}>
                              {visibleColumns.productCode && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Mã hàng</Typography>
                                  <Typography variant="body2">{item.id}</Typography>
                                </Box>
                              )}
                              {visibleColumns.barcode && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Mã vạch</Typography>
                                  <Typography variant="body2">{item.barcode || 'Chưa có'}</Typography>
                                </Box>
                              )}
                              {visibleColumns.stock && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Tồn kho</Typography>
                                  <Typography variant="body2">{item.stock}</Typography>
                                </Box>
                              )}
                              {visibleColumns.cost && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Giá vốn</Typography>
                                  <Typography variant="body2">{item.cost != null ? item.cost.toLocaleString('vi-VN') : ''}</Typography>
                                </Box>
                              )}
                              {visibleColumns.price && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Giá bán</Typography>
                                  <Typography variant="body2">{item.price != null ? item.price.toLocaleString('vi-VN') : ''}</Typography>
                                </Box>
                              )}
                              {(visibleColumns.minStock || visibleColumns.maxStock) && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Định mức tồn</Typography>
                                  <Typography variant="body2">
                                    {(item.raw?.minStock ?? 0)} - {(item.raw?.maxStock ?? 999999999).toLocaleString('vi-VN')}
                                  </Typography>
                                </Box>
                              )}
                              {visibleColumns.position && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Vị trí</Typography>
                                  <Typography variant="body2">{item.raw?.position || 'Chưa có'}</Typography>
                                </Box>
                              )}
                              {visibleColumns.productType && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Loại hàng</Typography>
                                  <Typography variant="body2">{item.raw?.type || item.attributeName || 'Chưa có'}</Typography>
                                </Box>
                              )}
                              {visibleColumns.createdAt && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Thời gian tạo</Typography>
                                  <Typography variant="body2">{item.createdAt || 'Chưa có'}</Typography>
                                </Box>
                              )}
                            </Box>
                          </>
                        )}
                        <Divider sx={{ my: 2 }} />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Nhà cung cấp
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.supplier || 'Chưa có'}
                          </Typography>
                        </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleOpenDelete(item)}>
                            Xóa
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => openCopyDialog(item)}>
                            Sao chép
                          </Button>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained" onClick={() => openEditDialog(item)}>
                            Chỉnh sửa
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleOpenPrint([item.id])}>
                            In tem mã
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Paper>

          <Menu
            anchorEl={createMenuAnchor}
            open={Boolean(createMenuAnchor)}
            onClose={() => setCreateMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={() => {
                setCreateMenuAnchor(null);
                openCreateDialog('Hàng hóa');
              }}
            >
              Hàng hóa
            </MenuItem>
            <MenuItem
              onClick={() => {
                setCreateMenuAnchor(null);
                openCreateDialog('Dịch vụ');
              }}
            >
              Dịch vụ
            </MenuItem>
            <MenuItem
              onClick={() => {
                setCreateMenuAnchor(null);
                openCreateDialog('Combo - đóng gói');
              }}
            >
              Combo - đóng gói
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Popover
        open={Boolean(categoryAnchorEl)}
        anchorEl={categoryAnchorEl}
        onClose={() => setCategoryAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 420, p: 2 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Nhóm hàng
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setCategoryDialogOpen(true)}>
            Tạo mới
          </Button>
        </Box>
        <TextField
          size="small"
          placeholder="Tìm kiếm"
          value={categorySearchTerm}
          onChange={(event) => setCategorySearchTerm(event.target.value)}
          fullWidth
          sx={{ mb: 1 }}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
        />
        <Box sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {categoryLoading ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Đang tải nhóm hàng...
            </Typography>
          ) : categoryError ? (
            <Typography variant="body2" color="error" sx={{ p: 2 }}>
              {categoryError}
            </Typography>
          ) : filteredCategoryTree.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Không tìm thấy nhóm hàng.
            </Typography>
          ) : (
            renderCategoryNodes(filteredCategoryTree)
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          <Button
            size="small"
            onClick={() => setCategoryDraftIds(new Set(categories.map((item) => item._id)))}
          >
            Chọn tất cả
          </Button>
          <Button variant="contained" size="small" onClick={handleApplyCategories}>
            Áp dụng
          </Button>
        </Box>
      </Popover>

      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Tạo nhóm hàng</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Tên nhóm"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Nhóm cha</InputLabel>
              <Select
                value={categoryForm.parentId}
                label="Nhóm cha"
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, parentId: event.target.value }))}
              >
                <MenuItem value="">Chọn nhóm hàng</MenuItem>
                {categoryOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Bỏ qua</Button>
          <Button variant="contained" onClick={handleCreateCategory}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={brandDialogOpen} onClose={() => setBrandDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Tạo thương hiệu</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Tên thương hiệu"
              value={brandForm.name}
              onChange={(event) => setBrandForm((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
              placeholder="Nhập tên thương hiệu"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrandDialogOpen(false)}>Bỏ qua</Button>
          <Button variant="contained" onClick={handleCreateBrand}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => !importLoading && setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Nhập hàng hóa từ file dữ liệu</span>
          <Typography
            component="a"
            href="#"
            onClick={(e) => { e.preventDefault(); handleDownloadImportTemplate(); }}
            variant="body2"
            color="primary"
            sx={{ fontWeight: 500 }}
          >
            Tải về file mẫu: Excel file
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Xử lý trùng mã hàng/mã vạch, khác tên hàng hóa?
              </Typography>
              <RadioGroup
                row
                value={importOptions.duplicateCodeName}
                onChange={(e) => setImportOptions((o) => ({ ...o, duplicateCodeName: e.target.value }))}
              >
                <FormControlLabel value="error" control={<Radio />} label="Báo lỗi và dừng import" />
                <FormControlLabel value="replace_name" control={<Radio />} label="Thay thế tên hàng cũ bằng tên hàng mới" />
              </RadioGroup>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Xử lý trùng mã vạch, khác mã hàng?
              </Typography>
              <RadioGroup
                row
                value={importOptions.duplicateBarcodeCode}
                onChange={(e) => setImportOptions((o) => ({ ...o, duplicateBarcodeCode: e.target.value }))}
              >
                <FormControlLabel value="error" control={<Radio />} label="Báo lỗi và dừng import" />
                <FormControlLabel value="replace_code" control={<Radio />} label="Thay thế mã hàng cũ bằng mã hàng mới" />
              </RadioGroup>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Cập nhật tồn kho?
              </Typography>
              <RadioGroup
                row
                value={importOptions.updateStock ? 'yes' : 'no'}
                onChange={(e) => setImportOptions((o) => ({ ...o, updateStock: e.target.value === 'yes' }))}
              >
                <FormControlLabel value="no" control={<Radio />} label="Không" />
                <FormControlLabel value="yes" control={<Radio />} label="Có" />
              </RadioGroup>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Cập nhật giá vốn?
              </Typography>
              <RadioGroup
                row
                value={importOptions.updateCost ? 'yes' : 'no'}
                onChange={(e) => setImportOptions((o) => ({ ...o, updateCost: e.target.value === 'yes' }))}
              >
                <FormControlLabel value="no" control={<Radio />} label="Không" />
                <FormControlLabel value="yes" control={<Radio />} label="Có" />
              </RadioGroup>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Cập nhật mô tả?
              </Typography>
              <RadioGroup
                row
                value={importOptions.updateDescription ? 'yes' : 'no'}
                onChange={(e) => setImportOptions((o) => ({ ...o, updateDescription: e.target.value === 'yes' }))}
              >
                <FormControlLabel value="no" control={<Radio />} label="Không" />
                <FormControlLabel value="yes" control={<Radio />} label="Có" />
              </RadioGroup>
            </Box>
            <input
              type="file"
              ref={importFileInputRef}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                setImportFile(file || null);
                setImportError('');
                setImportPreviewRows([]);
                e.target.value = '';
                if (file) {
                  try {
                    const rows = await parseImportFilePreview(file);
                    setImportPreviewRows(rows);
                  } catch (err) {
                    setImportError(err.message || 'Không đọc được file Excel');
                  }
                }
              }}
            />
            {importFile && (
              <Typography variant="body2" color="text.secondary">
                Đã chọn: {importFile.name}
              </Typography>
            )}
            {importPreviewRows.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Xem trước ({importPreviewRows.length} sản phẩm sẽ nhập)
                </Typography>
                <TableContainer sx={{ maxHeight: 280, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Mã hàng</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Tên hàng</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Giá bán</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Giá vốn</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Tồn kho</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Nhóm hàng</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Thương hiệu</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importPreviewRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.productCode || '(Tự động)'}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell align="right">{Number(row.price) ? Number(row.price).toLocaleString('vi-VN') : ''}</TableCell>
                          <TableCell align="right">{Number(row.costPrice) ? Number(row.costPrice).toLocaleString('vi-VN') : ''}</TableCell>
                          <TableCell align="right">{row.stock !== '' && row.stock != null ? String(row.stock) : ''}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.brand}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            {importError && (
              <Typography variant="body2" color="error">
                {importError}
              </Typography>
            )}
            {importResult?.imported != null && (
              <Typography variant="body2" sx={{ color: 'success.main' }}>
                Đã import {importResult.imported} sản phẩm.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => !importLoading && setImportDialogOpen(false)} disabled={importLoading}>
            Bỏ qua
          </Button>
          <Button
            variant="outlined"
            onClick={() => importFileInputRef.current?.click()}
            disabled={importLoading}
          >
            Chọn file dữ liệu
          </Button>
          <Button
            variant="contained"
            onClick={handleImportSubmit}
            disabled={importLoading || !importFile}
          >
            {importLoading ? 'Đang nhập hàng...' : 'Thực hiện'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Xóa hàng hóa</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteTarget?.ids ? (
              <>
                Hệ thống sẽ xóa hoàn toàn{' '}
                <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
                  {deleteTarget.ids.length} sản phẩm đã chọn
                </Typography>
                {' '}trên toàn bộ chi nhánh nhưng vẫn giữ thông tin trong các giao dịch lịch sử nếu có. Bạn có chắc
                chắn muốn xóa?
              </>
            ) : (
              <>
                Hệ thống sẽ xóa hoàn toàn hàng hóa{' '}
                <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
                  {deleteTarget?.id}
                </Typography>
                {' '}trên toàn bộ chi nhánh nhưng vẫn giữ thông tin hàng hóa trong các giao dịch lịch sử nếu có. Bạn có chắc
                chắn muốn xóa?
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Bỏ qua</Button>
          <Button variant="contained" color="primary" onClick={handleConfirmDelete}>
            Đồng ý
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={productDialogOpen} onClose={() => setProductDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{productDialogMode === 'edit' ? 'Sửa hàng hóa' : 'Tạo hàng hóa'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Tabs value={productDialogTab} onChange={(event, value) => setProductDialogTab(value)} sx={{ mb: 2 }}>
              <Tab label="Thông tin" />
              <Tab label="Mô tả" />
            </Tabs>

            {productDialogTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    Thông tin {productDialogType.toLowerCase()}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <TextField
                        label="Mã hàng"
                        placeholder="Tự động"
                        value={productForm.id}
                        onFocus={(e) => e.target.select()}
                        onChange={(event) => {
                          setProductForm((prev) => ({ ...prev, id: event.target.value }));
                          setProductCodeSource('user');
                        }}
                        onBlur={handleCheckProductCode}
                        error={Boolean(productCodeError)}
                        helperText={productCodeError || ' '}
                        fullWidth
                      />
                      <TextField
                        label="Mã vạch"
                        placeholder="Nhập mã vạch"
                        value={productForm.barcode}
                        onFocus={(e) => e.target.select()}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, barcode: event.target.value }))}
                        fullWidth
                      />
                      <TextField
                        label="Tên hàng"
                        placeholder="Bắt buộc"
                        value={productForm.name}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                        fullWidth
                      />
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <FormControl fullWidth error={Boolean(productFormCategoryError)}>
                          <InputLabel>Nhóm hàng</InputLabel>
                          <Select
                            value={productForm.category}
                            label="Nhóm hàng"
                            onChange={(event) => {
                              setProductForm((prev) => ({ ...prev, category: event.target.value }));
                              setProductFormCategoryError('');
                            }}
                          >
                            <MenuItem value="">Chọn nhóm hàng</MenuItem>
                            {categoryOptions.map((option) => (
                              <MenuItem key={option.id} value={option.id}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {productFormCategoryError && (
                            <FormHelperText sx={{ color: 'error.main' }}>{productFormCategoryError}</FormHelperText>
                          )}
                        </FormControl>
                        <Button
                          size="small"
                          sx={{ textTransform: 'none', mt: 1, minWidth: 'fit-content' }}
                          onClick={() => setCategoryDialogOpen(true)}
                        >
                          Tạo mới
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <FormControl fullWidth>
                          <InputLabel>Thương hiệu</InputLabel>
                          <Select
                            value={productForm.brand}
                            label="Thương hiệu"
                            onChange={(event) => setProductForm((prev) => ({ ...prev, brand: event.target.value }))}
                          >
                            <MenuItem value="">Chọn thương hiệu</MenuItem>
                            {brands.map((b) => (
                              <MenuItem key={b._id} value={b._id}>
                                {b.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button
                          size="small"
                          sx={{ textTransform: 'none', mt: 1, minWidth: 'fit-content' }}
                          onClick={() => setBrandDialogOpen(true)}
                        >
                          Tạo mới
                        </Button>
                      </Box>
                    </Box>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        bgcolor: 'grey.50',
                      }}
                    >
                      <ImageOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                      <Button variant="outlined" size="small">
                        Thêm ảnh
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        Mỗi ảnh không quá 2 MB
                      </Typography>
                    </Paper>
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Giá vốn, giá bán
                    </Typography>
                    <Button size="small" sx={{ textTransform: 'none' }}>
                      Thiết lập giá
                    </Button>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="Giá vốn"
                      type="number"
                      value={productForm.cost}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, cost: event.target.value }))}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      fullWidth
                    />
                    <TextField
                      label="Giá bán"
                      type="number"
                      value={productForm.price}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      fullWidth
                    />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Tồn kho
                    </Typography>
                    <IconButton size="small">
                      <ExpandMoreIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Quản lý số lượng tồn kho và định mức tồn.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                    <TextField
                      label="Tồn kho"
                      type="number"
                      value={productForm.stock}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      fullWidth
                    />
                    <TextField
                      label="Định mức tồn thấp nhất"
                      type="number"
                      value={productForm.minStock}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, minStock: event.target.value }))}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      fullWidth
                    />
                    <TextField
                      label="Định mức tồn cao nhất"
                      type="number"
                      value={productForm.maxStock}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, maxStock: event.target.value }))}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      fullWidth
                    />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Tích điểm
                  </Typography>
                  <Switch
                    checked={productForm.earnPoints}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, earnPoints: event.target.checked }))}
                  />
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Vị trí, trọng lượng
                    </Typography>
                    <Button size="small" sx={{ textTransform: 'none' }}>
                      Tạo mới
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Quản lý việc sắp xếp kho, vị trí bán hàng hoặc trọng lượng.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 2 }}>
                      <TextField
                        label="Vị trí"
                        placeholder="Chọn vị trí"
                        value={productForm.position}
                        onFocus={(e) => e.target.select()}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, position: event.target.value }))}
                        fullWidth
                      />
                      <TextField
                        label="Trọng lượng"
                        value={productForm.weight}
                        onFocus={(e) => e.target.select()}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, weight: event.target.value }))}
                        fullWidth
                      />
                    <TextField
                      label="Đơn vị"
                      value={productForm.unit}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, unit: event.target.value }))}
                      fullWidth
                    />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Quản lý theo đơn vị tính và thuộc tính
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Tạo nhiều hàng hóa khác đơn vị tính hoặc đặc điểm. Mỗi hàng hóa có 1 mã hàng riêng.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {productForm.attributeValues?.length ? `${productForm.attributeValues.length} hàng cùng loại` : ''}
                    </Typography>
                    <Button variant="outlined" size="small" onClick={handleOpenAttributeDialog}>
                      Thiết lập
                    </Button>
                  </Box>
                </Paper>

                <FormControlLabel
                  control={
                    <Switch
                      checked={productForm.sellDirect}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, sellDirect: event.target.checked }))}
                    />
                  }
                  label="Bán trực tiếp"
                />
              </Box>
            )}

            {productDialogTab === 1 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <TextField label="Mô tả" multiline minRows={6} fullWidth placeholder="Nhập mô tả hàng hóa" />
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialogOpen(false)}>Bỏ qua</Button>
          <Button variant="outlined">Lưu &amp; Tạo thêm hàng</Button>
          <Button variant="contained" onClick={handleSaveProduct}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={attributeDialogOpen} onClose={() => setAttributeDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Thiết lập đơn vị tính và thuộc tính</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Đơn vị tính
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Thêm đơn vị bán hoặc nhập như chai, lốc, thùng. Đặt công thức quy đổi để tính nhanh giá và tồn kho.
              </Typography>
              <Button size="small" startIcon={<AddIcon />}>
                Thêm đơn vị cơ bản
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Thuộc tính
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Thêm đặc điểm như hương vị, dung tích, màu sắc
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: 2, alignItems: 'center' }}>
                <FormControl fullWidth>
                  <InputLabel>Chọn thuộc tính</InputLabel>
                  <Select
                    value={selectedAttribute}
                    label="Chọn thuộc tính"
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === '__create') {
                        const name = window.prompt('Nhập tên thuộc tính');
                        if (name && name.trim()) {
                          const trimmed = name.trim();
                          setAttributeOptions((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
                          setSelectedAttribute(trimmed);
                        }
                        return;
                      }
                      setSelectedAttribute(value);
                    }}
                  >
                    <MenuItem value="">Chọn thuộc tính</MenuItem>
                    {attributeOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                    <MenuItem value="__create">+ Tạo thuộc tính mới</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  placeholder="Nhập giá trị thuộc tính và enter"
                  value={attributeValueInput}
                  onChange={(event) => setAttributeValueInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddAttributeValue(attributeValueInput);
                    }
                  }}
                />
                <Button variant="outlined" onClick={() => quickAttributeValues.forEach(handleAddAttributeValue)}>
                  Chọn nhanh
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {attributeValues.map((value) => (
                  <Chip key={value} label={value} onDelete={() => handleRemoveAttributeValue(value)} />
                ))}
              </Box>
              <Button size="small" startIcon={<AddIcon />} sx={{ mt: 2 }}>
                Thêm thuộc tính
              </Button>
            </Paper>

            {attributeValues.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Hàng cùng loại
                  </Typography>
                  <Button size="small">Thiết lập giá</Button>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr 1fr 120px 120px 100px 40px', gap: 1 }}>
                  <Typography variant="caption">Giá trị thuộc tính</Typography>
                  <Typography variant="caption">Quy đổi</Typography>
                  <Typography variant="caption">Mã hàng</Typography>
                  <Typography variant="caption">Mã vạch</Typography>
                  <Typography variant="caption">Giá vốn</Typography>
                  <Typography variant="caption">Giá bán</Typography>
                  <Typography variant="caption">Tồn kho</Typography>
                  <Typography variant="caption" />
                </Box>
                <Divider sx={{ my: 1 }} />
                {variantRows.map((row, index) => (
                  <Box
                    key={row.value}
                    sx={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr 1fr 120px 120px 100px 40px', gap: 1, mb: 1 }}
                  >
                    <Typography variant="body2">{row.value}</Typography>
                    <TextField
                      size="small"
                      value={row.conversion}
                      onFocus={(e) => e.target.select()}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariantRows((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, conversion: value } : item))
                        );
                      }}
                    />
                    <TextField
                      size="small"
                      value={row.code}
                      placeholder={productCodeSource === 'auto' ? 'Sẽ gán SPxxx khi lưu' : ''}
                      disabled={productCodeSource === 'auto'}
                      onFocus={(e) => e.target.select()}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariantRows((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, code: value } : item))
                        );
                      }}
                    />
                    <TextField
                      size="small"
                      value={row.barcode}
                      onFocus={(e) => e.target.select()}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariantRows((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, barcode: value } : item))
                        );
                      }}
                    />
                    <TextField
                      size="small"
                      value={row.cost}
                      onFocus={(e) => e.target.select()}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariantRows((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, cost: value } : item))
                        );
                      }}
                    />
                    <TextField
                      size="small"
                      value={row.price}
                      onFocus={(e) => e.target.select()}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariantRows((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, price: value } : item))
                        );
                      }}
                    />
                    <TextField
                      size="small"
                      value={row.stock}
                      onFocus={(e) => e.target.select()}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariantRows((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, stock: value } : item))
                        );
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveAttributeValue(row.value)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttributeDialogOpen(false)}>Bỏ qua</Button>
          <Button variant="contained" onClick={handleApplyAttributes}>
            Xong
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Chọn loại giấy in tem mã</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Số lượng in"
                type="number"
                value={printForm.quantity}
                onChange={(event) => setPrintForm((prev) => ({ ...prev, quantity: event.target.value }))}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Mã hàng</InputLabel>
                <Select
                  value={printForm.codeType}
                  label="Mã hàng"
                  onChange={(event) => setPrintForm((prev) => ({ ...prev, codeType: event.target.value }))}
                >
                  <MenuItem value="Mã hàng">Mã hàng</MenuItem>
                  <MenuItem value="Mã vạch">Mã vạch</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Bảng giá chung</InputLabel>
                <Select
                  value={printForm.priceList}
                  label="Bảng giá chung"
                  onChange={(event) => setPrintForm((prev) => ({ ...prev, priceList: event.target.value }))}
                >
                  <MenuItem value="Bảng giá chung">Bảng giá chung</MenuItem>
                  <MenuItem value="Bảng giá sỉ">Bảng giá sỉ</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Giá kèm VND</InputLabel>
                <Select
                  value={printForm.priceDisplay}
                  label="Giá kèm VND"
                  onChange={(event) => setPrintForm((prev) => ({ ...prev, priceDisplay: event.target.value }))}
                >
                  <MenuItem value="Giá kèm VND">Giá kèm VND</MenuItem>
                  <MenuItem value="Giá không kèm VND">Giá không kèm VND</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Giá không kèm đơn vị tính</InputLabel>
                <Select
                  value={printForm.unitDisplay}
                  label="Giá không kèm đơn vị tính"
                  onChange={(event) => setPrintForm((prev) => ({ ...prev, unitDisplay: event.target.value }))}
                >
                  <MenuItem value="Giá không kèm đơn vị tính">Giá không kèm đơn vị tính</MenuItem>
                  <MenuItem value="Giá kèm đơn vị tính">Giá kèm đơn vị tính</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Không in tên cửa hàng</InputLabel>
                <Select
                  value={printForm.storeName}
                  label="Không in tên cửa hàng"
                  onChange={(event) => setPrintForm((prev) => ({ ...prev, storeName: event.target.value }))}
                >
                  <MenuItem value="Không in tên cửa hàng">Không in tên cửa hàng</MenuItem>
                  <MenuItem value="In tên cửa hàng">In tên cửa hàng</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" sx={{ justifyContent: 'flex-start' }}>
                Xuất file Excel
              </Button>
              <Typography variant="caption" color="text.secondary">
                Lưu ý: Nếu mã vạch được in không đầy đủ, hãy sử dụng mẫu giấy in có khoảng trắng rộng hơn. Phần mềm hỗ
                trợ in tối đa 5000 tem mỗi lần.
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Chọn khổ in ({printTargets.length} sản phẩm)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                {[
                  'Mẫu giấy cuộn 3 nhãn (104x22mm)',
                  'Mẫu giấy 12 nhãn (202x162mm)',
                  'Mẫu giấy cuộn 2 nhãn (72x22mm)',
                  'Mẫu giấy 65 nhãn (A4)',
                  'Mẫu giấy cuộn 2 nhãn (74x22mm)',
                  'Mẫu tem hàng trang sức (75x10mm)',
                  'Mẫu giấy cuộn 1 nhãn (50x30mm)',
                ].map((label) => (
                  <Button
                    key={label}
                    variant={printForm.paperSize === label ? 'contained' : 'outlined'}
                    onClick={() => setPrintForm((prev) => ({ ...prev, paperSize: label }))}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Đóng</Button>
          <Button variant="contained">Xem bản in</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
