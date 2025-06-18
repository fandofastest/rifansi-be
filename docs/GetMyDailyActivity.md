# GetMyDailyActivity Query

## Overview
Query baru `GetMyDailyActivity` dibuat untuk menampilkan laporan aktivitas harian yang dibuat oleh user yang sedang login dengan performa yang optimal dan dukungan pagination.

## Keunggulan
1. **Performance Optimized**: Hanya mengambil field-field penting tanpa detail yang berat
2. **Auto-Filter**: Otomatis filter berdasarkan user yang login (tidak perlu specify userId)
3. **Pagination**: Mendukung limit dan skip untuk pagination yang smooth
4. **Date Range**: Mendukung filter berdasarkan rentang tanggal
5. **Fast Loading**: Tidak populate detail activity, equipment logs, dll yang membuat query lambat

## Query Structure
```graphql
getMyDailyActivity(
  limit: Int = 10      # Jumlah data per halaman (default: 10)
  skip: Int = 0        # Jumlah data yang di-skip (default: 0)
  startDate: String    # Filter tanggal mulai (optional)
  endDate: String      # Filter tanggal akhir (optional)
): MyDailyActivityResponse!
```

## Response Structure
```graphql
type MyDailyActivityResponse {
  activities: [MyDailyActivityItem!]!  # List aktivitas
  totalCount: Int!                     # Total semua data
  hasMore: Boolean!                    # Apakah masih ada data lagi
  currentPage: Int!                    # Halaman saat ini
  totalPages: Int!                     # Total halaman
}

type MyDailyActivityItem {
  id: ID!                   # ID aktivitas
  date: String!             # Tanggal aktivitas
  location: String          # Lokasi
  weather: String           # Cuaca
  status: String!           # Status aktivitas
  workStartTime: String     # Jam mulai kerja
  workEndTime: String       # Jam selesai kerja
  closingRemarks: String    # Catatan penutup
  isApproved: Boolean       # Status approval
  spk: SPK                  # Info SPK (basic saja)
  createdAt: String!        # Tanggal dibuat
  updatedAt: String!        # Tanggal diupdate
}
```

## Usage Examples

### Basic Usage
```graphql
query {
  getMyDailyActivity {
    activities {
      id
      date
      status
      spk {
        spkNo
        title
      }
    }
    totalCount
    hasMore
  }
}
```

### With Pagination
```graphql
query($limit: Int, $skip: Int) {
  getMyDailyActivity(limit: $limit, skip: $skip) {
    activities {
      id
      date
      status
      location
    }
    totalCount
    hasMore
    currentPage
    totalPages
  }
}
```

### With Date Filter
```graphql
query($startDate: String, $endDate: String) {
  getMyDailyActivity(startDate: $startDate, endDate: $endDate) {
    activities {
      id
      date
      status
    }
    totalCount
  }
}
```

## Perbandingan dengan Query Lain

| Feature | GetMyDailyActivity | getDailyActivityWithDetails | dailyActivitiesByUser |
|---------|-------------------|----------------------------|----------------------|
| Speed | ⚡ Very Fast | 🐌 Slow | 🟡 Medium |
| Details | Basic only | Full details | Medium details |
| Pagination | ✅ Yes | ❌ No | ❌ No |
| Auto-filter user | ✅ Yes | ❌ No | ❌ No |
| Use case | List view, fast loading | Detail view | General purpose |

## Best Practices
1. Gunakan untuk list view atau dashboard yang butuh loading cepat
2. Set limit yang reasonable (10-50) untuk performa optimal  
3. Gunakan date filter untuk membatasi data yang diambil
4. Implementasikan infinite scroll atau pagination di frontend
5. Untuk detail lengkap, gunakan query terpisah setelah user click item

## ⚠️ Important: Variable Types
**Pastikan variabel dikirim dengan tipe data yang benar:**
- `limit` dan `skip` harus **integer** (tanpa tanda kutip)
- `startDate` dan `endDate` harus **string** (dengan tanda kutip)

```json
// ✅ CORRECT
{
  "limit": 20,           // Integer, no quotes
  "skip": 0,             // Integer, no quotes
  "startDate": "2024-01-01"  // String, with quotes
}

// ❌ WRONG
{
  "limit": "20",         // String - will cause error
  "skip": "0",           // String - will cause error
  "startDate": 2024      // Number - will cause error
}
```

## Frontend Implementation Example
```javascript
// Initial load
const { data } = await apolloClient.query({
  query: GET_MY_DAILY_ACTIVITY,
  variables: { 
    limit: 20,           // Integer, not "20"
    skip: 0              // Integer, not "0"
  }
});

// Load more for pagination
const loadMore = () => {
  apolloClient.query({
    query: GET_MY_DAILY_ACTIVITY,
    variables: { 
      limit: 20,          // Integer
      skip: data.getMyDailyActivity.activities.length  // Integer
    }
  });
};
``` 