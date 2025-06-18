# Debug GetMyDailyActivity - Hasil Kosong

## Masalah
Query `GetMyDailyActivity` mengembalikan hasil kosong, padahal `GetDailyActivityWithDetails` dengan parameter user yang sama mengembalikan data.

## Langkah Debugging

### Step 1: Test Debug Query
Jalankan query debug ini terlebih dahulu:

```graphql
query {
  getMyDailyActivityDebug {
    success
    message
    userIdUsed
    userIdType
    userIdFormats
    sampleActivity {
      id
      date
      createdBy
    }
    error
  }
}
```

**Expected Output:**
- Jika `success: true` → Query akan menunjukkan format user ID yang benar
- Jika `success: false` → Ada masalah dengan format user ID

### Step 2: Periksa Console Log
Setelah menjalankan `GetMyDailyActivity`, periksa console/log server untuk melihat:

```
getMyDailyActivity - User object keys: [...]
getMyDailyActivity - User object: { id: ..., _id: ..., username: ... }
getMyDailyActivity - Using userId: ... Type: ...
getMyDailyActivity - Sample activities createdBy: [...]
getMyDailyActivity - User activities (string): ...
getMyDailyActivity - User activities (ObjectId): ...
getMyDailyActivity - Final query: { createdBy: ... }
getMyDailyActivity - Total count: ...
```

### Step 3: Bandingkan dengan Query yang Bekerja
Jalankan `GetDailyActivityWithDetails` dengan userId yang sama:

```graphql
query GetDailyActivityWithDetails($userId: ID!) {
  getDailyActivityWithDetails(userId: $userId) {
    date
    userDetail {
      id
      username
    }
  }
}
```

Variables:
```json
{
  "userId": "USER_ID_YANG_SAMA"
}
```

## Kemungkinan Solusi

### Solusi 1: Format User ID Salah
Jika debug menunjukkan user ID format berbeda:

```javascript
// Mungkin perlu convert
const userId = user.id.toString();
// atau
const userId = new mongoose.Types.ObjectId(user.id);
```

### Solusi 2: Field createdBy Different Type
Jika createdBy disimpan sebagai ObjectId tapi kita query dengan string:

```javascript
const query = { 
  createdBy: mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId 
};
```

### Solusi 3: User Context Issue
Jika user object tidak memiliki ID yang benar:

```javascript
// Periksa cara mendapatkan user dari token/session
const userId = user.id || user._id || user.sub || user.userId;
```

## Test Cases

### Test 1: Query Tanpa Variables
```graphql
query {
  getMyDailyActivity {
    activities {
      id
      date
    }
    totalCount
  }
}
```

### Test 2: Query dengan Parameter Minimal
```graphql
query {
  getMyDailyActivity(limit: 5) {
    activities {
      id
      date
      status
    }
    totalCount
  }
}
```

### Test 3: Bandingkan dengan dailyActivitiesByUser
```graphql
query TestComparison($userId: ID!) {
  byUser: dailyActivitiesByUser(userId: $userId) {
    id
    date
    user {
      id
      username
    }
  }
}
```

## Analisis Hasil

### Jika Debug Query Success = true:
- Resolver berfungsi dengan benar
- Masalah mungkin di pagination atau filter lain
- Periksa startDate/endDate jika digunakan

### Jika Debug Query Success = false:
- Ada masalah fundamental dengan user ID format
- Periksa authentication middleware
- Periksa bagaimana user object dibuat

### Jika Total Count = 0:
- User ID tidak cocok dengan createdBy di database
- Mungkin ada case sensitivity issue
- Mungkin ada tipe data mismatch

### Jika Activities Found di Log tapi Result Kosong:
- Masalah di mapping response
- Periksa populate SPK
- Periksa select fields

## Common Fixes

### Fix 1: User ID Type Conversion
```javascript
const userId = user.id ? user.id.toString() : user._id.toString();
```

### Fix 2: Flexible Query
```javascript
const query = {
  $or: [
    { createdBy: user.id },
    { createdBy: user._id },
    { createdBy: user.id?.toString() },
    { createdBy: user._id?.toString() }
  ]
};
```

### Fix 3: ObjectId Handling
```javascript
const mongoose = require('mongoose');
const userId = mongoose.Types.ObjectId.isValid(user.id) 
  ? user.id 
  : new mongoose.Types.ObjectId(user.id);
```

## Report Results
Setelah menjalankan debug:

1. **Screenshot hasil debug query**
2. **Copy console log yang relevan**
3. **Hasil perbandingan dengan query lain**
4. **Format user ID yang bekerja**

Dengan informasi ini, kita bisa fix resolver dengan tepat! 