import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Popover,
  Select,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../utils/apiClient';
import { getStoredStoreId } from '../utils/authStorage';

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('vi-VN');
}

function parseNumber(v) {
  if (v === '' || v == null) return 0;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isNaN(n) ? 0 : n;
}

const DRAFT_STORAGE_KEY = 'purchaseOrderDraft';

export default function PurchaseOrderNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams();
  const { user } = useAuth();
  const copyFrom = location.state?.copyFrom;
  const productSearchRef = useRef(null);
  const fileInputRef = useRef(null);
  const now = useMemo(() => new Date(), []);
  const userDisplayName = user?.name || user?.email || user?.username || 'Người dùng';
  const dateTimeStr = now.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [supplierOption, setSupplierOption] = useState(null);
  const [orderReference, setOrderReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [discountPopover, setDiscountPopover] = useState({
    anchorEl: null,
    rowIndex: null,
    mode: 'vnd',
    inputValue: '',
  });
  const [confirmNoSupplierOpen, setConfirmNoSupplierOpen] = useState(false);
  const [orderDiscountPopover, setOrderDiscountPopover] = useState({
    anchorEl: null,
    mode: 'vnd',
    inputValue: '',
  });
  const [editOrder, setEditOrder] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState(false);

  // State cho dialog tạo sản phẩm mới
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductTab, setCreateProductTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productForm, setProductForm] = useState({
    id: '',
    barcode: '',
    name: '',
    category: '',
    brand: '',
    price: 0,
    stock: 0,
    minStock: 0,
    maxStock: 999999999,
    position: '',
    weight: '',
    unit: 'Cái',
    earnPoints: true,
  });
  const [productFormCategoryError, setProductFormCategoryError] = useState('');
  const [productCodeError, setProductCodeError] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Dialog tạo nhà cung cấp mới
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [supplierGroups, setSupplierGroups] = useState([]);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    area: '',
    ward: '',
    groupId: '',
    notes: '',
    companyName: '',
    taxCode: '',
  });
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierFormError, setSupplierFormError] = useState('');

  // Import Excel: chọn file → hiển thị tên file + lỗi đỏ → bấm Thực hiện mới thêm vào phiếu
  const [excelFile, setExcelFile] = useState(null);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelImportErrors, setExcelImportErrors] = useState([]);
  const [excelValidRows, setExcelValidRows] = useState([]);

  // State cho dialog tùy chọn hiển thị
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);
  const [displayOptionsAnchor, setDisplayOptionsAnchor] = useState(null);
  const [displayOptions, setDisplayOptions] = useState({
    showImage: false,
    showStock: false,
    filterMode: false,
    sortOrder: 'asc',
    showCostPrice: false,
    showSellPrice: false,
  });

  const loadProducts = useCallback(async () => {
    try {
      const res = await apiRequest('/api/products');
      setProducts(Array.isArray(res?.products) ? res.products : []);
    } catch {
      setProducts([]);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await apiRequest('/api/suppliers');
      setSuppliers(Array.isArray(res?.suppliers) ? res.suppliers : []);
    } catch {
      setSuppliers([]);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await apiRequest('/api/categories');
      setCategories(Array.isArray(res?.categories) ? res.categories : []);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const res = await apiRequest('/api/brands');
      setBrands(Array.isArray(res?.brands) ? res.brands : []);
    } catch {
      setBrands([]);
    }
  }, []);

  const loadSupplierGroups = useCallback(async () => {
    try {
      const storeId = getStoredStoreId();
      const url = storeId ? `/api/supplier-groups?storeId=${storeId}` : '/api/supplier-groups';
      const res = await apiRequest(url);
      setSupplierGroups(Array.isArray(res?.groups) ? res.groups : []);
    } catch {
      setSupplierGroups([]);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadSuppliers();
    loadCategories();
    loadBrands();
  }, [loadProducts, loadSuppliers, loadCategories, loadBrands]);

  useEffect(() => {
    if (createSupplierOpen) loadSupplierGroups();
  }, [createSupplierOpen, loadSupplierGroups]);

  const categoryOptions = useMemo(() => {
    const buildOptions = (cats, parentId = null, level = 0) => {
      const results = [];
      const children = cats.filter((c) => (c.parentId || null) === parentId);
      children.forEach((c) => {
        results.push({ id: c._id, label: '—'.repeat(level) + (level > 0 ? ' ' : '') + c.name, level });
        results.push(...buildOptions(cats, c._id, level + 1));
      });
      return results;
    };
    return buildOptions(categories);
  }, [categories]);

  useEffect(() => {
    if (!editId || !suppliers.length) return;
    let cancelled = false;
    setEditLoading(true);
    apiRequest(`/api/purchase-orders/${editId}`)
      .then((res) => {
        const order = res?.purchaseOrder || res;
        if (!order || cancelled) return;
        setEditOrder(order);
        const itemsFrom = Array.isArray(order.items) ? order.items : [];
        setItems(
          itemsFrom.map((it) => ({
            productId: it.productId || '',
            productCode: it.productCode || '',
            productName: it.productName || '',
            unit: it.unit || '',
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unitPrice) || 0,
            discount: Number(it.discount) || 0,
            amount: Number(it.amount) || 0,
            note: it.note || '',
          }))
        );
        setNotes(order.notes || '');
        setDiscountAmount(0);
        if (order.supplierId && suppliers.some((s) => s._id === order.supplierId)) {
          const s = suppliers.find((x) => x._id === order.supplierId);
          setSupplierOption(s ? { id: s._id, code: s.code || '', name: s.name || '', label: s.code ? `${s.code} - ${s.name}` : s.name } : null);
        } else {
          setSupplierOption(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEditLoading(false);
      });
    return () => { cancelled = true; };
  }, [editId, suppliers]);

  const draftRestored = useRef(false);
  useEffect(() => {
    if (editId || copyFrom || !suppliers.length || draftRestored.current) return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      draftRestored.current = true;
      if (Array.isArray(draft.items) && draft.items.length > 0) {
        setItems(draft.items);
      }
      if (draft.notes != null) setNotes(draft.notes);
      if (draft.discountAmount != null) setDiscountAmount(Number(draft.discountAmount) || 0);
      if (draft.orderReference != null) setOrderReference(draft.orderReference || '');
      if (draft.supplierOption && suppliers.some((s) => s._id === draft.supplierOption.id)) {
        const s = suppliers.find((x) => x._id === draft.supplierOption.id);
        if (s) setSupplierOption({ id: s._id, code: s.code || '', name: s.name || '', label: s.code ? `${s.code} - ${s.name}` : s.name });
      }
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [editId, copyFrom, suppliers]);

  const copyFromApplied = useRef(false);
  useEffect(() => {
    if (editId || !copyFrom || !suppliers.length || copyFromApplied.current) return;
    copyFromApplied.current = true;
    const itemsFrom = Array.isArray(copyFrom.items) ? copyFrom.items : [];
    if (itemsFrom.length > 0) {
      setItems(
        itemsFrom.map((it) => ({
          productId: it.productId || '',
          productCode: it.productCode || '',
          productName: it.productName || '',
          unit: it.unit || '',
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
          amount: Number(it.amount) || 0,
          note: it.note || '',
        }))
      );
    }
    if (copyFrom.supplierId && suppliers.some((s) => s._id === copyFrom.supplierId)) {
      const s = suppliers.find((x) => x._id === copyFrom.supplierId);
      setSupplierOption(s ? { id: s._id, code: s.code || '', name: s.name || '', label: s.code ? `${s.code} - ${s.name}` : s.name } : null);
    }
    setNotes(copyFrom.notes || '');
    setDiscountAmount(Number(copyFrom.discountAmount) || 0);
  }, [editId, copyFrom, suppliers]);

  const productFiltered = useMemo(() => {
    const t = productSearch.trim().toLowerCase();
    if (!t) return products.slice(0, 50);
    return products.filter(
      (p) =>
        (p.productCode || '').toLowerCase().includes(t) ||
        (p.name || '').toLowerCase().includes(t)
    ).slice(0, 50);
  }, [products, productSearch]);

  const totalGoodsAmount = useMemo(
    () => items.reduce((s, it) => s + (Number(it.amount) || 0), 0),
    [items]
  );
  const amountToPay = useMemo(
    () => Math.max(0, totalGoodsAmount - (Number(discountAmount) || 0)),
    [totalGoodsAmount, discountAmount]
  );

  const addProduct = useCallback((product) => {
    const productId = product._id || product.localId || '';
    const productCode = (product.productCode || '').trim().toLowerCase();
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (it) =>
          (productId && (it.productId || '').toString() === productId.toString()) ||
          (productCode && (it.productCode || '').trim().toLowerCase() === productCode)
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        const row = { ...next[existingIndex] };
        const q = Number(row.quantity) || 0;
        const up = Number(row.unitPrice) || 0;
        const d = Number(row.discount) || 0;
        row.quantity = q + 1;
        row.amount = Math.max(0, row.quantity * up - row.quantity * d);
        next[existingIndex] = row;
        return next;
      }
      const qty = 1;
      const unitPrice =
        Number(product.lastPurchaseUnitPrice) ||
        Number(product.costPrice) ||
        Number(product.price) ||
        0;
      const discountPerUnit = 0;
      const amount = Math.max(0, qty * (unitPrice - discountPerUnit));
      return [
        ...prev,
        {
          productId,
          productCode: product.productCode || '',
          productName: product.name || '',
          unit: product.unit || '',
          quantity: qty,
          unitPrice,
          discount: discountPerUnit,
          amount,
          note: '',
          stock: Number(product.stock) || 0,
          sellPrice: Number(product.price) || 0,
          costPrice: Number(product.costPrice) || 0,
        },
      ];
    });
    setProductSearch('');
    if (productSearchRef.current) productSearchRef.current.focus();
  }, []);

  const updateItem = useCallback((index, field, value) => {
    if (field === 'note') {
      setItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], note: value };
        return next;
      });
      return;
    }
    const num = parseNumber(value);
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      if (field === 'quantity') row.quantity = num;
      else if (field === 'unitPrice') row.unitPrice = num;
      else if (field === 'discount') row.discount = num;
      const q = Number(row.quantity) || 0;
      const u = Number(row.unitPrice) || 0;
      const d = Number(row.discount) || 0;
      row.amount = Math.max(0, q * u - q * d);
      next[index] = row;
      return next;
    });
  }, []);

  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const openDiscountPopover = useCallback((event, rowIndex) => {
    event.stopPropagation();
    const row = items[rowIndex];
    if (!row) return;
    const discount = Number(row.discount) || 0;
    setDiscountPopover({
      anchorEl: event.currentTarget,
      rowIndex,
      mode: 'vnd',
      inputValue: String(discount),
    });
  }, [items]);

  const closeDiscountPopover = useCallback(() => {
    setDiscountPopover((prev) => ({ ...prev, anchorEl: null, rowIndex: null }));
  }, []);

  const openOrderDiscountPopover = useCallback((event) => {
    const current = Number(discountAmount) || 0;
    setOrderDiscountPopover({
      anchorEl: event.currentTarget,
      mode: 'vnd',
      inputValue: String(current),
    });
  }, [discountAmount]);

  const closeOrderDiscountPopover = useCallback(() => {
    setOrderDiscountPopover((prev) => ({ ...prev, anchorEl: null }));
  }, []);

  const applyOrderDiscount = useCallback((mode, inputValue, totalGoods) => {
    if (mode === 'vnd') {
      setDiscountAmount(Math.max(0, parseNumber(inputValue)));
    } else {
      const pct = Math.min(100, Math.max(0, parseNumber(inputValue)));
      setDiscountAmount(Math.round((totalGoods * pct) / 100));
    }
  }, []);

  const applyDiscountFromPopover = useCallback((rowIndex, mode, inputValue) => {
    const row = items[rowIndex];
    if (!row) return;
    const unitPrice = Number(row.unitPrice) || 0;
    let discountPerUnit = 0;
    if (mode === 'vnd') {
      discountPerUnit = Math.max(0, parseNumber(inputValue));
    } else {
      const pct = Math.min(100, Math.max(0, parseNumber(inputValue)));
      discountPerUnit = Math.round((unitPrice * pct) / 100);
    }
    setItems((prev) => {
      const next = [...prev];
      const r = { ...next[rowIndex], discount: discountPerUnit };
      const q = Number(r.quantity) || 0;
      const u = Number(r.unitPrice) || 0;
      r.amount = Math.max(0, q * u - q * discountPerUnit);
      next[rowIndex] = r;
      return next;
    });
  }, [items]);

  const openCreateProductDialog = useCallback(() => {
    setProductForm({
      id: '',
      barcode: '',
      name: '',
      category: '',
      brand: '',
      price: 0,
      stock: 0,
      minStock: 0,
      maxStock: 999999999,
      position: '',
      weight: '',
      unit: 'Cái',
      earnPoints: true,
    });
    setProductFormCategoryError('');
    setProductCodeError('');
    setCreateProductTab(0);
    setCreateProductOpen(true);
  }, []);

  const handleCheckProductCode = useCallback(async () => {
    const code = (productForm.id || '').trim();
    if (!code) {
      setProductCodeError('');
      return;
    }
    try {
      const existing = products.find(
        (p) => (p.productCode || '').toLowerCase() === code.toLowerCase()
      );
      if (existing) {
        setProductCodeError('Mã hàng đã tồn tại');
      } else {
        setProductCodeError('');
      }
    } catch {
      setProductCodeError('');
    }
  }, [productForm.id, products]);

  const handleSaveNewCategory = useCallback(async () => {
    if (!newCategoryName.trim()) return;
    try {
      await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newCategoryName.trim(),
          parentId: newCategoryParent || null,
        }),
      });
      await loadCategories();
      setCategoryDialogOpen(false);
      setNewCategoryName('');
      setNewCategoryParent('');
    } catch {
      // ignore
    }
  }, [newCategoryName, newCategoryParent, loadCategories]);

  const handleSaveNewBrand = useCallback(async () => {
    if (!newBrandName.trim()) return;
    try {
      await apiRequest('/api/brands', {
        method: 'POST',
        body: JSON.stringify({ name: newBrandName.trim() }),
      });
      await loadBrands();
      setBrandDialogOpen(false);
      setNewBrandName('');
    } catch {
      // ignore
    }
  }, [newBrandName, loadBrands]);

  const openCreateSupplierDialog = useCallback(() => {
    setSupplierForm({
      name: '',
      code: '',
      phone: '',
      email: '',
      address: '',
      area: '',
      ward: '',
      groupId: '',
      notes: '',
      companyName: '',
      taxCode: '',
    });
    setSupplierFormError('');
    setCreateSupplierOpen(true);
  }, []);

  const handleSaveSupplier = useCallback(async () => {
    const name = (supplierForm.name || '').trim();
    if (!name) {
      setSupplierFormError('Vui lòng nhập tên nhà cung cấp');
      return;
    }
    const phone = (supplierForm.phone || '').trim();
    const email = (supplierForm.email || '').trim();
    if (!phone && !email) {
      setSupplierFormError('Nhà cung cấp cần ít nhất số điện thoại hoặc email');
      return;
    }
    setSupplierFormError('');
    setSavingSupplier(true);
    try {
      const payload = {
        name,
        code: (supplierForm.code || '').trim() || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: (supplierForm.address || '').trim() || undefined,
        area: (supplierForm.area || '').trim() || undefined,
        ward: (supplierForm.ward || '').trim() || undefined,
        groupId: supplierForm.groupId || undefined,
        notes: (supplierForm.notes || '').trim() || undefined,
        companyName: (supplierForm.companyName || '').trim() || undefined,
        taxCode: (supplierForm.taxCode || '').trim() || undefined,
      };
      const res = await apiRequest('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const newSupplier = res?.supplier;
      await loadSuppliers();
      if (newSupplier) {
        setSupplierOption({
          id: newSupplier._id,
          code: newSupplier.code || '',
          name: newSupplier.name || '',
          label: newSupplier.code ? `${newSupplier.code} - ${newSupplier.name}` : newSupplier.name,
        });
      }
      setCreateSupplierOpen(false);
    } catch (err) {
      setSupplierFormError(err?.data?.message || err?.message || 'Lưu nhà cung cấp thất bại');
    } finally {
      setSavingSupplier(false);
    }
  }, [supplierForm, loadSuppliers]);

  const handleSaveProduct = useCallback(async () => {
    if (!productForm.name.trim()) return;
    if (!productForm.category || !String(productForm.category).trim()) {
      setProductFormCategoryError('Vui lòng chọn nhóm hàng');
      return;
    }
    if (productCodeError) return;
    setProductFormCategoryError('');
    setSavingProduct(true);

    let productCode = (productForm.id || '').trim();
    if (!productCode) {
      try {
        const res = await apiRequest('/api/products/next-codes?count=1');
        productCode = res?.codes?.[0] || `SP${Date.now()}`;
      } catch {
        productCode = `SP${Date.now()}`;
      }
    }

    const payload = [
      {
        productCode,
        name: productForm.name.trim(),
        barcode: productForm.barcode || '',
        price: Number(productForm.price) || 0,
        costPrice: 0,
        stock: Number(productForm.stock) || 0,
        unit: productForm.unit || 'Cái',
        categoryId: productForm.category,
        brandId: productForm.brand || '',
        allowPoints: productForm.earnPoints,
        localId: `local-${productCode}-${Date.now()}`,
      },
    ];

    try {
      const res = await apiRequest('/api/products', {
        method: 'POST',
        body: JSON.stringify({ products: payload }),
      });
      const createdProducts = res?.products || [];
      const newProduct = createdProducts[0] || {
        _id: `temp-${Date.now()}`,
        productCode,
        name: productForm.name.trim(),
        unit: productForm.unit || 'Cái',
        costPrice: 0,
        price: Number(productForm.price) || 0,
      };

      await loadProducts();

      setItems((prev) => [
        ...prev,
        {
          productId: newProduct._id || '',
          productCode: newProduct.productCode || productCode,
          productName: newProduct.name || productForm.name.trim(),
          unit: newProduct.unit || productForm.unit || 'Cái',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          amount: 0,
          note: '',
          stock: Number(newProduct.stock) || 0,
          sellPrice: Number(newProduct.price) || Number(productForm.price) || 0,
          costPrice: Number(newProduct.costPrice) || 0,
        },
      ]);

      setCreateProductOpen(false);
    } catch (err) {
      console.error('Lỗi tạo sản phẩm:', err);
    } finally {
      setSavingProduct(false);
    }
  }, [productForm, productCodeError, loadProducts]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        setExcelFile(file);
        setExcelFileName(file.name);
        if (!raw.length || raw.length < 2) {
          setExcelImportErrors([{ row: 1, message: 'File không có dòng dữ liệu' }]);
          setExcelValidRows([]);
          return;
        }
        const headers = raw[0].map((h) => String(h ?? '').trim());
        const headersLower = headers.map((h) => h.toLowerCase());
        const col = (names) => headersLower.findIndex((h) => names.some((n) => (h || '').includes(n)));
        const idxCode = col(['mã hàng', 'mã', 'code']);
        const idxName = col(['tên hàng', 'tên', 'name']);
        const idxUnit = col(['đơn vị tính', 'đvt', 'unit']);
        const idxPrice = col(['đơn giá', 'unitprice', 'price']);
        const idxDiscountPct = headersLower.findIndex((h) => (h || '').includes('giảm giá') && (h || '').includes('%'));
        const idxDiscount = headersLower.findIndex((h, i) => (h || '').includes('giảm giá') && !(h || '').includes('%') && i !== idxDiscountPct);
        const idxQty = col(['số lượng', 'quantity']);
        const get = (row, i) => (i >= 0 && row[i] != null && row[i] !== '' ? String(row[i]).trim() : '');
        const errors = [];
        const validRows = [];
        for (let r = 1; r < raw.length; r++) {
          const row = raw[r];
          const code = get(row, idxCode);
          const name = get(row, idxName);
          const qty = parseNumber(row[idxQty] ?? 0);
          if (!code && !name && qty <= 0) continue;
          const excelRowNum = r + 1;
          const product = code
            ? products.find((p) => (p.productCode || '').trim().toLowerCase() === code.trim().toLowerCase())
            : null;
          if (!product && code) {
            errors.push({ row: excelRowNum, message: 'Mã hàng không có trên hệ thống hoặc ngừng kinh doanh' });
            continue;
          }
          if (!product) continue;
          const unit = get(row, idxUnit) || product.unit || '';
          const unitPrice = parseNumber(row[idxPrice] ?? 0) || Number(product.costPrice) || Number(product.price) || 0;
          let discountFromFile = parseNumber(row[idxDiscount] ?? 0);
          if (idxDiscountPct >= 0 && (row[idxDiscountPct] != null && row[idxDiscountPct] !== '')) {
            const pct = parseNumber(row[idxDiscountPct] ?? 0);
            if (pct > 0) discountFromFile = Math.round((unitPrice * (qty || 1) * pct) / 100);
          }
          const q = qty || 1;
          const discountPerUnit = q > 0 ? Math.round(discountFromFile / q) : 0;
          const amount = Math.max(0, q * unitPrice - discountFromFile);
          validRows.push({
            productId: product._id || product.localId || '',
            productCode: product.productCode || code,
            productName: name || product.name || '',
            unit,
            quantity: q,
            unitPrice,
            discount: discountPerUnit,
            amount,
            note: '',
            stock: Number(product.stock) || 0,
            sellPrice: Number(product.price) || 0,
            costPrice: Number(product.costPrice) || 0,
          });
        }
        setExcelImportErrors(errors);
        setExcelValidRows(validRows);
      } catch (err) {
        console.error(err);
        setExcelImportErrors([{ row: 0, message: 'Không đọc được file Excel. Vui lòng kiểm tra định dạng.' }]);
        setExcelValidRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [products]);

  const handleExcelExecute = useCallback(() => {
    setItems((prev) => [...prev, ...excelValidRows]);
    setExcelFile(null);
    setExcelFileName('');
    setExcelImportErrors([]);
    setExcelValidRows([]);
  }, [excelValidRows]);

  const handleExcelCancel = useCallback(() => {
    setExcelFile(null);
    setExcelFileName('');
    setExcelImportErrors([]);
    setExcelValidRows([]);
  }, []);

  const downloadTemplate = useCallback(() => {
    const headers = ['Mã hàng', 'Tên hàng', 'Đơn vị tính', 'Đơn giá', 'Giảm giá', 'Giảm giá (%)', 'Số lượng'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PurchaseOrderTemplate');
    XLSX.writeFile(wb, 'MauFileNhapHang.xlsx');
  }, []);

  const buildItemsPayload = useCallback(() => {
    return (items || []).map((it) => ({
      productId: it.productId ? String(it.productId).trim() || null : null,
      productCode: String(it.productCode ?? '').trim(),
      productName: String(it.productName ?? '').trim(),
      unit: String(it.unit ?? '').trim(),
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      amount: Number(it.amount) || 0,
      note: String(it.note ?? '').trim(),
    }));
  }, [items]);

  const isEditMode = Boolean(editId);
  const statusLabel = (s) => (s === 'received' ? 'Đã nhập hàng' : s === 'cancelled' ? 'Đã hủy' : 'Phiếu tạm');

  const saveDraft = useCallback(() => {
    setSaveError('');
    if (isEditMode) {
      setSaving(true);
      const payload = {
        supplierId: supplierOption?.id || undefined,
        supplierCode: supplierOption?.code || '',
        supplierName: supplierOption?.name || '',
        notes: notes || '',
        amountToPay: Number(amountToPay) || 0,
        status: 'draft',
        items: buildItemsPayload(),
      };
      apiRequest(`/api/purchase-orders/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
        .then(() => navigate('/purchase-orders'))
        .catch((err) => setSaveError(err?.data?.message || err?.message || 'Lưu thất bại'))
        .finally(() => setSaving(false));
      return;
    }
    try {
      const draft = {
        supplierOption: supplierOption ? { id: supplierOption.id, code: supplierOption.code, name: supplierOption.name } : null,
        items: buildItemsPayload(),
        notes,
        discountAmount,
        orderReference,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setDraftSavedMessage(true);
      setTimeout(() => setDraftSavedMessage(false), 3000);
    } catch {
      setSaveError('Không lưu được bản nháp');
    }
  }, [isEditMode, editId, supplierOption, notes, amountToPay, discountAmount, orderReference, buildItemsPayload, navigate]);

  const submitComplete = useCallback(async () => {
    setSaveError('');
    setSaving(true);
    try {
      const payload = {
        supplierId: supplierOption?.id || undefined,
        supplierCode: supplierOption?.code || '',
        supplierName: supplierOption?.name || '',
        notes: notes || '',
        amountToPay: Number(amountToPay) || 0,
        status: 'received',
        items: buildItemsPayload(),
      };
      if (isEditMode) {
        await apiRequest(`/api/purchase-orders/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/purchase-orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      navigate('/purchase-orders');
    } catch (err) {
      setSaveError(err?.data?.message || err?.message || 'Hoàn thành thất bại');
    } finally {
      setSaving(false);
    }
  }, [isEditMode, editId, supplierOption, notes, amountToPay, buildItemsPayload, navigate]);

  const saveEditOrder = useCallback(async () => {
    setSaveError('');
    setSaving(true);
    try {
      // Luôn gửi status 'received' khi bấm Lưu để backend cập nhật tồn kho (draft→received cộng tồn, received→received điều chỉnh delta).
      await apiRequest(`/api/purchase-orders/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          supplierId: supplierOption?.id || undefined,
          supplierCode: supplierOption?.code || '',
          supplierName: supplierOption?.name || '',
          notes: notes || '',
          amountToPay: Number(amountToPay) || 0,
          status: 'received',
          items: buildItemsPayload(),
        }),
      });
      navigate('/purchase-orders');
    } catch (err) {
      setSaveError(err?.data?.message || err?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }, [editId, supplierOption, notes, amountToPay, buildItemsPayload, navigate]);

  const saveComplete = useCallback(() => {
    if (!supplierOption) {
      setConfirmNoSupplierOpen(true);
      return;
    }
    submitComplete();
  }, [supplierOption, submitComplete]);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        id: s._id,
        code: s.code || '',
        name: s.name || '',
        label: s.code ? `${s.code} - ${s.name}` : s.name,
      })),
    [suppliers]
  );

  return (
    <Layout maxWidth={false}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate('/purchase-orders')} aria-label="Quay lại">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {isEditMode ? 'Nhập hàng' : 'Nhập hàng'}
        </Typography>
      </Box>
      {editLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Đang tải phiếu...</Typography>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'nowrap', minWidth: 0, width: '100%' }}>
        {/* Cột trái: Nhập hàng hóa (scroll ngang bảng) */}
        <Paper variant="outlined" sx={{ flex: '1 1 auto', minWidth: 0, p: 2, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TextField
              inputRef={productSearchRef}
              size="small"
              placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'F3') {
                  e.preventDefault();
                  productSearchRef.current?.focus();
                }
                if (e.key === 'Enter' && productFiltered.length === 1) {
                  addProduct(productFiltered[0]);
                }
              }}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} /> }}
              sx={{ flex: 1, minWidth: 260 }}
            />
            <IconButton size="small" title="Lưới">
              <GridViewOutlinedIcon />
            </IconButton>
            <IconButton size="small" title="Tạo sản phẩm mới" onClick={openCreateProductDialog}>
              <AddIcon />
            </IconButton>
            <IconButton
              size="small"
              title="Tùy chọn hiển thị"
              onClick={(e) => {
                setDisplayOptionsAnchor(e.currentTarget);
                setDisplayOptionsOpen(true);
              }}
            >
              <VisibilityOutlinedIcon />
            </IconButton>
            <IconButton size="small">
              <MoreVertIcon />
            </IconButton>
          </Box>

          {productSearch.trim() && (
            <Paper
              elevation={2}
              sx={{
                position: 'relative',
                zIndex: 10,
                mt: 0,
                mb: 1,
                maxHeight: 280,
                overflow: 'auto',
                minWidth: 360,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {productFiltered.length > 0 ? (
                productFiltered.slice(0, 15).map((p) => (
                  <Box
                    key={p._id || p.localId}
                    onClick={() => addProduct(p)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-of-type': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {p.productCode || '—'} — {p.name || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ĐVT: {p.unit || '—'} · Đơn giá: {(Number(p.lastPurchaseUnitPrice) || Number(p.costPrice) || Number(p.price) || 0).toLocaleString('vi-VN')}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Box sx={{ px: 2, py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Không tìm thấy hàng hóa. Thử mã hoặc tên khác.
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          <TableContainer sx={{ flex: 1, minHeight: 120, overflowX: 'auto' }}>
            <Table size="small" stickyHeader sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 40 }} />
                  <TableCell sx={{ fontWeight: 600, width: 48 }}>STT</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>
                    {displayOptions.filterMode ? (
                      <TextField size="small" placeholder="Tìm mã hàng" variant="standard" InputProps={{ disableUnderline: true }} sx={{ '& input': { fontSize: '0.875rem', fontWeight: 600 } }} />
                    ) : 'Mã hàng'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>
                    {displayOptions.filterMode ? (
                      <TextField size="small" placeholder="Tìm tên hàng" variant="standard" InputProps={{ disableUnderline: true }} sx={{ '& input': { fontSize: '0.875rem', fontWeight: 600 } }} />
                    ) : 'Tên hàng'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }}>
                    {displayOptions.filterMode ? (
                      <TextField size="small" placeholder="Tìm đơn vị" variant="standard" InputProps={{ disableUnderline: true }} sx={{ '& input': { fontSize: '0.875rem', fontWeight: 600 }, width: 60 }} />
                    ) : 'ĐVT'}
                  </TableCell>
                  {displayOptions.showStock && (
                    <TableCell sx={{ fontWeight: 600, width: 80 }} align="right">Tồn kho</TableCell>
                  )}
                  {displayOptions.showCostPrice && (
                    <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Giá vốn</TableCell>
                  )}
                  {displayOptions.showSellPrice && (
                    <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Giá bán</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Số lượng</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 110 }} align="right">Đơn giá</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Giảm giá</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 110 }} align="right">Thành tiền</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(displayOptions.sortOrder === 'desc' ? [...items].reverse() : items).map((row, index) => {
                  const actualIndex = displayOptions.sortOrder === 'desc' ? items.length - 1 - index : index;
                  return (
                    <TableRow key={actualIndex} hover>
                      <TableCell padding="checkbox" sx={{ width: 40 }}>
                        <IconButton size="small" onClick={() => removeItem(actualIndex)} aria-label="Xóa dòng" color="error">
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{actualIndex + 1}</TableCell>
                      <TableCell>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => {}}
                        >
                          {row.productCode || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{row.productName || '—'}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            <EditOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <TextField
                              size="small"
                              placeholder="Ghi chú..."
                              value={row.note || ''}
                              onChange={(e) => updateItem(actualIndex, 'note', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              variant="standard"
                              InputProps={{ disableUnderline: true, sx: { fontSize: '0.8rem' } }}
                              sx={{ flex: 1, minWidth: 80, '& input': { py: 0 } }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{row.unit || '—'}</TableCell>
                      {displayOptions.showStock && (
                        <TableCell align="right">
                          <Typography variant="body2">{formatMoney(row.stock || 0)}</Typography>
                        </TableCell>
                      )}
                      {displayOptions.showCostPrice && (
                        <TableCell align="right">
                          <Typography variant="body2">{formatMoney(row.costPrice || 0)}</Typography>
                        </TableCell>
                      )}
                      {displayOptions.showSellPrice && (
                        <TableCell align="right">
                          <Typography variant="body2">{formatMoney(row.sellPrice || 0)}</Typography>
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={row.quantity}
                          onChange={(e) => updateItem(actualIndex, 'quantity', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          inputProps={{ min: 0, step: 1 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={row.unitPrice}
                          onChange={(e) => updateItem(actualIndex, 'unitPrice', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          inputProps={{ min: 0 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          onClick={(e) => openDiscountPopover(e, actualIndex)}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            minWidth: 90,
                            py: 0.5,
                            px: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Typography variant="body2">{formatMoney(row.discount)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {formatMoney(row.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {items.length === 0 && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                mt: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Thêm sản phẩm từ file excel
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                (Tải về file mẫu:{' '}
                <Typography component="a" href="#" onClick={(e) => { e.preventDefault(); downloadTemplate(); }} sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}>
                  Excel file
                </Typography>
                )
              </Typography>
              {!excelFile ? (
                <Button
                  variant="contained"
                  startIcon={<FileUploadOutlinedIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ textTransform: 'none' }}
                >
                  Chọn file dữ liệu
                </Button>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%', maxWidth: 360 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{excelFileName}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" onClick={handleExcelExecute} disabled={excelValidRows.length === 0} sx={{ textTransform: 'none' }}>
                      Thực hiện
                    </Button>
                    <Button variant="outlined" onClick={handleExcelCancel} sx={{ textTransform: 'none' }}>
                      Hủy
                    </Button>
                  </Box>
                  {excelImportErrors.length > 0 && (
                    <Box sx={{ width: '100%', textAlign: 'left', mt: 1 }}>
                      {excelImportErrors.map((err, i) => (
                        <Typography key={i} variant="body2" sx={{ color: 'error.main' }}>
                          Dòng {err.row}: {err.message}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
          {items.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">
                  Thêm từ Excel:
                </Typography>
                <Typography component="a" href="#" onClick={(e) => { e.preventDefault(); downloadTemplate(); }} sx={{ color: 'primary.main', fontSize: '0.875rem', textDecoration: 'underline' }}>
                  Tải file mẫu
                </Typography>
                {!excelFile ? (
                  <Button size="small" startIcon={<FileUploadOutlinedIcon />} onClick={() => fileInputRef.current?.click()} sx={{ textTransform: 'none' }}>
                    Chọn file dữ liệu
                  </Button>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{excelFileName}</Typography>
                    <Button size="small" variant="contained" onClick={handleExcelExecute} disabled={excelValidRows.length === 0} sx={{ textTransform: 'none' }}>
                      Thực hiện
                    </Button>
                    <Button size="small" variant="outlined" onClick={handleExcelCancel} sx={{ textTransform: 'none' }}>
                      Hủy
                    </Button>
                  </>
                )}
              </Box>
              {excelFile && excelImportErrors.length > 0 && (
                <Box>
                  {excelImportErrors.map((err, i) => (
                    <Typography key={i} variant="body2" sx={{ color: 'error.main' }}>
                      Dòng {err.row}: {err.message}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
        </Paper>

        {/* Cột phải: Thông tin nhà cung cấp & phiếu (cố định bên phải) */}
        <Paper variant="outlined" sx={{ flex: '0 0 360px', width: 360, p: 2, display: 'flex', flexDirection: 'column', borderLeft: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">{userDisplayName.charAt(0).toUpperCase()}</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>{userDisplayName}</Typography>
            <Typography variant="caption" color="text.secondary">{dateTimeStr}</Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Tìm nhà cung cấp
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
            <Autocomplete
              size="small"
              fullWidth
              options={supplierOptions}
              value={supplierOption}
              onChange={(_, v) => setSupplierOption(v)}
              getOptionLabel={(opt) => (opt && opt.label) || ''}
              isOptionEqualToValue={(a, b) => a?.id === b?.id}
              renderInput={(params) => <TextField {...params} placeholder="Tìm nhà cung cấp" onFocus={(e) => e.target.select()} />}
            />
            <IconButton size="small" onClick={openCreateSupplierDialog} title="Tạo nhà cung cấp mới">
              <AddIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Mã phiếu nhập</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{isEditMode && editOrder ? (editOrder.code || '—') : 'Mã phiếu tự động'}</Typography>
          </Box>
          <TextField
            size="small"
            fullWidth
            label="Mã đặt hàng nhập"
            value={orderReference}
            onChange={(e) => setOrderReference(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder=""
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">Trạng thái</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{isEditMode && editOrder ? statusLabel(editOrder.status) : 'Phiếu tạm'}</Typography>
          </Box>

          <Box sx={{ py: 1.5, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">
                Tổng tiền hàng
                {items.length > 0 && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    ({items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)})
                  </Typography>
                )}
              </Typography>
              <Typography variant="body2">{formatMoney(totalGoodsAmount)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Giảm giá</Typography>
              <Box
                onClick={openOrderDiscountPopover}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minWidth: 100,
                  py: 0.5,
                  px: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  justifyContent: 'flex-end',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="body2">{formatMoney(discountAmount)}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Cần trả nhà cung cấp
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {formatMoney(amountToPay)}
              </Typography>
            </Box>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Ghi chú</Typography>
          <TextField
            size="small"
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={(e) => e.target.select()}
            multiline
            rows={3}
            placeholder=""
            sx={{ mb: 2 }}
          />

          {draftSavedMessage && !isEditMode && (
            <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
              Đã lưu tạm (chưa đẩy lên server)
            </Typography>
          )}
          {saveError && (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {saveError}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1 }}>
            {isEditMode ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<SaveOutlinedIcon />}
                onClick={saveEditOrder}
                disabled={saving}
                fullWidth
                sx={{ textTransform: 'none' }}
              >
                Lưu
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={saveDraft}
                  disabled={saving}
                  sx={{ textTransform: 'none', flex: 1 }}
                  title="Chỉ lưu trên máy, chưa cập nhật tồn kho"
                >
                  Lưu tạm
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleOutlinedIcon />}
                  onClick={saveComplete}
                  disabled={saving}
                  sx={{ textTransform: 'none', flex: 1 }}
                  title="Lưu phiếu và cập nhật tồn kho"
                >
                  Hoàn thành
                </Button>
              </>
            )}
          </Box>
        </Paper>
      </Box>

      <Dialog open={confirmNoSupplierOpen} onClose={() => setConfirmNoSupplierOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Thông báo</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Bạn chưa chọn nhà cung cấp, có muốn tiếp tục lưu?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmNoSupplierOpen(false)} sx={{ textTransform: 'none' }}>
            Bỏ qua
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setConfirmNoSupplierOpen(false);
              submitComplete();
            }}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Đồng ý
          </Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={Boolean(orderDiscountPopover.anchorEl)}
        anchorEl={orderDiscountPopover.anchorEl}
        onClose={closeOrderDiscountPopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 220, p: 2 } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Giảm giá (phiếu)
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            type="number"
            value={orderDiscountPopover.inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setOrderDiscountPopover((prev) => ({ ...prev, inputValue: v }));
              applyOrderDiscount(orderDiscountPopover.mode, v, totalGoodsAmount);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyOrderDiscount(orderDiscountPopover.mode, orderDiscountPopover.inputValue, totalGoodsAmount);
                closeOrderDiscountPopover();
              }
            }}
            onFocus={(e) => e.target.select()}
            inputProps={{ min: 0, step: orderDiscountPopover.mode === '%' ? 0.1 : 1 }}
            sx={{ width: 120 }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              variant={orderDiscountPopover.mode === 'vnd' ? 'contained' : 'outlined'}
              onClick={() => {
                setOrderDiscountPopover((prev) => ({ ...prev, mode: 'vnd', inputValue: String(discountAmount) }));
              }}
              sx={{ textTransform: 'none', minWidth: 56 }}
            >
              VND
            </Button>
            <Button
              size="small"
              variant={orderDiscountPopover.mode === '%' ? 'contained' : 'outlined'}
              onClick={() => {
                const pct = totalGoodsAmount > 0 ? Math.round((discountAmount / totalGoodsAmount) * 100 * 10) / 10 : 0;
                setOrderDiscountPopover((prev) => ({ ...prev, mode: '%', inputValue: String(pct) }));
              }}
              sx={{ textTransform: 'none', minWidth: 48 }}
            >
              %
            </Button>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Luôn hiển thị bằng số tiền: {formatMoney(discountAmount)}
        </Typography>
      </Popover>

      <Popover
        open={Boolean(discountPopover.anchorEl)}
        anchorEl={discountPopover.anchorEl}
        onClose={closeDiscountPopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 220, p: 2 } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Giảm giá
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            type="number"
            value={discountPopover.inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setDiscountPopover((prev) => ({ ...prev, inputValue: v }));
              if (discountPopover.rowIndex != null) {
                applyDiscountFromPopover(discountPopover.rowIndex, discountPopover.mode, v);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (discountPopover.rowIndex != null) {
                  applyDiscountFromPopover(discountPopover.rowIndex, discountPopover.mode, discountPopover.inputValue);
                }
                closeDiscountPopover();
              }
            }}
            onFocus={(e) => e.target.select()}
            inputProps={{ min: 0, step: discountPopover.mode === '%' ? 0.1 : 1, 'aria-label': 'Giá trị giảm giá' }}
            sx={{ width: 120 }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              variant={discountPopover.mode === 'vnd' ? 'contained' : 'outlined'}
              onClick={() => {
                const idx = discountPopover.rowIndex;
                const row = idx != null ? items[idx] : null;
                if (row && idx != null) {
                  const discount = Number(row.discount) || 0;
                  setDiscountPopover((prev) => ({ ...prev, mode: 'vnd', inputValue: String(discount) }));
                } else {
                  setDiscountPopover((prev) => ({ ...prev, mode: 'vnd' }));
                }
              }}
              sx={{ textTransform: 'none', minWidth: 56 }}
            >
              VND
            </Button>
            <Button
              size="small"
              variant={discountPopover.mode === '%' ? 'contained' : 'outlined'}
              onClick={() => {
                const idx = discountPopover.rowIndex;
                const row = idx != null ? items[idx] : null;
                if (row && idx != null) {
                  const unitPrice = Number(row.unitPrice) || 0;
                  const discount = Number(row.discount) || 0;
                  const pct = unitPrice > 0 ? Math.round((discount / unitPrice) * 100 * 10) / 10 : 0;
                  setDiscountPopover((prev) => ({ ...prev, mode: '%', inputValue: String(pct) }));
                } else {
                  setDiscountPopover((prev) => ({ ...prev, mode: '%', inputValue: '0' }));
                }
              }}
              sx={{ textTransform: 'none', minWidth: 48 }}
            >
              %
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Popover tùy chọn hiển thị */}
      <Popover
        open={displayOptionsOpen}
        anchorEl={displayOptionsAnchor}
        onClose={() => setDisplayOptionsOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 280, p: 0 } }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Tùy chọn hiển thị
          </Typography>
        </Box>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={0}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { minHeight: 40, py: 1 },
            }}
          >
            <Tab label="Hiển thị" sx={{ textTransform: 'none' }} />
            <Tab label="Khác" sx={{ textTransform: 'none' }} />
          </Tabs>
        </Box>
        <Box sx={{ p: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.75,
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 1,
            }}
          >
            <Typography variant="body2">Ảnh hàng hóa</Typography>
            <Switch
              size="small"
              checked={displayOptions.showImage}
              onChange={(e) => setDisplayOptions((prev) => ({ ...prev, showImage: e.target.checked }))}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.75,
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 1,
            }}
          >
            <Typography variant="body2">Tồn Kho</Typography>
            <Switch
              size="small"
              checked={displayOptions.showStock}
              onChange={(e) => setDisplayOptions((prev) => ({ ...prev, showStock: e.target.checked }))}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.75,
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 1,
            }}
          >
            <Typography variant="body2">Chế độ lọc</Typography>
            <Switch
              size="small"
              checked={displayOptions.filterMode}
              onChange={(e) => setDisplayOptions((prev) => ({ ...prev, filterMode: e.target.checked }))}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.75,
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 1,
            }}
          >
            <Typography variant="body2">Sắp xếp thứ tự hàng hóa</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                color={displayOptions.sortOrder === 'asc' ? 'primary' : 'default'}
                onClick={() => setDisplayOptions((prev) => ({ ...prev, sortOrder: 'asc' }))}
                sx={{
                  bgcolor: displayOptions.sortOrder === 'asc' ? 'primary.main' : 'transparent',
                  color: displayOptions.sortOrder === 'asc' ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: displayOptions.sortOrder === 'asc' ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color={displayOptions.sortOrder === 'desc' ? 'primary' : 'default'}
                onClick={() => setDisplayOptions((prev) => ({ ...prev, sortOrder: 'desc' }))}
                sx={{
                  bgcolor: displayOptions.sortOrder === 'desc' ? 'primary.main' : 'transparent',
                  color: displayOptions.sortOrder === 'desc' ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: displayOptions.sortOrder === 'desc' ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.75,
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2">Giá vốn</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>ⓘ</Typography>
            </Box>
            <Switch
              size="small"
              checked={displayOptions.showCostPrice}
              onChange={(e) => setDisplayOptions((prev) => ({ ...prev, showCostPrice: e.target.checked }))}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.75,
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 1,
            }}
          >
            <Typography variant="body2">Giá bán</Typography>
            <Switch
              size="small"
              checked={displayOptions.showSellPrice}
              onChange={(e) => setDisplayOptions((prev) => ({ ...prev, showSellPrice: e.target.checked }))}
            />
          </Box>
        </Box>
      </Popover>

      {/* Dialog tạo sản phẩm mới */}
      <Dialog open={createProductOpen} onClose={() => setCreateProductOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Tạo hàng hóa</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Tabs value={createProductTab} onChange={(e, v) => setCreateProductTab(v)} sx={{ mb: 2 }}>
              <Tab label="Thông tin" />
              <Tab label="Mô tả" />
            </Tabs>

            {createProductTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    Thông tin hàng hóa
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <TextField
                        label="Mã hàng"
                        placeholder="Tự động"
                        value={productForm.id}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, id: e.target.value }))}
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
                        onChange={(e) => setProductForm((prev) => ({ ...prev, barcode: e.target.value }))}
                        fullWidth
                      />
                      <TextField
                        label="Tên hàng"
                        placeholder="Bắt buộc"
                        value={productForm.name}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                        fullWidth
                        sx={{ gridColumn: 'span 2' }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <FormControl fullWidth error={Boolean(productFormCategoryError)}>
                          <InputLabel>Nhóm hàng (Bắt buộc)</InputLabel>
                          <Select
                            value={productForm.category}
                            label="Nhóm hàng (Bắt buộc)"
                            onChange={(e) => {
                              setProductForm((prev) => ({ ...prev, category: e.target.value }));
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
                            onChange={(e) => setProductForm((prev) => ({ ...prev, brand: e.target.value }))}
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
                      Giá bán
                    </Typography>
                    <Button size="small" sx={{ textTransform: 'none' }}>
                      Thiết lập giá
                    </Button>
                  </Box>
                  <TextField
                    label="Giá bán"
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    fullWidth
                  />
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
                    Quản lý số lượng tồn kho và định mức tồn. Khi tồn kho chạm đến định mức, bạn sẽ nhận được cảnh báo.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="Định mức tồn thấp nhất"
                      type="number"
                      value={productForm.minStock}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, minStock: e.target.value }))}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      fullWidth
                    />
                    <TextField
                      label="Định mức tồn cao nhất"
                      type="number"
                      value={productForm.maxStock}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, maxStock: e.target.value }))}
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
                    onChange={(e) => setProductForm((prev) => ({ ...prev, earnPoints: e.target.checked }))}
                  />
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Vị trí, trọng lượng
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Quản lý việc sắp xếp kho, vị trí bán hàng hoặc trọng lượng hàng hóa.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 2 }}>
                    <TextField
                      label="Vị trí"
                      placeholder="Chọn vị trí"
                      value={productForm.position}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, position: e.target.value }))}
                      fullWidth
                    />
                    <TextField
                      label="Trọng lượng"
                      value={productForm.weight}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, weight: e.target.value }))}
                      fullWidth
                    />
                    <TextField
                      label="Đơn vị"
                      value={productForm.unit}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, unit: e.target.value }))}
                      fullWidth
                    />
                  </Box>
                </Paper>
              </Box>
            )}

            {createProductTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Mô tả sản phẩm"
                  multiline
                  rows={8}
                  placeholder="Nhập mô tả chi tiết về sản phẩm..."
                  fullWidth
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateProductOpen(false)} disabled={savingProduct}>
            Bỏ qua
          </Button>
          <Button variant="contained" onClick={handleSaveProduct} disabled={savingProduct}>
            {savingProduct ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog tạo nhóm hàng mới */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Tạo nhóm hàng</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Tên nhóm hàng"
              placeholder="Nhập tên nhóm hàng"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              fullWidth
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Nhóm hàng cha</InputLabel>
              <Select
                value={newCategoryParent}
                label="Nhóm hàng cha"
                onChange={(e) => setNewCategoryParent(e.target.value)}
              >
                <MenuItem value="">Không có (nhóm gốc)</MenuItem>
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
          <Button variant="contained" onClick={handleSaveNewCategory}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog tạo thương hiệu mới */}
      <Dialog open={brandDialogOpen} onClose={() => setBrandDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Tạo thương hiệu</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Tên thương hiệu"
              placeholder="Nhập tên thương hiệu"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              fullWidth
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrandDialogOpen(false)}>Bỏ qua</Button>
          <Button variant="contained" onClick={handleSaveNewBrand}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog tạo nhà cung cấp mới */}
      <Dialog open={createSupplierOpen} onClose={() => !savingSupplier && setCreateSupplierOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Tạo nhà cung cấp
          <IconButton size="small" onClick={() => !savingSupplier && setCreateSupplierOpen(false)} aria-label="Đóng">
            ×
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {supplierFormError && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {supplierFormError}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Tên nhà cung cấp"
              placeholder="Bắt buộc"
              value={supplierForm.name}
              onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Mã nhà cung cấp"
              placeholder="Tự động"
              value={supplierForm.code}
              onChange={(e) => setSupplierForm((prev) => ({ ...prev, code: e.target.value }))}
              fullWidth
              helperText="Để trống để hệ thống tự tạo mã"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Điện thoại"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, phone: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Email"
                placeholder="email@gmail.com"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, email: e.target.value }))}
                fullWidth
              />
            </Box>

            <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Địa chỉ</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Địa chỉ"
                    placeholder="Nhập địa chỉ"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm((prev) => ({ ...prev, address: e.target.value }))}
                    fullWidth
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="Tỉnh/Thành phố"
                      placeholder="Chọn Tỉnh/Thành phố"
                      value={supplierForm.area}
                      onChange={(e) => setSupplierForm((prev) => ({ ...prev, area: e.target.value }))}
                      fullWidth
                    />
                    <TextField
                      label="Phường/Xã"
                      placeholder="Chọn Phường/Xã"
                      value={supplierForm.ward}
                      onChange={(e) => setSupplierForm((prev) => ({ ...prev, ward: e.target.value }))}
                      fullWidth
                    />
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Nhóm nhà cung cấp, ghi chú</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Nhóm nhà cung cấp</InputLabel>
                    <Select
                      value={supplierForm.groupId}
                      label="Nhóm nhà cung cấp"
                      onChange={(e) => setSupplierForm((prev) => ({ ...prev, groupId: e.target.value }))}
                    >
                      <MenuItem value="">Chọn nhóm nhà cung cấp</MenuItem>
                      {supplierGroups.map((g) => (
                        <MenuItem key={g._id} value={g._id}>
                          {g.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Ghi chú"
                    placeholder="Nhập ghi chú"
                    value={supplierForm.notes}
                    onChange={(e) => setSupplierForm((prev) => ({ ...prev, notes: e.target.value }))}
                    fullWidth
                    multiline
                    rows={2}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Thông tin xuất hóa đơn</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Tên công ty"
                    value={supplierForm.companyName}
                    onChange={(e) => setSupplierForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Mã số thuế"
                    value={supplierForm.taxCode}
                    onChange={(e) => setSupplierForm((prev) => ({ ...prev, taxCode: e.target.value }))}
                    fullWidth
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => !savingSupplier && setCreateSupplierOpen(false)} disabled={savingSupplier}>
            Bỏ qua
          </Button>
          <Button variant="contained" onClick={handleSaveSupplier} disabled={savingSupplier}>
            {savingSupplier ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
