import React, { useCallback, useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, MenuItem, Paper, TextField, Tooltip, Typography } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import UndoIcon from '@mui/icons-material/Undo';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PaymentsIcon from '@mui/icons-material/Payments';
import SavingsIcon from '@mui/icons-material/Savings';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/apiClient';

export default function Dashboard() {
  const [reportType, setReportType] = useState('day');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportQuarter, setReportQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportLunarYear, setReportLunarYear] = useState(() => new Date().getFullYear());
  const [reportLoading, setReportLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [reportStoreFilter, setReportStoreFilter] = useState('');
  const [reportCashierId, setReportCashierId] = useState('');
  const [reportData, setReportData] = useState({
    totalCost: 0,
    totalSales: 0,
    totalReturns: 0,
    netSales: 0,
    totalProfit: 0,
    orderCount: 0,
    returnCount: 0,
    buckets: [],
  });
  const [activityLoading, setActivityLoading] = useState(false);
  const [activities, setActivities] = useState([]);

  const periodLabel = useCallback(() => {
    if (reportType === 'day') return reportDate;
    if (reportType === 'month') return reportMonth;
    if (reportType === 'quarter') return `Q${reportQuarter}-${reportYear}`;
    if (reportType === 'year') return `${reportYear}`;
    return `Âm ${reportLunarYear}`;
  }, [reportType, reportDate, reportMonth, reportQuarter, reportYear, reportLunarYear]);
  const summaryItems = [
    {
      label: 'Doanh thu',
      value: reportData.totalSales.toLocaleString('vi-VN'),
      note: `${reportData.orderCount} hóa đơn`,
      icon: <AttachMoneyIcon fontSize="small" />,
      color: '#1976d2',
    },
    {
      label: 'Trả hàng',
      value: reportData.totalReturns.toLocaleString('vi-VN'),
      note: '',
      icon: <UndoIcon fontSize="small" />,
      color: '#f57c00',
    },
    {
      label: 'Doanh thu thuần',
      value: reportData.netSales.toLocaleString('vi-VN'),
      note: '',
      icon: reportData.totalProfit >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />,
      color: reportData.totalProfit >= 0 ? '#2e7d32' : '#d32f2f',
    },
  ];

  const buildQuery = useCallback((params) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    return search.toString();
  }, []);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const storeId = reportStoreFilter;
      const query = buildQuery({
        type: reportType,
        date: reportDate,
        month: reportMonth,
        quarter: reportQuarter,
        year: reportYear,
        lunarYear: reportLunarYear,
        storeId,
        cashierId: reportCashierId,
      });
      const response = await apiRequest(`/api/reports/sales?${query}`);
      setReportData({
        totalCost: response.totalCost || 0,
        totalSales: response.totalSales || 0,
        totalReturns: response.totalReturns || 0,
        netSales: response.netSales || 0,
        totalProfit: response.totalProfit || 0,
        orderCount: response.orderCount || 0,
        returnCount: response.returnCount || 0,
        buckets: Array.isArray(response.buckets) ? response.buckets : [],
      });
    } catch {
      setReportData({
        totalCost: 0,
        totalSales: 0,
        totalReturns: 0,
        netSales: 0,
        totalProfit: 0,
        orderCount: 0,
        returnCount: 0,
        buckets: [],
      });
    } finally {
      setReportLoading(false);
    }
  }, [
    buildQuery,
    reportType,
    reportDate,
    reportMonth,
    reportQuarter,
    reportYear,
    reportLunarYear,
    reportStoreFilter,
    reportCashierId,
  ]);

  const loadActivities = useCallback(async () => {
    setActivityLoading(true);
    try {
      const query = buildQuery({
        storeId: reportStoreFilter,
        limit: 8,
      });
      const response = await apiRequest(`/api/reports/activity?${query}`);
      const items = Array.isArray(response?.items) ? response.items : [];
      setActivities(items);
    } catch {
      setActivities([]);
    } finally {
      setActivityLoading(false);
    }
  }, [buildQuery, reportStoreFilter]);

  const loadFilters = useCallback(async () => {
    try {
      const [storeResponse, userResponse] = await Promise.all([
        apiRequest('/api/stores/me'),
        apiRequest('/api/users'),
      ]);
      setStores(Array.isArray(storeResponse?.stores) ? storeResponse.stores : []);
      const users = Array.isArray(userResponse?.users) ? userResponse.users : [];
      setCashiers(users.filter((userItem) => userItem.role === 'cashier'));
    } catch {
      setStores([]);
      setCashiers([]);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadActivities();
    }, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [loadActivities]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  return (
    <Layout>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Kết quả bán hàng hôm nay
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              {summaryItems.map((item) => (
                <Box key={item.label} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {item.value}
                    </Typography>
                    {item.note && (
                      <Typography variant="caption" color="text.secondary">
                        {item.note}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Báo cáo bán hàng
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  select
                  label="Cửa hàng"
                  size="small"
                  value={reportStoreFilter}
                  onChange={(e) => setReportStoreFilter(e.target.value)}
                  sx={{ minWidth: 200 }}
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) return 'Tổng cửa hàng';
                      const headquarters = stores.find((store) => store.isHeadquarters) || stores[0];
                      if (headquarters && selected === headquarters.storeId) {
                        return `Chi nhánh trung tâm - ${headquarters.name || headquarters.storeId}`;
                      }
                      const match = stores.find((store) => store.storeId === selected);
                      return match?.name || match?.storeName || selected;
                    },
                  }}
                >
                  <MenuItem value="">Tổng cửa hàng</MenuItem>
                  {(() => {
                    const headquarters = stores.find((store) => store.isHeadquarters) || stores[0];
                    if (!headquarters) return null;
                    return (
                      <MenuItem value={headquarters.storeId}>
                        Chi nhánh trung tâm - {headquarters.name || headquarters.storeId}
                      </MenuItem>
                    );
                  })()}
                  {stores
                    .filter((store) => {
                      const headquarters = stores.find((item) => item.isHeadquarters) || stores[0];
                      return !headquarters || store.storeId !== headquarters.storeId;
                    })
                    .map((store) => (
                      <MenuItem key={store.storeId || store._id} value={store.storeId}>
                        {store.name || store.storeName || store.storeId}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  select
                  label="Nhân viên"
                  size="small"
                  value={reportCashierId}
                  onChange={(e) => setReportCashierId(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">Tất cả nhân viên</MenuItem>
                  {cashiers.map((cashier) => (
                    <MenuItem key={cashier.id || cashier._id} value={cashier.id || cashier._id}>
                      {cashier.name || cashier.email || cashier.phone}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
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
                      <Chip label={`Đơn hàng: ${reportData.orderCount}`} variant="outlined" />
                      <Chip label={`Trả hàng: ${reportData.returnCount}`} variant="outlined" />
                      <Chip label={`Giá vốn: ${reportData.totalCost.toLocaleString('vi-VN')}`} color="default" />
                      <Chip
                        label={`Lợi nhuận: ${reportData.totalProfit.toLocaleString('vi-VN')}`}
                        color={reportData.totalProfit >= 0 ? 'success' : 'error'}
                      />
                      <Chip label={`Doanh thu: ${reportData.totalSales.toLocaleString('vi-VN')}`} color="primary" />
                      <Chip label={`Trả hàng: ${reportData.totalReturns.toLocaleString('vi-VN')}`} color="warning" />
                      <Chip label={periodLabel()} variant="outlined" />
                    </Box>
                    {(() => {
                      const rawBuckets = reportData.buckets || [];
                      const buckets =
                        reportType === 'month'
                          ? rawBuckets.filter((bucket) => (Number(bucket.totalSales) || 0) > 0)
                          : rawBuckets;
                      if (buckets.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            Chưa có doanh thu trong khoảng thời gian đã chọn.
                          </Typography>
                        );
                      }
                      const maxValue = Math.max(
                        ...buckets.map((bucket) => Math.max(bucket.totalSales, 0)),
                        1
                      );
                      const barHeight = (value) => (Math.max(value, 0) / maxValue) * 180;
                      return (
                        <Box sx={{ overflowX: 'auto', pb: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1, minWidth: buckets.length * 28 }}>
                            {buckets.map((bucket) => (
                              <Box key={bucket.label} sx={{ minWidth: 28 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 220 }}>
                                  <Tooltip
                                    title={`${bucket.label} · Giá vốn: ${bucket.totalCost.toLocaleString('vi-VN')} · Lợi nhuận: ${bucket.totalProfit.toLocaleString('vi-VN')} · Doanh thu: ${bucket.totalSales.toLocaleString('vi-VN')} · Trả hàng: ${bucket.totalReturns.toLocaleString('vi-VN')}`}
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
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <PaymentsIcon color="success" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Thanh toán
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cài đặt QR miễn phí
                </Typography>
              </Box>
            </Box>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <SavingsIcon color="primary" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Vay vốn
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Đủ vốn hôm nay, vững vàng ngày mai
                </Typography>
              </Box>
            </Box>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Hoạt động gần đây
            </Typography>
            {activityLoading ? (
              <Typography variant="body2" color="text.secondary">
                Đang tải hoạt động...
              </Typography>
            ) : activities.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Chưa có hoạt động mới.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {activities.map((item) => {
                  const timeLabel = item.createdAt
                    ? new Date(item.createdAt).toLocaleString('vi-VN')
                    : '';
                  const amountLabel = (Number(item.amount) || 0).toLocaleString('vi-VN');
                  const actionLabel = item.type === 'return' ? 'vừa trả hàng' : 'vừa bán đơn hàng';
                  const linkPath = item.type === 'return' ? '/returns' : '/orders';
                  const linkCode = item.code || item.localId || '';
                  const link = `${linkPath}?code=${encodeURIComponent(linkCode)}`;
                  return (
                    <Box
                      key={`${item.type}-${item.localId}`}
                      component="a"
                      href={link}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <Box sx={{ mt: 0.5, width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2">
                          <Typography component="span" sx={{ fontWeight: 600 }}>
                            {item.actorName}
                          </Typography>{' '}
                          {actionLabel} với giá trị {amountLabel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {timeLabel}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Layout>
  );
}
