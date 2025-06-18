# Debug GetMyDailyActivity Query

## Error yang Anda Alami:
```
Variable "$limit" got invalid value "20"; Int cannot represent non-integer value: "20"
Variable "$skip" got invalid value "true"; Int cannot represent non-integer value: "true"
```

## Root Cause:
Variables dikirim sebagai string/boolean, padahal schema mengharapkan integer.

## Solution - Test Step by Step:

### Test 1: Tanpa Variables (Paling Mudah)
```graphql
query {
  getMyDailyActivity {
    activities {
      id
      date
      status
    }
    totalCount
    hasMore
  }
}
```
**Expected:** Berhasil, mengembalikan max 10 data

### Test 2: Dengan Variables Sederhana
**Query:**
```graphql
query GetTest($limit: Int) {
  getMyDailyActivity(limit: $limit) {
    activities {
      id
      date
      status
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "limit": 5
}
```
**Expected:** Berhasil, mengembalikan max 5 data

### Test 3: Dengan Semua Variables
**Query:**
```graphql
query GetTestFull($limit: Int, $skip: Int) {
  getMyDailyActivity(limit: $limit, skip: $skip) {
    activities {
      id
      date
      status
      location
      spk {
        spkNo
        title
      }
    }
    totalCount
    hasMore
    currentPage
    totalPages
  }
}
```

**Variables:**
```json
{
  "limit": 10,
  "skip": 0
}
```

## Troubleshooting Checklist:

### ✅ Yang Benar:
- `"limit": 10` (integer)
- `"skip": 0` (integer)
- `"startDate": "2024-01-01"` (string dengan quotes)

### ❌ Yang Salah:
- `"limit": "10"` (string dengan quotes)
- `"skip": "0"` (string dengan quotes)
- `"skip": true` (boolean)
- `"skip": "true"` (string boolean)

### Platform-specific Notes:

#### GraphQL Playground:
Variables tab harus berisi JSON valid:
```json
{
  "limit": 10,
  "skip": 0
}
```

#### Postman:
Di GraphQL Variables section:
```json
{
  "limit": 10,
  "skip": 0
}
```

#### Apollo Client:
```javascript
client.query({
  query: GET_MY_DAILY_ACTIVITY,
  variables: {
    limit: 10,    // number type
    skip: 0       // number type
  }
});
```

#### Axios/Fetch:
```javascript
const response = await axios.post('/graphql', {
  query: `query($limit: Int, $skip: Int) { ... }`,
  variables: {
    limit: 10,    // number type
    skip: 0       // number type
  }
});
```

## Quick Fix Command:
Jika Anda menggunakan JavaScript, pastikan convert string ke number:
```javascript
const limit = parseInt("10");  // 10 (number)
const skip = parseInt("0");    // 0 (number)
``` 