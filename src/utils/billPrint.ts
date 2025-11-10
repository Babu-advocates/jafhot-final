interface BillItem {
  food_item_name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Bill {
  customer_name?: string | null;
  mobile_last_digit: string;
  total: number;
  created_at?: string;
  bill_items?: BillItem[];
  items?: BillItem[];
  payment_mode?: 'cash' | 'online';
}

export const printBill = (bill: Bill, showAmounts: boolean = true) => {
  const items = bill.bill_items || bill.items || [];
  const logoUrl = `${window.location.origin}/hot-chicken-logo.png`;
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${bill.mobile_last_digit}</title>
          <style>
            @page {
              margin: 0;
            }
            body { 
              font-family: monospace; 
              font-size: 13px; 
              margin: 5px; 
              padding: 0;
              width: 58mm;
              line-height: 1.3;
            }
            .header { text-align: center; margin-bottom: 8px; }
            .header h2 { margin: 2px 0; font-size: 18px; font-weight: bold; }
            .header p { margin: 1px 0; font-size: 12px; }
            .bill-details { margin: 5px 0; font-size: 12px; }
            .bill-details p { margin: 1px 0; }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 12px;
              margin: 5px 0;
            }
            .items-table th { 
              text-align: left; 
              padding: 1px 2px; 
              border-bottom: 1px solid #000;
              font-weight: bold;
            }
            .items-table td { 
              text-align: left; 
              padding: 1px 2px; 
            }
            .total { 
              font-weight: bold; 
              font-size: 14px; 
              text-align: right;
              margin: 5px 0;
            }
            .separator { 
              border-top: 1px dashed #000; 
              margin: 5px 0; 
            }
            .thank-you { 
              text-align: center; 
              margin-top: 8px; 
              margin-bottom: 0;
              font-size: 12px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="Hot Chicken Logo" style="width: 20mm; height: auto; margin-bottom: 5px;">
            <h2>JAF HOT CHICKEN</h2>
            <p>57K, SENTHIL COMPLEX, TENKASI</p>
            <p>TAMIL NADU 627811</p>
            <p>Phone: +91 88385 14326</p>
            <p>Company name: Techverse Infotech</p>
          </div>
          <div class="separator"></div>
          <div class="bill-details">
            <p>Invoice No/Date: ${Math.floor(Math.random() * 1000)} / ${bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</p>
            <p>Customer Name: ${bill.customer_name || 'Walk-in Customer'}</p>
            <p>Cust Mobile No: ***${bill.mobile_last_digit}</p>
          </div>
          <div class="separator"></div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Sl</th>
                <th>Product</th>
                ${showAmounts ? '<th>Price</th>' : ''}
                <th>Qty</th>
                ${showAmounts ? '<th>Amt</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.food_item_name}</td>
                  ${showAmounts ? `<td>${item.price.toFixed(2)}</td>` : ''}
                  <td>${item.quantity}</td>
                  ${showAmounts ? `<td>${item.total.toFixed(2)}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="separator"></div>
          ${showAmounts ? `<div class="total">
            <p>Net Payable: ₹${bill.total.toFixed(2)}</p>
            ${bill.payment_mode ? `<p style="margin-top: 3px;">Payment Mode: ${bill.payment_mode.toUpperCase()}</p>` : ''}
          </div>` : ''}
          <div class="separator"></div>
          <div class="thank-you">
            <p>THANK YOU, VISIT US AGAIN!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};