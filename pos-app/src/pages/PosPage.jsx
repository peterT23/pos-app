import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Grid, 
  Alert, 
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Paper,
  Pagination,
  Chip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  MenuItem,
  Avatar,
  Switch,
  Tooltip,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Add as AddIcon,
  QrCode2 as QrCode2Icon,
  Sync as SyncIcon,
  BarChart as BarChartIcon,
  Undo as UndoIcon,
  FileUpload as FileUploadIcon,
  Tune as TuneIcon,
  Keyboard as KeyboardIcon,
  ExitToApp as ExitToAppIcon,
  Apps as AppsIcon
} from '@mui/icons-material';
import Header from '../components/Header';
import ProductList from '../components/ProductList';
import PaymentPanel from '../components/PaymentPanel';
import ProductSearchDropdown from '../components/ProductSearchDropdown';
import Footer from '../components/Footer';
import BottomFooter from '../components/BottomFooter';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../utils/apiClient';
import { getStoredStoreId, setStoredStoreId } from '../utils/authStorage';
import db, { 
  generateLocalId, 
  generateOrderCode, 
  generateReturnCode,
  migrateOrderCodes,
  checkPhoneExists,
  generateCustomerCode,
  checkCustomerCodeExists
} from '../db/posDB';
import { seedDatabase } from '../db/seedData';

/**
 * Trang POS chính với layout mới theo hình ảnh
 */
