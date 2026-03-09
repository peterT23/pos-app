import db, { generateLocalId } from './posDB';

/**
 * Hàm tạo dữ liệu mẫu để test POS
 * Chạy một lần khi khởi động app (nếu database trống)
 */
export async function seedDatabase() {
  try {
    // Đảm bảo database đã được mở
    await db.open().catch(err => {
      // Database đã mở rồi, không cần làm gì
      if (err.name !== 'DatabaseClosedError') {
        throw err;
      }
    });

    // Kiểm tra xem đã có dữ liệu chưa
    const productCount = await db.products.count();
    if (productCount > 0) {
      console.log('Database đã có dữ liệu, bỏ qua seed.');
      return;
    }

    const now = Date.now();

    // 1. Tạo sản phẩm mẫu - kiểm tra duplicate barcode trước khi thêm
    const sampleProducts = [];
    const barcodes = new Set();
    
    const productData = [
      {
        barcode: '8936043010012',
        name: 'Bút bi xanh Thiên Long',
        price: 5000,
        costPrice: 3000,
        stock: 100,
        unit: 'Cây',
      },
      {
        barcode: '8936043010029',
        name: 'Bút bi đỏ Thiên Long',
        price: 5000,
        costPrice: 3000,
        stock: 80,
        unit: 'Cây',
      },
      {
        barcode: '8936043010036',
        name: 'Vở học sinh 200 trang',
        price: 12000,
        costPrice: 8000,
        stock: 50,
        unit: 'Quyển',
      },
      {
        barcode: '8936043010043',
        name: 'Vở học sinh 100 trang',
        price: 8000,
        costPrice: 5000,
        stock: 60,
        unit: 'Quyển',
      },
      {
        barcode: '8936043010050',
        name: 'Bút chì 2B',
        price: 3000,
        costPrice: 2000,
        stock: 150,
        unit: 'Cây',
      },
      {
        barcode: '8936043010067',
        name: 'Tẩy gôm',
        price: 2000,
        costPrice: 1000,
        stock: 200,
        unit: 'Cục',
      },
      {
        barcode: '8936043010074',
        name: 'Thước kẻ 20cm',
        price: 5000,
        costPrice: 3000,
        stock: 90,
        unit: 'Cây',
      },
      {
        barcode: '8936043010081',
        name: 'Compa vẽ hình tròn',
        price: 15000,
        costPrice: 10000,
        stock: 30,
        unit: 'Bộ',
      },
      {
        barcode: '8936043010098',
        name: 'Bút highlight',
        price: 8000,
        costPrice: 5000,
        stock: 70,
        unit: 'Cây',
      },
      {
        barcode: '8936043010104',
        name: 'Bút dạ quang',
        price: 10000,
        costPrice: 6000,
        stock: 40,
        unit: 'Cây',
      },
    ];

    // Tạo sản phẩm với kiểm tra duplicate barcode và localId
    for (const productInfo of productData) {
      // Kiểm tra barcode đã tồn tại chưa
      const existingProduct = await db.products.where('barcode').equals(productInfo.barcode).first();
      if (existingProduct && !existingProduct.deleted) {
        console.warn(`Barcode ${productInfo.barcode} đã tồn tại, bỏ qua.`);
        continue;
      }

      // Tạo localId mới và kiểm tra trùng
      let localId = generateLocalId();
      let attempts = 0;
      while (await db.products.get(localId) && attempts < 10) {
        localId = generateLocalId();
        attempts++;
      }
      if (attempts >= 10) {
        console.error('Không thể tạo localId duy nhất sau 10 lần thử.');
        continue;
      }

      // Kiểm tra barcode không trùng trong danh sách đang tạo
      if (barcodes.has(productInfo.barcode)) {
        console.warn(`Barcode ${productInfo.barcode} trùng trong danh sách seed, bỏ qua.`);
        continue;
      }
      barcodes.add(productInfo.barcode);

      sampleProducts.push({
        localId,
        ...productInfo,
        createdAt: now,
        updatedAt: now,
        synced: false,
        deleted: false,
      });
    }

    if (sampleProducts.length > 0) {
      await db.products.bulkAdd(sampleProducts);
    }
    console.log(`Đã tạo ${sampleProducts.length} sản phẩm mẫu.`);

    // 2. Tạo khách hàng mẫu - kiểm tra duplicate phone và localId
    const sampleCustomers = [];
    const phones = new Set();
    
    const customerData = [
      {
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        points: 0,
        debt: 0,
        note: 'Khách hàng thân thiết',
      },
      {
        name: 'Trần Thị B',
        phone: '0907654321',
        points: 0,
        debt: 0,
        note: '',
      },
      {
        name: 'Trần Thị Hạnh',
        phone: '0395027978',
        points: 1,
        debt: 159000,
        note: '',
      },
    ];

    // Tạo khách hàng với kiểm tra duplicate phone và localId
    for (const customerInfo of customerData) {
      // Kiểm tra số điện thoại đã tồn tại chưa
      const existingCustomer = await db.customers.where('phone').equals(customerInfo.phone).first();
      if (existingCustomer) {
        console.warn(`Số điện thoại ${customerInfo.phone} đã tồn tại, bỏ qua.`);
        continue;
      }

      // Tạo localId mới và kiểm tra trùng
      let localId = generateLocalId();
      let attempts = 0;
      while (await db.customers.get(localId) && attempts < 10) {
        localId = generateLocalId();
        attempts++;
      }
      if (attempts >= 10) {
        console.error('Không thể tạo localId duy nhất sau 10 lần thử.');
        continue;
      }

      // Kiểm tra phone không trùng trong danh sách đang tạo
      if (phones.has(customerInfo.phone)) {
        console.warn(`Số điện thoại ${customerInfo.phone} trùng trong danh sách seed, bỏ qua.`);
        continue;
      }
      phones.add(customerInfo.phone);

      sampleCustomers.push({
        localId,
        ...customerInfo,
        createdAt: now,
        synced: false,
      });
    }

    if (sampleCustomers.length > 0) {
      await db.customers.bulkAdd(sampleCustomers);
    }
    console.log(`Đã tạo ${sampleCustomers.length} khách hàng mẫu.`);

    // 3. Tạo settings mẫu (dùng bulkPut để ghi đè nếu key đã tồn tại, tránh BulkError)
    const sampleSettings = [
      {
        key: 'storeName',
        value: 'Cửa hàng Văn phòng phẩm ABC',
      },
      {
        key: 'pointRate',
        value: 1000, // 1000đ = 1 điểm
      },
      {
        key: 'pointEarnRate',
        value: 0.01, // 1% tổng tiền = điểm tích lũy
      },
    ];

    await db.settings.bulkPut(sampleSettings);
    console.log(`Đã tạo ${sampleSettings.length} cài đặt mẫu.`);

    console.log('✅ Hoàn thành tạo dữ liệu mẫu!');
  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu mẫu:', error);
  }
}
