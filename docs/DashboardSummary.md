# Dashboard Summary (Complete)

## Deskripsi
Query lengkap untuk mendapatkan ringkasan dashboard yang mencakup:
- Total SPK, WorkItems, dan laporan
- Monthly sales untuk 1 tahun terakhir dengan sales vs cost dan profit
- Monthly capaian untuk semua SPK
- Chart data untuk analisis rincian

## Query
```graphql
query DashboardSummary {
  dashboardSummary {
    # Summary data
    totalSPK
    totalWorkItems
    totalReports
    totalDailyActivities
    totalRepairReports
    
    # Monthly Sales data
    monthlySales {
      year
      month
      monthName
      sales
      cost
      costBreakdown {
        material
        manpower
        equipment
        other
      }
      profit
      profitMargin
      spkCount
    }
    
    # Monthly Capaian data
    monthlyCapaian {
      year
      month
      monthName
      totalSPKActive
      totalBudget
      spkProgress {
        spkId
        spkTitle
        spkBudget
        activityCount
      }
    }
    
    # Chart data - SPK Performance (Top 10 SPK berdasarkan budget)
    spkPerformance {
      spkId
      spkNo
      title
      projectName
      budget
      workItemsAmount
      workItemsCount
      date
    }
    
    # Chart data - Cost Breakdown (Total cost per kategori)
    costBreakdown {
      material
      manpower
      equipment
      other
      total
    }
    
    # Chart data - Monthly Trend (Sales trend)
    monthlyTrend {
      year
      month
      monthName
      totalSales
      spkCount
    }
    
    # Chart data - Work Items Distribution (per kategori)
    workItemsDistribution {
      categoryName
      count
    }
    
    # Chart data - Activity Status Distribution
    activityStatusDistribution {
      status
      count
    }
  }
}
```

## Response Fields

### Summary Data
- `totalSPK`: Total jumlah SPK
- `totalWorkItems`: Total jumlah WorkItems
- `totalReports`: Total laporan (DailyActivity + EquipmentRepairReport)
- `totalDailyActivities`: Total DailyActivity yang aktif
- `totalRepairReports`: Total EquipmentRepairReport yang aktif

### Monthly Sales
Array data penjualan bulanan untuk 1 tahun terakhir:
- `year`: Tahun
- `month`: Bulan (1-12)
- `monthName`: Nama bulan dalam bahasa Indonesia
- `sales`: Total sales berdasarkan items sales (total amount dari workItems)
- `cost`: Total biaya aktual (material + manpower + equipment + other costs)
- `costBreakdown`: Rincian biaya per kategori
- `profit`: Sales - Cost
- `profitMargin`: Persentase profit margin
- `spkCount`: Jumlah SPK yang dibuat dalam bulan tersebut

### Monthly Capaian
Array data capaian bulanan untuk semua SPK:
- `year`: Tahun
- `month`: Bulan (1-12)
- `monthName`: Nama bulan dalam bahasa Indonesia
- `totalSPKActive`: Jumlah SPK yang aktif dalam bulan tersebut
- `totalBudget`: Total budget SPK yang aktif
- `spkProgress`: Array detail progress per SPK

### Chart Data

#### SPK Performance
Array data top 10 SPK berdasarkan budget:
- `spkId`: ID SPK
- `spkNo`: Nomor SPK
- `title`: Judul SPK
- `projectName`: Nama proyek
- `budget`: Budget SPK
- `workItemsAmount`: Total amount dari workItems
- `workItemsCount`: Jumlah workItems
- `date`: Tanggal SPK

#### Cost Breakdown
Total cost breakdown per kategori:
- `material`: Total biaya material
- `manpower`: Total biaya tenaga kerja
- `equipment`: Total biaya peralatan
- `other`: Total biaya lainnya
- `total`: Total keseluruhan biaya

#### Monthly Trend
Array data trend bulanan untuk 1 tahun terakhir:
- `year`: Tahun
- `month`: Bulan (1-12)
- `monthName`: Nama bulan dalam bahasa Indonesia
- `totalSales`: Total sales berdasarkan budget SPK
- `spkCount`: Jumlah SPK dalam bulan tersebut

#### Work Items Distribution
Array distribusi work items per kategori:
- `categoryName`: Nama kategori
- `count`: Jumlah work items dalam kategori tersebut

#### Activity Status Distribution
Array distribusi status aktivitas:
- `status`: Status aktivitas (Draft, Submitted, Approved, Rejected)
- `count`: Jumlah aktivitas dengan status tersebut

## Perhitungan Financial Metrics

### Sales (Items Sales)
- Berdasarkan total `amount` dari workItems di SPK
- Dihitung: `sum(workItems.amount)` untuk setiap SPK
- Merupakan nilai kontrak berdasarkan items yang direncanakan

### Cost (Actual Cost)
- **Material Cost**: `quantity * unitRate` dari MaterialUsageLog
- **Manpower Cost**: `personCount * workingHours * hourlyRate` dari ManpowerLog
- **Equipment Cost**: `(fuelIn * fuelPrice) + (workingHour * hourlyRate)` dari EquipmentLog
- **Other Cost**: `amount` dari OtherCost

### Profit
- `Sales - Cost`

### Profit Margin
- `((Sales - Cost) / Sales) * 100`

## Chart Recommendations

### 1. SPK Performance Chart
- **Chart Type**: Bar Chart atau Table
- **X-Axis**: SPK Title
- **Y-Axis**: Budget Amount
- **Use Case**: Analisis SPK dengan budget tertinggi

### 2. Cost Breakdown Chart
- **Chart Type**: Pie Chart atau Donut Chart
- **Data**: Material, Manpower, Equipment, Other
- **Use Case**: Analisis komposisi biaya

### 3. Monthly Trend Chart
- **Chart Type**: Line Chart
- **X-Axis**: Month
- **Y-Axis**: Total Sales
- **Use Case**: Analisis trend penjualan bulanan

### 4. Work Items Distribution Chart
- **Chart Type**: Bar Chart atau Pie Chart
- **X-Axis**: Category Name
- **Y-Axis**: Count
- **Use Case**: Analisis distribusi work items per kategori

### 5. Activity Status Distribution Chart
- **Chart Type**: Pie Chart atau Bar Chart
- **Data**: Status (Draft, Submitted, Approved, Rejected)
- **Use Case**: Analisis status aktivitas

## Catatan
- Semua data hanya menampilkan record untuk 1 tahun terakhir
- Data hanya menampilkan record yang aktif (isActive tidak false)
- Sales berdasarkan total amount dari workItems yang direncanakan
- Cost berdasarkan actual cost yang sudah terjadi dari berbagai log aktivitas 