export default function PosPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  // State tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  
  // State thông báo
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Tên nhân viên thu ngân
  const cashierName = user?.name || 'Nhân viên';
  const cashierId = user?.id || user?._id || user?.sub || '';
  const effectiveCashierName = user?.name || cashierName;
  const storeInfo = {
    name: 'Cơ sở bán hàng',
    phone: '0900000000',
    address: 'Địa chỉ cơ sở bán'
  };

  const [printSettingsOpen, setPrintSettingsOpen] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [printCopies, setPrintCopies] = useState(1);
  const [printTemplate] = useState('invoice');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const syncingRef = useRef(false);
  const lastSyncAttemptRef = useRef(0);
  const authFailedRef = useRef(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    phone: '',
    address: '',
    storeId: '',
  });
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    const stored = getStoredStoreId();
    return stored && stored !== 'default' ? stored : '';
  });
  const POS_ADMIN_URL = import.meta.env.VITE_POS_ADMIN_URL || 'http://localhost:5174/dashboard';
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState('day');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportQuarter, setReportQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportLunarYear, setReportLunarYear] = useState(() => new Date().getFullYear());
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalCost: 0,
    totalSales: 0,
    totalProfit: 0,
    orderCount: 0,
    buckets: []
  });

  // State cho Dialog thêm khách hàng
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerCode: '',
    name: '',
    nickname: '',
    phone: '',
    address: '',
    area: '',
    ward: '',
    group: '',
    dateOfBirth: '',
    gender: 'male', // 'male' | 'female'
    email: '',
    facebook: '',
    note: '',
    avatar: null
  });
  const [customerErrors, setCustomerErrors] = useState({
    customerCode: '',
    phone: ''
  });
  const [addCustomerLoading, setAddCustomerLoading] = useState(false);
  const [editCustomerDialogOpen, setEditCustomerDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editCustomerErrors, setEditCustomerErrors] = useState({
    customerCode: '',
    phone: ''
  });
  const [editCustomerLoading, setEditCustomerLoading] = useState(false);
  const [editCustomerTab, setEditCustomerTab] = useState(0);
  const [orderHistory, setOrderHistory] = useState([]);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnOrdersLoading, setReturnOrdersLoading] = useState(false);
  const [returnOrders, setReturnOrders] = useState([]);
  const [returnRecordsLoading, setReturnRecordsLoading] = useState(false);
  const [returnRecords, setReturnRecords] = useState([]);
  const [returnDetailOpen, setReturnDetailOpen] = useState(false);
  const [returnDetailLoading, setReturnDetailLoading] = useState(false);
  const [returnDetail, setReturnDetail] = useState(null);
  const [returnSearchField, setReturnSearchField] = useState('orderCode');
  const [returnSearchTerm, setReturnSearchTerm] = useState('');
  const [returnFromDate, setReturnFromDate] = useState('');
  const [returnToDate, setReturnToDate] = useState('');
  const [returnPage, setReturnPage] = useState(1);
  const [returnRecordsPage, setReturnRecordsPage] = useState(1);
  const [returnDialogTab, setReturnDialogTab] = useState(0);
  const [exchangeSearchTerm, setExchangeSearchTerm] = useState('');
  const [exchangeSearchOpen, setExchangeSearchOpen] = useState(false);
  const [exchangeSearchAnchor, setExchangeSearchAnchor] = useState(null);
  const exchangeSearchRef = useRef(null);
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

  // State chế độ bán hàng
  const [saleMode, setSaleMode] = useState('quick'); // 'quick' | 'normal' | 'delivery'

  // State quản lý các hóa đơn
  // Mỗi hóa đơn có: items, customerPhone, orderNote, paymentMethod, amountPaid, discount, discountType
  const [invoices, setInvoices] = useState({
    0: {
      items: [],
      returnMode: false,
      returnOrder: null,
      returnItems: [],
      exchangeItems: [],
      customerPhone: '',
      customerLocalId: '',
      customerName: '',
      customerDebt: 0,
      customerPoints: 0,
      customerSearchTerm: '',
      orderNote: '',
      paymentMethod: 'cash',
      amountPaid: 0,
      discount: 0,
      discountType: 'vnd', // 'vnd' | 'percent'
    }
  });
  const [invoiceTabs, setInvoiceTabs] = useState([{ label: 'Hóa đơn 1', id: 0 }]);
  const invoiceIdCounterRef = useRef(1);
  const invoiceLabelCounterRef = useRef(2);
  const [activeInvoiceIndex, setActiveInvoiceIndex] = useState(0);

  // Lấy state của hóa đơn hiện tại
  const currentInvoice = invoices[activeInvoiceIndex] || {
    items: [],
    returnMode: false,
    returnOrder: null,
    returnItems: [],
    exchangeItems: [],
    customerPhone: '',
    customerLocalId: '',
    customerName: '',
    customerDebt: 0,
    customerPoints: 0,
    customerSearchTerm: '',
    orderNote: '',
    paymentMethod: 'cash',
    amountPaid: 0,
    discount: 0,
    discountType: 'vnd',
  };

  const isReturnMode = currentInvoice.returnMode || false;
  const returnOrder = currentInvoice.returnOrder || null;
  const returnItems = currentInvoice.returnItems || [];
  const exchangeItems = currentInvoice.exchangeItems || [];
  const cartItems = isReturnMode ? exchangeItems : currentInvoice.items;
  const customerPhone = currentInvoice.customerPhone;
  const customerLocalId = currentInvoice.customerLocalId;
  const customerName = currentInvoice.customerName || '';
  const customerDebt = currentInvoice.customerDebt || 0;
  const customerPoints = currentInvoice.customerPoints || 0;
  const customerSearchTerm = currentInvoice.customerSearchTerm || '';
  const orderNote = currentInvoice.orderNote;
  const paymentMethod = currentInvoice.paymentMethod;
  const amountPaid = currentInvoice.amountPaid;
  const discount = currentInvoice.discount || 0;
  const discountType = currentInvoice.discountType || 'vnd';

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

  // Hiển thị thông báo
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatCustomerLabel = (customer) => {
    if (!customer) return '';
    const name = String(customer.name || '').trim();
    const nickname = String(customer.nickname || '').trim();
    if (name && nickname) return `${name} (${nickname})`;
    return name || nickname || '';
  };

  const loadStores = useCallback(async () => {
    setStoreLoading(true);
    try {
      const response = await apiRequest('/api/stores/me');
      const list = Array.isArray(response?.stores) ? response.stores : [];
      setStores(list);
      if (list.length > 0) {
        const found = list.find((store) => store.storeId === selectedStoreId);
        if (!found) {
          const nextStoreId = list[0].storeId;
          setSelectedStoreId(nextStoreId);
          setStoredStoreId(nextStoreId);
        }
      } else {
        setSelectedStoreId('');
        setStoredStoreId('');
      }
    } catch (error) {
      console.warn('Load stores failed:', error);
    } finally {
      setStoreLoading(false);
    }
  }, [selectedStoreId]);

  const handleStoreChange = (storeId) => {
    setSelectedStoreId(storeId);
    setStoredStoreId(storeId);
  };

  const handleCreateStore = async () => {
    if (!newStore.name.trim()) {
      showSnackbar('Vui lòng nhập tên cửa hàng', 'error');
      return;
    }
    try {
      const payload = {
        name: newStore.name.trim(),
        phone: newStore.phone.trim(),
        address: newStore.address.trim(),
        storeId: newStore.storeId.trim() || undefined,
      };
      const response = await apiRequest('/api/stores', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const created = response?.store;
      const nextStoreId = created?.storeId || payload.storeId || '';
      if (nextStoreId) {
        setSelectedStoreId(nextStoreId);
        setStoredStoreId(nextStoreId);
      }
      setStoreDialogOpen(false);
      setNewStore({ name: '', phone: '', address: '', storeId: '' });
      showSnackbar('Tạo cửa hàng thành công', 'success');
      loadStores();
    } catch (error) {
      showSnackbar(error.message || 'Không thể tạo cửa hàng', 'error');
    }
  };

  const syncOrdersToServer = useCallback(async (orderLocalIds = null) => {
    await db.open();
    if (Array.isArray(orderLocalIds)) {
      const safeIds = orderLocalIds.filter(Boolean);
      if (safeIds.length === 0) {
        return { syncedOrders: 0, syncedItems: 0 };
      }
      const orders = await db.orders.where('localId').anyOf(safeIds).toArray();
      if (orders.length === 0) {
        return { syncedOrders: 0, syncedItems: 0 };
      }

      const orderIds = orders.map((order) => order.localId).filter(Boolean);
      const orderItems = orderIds.length > 0
        ? await db.order_items.where('orderLocalId').anyOf(orderIds).toArray()
        : [];
      const mappedItems = orderItems.map((item) => ({
        ...item,
        localId: `${item.orderLocalId}_${item.id}`,
      }));

      const response = await apiRequest('/api/sync/orders', {
        method: 'POST',
        body: JSON.stringify({ orders, orderItems: mappedItems }),
      });

      if (orderIds.length > 0) {
        await db.orders.where('localId').anyOf(orderIds).modify({ synced: true });
      }
      return response;
    }

    const orders = await db.orders.filter((order) => order.synced === false).toArray();
    if (orders.length === 0) {
      return { syncedOrders: 0, syncedItems: 0 };
    }

    const orderIds = orders.map((order) => order.localId).filter(Boolean);
    const orderItems = orderIds.length > 0
      ? await db.order_items.where('orderLocalId').anyOf(orderIds).toArray()
      : [];
    const mappedItems = orderItems.map((item) => ({
      ...item,
      localId: `${item.orderLocalId}_${item.id}`,
    }));

    const response = await apiRequest('/api/sync/orders', {
      method: 'POST',
      body: JSON.stringify({ orders, orderItems: mappedItems }),
    });

    if (orderIds.length > 0) {
      await db.orders.where('localId').anyOf(orderIds).modify({ synced: true });
    }
    return response;
  }, []);

  const syncMasterToServer = useCallback(async () => {
    await db.open();
    const products = await db.products.filter((product) => product.synced === false).toArray();
    const customers = await db.customers.filter((customer) => customer.synced === false).toArray();

    const safeProducts = products.filter((product) => product && typeof product.localId === 'string' && product.localId.trim());
    const safeCustomers = customers.filter((customer) => customer && typeof customer.localId === 'string' && customer.localId.trim());

    if (safeProducts.length === 0 && safeCustomers.length === 0) {
      return { syncedProducts: 0, syncedCustomers: 0 };
    }

    let response;
    try {
      response = await apiRequest('/api/sync/master', {
        method: 'POST',
        body: JSON.stringify({ products: safeProducts, customers: safeCustomers }),
      });
    } catch (error) {
      if (error?.errors) {
        console.warn('Sync master validation errors:', error.errors);
      }
      throw error;
    }

    if (safeProducts.length > 0) {
      const productIds = safeProducts.map((product) => product.localId);
      if (productIds.length > 0) {
        await db.products.where('localId').anyOf(productIds).modify({ synced: true });
      }
    }
    if (safeCustomers.length > 0) {
      const customerIds = safeCustomers.map((customer) => customer.localId);
      if (customerIds.length > 0) {
        await db.customers.where('localId').anyOf(customerIds).modify({ synced: true });
      }
    }

    return response;
  }, []);

  const syncReturnsToServer = useCallback(async () => {
    await db.open();
    const returns = await db.returns.filter((record) => record.synced === false).toArray();
    if (returns.length === 0) {
      return { syncedReturns: 0, syncedItems: 0 };
    }

    const returnIds = returns.map((record) => record.localId);
    const returnItems = returnIds.length > 0
      ? await db.return_items.where('returnLocalId').anyOf(returnIds).toArray()
      : [];
    const mappedItems = returnItems.map((item) => ({
      ...item,
      localId: `${item.returnLocalId}_${item.id}`,
    }));

    const response = await apiRequest('/api/sync/returns', {
      method: 'POST',
      body: JSON.stringify({ returns, returnItems: mappedItems }),
    });

    if (returnIds.length > 0) {
      await db.returns.where('localId').anyOf(returnIds).modify({ synced: true });
    }
    return response;
  }, []);

  const pullMasterData = useCallback(async () => {
    const response = await apiRequest('/api/sync/bootstrap', { method: 'GET' });
    const { products = [], customers = [], settings = [] } = response || {};

    await db.open();
    await db.transaction('rw', db.products, db.customers, db.settings, async () => {
      // Xóa hết dữ liệu cũ trước khi ghi dữ liệu user mới từ server (thay thế hoàn toàn)
      await db.products.clear();
      await db.customers.clear();
      await db.settings.clear();

      if (Array.isArray(products) && products.length > 0) {
        const normalizedProducts = products.map((product) => ({
          ...product,
          synced: true,
          deleted: Boolean(product.deleted),
        }));
        await db.products.bulkPut(normalizedProducts);
      }

      if (Array.isArray(customers) && customers.length > 0) {
        const normalizedCustomers = customers.map((customer) => ({
          ...customer,
          synced: true,
        }));
        await db.customers.bulkPut(normalizedCustomers);
      }

      if (Array.isArray(settings) && settings.length > 0) {
        const normalizedSettings = settings.map((setting) => ({
          key: setting.key,
          value: setting.value,
        }));
        await db.settings.bulkPut(normalizedSettings);
      }
    });

    return response;
  }, []);

  const syncAllData = useCallback(async () => {
    if (syncingRef.current || authFailedRef.current) return;
    const now = Date.now();
    if (now - lastSyncAttemptRef.current < 5000) return;
    lastSyncAttemptRef.current = now;
    syncingRef.current = true;
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      await syncOrdersToServer();
      await syncReturnsToServer();
      await syncMasterToServer();
      await pullMasterData();
      setLastSyncAt(Date.now());
      setSyncStatus('success');
      showSnackbar('Đồng bộ dữ liệu thành công', 'success');
    } catch (error) {
      console.warn('Sync all failed:', error);
      setSyncStatus('error');
      if (error?.status === 401 || String(error?.message).toLowerCase().includes('invalid token')) {
        authFailedRef.current = true;
        showSnackbar('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'warning');
      } else {
        showSnackbar('Không thể đồng bộ dữ liệu', 'warning');
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [syncOrdersToServer, syncReturnsToServer, syncMasterToServer, pullMasterData]);

  // Đồng bộ dữ liệu user từ server trước, sau đó mới seed nếu vẫn trống
  useEffect(() => {
    const initDatabase = async () => {
      try {
        try {
          await pullMasterData();
        } catch (error) {
          console.warn('Pull master data failed:', error);
        }
        await seedDatabase();
        if (!localStorage.getItem('pos_order_code_migrated_v1')) {
          await migrateOrderCodes();
          localStorage.setItem('pos_order_code_migrated_v1', 'true');
        }
      } catch (error) {
        console.error('Lỗi khởi tạo database:', error);
      }
    };
    initDatabase();
  }, [pullMasterData]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    const handleOnline = () => {
      syncAllData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncAllData]);

  useEffect(() => {
    const intervalMs = 5 * 60 * 1000;
    const tick = () => {
      if (!navigator.onLine || document.hidden) return;
      syncAllData();
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [syncAllData]);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  // Xử lý tìm kiếm trong header
  const handleHeaderSearch = (term) => {
    setSearchTerm(term);
  };

  const openEditCustomer = async (localId) => {
    if (!localId) return;
    try {
      await db.open();
      const customer = await db.customers.get(localId);
      if (!customer) {
        showSnackbar('Không tìm thấy khách hàng', 'error');
        return;
      }
      setEditCustomer({
        localId: customer.localId,
        customerCode: customer.customerCode || '',
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        area: customer.area || '',
        ward: customer.ward || '',
        group: customer.group || '',
        dateOfBirth: customer.dateOfBirth || '',
        gender: customer.gender || 'male',
        email: customer.email || '',
        facebook: customer.facebook || '',
        note: customer.note || '',
        avatar: null
      });
      setEditCustomerErrors({ customerCode: '', phone: '' });
      setEditCustomerDialogOpen(true);
      setEditCustomerTab(0);
    } catch (error) {
      console.error('Lỗi tải khách hàng:', error);
      showSnackbar('Có lỗi khi tải khách hàng', 'error');
    }
  };

  const loadOrderHistory = async (customer) => {
    if (!customer?.localId) return;
    setOrderHistoryLoading(true);
    try {
      await db.open();
      let orders = [];
      try {
        orders = await db.orders
          .where('customerLocalId')
          .equals(customer.localId)
          .toArray();
      } catch (error) {
        console.warn('Không thể query theo customerLocalId:', error);
      }

      if (orders.length === 0 && customer.phone) {
        const allOrders = await db.orders.toArray();
        orders = allOrders.filter(order => order.customerPhone === customer.phone);
      }

      orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrderHistory(orders);
    } catch (error) {
      console.error('Lỗi load lịch sử bán/trả hàng:', error);
      setOrderHistory([]);
    } finally {
      setOrderHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (editCustomerDialogOpen && editCustomerTab === 1 && editCustomer?.localId) {
      loadOrderHistory(editCustomer);
    }
  }, [editCustomerDialogOpen, editCustomerTab, editCustomer]);

  const returnSearchOptions = [
    { value: 'orderCode', label: 'Theo mã hóa đơn' },
    { value: 'shippingCode', label: 'Theo mã vận đơn bán' },
    { value: 'customer', label: 'Theo khách hàng hoặc ĐT' },
    { value: 'productCode', label: 'Theo mã hàng' },
    { value: 'productName', label: 'Theo tên hàng' }
  ];

  const loadReturnOrders = async () => {
    try {
      setReturnOrdersLoading(true);
      setReturnRecordsLoading(true);
      await db.open().catch(() => {});
      const [orders, customers, orderItems, products, returns] = await Promise.all([
        db.orders.toArray(),
        db.customers.toArray(),
        db.order_items.toArray(),
        db.products.toArray(),
        db.returns.toArray()
      ]);

      const customerById = new Map(customers.map((customer) => [customer.localId, customer]));
      const customerByPhone = new Map(customers.map((customer) => [customer.phone, customer]));
      const productById = new Map(products.map((product) => [product.localId, product]));

      const orderItemsByOrder = new Map();
      orderItems.forEach((item) => {
        if (!orderItemsByOrder.has(item.orderLocalId)) {
          orderItemsByOrder.set(item.orderLocalId, []);
        }
        orderItemsByOrder.get(item.orderLocalId).push(item);
      });

      const enriched = orders
        .filter(order => order.status !== 'returned')
        .map((order) => {
          const customer =
            (order.customerLocalId && customerById.get(order.customerLocalId)) ||
            (order.customerPhone && customerByPhone.get(order.customerPhone));

          const items = orderItemsByOrder.get(order.localId) || [];
          const productNames = items.map((item) => item.productName).filter(Boolean);
          const productCodes = items
            .map((item) => {
              const product = productById.get(item.productLocalId);
              return product?.productCode || product?.barcode || '';
            })
            .filter(Boolean);

          return {
            ...order,
            customerLabel: formatCustomerLabel(customer) || order.customerPhone || 'Khách lẻ',
            productNames,
            productCodes
          };
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setReturnOrders(enriched);

      const returnEnriched = returns
        .map((returnItem) => {
          const customer =
            (returnItem.customerLocalId && customerById.get(returnItem.customerLocalId)) ||
            (returnItem.customerPhone && customerByPhone.get(returnItem.customerPhone));
          return {
            ...returnItem,
            customerLabel: formatCustomerLabel(customer) || returnItem.customerPhone || 'Khách lẻ',
          };
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setReturnRecords(returnEnriched);
    } catch (error) {
      console.error('Lỗi tải đơn hàng trả:', error);
      setReturnOrders([]);
      setReturnRecords([]);
    } finally {
      setReturnOrdersLoading(false);
      setReturnRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (returnDialogOpen) {
      loadReturnOrders();
    }
  }, [returnDialogOpen]);

  const filteredReturnOrders = useMemo(() => {
    const term = returnSearchTerm.trim().toLowerCase();
    const fromDateValue = returnFromDate ? new Date(returnFromDate).setHours(0, 0, 0, 0) : null;
    const toDateValue = returnToDate ? new Date(returnToDate).setHours(23, 59, 59, 999) : null;

    return returnOrders.filter((order) => {
      if (fromDateValue || toDateValue) {
        const createdAtValue = order.createdAt ? new Date(order.createdAt).getTime() : 0;
        if (fromDateValue && createdAtValue < fromDateValue) return false;
        if (toDateValue && createdAtValue > toDateValue) return false;
      }

      if (!term) return true;

      if (returnSearchField === 'orderCode' || returnSearchField === 'shippingCode') {
        return order.orderCode?.toLowerCase().includes(term);
      }
      if (returnSearchField === 'customer') {
        return order.customerLabel?.toLowerCase().includes(term);
      }
      if (returnSearchField === 'productCode') {
        return order.productCodes?.some((code) => code.toLowerCase().includes(term));
      }
      if (returnSearchField === 'productName') {
        return order.productNames?.some((name) => name.toLowerCase().includes(term));
      }
      return true;
    });
  }, [returnOrders, returnSearchField, returnSearchTerm, returnFromDate, returnToDate]);

  const filteredReturnRecords = useMemo(() => {
    const term = returnSearchTerm.trim().toLowerCase();
    const fromDateValue = returnFromDate ? new Date(returnFromDate).setHours(0, 0, 0, 0) : null;
    const toDateValue = returnToDate ? new Date(returnToDate).setHours(23, 59, 59, 999) : null;

    return returnRecords.filter((record) => {
      if (fromDateValue || toDateValue) {
        const createdAtValue = record.createdAt ? new Date(record.createdAt).getTime() : 0;
        if (fromDateValue && createdAtValue < fromDateValue) return false;
        if (toDateValue && createdAtValue > toDateValue) return false;
      }

      if (!term) return true;

      const returnCode = (record.returnCode || '').toLowerCase();
      const orderCode = (record.orderCode || '').toLowerCase();
      const exchangeCode = (record.exchangeOrderCode || '').toLowerCase();
      const customerLabel = (record.customerLabel || '').toLowerCase();
      return (
        returnCode.includes(term) ||
        orderCode.includes(term) ||
        exchangeCode.includes(term) ||
        customerLabel.includes(term)
      );
    });
  }, [returnRecords, returnSearchTerm, returnFromDate, returnToDate]);

  const returnPageSize = 10;
  const returnTotalPages = Math.max(1, Math.ceil(filteredReturnOrders.length / returnPageSize));
  const returnPageSafe = Math.min(returnPage, returnTotalPages);
  const returnPageStart = (returnPageSafe - 1) * returnPageSize;
  const returnPageEnd = Math.min(returnPageStart + returnPageSize, filteredReturnOrders.length);
  const returnPageOrders = filteredReturnOrders.slice(returnPageStart, returnPageEnd);
  const returnRecordsPageSize = 10;
  const returnRecordsTotalPages = Math.max(1, Math.ceil(filteredReturnRecords.length / returnRecordsPageSize));
  const returnRecordsPageSafe = Math.min(returnRecordsPage, returnRecordsTotalPages);
  const returnRecordsPageStart = (returnRecordsPageSafe - 1) * returnRecordsPageSize;
  const returnRecordsPageEnd = Math.min(returnRecordsPageStart + returnRecordsPageSize, filteredReturnRecords.length);
  const returnRecordsPageItems = filteredReturnRecords.slice(returnRecordsPageStart, returnRecordsPageEnd);

  useEffect(() => {
    setReturnPage(1);
    setReturnRecordsPage(1);
  }, [returnSearchField, returnSearchTerm, returnFromDate, returnToDate]);

  const handleSelectReturnOrder = async (order) => {
    if (!order) return;
    try {
      await db.open();
      const [orderItems, products] = await Promise.all([
        db.order_items.where('orderLocalId').equals(order.localId).toArray(),
        db.products.toArray()
      ]);
      const productById = new Map(products.map(product => [product.localId, product]));
      const mappedReturnItems = orderItems.map(item => {
        const product = productById.get(item.productLocalId);
        return {
          product: {
            localId: item.productLocalId,
            name: item.productName,
            price: item.price,
            barcode: product?.barcode || '',
            stock: product?.stock ?? 0
          },
          qty: 0,
          maxQty: item.qty
        };
      });

      updateCurrentInvoice({
        returnMode: true,
        returnOrder: {
          localId: order.localId,
          orderCode: order.orderCode,
          customerLabel: order.customerLabel || '',
          customerLocalId: order.customerLocalId || '',
          customerPhone: order.customerPhone || ''
        },
        returnItems: mappedReturnItems,
        exchangeItems: [],
        customerName: order.customerLabel || '',
        customerLocalId: order.customerLocalId || '',
        customerPhone: order.customerPhone || ''
      });

      setReturnDialogOpen(false);
    } catch (error) {
      console.error('Lỗi load đơn trả hàng:', error);
      showSnackbar('Không thể tải đơn trả hàng', 'error');
    }
  };

  const handleUpdateReturnQty = (productLocalId, newQty) => {
    updateCurrentInvoice({
      returnItems: returnItems.map(item => {
        if (item.product.localId === productLocalId) {
          const maxQty = typeof item.maxQty === 'number' ? item.maxQty : newQty;
          return { ...item, qty: Math.min(Math.max(newQty, 0), maxQty) };
        }
        return item;
      })
    });
  };

  const handleReturnCheckout = async () => {
    if (!returnOrder) {
      showSnackbar('Vui lòng chọn hóa đơn trả hàng', 'warning');
      return;
    }

    const itemsToReturn = returnItems.filter(item => (Number(item.qty) || 0) > 0);
    if (itemsToReturn.length === 0) {
      showSnackbar('Vui lòng chọn sản phẩm cần trả', 'warning');
      return;
    }

    try {
      const returnLocalId = generateLocalId();
      const returnCode = await generateReturnCode();
      const now = Date.now();
      const hasExchangeItems = cartItems.length > 0;
      const exchangeOrderLocalId = hasExchangeItems ? generateLocalId() : null;
      const exchangeOrderCode = hasExchangeItems ? await generateOrderCode() : null;

      const returnRecord = {
        localId: returnLocalId,
        returnCode,
        orderLocalId: returnOrder.localId,
        orderCode: returnOrder.orderCode || null,
        exchangeOrderLocalId: exchangeOrderLocalId,
        exchangeOrderCode: exchangeOrderCode,
        cashierId,
        cashierName: effectiveCashierName,
        customerLocalId: customerLocalId || returnOrder.customerLocalId || null,
        customerPhone: customerPhone || returnOrder.customerPhone || null,
        totalReturnAmount: returnTotalAmount,
        totalExchangeAmount: totalAmount,
        netAmount,
        paymentMethod,
        amountPaid,
        createdAt: now,
        synced: false,
        exchangeItems: cartItems.map(item => ({
          productLocalId: item.product.localId,
          productName: item.product.name,
          price: item.product.price,
          qty: item.qty,
          subtotal: item.product.price * item.qty,
        }))
      };

      const returnItemRecords = itemsToReturn.map(item => ({
        returnLocalId,
        productLocalId: item.product.localId,
        productName: item.product.name,
        price: item.product.price,
        qty: item.qty,
        subtotal: item.product.price * item.qty,
      }));

      await db.transaction('rw', db.returns, db.return_items, db.products, db.orders, db.order_items, async () => {
        await db.returns.add(returnRecord);
        if (returnItemRecords.length > 0) {
          await db.return_items.bulkAdd(returnItemRecords);
        }

        if (hasExchangeItems) {
          const exchangeOrder = {
            localId: exchangeOrderLocalId,
            orderCode: exchangeOrderCode,
            totalAmount: totalAmount,
            subtotalAmount: subtotalAmount,
            discount: orderDiscount,
            discountType: discountType,
            paymentMethod: paymentMethod,
            cashierId,
            cashierName: effectiveCashierName,
            customerLocalId: customerLocalId || returnOrder.customerLocalId || null,
            customerPhone: customerPhone || returnOrder.customerPhone || null,
            pointsUsed: 0,
            pointsEarned: 0,
            status: 'completed',
            createdAt: now,
            synced: false,
            note: orderNote,
          };
          const exchangeOrderItems = cartItems.map(item => ({
            orderLocalId: exchangeOrderLocalId,
            productLocalId: item.product.localId,
            productName: item.product.name,
            price: item.product.price,
            qty: item.qty,
            subtotal: item.product.price * item.qty,
          }));
          await db.orders.add(exchangeOrder);
          if (exchangeOrderItems.length > 0) {
            await db.order_items.bulkAdd(exchangeOrderItems);
          }
        }

        await db.orders.update(returnOrder.localId, {
          status: 'returned',
          updatedAt: now,
          synced: false,
        });

        for (const item of itemsToReturn) {
          const product = await db.products.get(item.product.localId);
          if (product) {
            await db.products.update(item.product.localId, {
              stock: product.stock + item.qty,
              updatedAt: now,
              synced: false,
            });
          }
        }

        for (const item of cartItems) {
          const product = await db.products.get(item.product.localId);
          if (product) {
            await db.products.update(item.product.localId, {
              stock: product.stock - item.qty,
              updatedAt: now,
              synced: false,
            });
          }
        }
      });

      showSnackbar(`Đã lưu đơn trả hàng ${returnCode}`, 'success');
      syncReturnsToServer().catch((error) => {
        console.warn('Sync returns failed:', error);
      });
      syncOrdersToServer().catch((error) => {
        console.warn('Sync orders failed:', error);
      });
      syncMasterToServer().catch((error) => {
        console.warn('Sync master failed:', error);
      });
      updateCurrentInvoice({
        returnMode: false,
        returnOrder: null,
        returnItems: [],
        exchangeItems: [],
        items: [],
        amountPaid: 0,
        paymentMethod: 'cash'
      });
    } catch (error) {
      console.error('Lỗi khi trả hàng:', error);
      showSnackbar('Có lỗi khi lưu đơn trả hàng', 'error');
    }
  };

  const handleOpenReturnDetail = async (record) => {
    if (!record) return;
    try {
      setReturnDetailLoading(true);
      await db.open();
      const returnItems = await db.return_items
        .where('returnLocalId')
        .equals(record.localId)
        .toArray();
      const exchangeItems = Array.isArray(record.exchangeItems) ? record.exchangeItems : [];

      setReturnDetail({
        ...record,
        returnItems,
        exchangeItems,
      });
      setReturnDetailOpen(true);
    } catch (error) {
      console.error('Lỗi tải chi tiết hóa đơn đổi trả:', error);
      showSnackbar('Không thể tải chi tiết hóa đơn đổi trả', 'error');
    } finally {
      setReturnDetailLoading(false);
    }
  };


  // Cập nhật state của hóa đơn hiện tại
  const updateCurrentInvoice = (updates) => {
    setInvoices(prev => ({
      ...prev,
      [activeInvoiceIndex]: {
        ...prev[activeInvoiceIndex],
        ...updates
      }
    }));
  };

  /**
   * Hàm xử lý thêm sản phẩm vào giỏ hàng
   * @param {Object} product - Object sản phẩm cần thêm
   * 
   * Logic:
   * 1. Kiểm tra tồn kho
   * 2. Tìm sản phẩm trong giỏ hàng hiện tại
   * 3. Nếu đã có: Tăng số lượng
   * 4. Nếu chưa có: Thêm mới vào giỏ
   */
  const handleAddToCart = (product) => {
    const cartItemsKey = isReturnMode ? 'exchangeItems' : 'items';
    const existingItem = cartItems.find(item => item.product.localId === product.localId);
    
    if (existingItem) {
      handleUpdateQty(product.localId, existingItem.qty + 1);
    } else {
      updateCurrentInvoice({
        [cartItemsKey]: [...cartItems, { product, qty: 1 }]
      });
      showSnackbar(`Đã thêm "${product.name}" vào hóa đơn`, 'success');
    }
    // Không xóa search term để có thể thêm nhiều sản phẩm cùng lúc
  };

  /**
   * Hàm cập nhật số lượng sản phẩm trong hóa đơn
   * @param {string} productLocalId - ID của sản phẩm cần cập nhật
   * @param {number} newQty - Số lượng mới
   * 
   * Logic:
   * 1. Nếu số lượng <= 0: Xóa sản phẩm khỏi giỏ
   * 2. Nếu số lượng > tồn kho: Cảnh báo và giữ nguyên
   * 3. Nếu hợp lệ: Cập nhật số lượng
   */
  const handleUpdateQty = (productLocalId, newQty) => {
    // Nếu số lượng <= 0, xóa sản phẩm khỏi giỏ hàng
    if (newQty <= 0) {
      handleRemoveFromCart(productLocalId);
      return;
    }

    // Map qua mảng items để tìm và cập nhật sản phẩm
    // map(): Tạo mảng mới với cùng số phần tử, có thể thay đổi giá trị
    const updatedItems = cartItems.map(item => {
      // Nếu là sản phẩm cần cập nhật
      if (item.product.localId === productLocalId) {
        // Cập nhật số lượng: Spread operator để giữ nguyên các thuộc tính khác
        return { ...item, qty: newQty };
      }
      // Nếu không phải sản phẩm cần cập nhật, giữ nguyên
      return item;
    });

    // Cập nhật state với mảng items mới
    const cartItemsKey = isReturnMode ? 'exchangeItems' : 'items';
    updateCurrentInvoice({ [cartItemsKey]: updatedItems });
  };

  // Cập nhật discount cho sản phẩm
  const handleUpdateDiscount = (productLocalId, discount, discountType) => {
    const updatedItems = cartItems.map(item => {
      if (item.product.localId === productLocalId) {
        return { 
          ...item, 
          discount: discount || 0,
          discountType: discountType || 'vnd'
        };
      }
      return item;
    });
    const cartItemsKey = isReturnMode ? 'exchangeItems' : 'items';
    updateCurrentInvoice({ [cartItemsKey]: updatedItems });
  };

  // Xóa sản phẩm khỏi hóa đơn hiện tại
  const handleRemoveFromCart = (productLocalId) => {
    const cartItemsKey = isReturnMode ? 'exchangeItems' : 'items';
    updateCurrentInvoice({
      [cartItemsKey]: cartItems.filter(item => item.product.localId !== productLocalId)
    });
  };

  // Tính tổng tiền hàng (sau giảm giá từng sản phẩm)
  const calculateItemFinalPrice = (item) => {
    const basePrice = item.product.price;
    const itemDiscount = item.discount || 0;
    const itemDiscountType = item.discountType || 'vnd';
    
    if (itemDiscountType === 'percent') {
      return basePrice * (1 - itemDiscount / 100);
    } else {
      return Math.max(0, basePrice - itemDiscount);
    }
  };

  // Tính tổng tiền hàng (sau giảm giá từng sản phẩm)
  const subtotalAmount = cartItems.reduce((sum, item) => {
    const finalPrice = calculateItemFinalPrice(item);
    return sum + (finalPrice * item.qty);
  }, 0);

  // Tính giảm giá chung
  const calculateOrderDiscount = () => {
    if (!discount || discount === 0) return 0;
    if (discountType === 'percent') {
      return subtotalAmount * (discount / 100);
    } else {
      return Math.min(discount, subtotalAmount); // Không được giảm quá tổng tiền
    }
  };

  const orderDiscount = calculateOrderDiscount();
  const totalAmount = Math.max(0, subtotalAmount - orderDiscount);

  const returnTotalAmount = returnItems.reduce((sum, item) => {
    const price = Number(item.product?.price) || 0;
    return sum + price * (Number(item.qty) || 0);
  }, 0);
  const returnTotalQty = returnItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const exchangeTotalQty = cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const netAmount = totalAmount - returnTotalAmount;
  const returnNeedToPay = Math.abs(netAmount);
  const returnQuickAmounts = [
    returnNeedToPay,
    returnNeedToPay + 3000,
    returnNeedToPay + 8000,
    60000,
    100000,
    200000,
    500000
  ].filter(amount => amount > 0).slice(0, 7);
  const filteredReturnItems = isReturnMode && searchTerm.trim()
    ? returnItems.filter(item => {
        const term = searchTerm.trim().toLowerCase();
        const name = item.product?.name?.toLowerCase() || '';
        const barcode = item.product?.barcode?.toLowerCase() || '';
        return name.includes(term) || barcode.includes(term);
      })
    : returnItems;

  const handlePrintInvoice = async (copiesOverride) => {
    if (!cartItems || cartItems.length === 0) {
      showSnackbar('Chưa có sản phẩm để in hóa đơn', 'warning');
      return;
    }

    let customer = null;
    try {
      await db.open().catch(() => {});
      if (customerLocalId) {
        customer = await db.customers.get(customerLocalId);
      } else if (customerPhone) {
        customer = await db.customers.where('phone').equals(customerPhone).first();
      }
    } catch (error) {
      console.error('Lỗi tải thông tin khách hàng để in:', error);
    }

    const customerNameValue = customerName || customer?.name || '';
    const customerNicknameValue = customer?.nickname || '';
    const customerPhoneValue = customerPhone || customer?.phone || '';
    const customerAddressValue = customer?.address?.trim() || '';
    const customerPointsValue =
      customer?.points !== undefined && customer?.points !== null
        ? customer.points
        : customerPoints;

    const paymentMethodLabel =
      paymentMethod === 'cash'
        ? 'Tiền mặt'
        : paymentMethod === 'bank'
          ? 'Chuyển khoản'
          : paymentMethod || '';

    const createdAtLabel = new Date().toLocaleString('vi-VN', { hour12: false });

    const itemsHtml = cartItems
      .map((item) => {
        const basePrice = Number(item.product?.price) || 0;
        const finalPrice = Number(calculateItemFinalPrice(item)) || 0;
        const hasDiscount = finalPrice < basePrice;
        const lineTotal = finalPrice * (Number(item.qty) || 0);
        return `
          <tr>
            <td class="item-name">${item.product?.name || ''}</td>
            <td class="item-qty">${item.qty}</td>
            <td class="item-price">
              <div class="price-final">${finalPrice.toLocaleString('vi-VN')}</div>
              ${hasDiscount ? `<div class="price-original">${basePrice.toLocaleString('vi-VN')}</div>` : ''}
            </td>
            <td class="item-total">${lineTotal.toLocaleString('vi-VN')}</td>
          </tr>
        `;
      })
      .join('');

    const customerInfoRows = [];
    if (customerNameValue) customerInfoRows.push(`Họ tên: ${customerNameValue}`);
    if (customerNicknameValue) customerInfoRows.push(`Biệt danh: ${customerNicknameValue}`);
    if (customerPhoneValue) customerInfoRows.push(`SĐT: ${customerPhoneValue}`);
    if (customerPointsValue !== undefined && customerPointsValue !== null && customerNameValue) {
      customerInfoRows.push(`Điểm tích luỹ: ${Number(customerPointsValue) || 0}`);
    }
    if (customerAddressValue) customerInfoRows.push(`Địa chỉ: ${customerAddressValue}`);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Hóa đơn bán hàng</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 16px; }
            .header { text-align: center; margin-bottom: 12px; }
            .store-name { font-size: 18px; font-weight: 700; }
            .store-line { font-size: 12px; margin-top: 2px; }
            .section { margin-top: 10px; font-size: 12px; }
            .section-title { font-weight: 600; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
            th, td { padding: 6px 4px; border-bottom: 1px dashed #ccc; vertical-align: top; }
            th { text-align: left; font-weight: 600; }
            .item-qty, .item-price, .item-total { text-align: right; }
            .price-final { font-weight: 600; }
            .price-original { color: #666; text-decoration: line-through; font-size: 11px; }
            .summary { margin-top: 10px; font-size: 12px; }
            .summary-row { display: flex; justify-content: space-between; margin-top: 4px; }
            .summary-total { font-weight: 700; font-size: 13px; }
            .divider { border-top: 1px dashed #ccc; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${storeInfo.name}</div>
            <div class="store-line">SĐT: ${storeInfo.phone}</div>
            <div class="store-line">Địa chỉ: ${storeInfo.address}</div>
          </div>

          <div class="section">
            <div>Thời gian: ${createdAtLabel}</div>
            <div>Nhân viên: ${cashierName}</div>
          </div>

          ${customerInfoRows.length > 0 ? `
            <div class="section">
              <div class="section-title">Thông tin khách hàng</div>
              ${customerInfoRows.map((row) => `<div>${row}</div>`).join('')}
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th class="item-qty">SL</th>
                <th class="item-price">Giá</th>
                <th class="item-total">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary">
            <div class="divider"></div>
            <div class="summary-row summary-total">
              <span>Tổng tiền thanh toán</span>
              <span>${totalAmount.toLocaleString('vi-VN')}</span>
            </div>
            <div class="summary-row">
              <span>Phương thức thanh toán</span>
              <span>${paymentMethodLabel || '-'}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const totalCopies = Math.max(1, Number(copiesOverride || printCopies) || 1);
    let remainingCopies = totalCopies;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const printDocument = () => iframe.contentWindow?.document;
    const cleanup = () => {
      setTimeout(() => {
        iframe.remove();
      }, 0);
    };

    const triggerPrint = () => {
      if (remainingCopies <= 0) {
        cleanup();
        return;
      }
      remainingCopies -= 1;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };

    const doc = printDocument();
    if (!doc) {
      showSnackbar('Không thể mở cửa sổ in hóa đơn', 'error');
      cleanup();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (win) {
        win.onafterprint = () => {
          if (remainingCopies > 0) {
            setTimeout(triggerPrint, 150);
          } else {
            cleanup();
          }
        };
      }
      setTimeout(triggerPrint, 200);
    };
  };

  const buildReportRange = useCallback(() => {
    if (reportType === 'day') {
      const start = new Date(reportDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(reportDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (reportType === 'month') {
      const [year, month] = reportMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (reportType === 'quarter') {
      const quarter = Number(reportQuarter);
      const startMonth = (quarter - 1) * 3;
      const start = new Date(reportYear, startMonth, 1);
      const end = new Date(reportYear, startMonth + 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (reportType === 'year') {
      const start = new Date(reportYear, 0, 1);
      const end = new Date(reportYear, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    const start = new Date(reportLunarYear, 0, 1);
    const end = new Date(reportLunarYear, 11, 31, 23, 59, 59, 999);
    return { start, end };
  }, [reportType, reportDate, reportMonth, reportQuarter, reportYear, reportLunarYear]);

  const buildReportBuckets = useCallback((rangeStart) => {
    if (reportType === 'day') {
      return [
        {
          label: 'Ngày',
          start: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0, 0),
          end: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 23, 59, 59, 999)
        }
      ];
    }
    if (reportType === 'month') {
      const daysInMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, idx) => {
        const day = idx + 1;
        return {
          label: `${day}`,
          start: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), day, 0, 0, 0, 0),
          end: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), day, 23, 59, 59, 999)
        };
      });
    }
    if (reportType === 'quarter') {
      const quarterStartMonth = (Number(reportQuarter) - 1) * 3;
      return Array.from({ length: 3 }, (_, idx) => {
        const month = quarterStartMonth + idx;
        const start = new Date(reportYear, month, 1);
        const end = new Date(reportYear, month + 1, 0, 23, 59, 59, 999);
        return {
          label: `T${month + 1}`,
          start,
          end
        };
      });
    }
    return Array.from({ length: 12 }, (_, idx) => {
      const start = new Date(rangeStart.getFullYear(), idx, 1);
      const end = new Date(rangeStart.getFullYear(), idx + 1, 0, 23, 59, 59, 999);
      return {
        label: `T${idx + 1}`,
        start,
        end
      };
    });
  }, [reportType, reportQuarter, reportYear]);

  const loadSalesReport = useCallback(async () => {
    try {
      setReportLoading(true);
      await db.open().catch(() => {});
      const [orders, orderItems, products] = await Promise.all([
        db.orders.toArray(),
        db.order_items.toArray(),
        db.products.toArray()
      ]);
      const { start, end } = buildReportRange();
      const startTime = start.getTime();
      const endTime = end.getTime();
      const buckets = buildReportBuckets(start, end).map((bucket) => ({
        ...bucket,
        totalCost: 0,
        totalSales: 0,
        totalProfit: 0,
        orderCount: 0
      }));

      const productCostMap = new Map(
        products.map((product) => [product.localId, Number(product.costPrice) || 0])
      );
      const itemsByOrder = new Map();
      orderItems.forEach((item) => {
        if (!itemsByOrder.has(item.orderLocalId)) {
          itemsByOrder.set(item.orderLocalId, []);
        }
        itemsByOrder.get(item.orderLocalId).push(item);
      });

      let totalSales = 0;
      let totalCost = 0;
      let orderCount = 0;

      const quarterStartMonth = (Number(reportQuarter) - 1) * 3;
      orders.forEach((order) => {
        if (order?.status !== 'completed') return;
        const createdAt = Number(order.createdAt) || 0;
        if (createdAt < startTime || createdAt > endTime) return;
        orderCount += 1;
        totalSales += Number(order.totalAmount) || 0;

        const items = itemsByOrder.get(order.localId) || [];
        let orderCost = 0;
        items.forEach((item) => {
          const costPrice = productCostMap.get(item.productLocalId) || 0;
          orderCost += costPrice * (Number(item.qty) || 0);
        });
        totalCost += orderCost;

        const createdDate = new Date(createdAt);
        let bucketIndex = -1;
        if (reportType === 'day') {
          bucketIndex = 0;
        } else if (reportType === 'month') {
          const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
          const dayIndex = Math.min(createdDate.getDate(), daysInMonth) - 1;
          bucketIndex = dayIndex;
        } else if (reportType === 'quarter') {
          const monthIndex = createdDate.getMonth();
          bucketIndex = monthIndex - quarterStartMonth;
        } else {
          bucketIndex = createdDate.getMonth();
        }
        if (bucketIndex >= 0) {
          buckets[bucketIndex].totalSales += Number(order.totalAmount) || 0;
          buckets[bucketIndex].totalCost += orderCost;
          buckets[bucketIndex].totalProfit =
            buckets[bucketIndex].totalSales - buckets[bucketIndex].totalCost;
          buckets[bucketIndex].orderCount += 1;
        }
      });

      const totalProfit = totalSales - totalCost;
      setReportData({
        totalCost,
        totalSales,
        totalProfit,
        orderCount,
        buckets
      });
    } catch (error) {
      console.error('Lỗi tải báo cáo bán hàng:', error);
      showSnackbar('Không thể tải báo cáo bán hàng', 'error');
    } finally {
      setReportLoading(false);
    }
  }, [buildReportRange, buildReportBuckets, reportQuarter, reportType]);

  useEffect(() => {
    if (!reportDialogOpen) return;
    loadSalesReport();
  }, [reportDialogOpen, loadSalesReport]);

  const saveBankAccounts = (accounts) => {
    setBankAccounts(accounts);
    localStorage.setItem('pos_bank_accounts', JSON.stringify(accounts));
  };

  const selectedBankAccount =
    bankAccounts.find((account) => account.id === selectedBankAccountId) || null;

  const getBankQrUrl = (account, amount, note) => {
    if (!account?.bankCode || !account?.accountNumber) return '';
    const cleanAmount = Math.max(0, Math.round(amount || 0));
    const addInfo = encodeURIComponent(note || '');
    const accountName = encodeURIComponent(account.accountName || '');
    return `https://img.vietqr.io/image/${account.bankCode}-${account.accountNumber}-compact2.png?amount=${cleanAmount}&addInfo=${addInfo}&accountName=${accountName}`;
  };

  const prevReturnNeedToPayRef = useRef(returnNeedToPay);
  useEffect(() => {
    if (!isReturnMode) {
      prevReturnNeedToPayRef.current = returnNeedToPay;
      return;
    }
    const prevNeedToPay = prevReturnNeedToPayRef.current;
    const shouldAutoUpdate =
      (amountPaid === 0 && returnNeedToPay > 0) ||
      (amountPaid === prevNeedToPay && returnNeedToPay !== prevNeedToPay) ||
      (returnNeedToPay === 0 && amountPaid === prevNeedToPay);

    if (shouldAutoUpdate) {
      updateCurrentInvoice({ amountPaid: returnNeedToPay });
    }
    prevReturnNeedToPayRef.current = returnNeedToPay;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturnMode, returnNeedToPay, amountPaid]);

  /**
   * Hàm xử lý thanh toán đơn hàng
   * 
   * Logic:
   * 1. Validate: Kiểm tra giỏ hàng không trống, số tiền trả đủ
   * 2. Tạo order object với thông tin đơn hàng
   * 3. Tạo order_items (chi tiết đơn hàng)
   * 4. Cập nhật tồn kho sản phẩm
   * 5. Tính điểm tích lũy và cập nhật khách hàng
   * 6. Lưu vào database
   * 7. Xóa hóa đơn sau khi thanh toán thành công
   */
  const handleCheckout = async () => {
    // Validation: Kiểm tra giỏ hàng không trống
    if (cartItems.length === 0) {
      showSnackbar('Hóa đơn trống!', 'warning');
      return;
    }

    // Validation: Kiểm tra số tiền trả có đủ không
    if (amountPaid < totalAmount) {
      showSnackbar('Số tiền thanh toán không đủ!', 'error');
      return;
    }

    try {
      // Tạo ID cho đơn hàng (UUID)
      const orderLocalId = generateLocalId();
      
      // Tạo mã đơn hàng (VD: ORD-20241201-001)
      const orderCode = await generateOrderCode();
      
      // Lấy timestamp hiện tại (milliseconds từ 1970)
      const now = Date.now();

      // Tạo đơn hàng
                let effectiveCustomerLocalId = customerLocalId || null;

                if (!effectiveCustomerLocalId && customerPhone) {
                  const customerByPhone = await db.customers
                    .where('phone')
                    .equals(customerPhone)
                    .first();
                  if (customerByPhone) {
                    effectiveCustomerLocalId = customerByPhone.localId;
                  }
                }

      const order = {
        localId: orderLocalId,
        orderCode: orderCode,
        totalAmount: totalAmount,
        subtotalAmount: subtotalAmount,
        discount: orderDiscount,
        discountType: discountType,
        paymentMethod: paymentMethod,
        cashierId,
        cashierName: effectiveCashierName,
                  customerLocalId: effectiveCustomerLocalId,
                  customerPhone: customerPhone || null,
        pointsUsed: 0,
        pointsEarned: 0,
        status: 'completed',
        createdAt: now,
        synced: false,
        note: orderNote,
      };

      // Tạo chi tiết đơn hàng
      const orderItems = cartItems.map(item => ({
        orderLocalId: orderLocalId,
        productLocalId: item.product.localId,
        productName: item.product.name,
        price: item.product.price,
        qty: item.qty,
        subtotal: item.product.price * item.qty,
      }));

      // Cập nhật tồn kho cho từng sản phẩm đã bán
      // for...of: Loop qua từng item trong giỏ hàng
      for (const item of cartItems) {
        // Lấy thông tin sản phẩm từ database theo localId
        // .get(): Query theo primary key - nhanh nhất (O(1))
        const product = await db.products.get(item.product.localId);
        
        // Nếu tìm thấy sản phẩm
        if (product) {
          // Cập nhật tồn kho: stock mới = stock cũ - số lượng đã bán
          // .update(): Cập nhật record trong database
          await db.products.update(item.product.localId, {
            stock: product.stock - item.qty,  // Giảm tồn kho
            updatedAt: now,                    // Cập nhật thời gian sửa đổi
            synced: false,
          });
        }
      }

      // Tính điểm tích lũy (chỉ tính cho sản phẩm có allowPoints = true)
      // Tỷ lệ: 50000 VND = 1 điểm
      const pointsEarnedAmount = cartItems.reduce((sum, item) => {
        const finalPrice = calculateItemFinalPrice(item);
        const itemTotal = finalPrice * item.qty;
        // Chỉ tính điểm nếu sản phẩm cho phép tích điểm
        if (item.product.allowPoints !== false) {
          return sum + itemTotal;
        }
        return sum;
      }, 0);
      const pointsToAdd = Math.floor(pointsEarnedAmount / 50000);

      // Xử lý khách hàng: Cập nhật điểm tích lũy nếu có số điện thoại
      if (effectiveCustomerLocalId) {
        const existingCustomer = await db.customers.get(effectiveCustomerLocalId);

        if (existingCustomer) {
          await db.customers.update(existingCustomer.localId, {
            points: existingCustomer.points + pointsToAdd,
            updatedAt: now,
            synced: false,
          });
          order.pointsEarned = pointsToAdd;
        }
      } else if (customerPhone) {
        // Tìm khách hàng trong database theo số điện thoại
        // .where('phone'): Query theo index 'phone'
        // .equals(customerPhone): Tìm chính xác số điện thoại
        // .first(): Lấy record đầu tiên (nhanh hơn .toArray() vì chỉ cần 1)
        const existingCustomer = await db.customers
          .where('phone')
          .equals(customerPhone)
          .first();

        // Nếu tìm thấy khách hàng (đã có trong database)
        if (existingCustomer) {
          // Cập nhật điểm tích lũy: điểm mới = điểm cũ + điểm mới tích được
          await db.customers.update(existingCustomer.localId, {
            points: existingCustomer.points + pointsToAdd,
            updatedAt: now,
            synced: false,
          });
          // Lưu số điểm tích được vào đơn hàng
          order.customerLocalId = existingCustomer.localId;
          order.pointsEarned = pointsToAdd;
        } else {
          // Kiểm tra số điện thoại đã tồn tại chưa
          const phoneExists = await checkPhoneExists(customerPhone);
          if (phoneExists) {
            // Nếu đã tồn tại, cập nhật thay vì tạo mới
            const existingCustomer = await db.customers.where('phone').equals(customerPhone).first();
            if (existingCustomer) {
              await db.customers.update(existingCustomer.localId, {
                points: existingCustomer.points + pointsToAdd,
                updatedAt: now,
                synced: false,
              });
              order.pointsEarned = pointsToAdd;
            }
          } else {
            // Tạo localId mới và kiểm tra trùng
            let localId = generateLocalId();
            let attempts = 0;
            while (await db.customers.get(localId) && attempts < 10) {
              localId = generateLocalId();
              attempts++;
            }
            if (attempts >= 10) {
              console.error('Không thể tạo localId duy nhất sau 10 lần thử.');
              throw new Error('Không thể tạo khách hàng mới');
            }

            await db.customers.add({
              localId,
              name: customerName || `Khách hàng ${customerPhone}`,
              phone: customerPhone,
              points: pointsToAdd,
              debt: 0,  // Khách hàng mới không có nợ
              createdAt: now,
              synced: false,
            });
            order.customerLocalId = localId;
            order.pointsEarned = pointsToAdd;
          }
        }
      }

      // Lưu đơn hàng vào database
      // .add(): Thêm record mới vào bảng orders
      await db.orders.add(order);
      
      // Lưu chi tiết đơn hàng
      // .bulkAdd(): Thêm nhiều records cùng lúc (nhanh hơn add từng cái)
      await db.order_items.bulkAdd(orderItems);

      if (autoPrintEnabled) {
        await handlePrintInvoice(printCopies);
      }

      syncOrdersToServer([orderLocalId]).catch((error) => {
        console.warn('Sync orders failed:', error);
        showSnackbar('Chưa thể đồng bộ đơn hàng lên server', 'warning');
      });
      syncMasterToServer().catch((error) => {
        console.warn('Sync master failed:', error);
      });

      // Xóa hóa đơn sau khi thanh toán thành công
      // filter(): Tạo mảng mới không chứa hóa đơn đã thanh toán
      // (_, i): Bỏ qua giá trị, chỉ lấy index
      const activeTabIndex = invoiceTabs.findIndex((tab) => tab.id === activeInvoiceIndex);
      const safeActiveIndex = activeTabIndex >= 0 ? activeTabIndex : 0;
      const newTabs = invoiceTabs.filter((_, i) => i !== safeActiveIndex);
      
      // Xóa state của hóa đơn đã thanh toán
      // Lấy ID của hóa đơn đã thanh toán
      const paidInvoiceId =
        invoiceTabs[safeActiveIndex]?.id !== undefined
          ? invoiceTabs[safeActiveIndex].id
          : activeInvoiceIndex;
      // Functional update: Xóa invoice khỏi state
      setInvoices(prev => {
        const newInvoices = { ...prev };  // Copy object cũ
        delete newInvoices[paidInvoiceId]; // Xóa key khỏi object
        return newInvoices;                // Trả về object mới
      });

      // Cập nhật tabs: Set mảng tabs mới (đã xóa tab đã thanh toán)
      setInvoiceTabs(newTabs);
      
      // Chuyển sang hóa đơn khác hoặc tạo mới nếu không còn hóa đơn nào
      if (newTabs.length > 0) {
        // Chuyển sang hóa đơn trước đó hoặc hóa đơn cuối cùng
        const nextIndex = safeActiveIndex >= newTabs.length ? newTabs.length - 1 : safeActiveIndex;
        const nextActiveId = newTabs[nextIndex]?.id ?? newTabs[0]?.id ?? 0;
        setActiveInvoiceIndex(nextActiveId);
      } else {
        // Tạo hóa đơn mới nếu không còn hóa đơn nào
        const newInvoiceId = 0;
        setInvoiceTabs([{ label: 'Hóa đơn 1', id: newInvoiceId }]);
        setInvoices({
          [newInvoiceId]: {
            items: [],
            returnMode: false,
            returnOrder: null,
            returnItems: [],
            exchangeItems: [],
            customerPhone: '',
            customerLocalId: '',
            customerName: '',
            customerDebt: 0,
            customerPoints: 0,
            customerSearchTerm: '',
            orderNote: '',
            paymentMethod: 'cash',
            amountPaid: 0,
            discount: 0,
            discountType: 'vnd',
          }
        });
        invoiceIdCounterRef.current = 1;
        invoiceLabelCounterRef.current = 2;
        setActiveInvoiceIndex(newInvoiceId);
      }
      
      setSearchTerm('');

      showSnackbar(`Thanh toán thành công! Mã đơn: ${orderCode}`, 'success');

    } catch (error) {
      console.error('Lỗi khi thanh toán:', error);
      showSnackbar('Có lỗi xảy ra khi thanh toán!', 'error');
    }
  };

  // Set amountPaid mặc định = totalAmount khi totalAmount thay đổi
  const prevTotalAmountRef = useRef(totalAmount);
  useEffect(() => {
    const prevTotalAmount = prevTotalAmountRef.current;
    const shouldAutoUpdate =
      (amountPaid === 0 && totalAmount > 0) ||
      (amountPaid === prevTotalAmount && totalAmount !== prevTotalAmount) ||
      (totalAmount === 0 && amountPaid === prevTotalAmount);

    if (shouldAutoUpdate) {
      updateCurrentInvoice({ amountPaid: totalAmount });
    }
    prevTotalAmountRef.current = totalAmount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, amountPaid]); // Chỉ cập nhật khi totalAmount thay đổi

  const safeSelectedStoreId = stores.some((store) => store.storeId === selectedStoreId)
    ? selectedStoreId
    : '';

  return (
    <Box sx={{ 
      width: '100vw',
      height: '100vh', 
      bgcolor: '#f5f5f5', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      {/* Header - Cố định trên cùng */}
      <Box sx={{ flexShrink: 0 }}>
        <Header
          searchTerm={searchTerm}
          onSearch={handleHeaderSearch}
          searchPlaceholder={isReturnMode ? 'Tìm hàng trả (F3)' : 'Tìm hàng hóa (F3) hoặc quét barcode...'}
          disableSearchDropdown={isReturnMode}
          invoiceTabs={invoiceTabs}
          activeInvoiceIndex={activeInvoiceIndex}
          onInvoiceChange={setActiveInvoiceIndex}
          onOpenReturnOrders={() => setReturnDialogOpen(true)}
          onOpenPrintSettings={() => setPrintSettingsOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
          userName={cashierName}
          stores={stores}
          selectedStoreId={safeSelectedStoreId}
          onStoreChange={handleStoreChange}
          onOpenStoreDialog={() => setStoreDialogOpen(true)}
          canManageStores={user?.role === 'admin'}
          storeLoading={storeLoading}
          onNewInvoice={() => {
            const nextId = invoiceIdCounterRef.current;
            const nextLabel = invoiceLabelCounterRef.current;
            invoiceIdCounterRef.current += 1;
            invoiceLabelCounterRef.current += 1;
            const newTabs = [...invoiceTabs, { label: `Hóa đơn ${nextLabel}`, id: nextId }];
            setInvoiceTabs(newTabs);
            
            // Tạo hóa đơn mới với state rỗng
            setInvoices(prev => ({
              ...prev,
              [nextId]: {
                items: [],
                returnMode: false,
                returnOrder: null,
                returnItems: [],
                exchangeItems: [],
                customerPhone: '',
                customerLocalId: '',
                customerName: '',
                customerDebt: 0,
                customerPoints: 0,
                customerSearchTerm: '',
                orderNote: '',
                paymentMethod: 'cash',
                amountPaid: 0,
                discount: 0,
                discountType: 'vnd',
              }
            }));
            
            setActiveInvoiceIndex(nextId);
          }}
          onCloseInvoice={(index) => {
            if (invoiceTabs.length > 1) {
              const newTabs = invoiceTabs.filter((_, i) => i !== index);
              setInvoiceTabs(newTabs);
              
              // Xóa state của hóa đơn đã đóng
              const closedInvoiceId = invoiceTabs[index].id;
              setInvoices(prev => {
                const newInvoices = { ...prev };
                delete newInvoices[closedInvoiceId];
                return newInvoices;
              });
              
              // Chuyển sang hóa đơn khác nếu đang ở hóa đơn bị đóng
              if (activeInvoiceIndex === closedInvoiceId) {
                const nextIndex = index >= newTabs.length ? newTabs.length - 1 : index;
                const nextActiveId = newTabs[nextIndex]?.id ?? newTabs[0]?.id ?? 0;
                setActiveInvoiceIndex(nextActiveId);
              }
            }
          }}
          onAddToCart={handleAddToCart}
        />
      </Box>

      {/* Nội dung chính - Chia 2 cột */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        overflow: 'hidden',
        minHeight: 0,
        width: '100%',
        pb: 8 // Padding bottom để không bị che bởi BottomFooter
      }}>
        {/* Cột trái: Danh sách sản phẩm trong hóa đơn (70%) */}
        <Box sx={{ 
          width: '70%', 
          minWidth: 0,
          bgcolor: 'white', 
          display: 'flex', 
          flexDirection: 'column',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden'
        }}>
          {isReturnMode ? (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 2, overflow: 'hidden' }}>
              <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Paper sx={{ p: 1.5, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Trả hàng
                  </Typography>
                  <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <ProductList
                      items={filteredReturnItems}
                      onUpdateQty={handleUpdateReturnQty}
                      onRemove={(productLocalId) => handleUpdateReturnQty(productLocalId, 0)}
                      minQty={0}
                      getMaxQty={(item) => item.maxQty}
                      showQtyHint
                      disableDiscount
                    />
                  </Box>
                </Paper>
              </Box>

              <Box sx={{ bgcolor: 'primary.main', borderRadius: 1, p: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    inputRef={(el) => {
                      exchangeSearchRef.current = el;
                      if (el) {
                        setExchangeSearchAnchor(el);
                      }
                    }}
                    fullWidth
                    size="small"
                    placeholder="Tìm hàng đổi (F7)"
                    value={exchangeSearchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setExchangeSearchTerm(value);
                      setExchangeSearchOpen(value.trim().length > 0);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <QrCodeScannerIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      bgcolor: 'common.white',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'common.white',
                      }
                    }}
                  />
                </Box>
                <ProductSearchDropdown
                  searchTerm={exchangeSearchTerm}
                  open={exchangeSearchOpen}
                  anchorEl={exchangeSearchAnchor}
                  onClose={() => setExchangeSearchOpen(false)}
                  onAddToCart={(product) => {
                    handleAddToCart(product);
                    setExchangeSearchTerm('');
                    setExchangeSearchOpen(false);
                  }}
                />
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Paper sx={{ p: 1.5, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Mua hàng
                  </Typography>
                  <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <ProductList
                      items={cartItems}
                      onUpdateQty={handleUpdateQty}
                      onUpdateDiscount={handleUpdateDiscount}
                      onRemove={handleRemoveFromCart}
                    />
                  </Box>
                </Paper>
              </Box>
            </Box>
          ) : (
            <ProductList
              items={cartItems}
              onUpdateQty={handleUpdateQty}
              onUpdateDiscount={handleUpdateDiscount}
              onRemove={handleRemoveFromCart}
            />
          )}
          {/* Footer - Ghi chú đơn hàng (chỉ ở cột trái) */}
          <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
            <Footer note={orderNote} onNoteChange={(note) => updateCurrentInvoice({ orderNote: note })} />
          </Box>
        </Box>

        {/* Cột phải: Thông tin khách hàng và thanh toán (30%) */}
        <Box sx={{ 
          width: '30%', 
          minWidth: 0,
          bgcolor: '#f5f5f5', 
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
            {isReturnMode ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {cashierName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date().toLocaleString('vi-VN', { hour12: false })}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {customerName || returnOrder?.customerLabel || 'Khách lẻ'}
                    </Typography>
                    {customerPhone && (
                      <Typography variant="caption" color="text.secondary">
                        {customerPhone}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                    Trả hàng {returnOrder?.orderCode ? `/ ${returnOrder.orderCode}` : ''} - {cashierName}
                  </Typography>
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Tổng tiền hàng trả</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {returnTotalQty} / {returnTotalAmount.toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Tổng tiền hàng mua</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {exchangeTotalQty} / {totalAmount.toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {netAmount >= 0 ? 'Khách cần trả thêm' : 'Cần trả khách'}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: netAmount >= 0 ? 'primary.main' : 'error.main' }}
                      >
                        {Math.abs(netAmount).toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {netAmount >= 0 ? 'Khách thanh toán' : 'Tiền trả khách'}
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={amountPaid || returnNeedToPay}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        updateCurrentInvoice({ amountPaid: value });
                      }}
                    />
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <Grid container spacing={0.5}>
                      {returnQuickAmounts.map((amount) => (
                        <Grid item xs={4} key={amount}>
                          <Chip
                            label={amount.toLocaleString('vi-VN')}
                            onClick={() => updateCurrentInvoice({ amountPaid: amount })}
                            color={amountPaid === amount ? 'primary' : 'default'}
                            sx={{ width: '100%', fontSize: '0.75rem' }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel component="legend" sx={{ mb: 0.5, fontSize: '0.875rem', fontWeight: 600 }}>
                        Phương thức thanh toán
                      </FormLabel>
                      <RadioGroup
                        value={paymentMethod}
                        onChange={(e) => updateCurrentInvoice({ paymentMethod: e.target.value })}
                        row
                        sx={{ gap: 1 }}
                      >
                        <FormControlLabel value="cash" control={<Radio size="small" />} label="Tiền mặt" sx={{ m: 0 }} />
                        <FormControlLabel value="bank" control={<Radio size="small" />} label="Chuyển khoản" sx={{ m: 0 }} />
                      </RadioGroup>
                    </FormControl>
                  </Box>
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
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '__add__') {
                            setAddBankDialogOpen(true);
                            return;
                          }
                          setSelectedBankAccountId(value);
                        }}
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
                                returnNeedToPay,
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
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleReturnCheckout}
                >
                  TRẢ HÀNG
                </Button>
              </Box>
            ) : (
              <PaymentPanel
                cashierName={cashierName}
                customerName={customerName}
                customerPhone={customerPhone}
                customerLocalId={customerLocalId}
                customerSearchTerm={customerSearchTerm}
                customerDebt={customerDebt}
                customerPoints={customerPoints}
                onCustomerSearchChange={(searchValue) => {
                  updateCurrentInvoice({ customerSearchTerm: searchValue });
                  if (customerName || customerPhone) {
                    updateCurrentInvoice({
                      customerPhone: '',
                      customerLocalId: '',
                      customerName: '',
                      customerDebt: 0,
                      customerPoints: 0
                    });
                  }
                }}
                onCustomerSelect={async (customer) => {
                  updateCurrentInvoice({ 
                    customerPhone: customer.phone || '', 
                    customerLocalId: customer.localId || '',
                    customerName: formatCustomerLabel(customer),
                    customerSearchTerm: ''
                  });
                  
                  // Load thông tin đầy đủ của khách hàng từ database
                  if (customer.localId) {
                    try {
                      await db.open();
                      const fullCustomer = await db.customers.get(customer.localId);
                      if (fullCustomer) {
                        // Cập nhật số nợ và điểm tích lũy
                        // debt có thể chưa có trong schema, nên dùng || 0 để tránh lỗi
                        updateCurrentInvoice({
                          customerDebt: fullCustomer.debt || 0,
                          customerPoints: fullCustomer.points || 0
                        });
                      }
                    } catch (error) {
                      console.error('Lỗi load thông tin khách hàng:', error);
                      updateCurrentInvoice({ customerDebt: 0, customerPoints: 0 });
                    }
                  } else {
                    updateCurrentInvoice({ customerDebt: 0, customerPoints: 0 });
                  }
                }}
                onCustomerClear={() => {
                  updateCurrentInvoice({
                    customerPhone: '',
                    customerLocalId: '',
                    customerName: '',
                    customerSearchTerm: '',
                    customerDebt: 0,
                    customerPoints: 0
                  });
                }}
                onCustomerEdit={() => openEditCustomer(customerLocalId)}
                onAddCustomer={() => setAddCustomerDialogOpen(true)}
                items={cartItems}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={(method) => updateCurrentInvoice({ paymentMethod: method })}
                amountPaid={amountPaid}
                onAmountPaidChange={(amount) => updateCurrentInvoice({ amountPaid: amount })}
                discount={discount}
                discountType={discountType}
                onDiscountChange={(discountValue, discountTypeValue) => {
                  updateCurrentInvoice({ discount: discountValue, discountType: discountTypeValue });
                }}
                onCheckout={handleCheckout}
              />
            )}
        </Box>
      </Box>

      {/* Bottom Footer */}
      <BottomFooter 
        saleMode={saleMode}
        onSaleModeChange={setSaleMode}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Dialog thêm khách hàng */}
      <Dialog 
        open={addCustomerDialogOpen} 
        onClose={() => {
          setAddCustomerDialogOpen(false);
          // Reset form khi đóng
          setNewCustomer({
            customerCode: '',
            name: '',
            phone: '',
            address: '',
            area: '',
            ward: '',
            group: '',
            dateOfBirth: '',
            gender: 'male',
            email: '',
            facebook: '',
            note: '',
            avatar: null
          });
          setCustomerErrors({ customerCode: '', phone: '' });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Thêm khách hàng mới</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Hàng đầu: Avatar và cột trái */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              {/* Avatar và button chọn ảnh */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={newCustomer.avatar ? URL.createObjectURL(newCustomer.avatar) : ''}
                  sx={{ width: 80, height: 80 }}
                >
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraIcon />}
                  component="label"
                  sx={{ textTransform: 'none' }}
                >
                  Chọn ảnh
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNewCustomer({ ...newCustomer, avatar: file });
                      }
                    }}
                  />
                </Button>
              </Box>

              {/* Cột trái: Mã, Tên, Điện thoại, Địa chỉ, Khu vực, Phường xã */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Mã khách hàng"
                  placeholder="Mã mặc định"
                  value={newCustomer.customerCode}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setNewCustomer({ ...newCustomer, customerCode: value });
                    
                    // Validate mã khách hàng
                    if (value.trim()) {
                      const exists = await checkCustomerCodeExists(value);
                      if (exists) {
                        setCustomerErrors(prev => ({ ...prev, customerCode: 'Mã khách hàng đã tồn tại' }));
                      } else {
                        setCustomerErrors(prev => ({ ...prev, customerCode: '' }));
                      }
                    } else {
                      setCustomerErrors(prev => ({ ...prev, customerCode: '' }));
                    }
                  }}
                  error={!!customerErrors.customerCode}
                  helperText={customerErrors.customerCode}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={async () => {
                            const code = await generateCustomerCode();
                            setNewCustomer({ ...newCustomer, customerCode: code });
                            setCustomerErrors(prev => ({ ...prev, customerCode: '' }));
                          }}
                          title="Tự động tạo mã"
                        >
                          <Box sx={{ fontSize: '0.75rem', color: 'primary.main' }}>Auto</Box>
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  label="Tên khách hàng"
                  placeholder="Tên hoặc biệt danh"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  error={!newCustomer.name.trim() && !newCustomer.nickname.trim()}
                  helperText={!newCustomer.name.trim() && !newCustomer.nickname.trim() ? 'Nhập tên hoặc biệt danh' : ''}
                />
                <TextField
                  label="Biệt danh"
                  value={newCustomer.nickname}
                  onChange={(e) => setNewCustomer({ ...newCustomer, nickname: e.target.value })}
                />

                <TextField
                  label="Điện thoại"
                  value={newCustomer.phone}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setNewCustomer({ ...newCustomer, phone: value });
                    
                    // Validate số điện thoại
                    if (value.trim()) {
                      const exists = await checkPhoneExists(value);
                      if (exists) {
                        setCustomerErrors(prev => ({ ...prev, phone: 'Số điện thoại đã tồn tại' }));
                      } else {
                        setCustomerErrors(prev => ({ ...prev, phone: '' }));
                      }
                    } else {
                      setCustomerErrors(prev => ({ ...prev, phone: '' }));
                    }
                  }}
                  error={!!customerErrors.phone}
                  helperText={customerErrors.phone}
                />

                <TextField
                  label="Địa chỉ"
                  placeholder="Số nhà, tòa nhà, ngõ, đường"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />

                <TextField
                  label="Khu vực"
                  placeholder="Chọn Tỉnh/TP - Quận/Huyện"
                  value={newCustomer.area}
                  onChange={(e) => setNewCustomer({ ...newCustomer, area: e.target.value })}
                />

                <TextField
                  label="Phường xã"
                  placeholder="Chọn Phường/Xã"
                  value={newCustomer.ward}
                  onChange={(e) => setNewCustomer({ ...newCustomer, ward: e.target.value })}
                />
              </Box>

              {/* Cột phải: Nhóm, Ngày sinh, Giới tính, Email, Facebook, Ghi chú */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nhóm"
                  value={newCustomer.group}
                  onChange={(e) => setNewCustomer({ ...newCustomer, group: e.target.value })}
                />

                <Box>
                  <TextField
                    label="Ngày sinh"
                    type="date"
                    value={newCustomer.dateOfBirth}
                    onChange={(e) => setNewCustomer({ ...newCustomer, dateOfBirth: e.target.value })}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    fullWidth
                  />
                  <FormControl component="fieldset" sx={{ mt: 1 }}>
                    <FormLabel component="legend">Giới tính</FormLabel>
                    <RadioGroup
                      row
                      value={newCustomer.gender}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                    >
                      <FormControlLabel value="male" control={<Radio />} label="Nam" />
                      <FormControlLabel value="female" control={<Radio />} label="Nữ" />
                    </RadioGroup>
                  </FormControl>
                </Box>

                <TextField
                  label="Email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />

                <TextField
                  label="Facebook"
                  value={newCustomer.facebook}
                  onChange={(e) => setNewCustomer({ ...newCustomer, facebook: e.target.value })}
                />

                <TextField
                  label="Ghi chú"
                  multiline
                  rows={3}
                  value={newCustomer.note}
                  onChange={(e) => setNewCustomer({ ...newCustomer, note: e.target.value })}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddCustomerDialogOpen(false);
            setNewCustomer({
              customerCode: '',
              name: '',
              nickname: '',
              phone: '',
              address: '',
              area: '',
              ward: '',
              group: '',
              dateOfBirth: '',
              gender: 'male',
              email: '',
              facebook: '',
              note: '',
              avatar: null
            });
            setCustomerErrors({ customerCode: '', phone: '' });
          }}>
            Bỏ qua
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              // Validation
              if (!newCustomer.name.trim() && !newCustomer.nickname.trim()) {
                showSnackbar('Vui lòng nhập tên hoặc biệt danh', 'error');
                return;
              }

              if (customerErrors.customerCode || customerErrors.phone) {
                showSnackbar('Vui lòng sửa các lỗi trước khi lưu', 'error');
                return;
              }

              setAddCustomerLoading(true);
              try {
                // Tạo mã khách hàng nếu chưa có
                let customerCode = newCustomer.customerCode.trim();
                if (!customerCode) {
                  customerCode = await generateCustomerCode();
                }

                // Kiểm tra lại mã khách hàng và số điện thoại
                if (customerCode) {
                  const codeExists = await checkCustomerCodeExists(customerCode);
                  if (codeExists) {
                    showSnackbar('Mã khách hàng đã tồn tại', 'error');
                    setAddCustomerLoading(false);
                    return;
                  }
                }

                if (newCustomer.phone.trim()) {
                  const phoneExists = await checkPhoneExists(newCustomer.phone.trim());
                  if (phoneExists) {
                    showSnackbar('Số điện thoại đã tồn tại', 'error');
                    setAddCustomerLoading(false);
                    return;
                  }
                }

                // Tạo khách hàng mới
                const localId = generateLocalId();
                const now = Date.now();

                await db.customers.add({
                  localId,
                  customerCode: customerCode || null,
                  name: newCustomer.name.trim(),
                  nickname: newCustomer.nickname.trim(),
                  phone: newCustomer.phone.trim() || null,
                  address: newCustomer.address.trim() || null,
                  area: newCustomer.area.trim() || null,
                  ward: newCustomer.ward.trim() || null,
                  group: newCustomer.group.trim() || null,
                  dateOfBirth: newCustomer.dateOfBirth || null,
                  gender: newCustomer.gender,
                  email: newCustomer.email.trim() || null,
                  facebook: newCustomer.facebook.trim() || null,
                  note: newCustomer.note.trim() || null,
                  points: 0,
                  debt: 0,  // Khách hàng mới không có nợ
                  createdAt: now,
                  synced: false
                });

                // Đóng dialog và reset form
                setAddCustomerDialogOpen(false);
                setNewCustomer({
                  customerCode: '',
                  name: '',
                  nickname: '',
                  phone: '',
                  address: '',
                  area: '',
                  ward: '',
                  group: '',
                  dateOfBirth: '',
                  gender: 'male',
                  email: '',
                  facebook: '',
                  note: '',
                  avatar: null
                });
                setCustomerErrors({ customerCode: '', phone: '' });

                showSnackbar('Thêm khách hàng thành công!', 'success');

                // Tự động chọn khách hàng vừa thêm
                updateCurrentInvoice({ 
                  customerPhone: newCustomer.phone.trim(), 
                  customerLocalId: localId,
                  customerName: formatCustomerLabel(newCustomer),
                  customerSearchTerm: '',
                  customerDebt: 0,
                  customerPoints: 0
                });
              } catch (error) {
                console.error('Lỗi thêm khách hàng:', error);
                showSnackbar('Có lỗi xảy ra khi thêm khách hàng!', 'error');
              } finally {
                setAddCustomerLoading(false);
              }
            }}
            disabled={addCustomerLoading || (!newCustomer.name.trim() && !newCustomer.nickname.trim())}
          >
            {addCustomerLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editCustomerDialogOpen} onClose={() => setEditCustomerDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Chỉnh sửa khách hàng</DialogTitle>
        <DialogContent>
          {editCustomer && (
            <>
              <Tabs
                value={editCustomerTab}
                onChange={(_, value) => setEditCustomerTab(Number(value))}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab label="Thông tin" value={0} />
                <Tab label="Lịch sử bán/trả hàng" value={1} />
              </Tabs>

              {editCustomerTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={editCustomer.avatar ? URL.createObjectURL(editCustomer.avatar) : ''}
                        sx={{ width: 80, height: 80 }}
                      >
                        <PersonIcon sx={{ fontSize: 40 }} />
                      </Avatar>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PhotoCameraIcon />}
                        component="label"
                        sx={{ textTransform: 'none' }}
                      >
                        Chọn ảnh
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setEditCustomer({ ...editCustomer, avatar: file });
                            }
                          }}
                        />
                      </Button>
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Mã khách hàng"
                        placeholder="Mã mặc định"
                        value={editCustomer.customerCode}
                        onChange={async (e) => {
                          const value = e.target.value;
                          setEditCustomer({ ...editCustomer, customerCode: value });
                          if (value.trim()) {
                            const exists = await checkCustomerCodeExists(value, editCustomer.localId);
                            if (exists) {
                              setEditCustomerErrors(prev => ({ ...prev, customerCode: 'Mã khách hàng đã tồn tại' }));
                            } else {
                              setEditCustomerErrors(prev => ({ ...prev, customerCode: '' }));
                            }
                          } else {
                            setEditCustomerErrors(prev => ({ ...prev, customerCode: '' }));
                          }
                        }}
                        error={!!editCustomerErrors.customerCode}
                        helperText={editCustomerErrors.customerCode}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={async () => {
                                  const code = await generateCustomerCode();
                                  setEditCustomer({ ...editCustomer, customerCode: code });
                                  setEditCustomerErrors(prev => ({ ...prev, customerCode: '' }));
                                }}
                                title="Tự động tạo mã"
                              >
                                <Box sx={{ fontSize: '0.75rem', color: 'primary.main' }}>Auto</Box>
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />

                      <TextField
                        label="Tên khách hàng"
                        placeholder="Tên hoặc biệt danh"
                        value={editCustomer.name}
                        onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                        error={!editCustomer.name.trim() && !String(editCustomer.nickname || '').trim()}
                        helperText={!editCustomer.name.trim() && !String(editCustomer.nickname || '').trim() ? 'Nhập tên hoặc biệt danh' : ''}
                      />
                      <TextField
                        label="Biệt danh"
                        value={editCustomer.nickname || ''}
                        onChange={(e) => setEditCustomer({ ...editCustomer, nickname: e.target.value })}
                      />

                      <TextField
                        label="Điện thoại"
                        value={editCustomer.phone}
                        onChange={async (e) => {
                          const value = e.target.value;
                          setEditCustomer({ ...editCustomer, phone: value });
                          if (value.trim()) {
                            const exists = await checkPhoneExists(value, editCustomer.localId);
                            if (exists) {
                              setEditCustomerErrors(prev => ({ ...prev, phone: 'Số điện thoại đã tồn tại' }));
                            } else {
                              setEditCustomerErrors(prev => ({ ...prev, phone: '' }));
                            }
                          } else {
                            setEditCustomerErrors(prev => ({ ...prev, phone: '' }));
                          }
                        }}
                        error={!!editCustomerErrors.phone}
                        helperText={editCustomerErrors.phone}
                      />

                      <TextField
                        label="Địa chỉ"
                        placeholder="Số nhà, tòa nhà, ngõ, đường"
                        value={editCustomer.address}
                        onChange={(e) => setEditCustomer({ ...editCustomer, address: e.target.value })}
                      />

                      <TextField
                        label="Khu vực"
                        placeholder="Chọn Tỉnh/TP - Quận/Huyện"
                        value={editCustomer.area}
                        onChange={(e) => setEditCustomer({ ...editCustomer, area: e.target.value })}
                      />

                      <TextField
                        label="Phường xã"
                        placeholder="Chọn Phường/Xã"
                        value={editCustomer.ward}
                        onChange={(e) => setEditCustomer({ ...editCustomer, ward: e.target.value })}
                      />
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Nhóm"
                        value={editCustomer.group}
                        onChange={(e) => setEditCustomer({ ...editCustomer, group: e.target.value })}
                      />

                      <Box>
                        <TextField
                          label="Ngày sinh"
                          type="date"
                          value={editCustomer.dateOfBirth}
                          onChange={(e) => setEditCustomer({ ...editCustomer, dateOfBirth: e.target.value })}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                        />
                        <FormControl component="fieldset" sx={{ mt: 1 }}>
                          <FormLabel component="legend">Giới tính</FormLabel>
                          <RadioGroup
                            row
                            value={editCustomer.gender}
                            onChange={(e) => setEditCustomer({ ...editCustomer, gender: e.target.value })}
                          >
                            <FormControlLabel value="male" control={<Radio />} label="Nam" />
                            <FormControlLabel value="female" control={<Radio />} label="Nữ" />
                          </RadioGroup>
                        </FormControl>
                      </Box>

                      <TextField
                        label="Email"
                        type="email"
                        value={editCustomer.email}
                        onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                      />

                      <TextField
                        label="Facebook"
                        value={editCustomer.facebook}
                        onChange={(e) => setEditCustomer({ ...editCustomer, facebook: e.target.value })}
                      />

                      <TextField
                        label="Ghi chú"
                        multiline
                        rows={3}
                        value={editCustomer.note}
                        onChange={(e) => setEditCustomer({ ...editCustomer, note: e.target.value })}
                      />
                    </Box>
                  </Box>
                </Box>
              )}

              {editCustomerTab === 1 && (
                <Box sx={{ pt: 1 }}>
                  {(() => {
                    const safeOrderHistory = Array.isArray(orderHistory)
                      ? orderHistory.filter(Boolean)
                      : [];
                    const totalSales = safeOrderHistory.reduce(
                      (sum, order) => sum + (Number(order?.totalAmount) || 0),
                      0
                    );

                    return (
                      <>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="text.secondary">
                            Số lần mua: {safeOrderHistory.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Tổng bán trừ trả hàng: {totalSales.toLocaleString('vi-VN')}
                          </Typography>
                        </Box>

                  {orderHistoryLoading ? (
                    <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : safeOrderHistory.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có lịch sử bán/trả hàng
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Mã hóa đơn</TableCell>
                          <TableCell>Thời gian</TableCell>
                          <TableCell>Người bán</TableCell>
                          <TableCell align="right">Tổng cộng</TableCell>
                          <TableCell>Trạng thái</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {safeOrderHistory.map((order) => {
                          const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
                          const createdAtLabel =
                            createdAt && !Number.isNaN(createdAt.getTime())
                              ? createdAt.toLocaleString('vi-VN', { hour12: false })
                              : '';

                          return (
                            <TableRow key={order?.localId || order?.orderCode}>
                              <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
                                {order?.orderCode || order?.localId || ''}
                              </TableCell>
                              <TableCell>{createdAtLabel}</TableCell>
                              <TableCell>{cashierName}</TableCell>
                              <TableCell align="right">
                                {(Number(order?.totalAmount) || 0).toLocaleString('vi-VN')}
                              </TableCell>
                              <TableCell>{order?.status === 'completed' ? 'Hoàn thành' : (order?.status || '')}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                      </>
                    );
                  })()}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCustomerDialogOpen(false)}>
            Bỏ qua
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!editCustomer) return;
              if (!editCustomer.name.trim() && !String(editCustomer.nickname || '').trim()) {
                showSnackbar('Vui lòng nhập tên hoặc biệt danh', 'error');
                return;
              }
              if (editCustomerErrors.customerCode || editCustomerErrors.phone) {
                showSnackbar('Vui lòng sửa các lỗi trước khi lưu', 'error');
                return;
              }
              setEditCustomerLoading(true);
              try {
                const customerCode = editCustomer.customerCode.trim() || null;
                if (customerCode) {
                  const codeExists = await checkCustomerCodeExists(customerCode, editCustomer.localId);
                  if (codeExists) {
                    showSnackbar('Mã khách hàng đã tồn tại', 'error');
                    setEditCustomerLoading(false);
                    return;
                  }
                }
                if (editCustomer.phone.trim()) {
                  const phoneExists = await checkPhoneExists(editCustomer.phone.trim(), editCustomer.localId);
                  if (phoneExists) {
                    showSnackbar('Số điện thoại đã tồn tại', 'error');
                    setEditCustomerLoading(false);
                    return;
                  }
                }

                const now = Date.now();
                await db.customers.update(editCustomer.localId, {
                  customerCode,
                  name: editCustomer.name.trim(),
                  nickname: String(editCustomer.nickname || '').trim(),
                  phone: editCustomer.phone.trim() || null,
                  address: editCustomer.address.trim() || null,
                  area: editCustomer.area.trim() || null,
                  ward: editCustomer.ward.trim() || null,
                  group: editCustomer.group.trim() || null,
                  dateOfBirth: editCustomer.dateOfBirth || null,
                  gender: editCustomer.gender,
                  email: editCustomer.email.trim() || null,
                  facebook: editCustomer.facebook.trim() || null,
                  note: editCustomer.note.trim() || null,
                  updatedAt: now,
                  synced: false
                });

                if (customerLocalId === editCustomer.localId) {
                  updateCurrentInvoice({ 
                    customerPhone: editCustomer.phone.trim() || '',
                    customerName: formatCustomerLabel(editCustomer),
                    customerSearchTerm: ''
                  });
                }

                setEditCustomerDialogOpen(false);
                showSnackbar('Cập nhật khách hàng thành công!', 'success');
              } catch (error) {
                console.error('Lỗi cập nhật khách hàng:', error);
                showSnackbar('Có lỗi xảy ra khi cập nhật khách hàng!', 'error');
              } finally {
                setEditCustomerLoading(false);
              }
            }}
            disabled={
              editCustomerLoading ||
              !editCustomer ||
              (!editCustomer.name.trim() && !String(editCustomer.nickname || '').trim())
            }
          >
            {editCustomerLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={storeDialogOpen}
        onClose={() => setStoreDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Tạo cửa hàng</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Tên cửa hàng"
              value={newStore.name}
              onChange={(e) => setNewStore((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Số điện thoại"
              value={newStore.phone}
              onChange={(e) => setNewStore((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Địa chỉ"
              value={newStore.address}
              onChange={(e) => setNewStore((prev) => ({ ...prev, address: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Mã cửa hàng (tuỳ chọn)"
              value={newStore.storeId}
              onChange={(e) => setNewStore((prev) => ({ ...prev, storeId: e.target.value }))}
              helperText="Ví dụ: trungtam, q1, q2..."
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStoreDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateStore}>
            Tạo cửa hàng
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={printSettingsOpen}
        onClose={() => setPrintSettingsOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Thiết lập in hóa đơn</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoPrintEnabled}
                  onChange={(e) => setAutoPrintEnabled(e.target.checked)}
                />
              }
              label="Tự động in hóa đơn"
            />
            <TextField
              label="Số bản in (Liên)"
              type="number"
              size="small"
              value={printCopies}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const value = Math.max(1, Number(e.target.value) || 1);
                setPrintCopies(value);
              }}
              inputProps={{ min: 1 }}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Chọn mẫu in
              </Typography>
              <Button variant="contained" sx={{ textTransform: 'none' }} disabled>
                {printTemplate === 'invoice' ? 'A. Mẫu in hóa đơn' : 'Mẫu in'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintSettingsOpen(false)}>Bỏ qua</Button>
          <Button variant="contained" onClick={() => setPrintSettingsOpen(false)}>
            Xong
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Danh mục chức năng
          </Typography>
          <List>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                setReportDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <BarChartIcon />
              </ListItemIcon>
              <ListItemText primary="Xem báo cáo bán hàng" />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                setReturnDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <UndoIcon />
              </ListItemIcon>
              <ListItemText primary="Chọn hóa đơn trả hàng" />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                showSnackbar('Chức năng import file sẽ được cập nhật sau', 'info');
              }}
            >
              <ListItemIcon>
                <FileUploadIcon />
              </ListItemIcon>
              <ListItemText primary="Import file" />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                showSnackbar('Tùy chọn hiển thị sẽ được cập nhật sau', 'info');
              }}
            >
              <ListItemIcon>
                <TuneIcon />
              </ListItemIcon>
              <ListItemText primary="Tùy chọn hiển thị" />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                syncAllData();
              }}
              disabled={syncing}
            >
              <ListItemIcon>
                {syncing ? <CircularProgress size={20} /> : <SyncIcon />}
              </ListItemIcon>
              <ListItemText
                primary={syncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
                secondary={
                  syncStatus === 'error'
                    ? 'Đồng bộ lỗi, sẽ thử lại'
                    : lastSyncAt
                      ? `Lần cuối: ${new Date(lastSyncAt).toLocaleString('vi-VN', { hour12: false })}`
                      : 'Chưa đồng bộ'
                }
              />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                showSnackbar('Bảng phím tắt sẽ được cập nhật sau', 'info');
              }}
            >
              <ListItemIcon>
                <KeyboardIcon />
              </ListItemIcon>
              <ListItemText primary="Phím tắt" />
            </ListItemButton>
            <Divider sx={{ my: 1 }} />
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                apiRequest('/api/auth/switch', {
                  method: 'POST',
                  body: JSON.stringify({ targetApp: 'pos-admin' }),
                })
                  .catch(() => null)
                  .finally(() => {
                    window.open(POS_ADMIN_URL, '_blank', 'noopener');
                  });
              }}
            >
              <ListItemIcon>
                <AppsIcon />
              </ListItemIcon>
              <ListItemText primary="Quản lý" />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                setLogoutDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <ExitToAppIcon />
              </ListItemIcon>
              <ListItemText primary="Đăng xuất" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
      >
        <DialogTitle>Đăng xuất</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn đăng xuất không?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Báo cáo bán hàng</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              label="Xem theo"
              size="small"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="day">Theo ngày</MenuItem>
              <MenuItem value="month">Theo tháng</MenuItem>
              <MenuItem value="quarter">Theo quý</MenuItem>
              <MenuItem value="year">Theo năm dương lịch</MenuItem>
              <MenuItem value="lunarYear">Theo năm âm lịch</MenuItem>
            </TextField>

            {reportType === 'day' && (
              <TextField
                label="Ngày"
                type="date"
                size="small"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            )}
            {reportType === 'month' && (
              <TextField
                label="Tháng"
                type="month"
                size="small"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            )}
            {reportType === 'quarter' && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  select
                  label="Quý"
                  size="small"
                  value={reportQuarter}
                  onChange={(e) => setReportQuarter(Number(e.target.value))}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value={1}>Quý 1</MenuItem>
                  <MenuItem value={2}>Quý 2</MenuItem>
                  <MenuItem value={3}>Quý 3</MenuItem>
                  <MenuItem value={4}>Quý 4</MenuItem>
                </TextField>
                <TextField
                  label="Năm"
                  type="number"
                  size="small"
                  value={reportYear}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setReportYear(Number(e.target.value) || new Date().getFullYear())}
                  inputProps={{ min: 2000, max: 2100 }}
                />
              </Box>
            )}
            {reportType === 'year' && (
              <TextField
                label="Năm"
                type="number"
                size="small"
                value={reportYear}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setReportYear(Number(e.target.value) || new Date().getFullYear())}
                inputProps={{ min: 2000, max: 2100 }}
              />
            )}
            {reportType === 'lunarYear' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TextField
                  label="Năm âm lịch"
                  type="number"
                  size="small"
                  value={reportLunarYear}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setReportLunarYear(Number(e.target.value) || new Date().getFullYear())}
                  inputProps={{ min: 2000, max: 2100 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Năm âm lịch hiện tạm tính theo năm dương lịch để hiển thị báo cáo.
                </Typography>
              </Box>
            )}

            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              {reportLoading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      label={`Đơn hàng: ${reportData.orderCount}`}
                      variant="outlined"
                    />
                    <Chip
                      label={`Giá vốn: ${reportData.totalCost.toLocaleString('vi-VN')}`}
                      color="default"
                    />
                   
                    <Chip
                      label={`Lợi nhuận: ${reportData.totalProfit.toLocaleString('vi-VN')}`}
                      color={reportData.totalProfit >= 0 ? 'success' : 'error'}
                    />
                     <Chip
                      label={`Doanh thu: ${reportData.totalSales.toLocaleString('vi-VN')}`}
                      color="primary"
                    />
                  </Box>

                  {(() => {
                    const buckets = reportData.buckets || [];
                    const maxValue = Math.max(
                      ...buckets.map((bucket) => Math.max(bucket.totalSales, 0)),
                      1
                    );
                    const barHeight = (value) => (Math.max(value, 0) / maxValue) * 180;
                    return (
                      <Box sx={{ overflowX: 'auto', pb: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            minWidth: buckets.length * 28,
                          }}
                        >
                          {buckets.map((bucket) => (
                            <Box key={bucket.label} sx={{ minWidth: 28 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 220 }}>
                              <Tooltip
                                title={`${bucket.label} · Giá vốn: ${bucket.totalCost.toLocaleString('vi-VN')} · Lợi nhuận: ${bucket.totalProfit.toLocaleString('vi-VN')} · Doanh thu: ${bucket.totalSales.toLocaleString('vi-VN')}`}
                                arrow
                              >
                                <Box
                                  sx={{
                                    width: 18,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    position: 'relative',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      height: barHeight(bucket.totalProfit),
                                      bgcolor: bucket.totalProfit >= 0 ? 'success.main' : 'error.main',
                                      borderTopLeftRadius: 4,
                                      borderTopRightRadius: 4,
                                    }}
                                  />
                                  <Box
                                    sx={{
                                      height: barHeight(bucket.totalCost),
                                      bgcolor: 'grey.400',
                                      borderBottomLeftRadius: 4,
                                      borderBottomRightRadius: 4,
                                    }}
                                  />
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      left: 0,
                                      right: 0,
                                      height: 2,
                                      bottom: Math.max(barHeight(bucket.totalSales) - 1, 0),
                                      bgcolor: 'primary.main',
                                    }}
                                  />
                                </Box>
                              </Tooltip>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                              {bucket.label}
                            </Typography>
                          </Box>
                          ))}
                        </Box>
                      </Box>
                    );
                  })()}
                </>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog chọn hóa đơn trả hàng */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Chọn hóa đơn trả hàng
          <IconButton size="small" onClick={() => setReturnDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={returnDialogTab}
            onChange={(_, value) => setReturnDialogTab(Number(value))}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Hóa đơn mua" value={0} />
            <Tab label="Hóa đơn đổi trả" value={1} />
          </Tabs>
          <Box sx={{ display: 'flex', gap: 2, minHeight: 420 }}>
            <Box sx={{ width: 260, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Tìm kiếm
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  placeholder={
                    returnSearchOptions.find((option) => option.value === returnSearchField)?.label ||
                    'Tìm kiếm'
                  }
                  value={returnSearchTerm}
                  onChange={(e) => setReturnSearchTerm(e.target.value)}
                />
                <Box sx={{ mt: 1 }}>
                  {returnSearchOptions.map((option) => (
                    <Button
                      key={option.value}
                      fullWidth
                      onClick={() => setReturnSearchField(option.value)}
                      sx={{
                        justifyContent: 'flex-start',
                        color: returnSearchField === option.value ? 'primary.main' : 'text.secondary',
                        fontWeight: returnSearchField === option.value ? 600 : 400,
                        textTransform: 'none',
                        px: 0,
                        py: 0.75,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 0,
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Thời gian
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    type="date"
                    size="small"
                    value={returnFromDate}
                    onChange={(e) => setReturnFromDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    value={returnToDate}
                    onChange={(e) => setReturnToDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Paper>
            </Box>

            <Paper sx={{ flex: 1, p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {returnDialogTab === 0 ? (
                        <>
                          <TableCell>Mã hóa đơn</TableCell>
                          <TableCell>Thời gian</TableCell>
                          <TableCell>Nhân viên</TableCell>
                          <TableCell>Khách hàng</TableCell>
                          <TableCell align="right">Tổng cộng</TableCell>
                          <TableCell align="right"> </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>Mã trả hàng</TableCell>
                          <TableCell>Hóa đơn gốc</TableCell>
                          <TableCell>Hóa đơn mua</TableCell>
                          <TableCell>Thời gian</TableCell>
                          <TableCell>Khách hàng</TableCell>
                          <TableCell align="right">Tổng cộng</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {returnDialogTab === 0 ? (
                      returnOrdersLoading ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                              <CircularProgress size={24} />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : filteredReturnOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography variant="body2" color="text.secondary">
                              Không tìm thấy hóa đơn phù hợp
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        returnPageOrders.map((order) => {
                          const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
                          const createdAtLabel =
                            createdAt && !Number.isNaN(createdAt.getTime())
                              ? createdAt.toLocaleString('vi-VN', { hour12: false })
                              : '';
                          return (
                            <TableRow key={order.localId || order.orderCode}>
                              <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
                                {order.orderCode || order.localId}
                              </TableCell>
                              <TableCell>{createdAtLabel}</TableCell>
                              <TableCell>{cashierName}</TableCell>
                              <TableCell>{order.customerLabel}</TableCell>
                              <TableCell align="right">
                                {(Number(order.totalAmount) || 0).toLocaleString('vi-VN')}
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleSelectReturnOrder(order)}
                                >
                                  Chọn
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )
                    ) : (
                      returnRecordsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                              <CircularProgress size={24} />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : filteredReturnRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography variant="body2" color="text.secondary">
                              Không tìm thấy hóa đơn đổi trả
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        returnRecordsPageItems.map((record) => {
                          const createdAt = record?.createdAt ? new Date(record.createdAt) : null;
                          const createdAtLabel =
                            createdAt && !Number.isNaN(createdAt.getTime())
                              ? createdAt.toLocaleString('vi-VN', { hour12: false })
                              : '';
                          return (
                            <TableRow
                              key={record.localId || record.returnCode}
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => handleOpenReturnDetail(record)}
                            >
                              <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
                                {record.returnCode || record.localId}
                              </TableCell>
                              <TableCell>{record.orderCode || ''}</TableCell>
                              <TableCell>{record.exchangeOrderCode || ''}</TableCell>
                              <TableCell>{createdAtLabel}</TableCell>
                              <TableCell>{record.customerLabel}</TableCell>
                              <TableCell align="right">
                                {(Number(record.totalExchangeAmount) || 0).toLocaleString('vi-VN')}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )
                    )}
                  </TableBody>
                </Table>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2
                }}
              >
                {returnDialogTab === 0 ? (
                  <>
                    <Pagination
                      count={returnTotalPages}
                      page={returnPageSafe}
                      onChange={(_, page) => setReturnPage(page)}
                      size="small"
                      color="primary"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {filteredReturnOrders.length === 0
                        ? 'Hiển thị 0 - 0 trên tổng số 0 hóa đơn'
                        : `Hiển thị ${returnPageStart + 1} - ${returnPageEnd} trên tổng số ${filteredReturnOrders.length} hóa đơn`}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Pagination
                      count={returnRecordsTotalPages}
                      page={returnRecordsPageSafe}
                      onChange={(_, page) => setReturnRecordsPage(page)}
                      size="small"
                      color="primary"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {filteredReturnRecords.length === 0
                        ? 'Hiển thị 0 - 0 trên tổng số 0 hóa đơn'
                        : `Hiển thị ${returnRecordsPageStart + 1} - ${returnRecordsPageEnd} trên tổng số ${filteredReturnRecords.length} hóa đơn`}
                    </Typography>
                  </>
                )}
              </Box>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>Đóng</Button>
          <Button variant="contained">Trả nhanh</Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={qrPreviewOpen} onClose={() => setQrPreviewOpen(false)} maxWidth="xs">
        <DialogTitle>Mã QR chuyển khoản</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            {selectedBankAccount && (
              <img
                src={getBankQrUrl(
                  selectedBankAccount,
                  returnNeedToPay,
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

      <Dialog open={returnDetailOpen} onClose={() => setReturnDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Chi tiết hóa đơn đổi trả
          <IconButton size="small" onClick={() => setReturnDetailOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {returnDetailLoading ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : returnDetail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  Mã trả hàng: <strong>{returnDetail.returnCode || ''}</strong>
                </Typography>
                <Typography variant="body2">
                  Hóa đơn gốc: <strong>{returnDetail.orderCode || ''}</strong>
                </Typography>
                <Typography variant="body2">
                  Hóa đơn mua: <strong>{returnDetail.exchangeOrderCode || ''}</strong>
                </Typography>
              </Box>

              {(() => {
                const createdAt = returnDetail.createdAt ? new Date(returnDetail.createdAt) : null;
                const createdAtLabel =
                  createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleString('vi-VN', { hour12: false })
                    : '';
                const totalReturnAmount = Number(returnDetail.totalReturnAmount) || 0;
                const totalExchangeAmount = Number(returnDetail.totalExchangeAmount) || 0;
                const amountDifference = Number(returnDetail.amountDifference) || 0;
                const diffLabel =
                  amountDifference > 0
                    ? 'Khách cần trả'
                    : amountDifference < 0
                      ? 'Cần trả khách'
                      : 'Không chênh lệch';
                const diffValue = Math.abs(amountDifference);
                const customerName = returnDetail.customerName || returnDetail.customerLabel || '';
                const customerPhone = returnDetail.customerPhone || '';
                const paymentMethodLabel =
                  returnDetail.paymentMethod === 'cash'
                    ? 'Tiền mặt'
                    : returnDetail.paymentMethod === 'bank'
                      ? 'Chuyển khoản'
                      : returnDetail.paymentMethod || '';

                return (
                  <Box
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Khách hàng
                      </Typography>
                      <Typography variant="body2">
                        {customerName || 'Khách lẻ'}
                        {customerPhone ? ` (${customerPhone})` : ''}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Thời gian
                      </Typography>
                      <Typography variant="body2">{createdAtLabel || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Hình thức thanh toán
                      </Typography>
                      <Typography variant="body2">{paymentMethodLabel || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Tổng tiền trả hàng
                      </Typography>
                      <Typography variant="body2">
                        {totalReturnAmount.toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Tổng tiền mua hàng
                      </Typography>
                      <Typography variant="body2">
                        {totalExchangeAmount.toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {diffLabel}
                      </Typography>
                      <Typography variant="body2">
                        {diffValue.toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Khách thanh toán
                      </Typography>
                      <Typography variant="body2">
                        {(Number(returnDetail.amountPaid) || 0).toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sản phẩm đã trả
                </Typography>
                {returnDetail.returnItems?.length ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell align="right">Số lượng</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {returnDetail.returnItems.map((item, index) => (
                        <TableRow key={`${item.productLocalId}-${index}`}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="right">{item.qty}</TableCell>
                          <TableCell align="right">
                            {(Number(item.price) || 0).toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell align="right">
                            {(Number(item.subtotal) || 0).toLocaleString('vi-VN')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Không có sản phẩm trả
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sản phẩm đã mua
                </Typography>
                {returnDetail.exchangeItems?.length ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell align="right">Số lượng</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {returnDetail.exchangeItems.map((item, index) => (
                        <TableRow key={`${item.productLocalId}-${index}`}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="right">{item.qty}</TableCell>
                          <TableCell align="right">
                            {(Number(item.price) || 0).toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell align="right">
                            {(Number(item.subtotal) || 0).toLocaleString('vi-VN')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Không có sản phẩm mua mới
                  </Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Không có dữ liệu chi tiết
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
