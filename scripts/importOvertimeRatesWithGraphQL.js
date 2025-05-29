const axios = require('axios');
require('dotenv').config();

// Data dari tabel yang diberikan
const overtimeRatesData = [
  { waktuKerja: 5, no: 2, normal: 0, weekend: 0, libur: 10 },
  { waktuKerja: 6, no: 3, normal: 0, weekend: 1.5, libur: 12 },
  { waktuKerja: 7, no: 4, normal: 0, weekend: 3.5, libur: 14 },
  { waktuKerja: 8, no: 5, normal: 1.5, weekend: 5.5, libur: 17 },
  { waktuKerja: 9, no: 6, normal: 3.5, weekend: 7.5, libur: 21 },
  { waktuKerja: 10, no: 7, normal: 5.5, weekend: 9.5, libur: 25 },
  { waktuKerja: 11, no: 8, normal: 7.5, weekend: 11.5, libur: 29 },
  { waktuKerja: 12, no: 9, normal: 9.5, weekend: 13.5, libur: 33 }
];

// Konfigurasi GraphQL API
const GRAPHQL_API = process.env.GRAPHQL_API || 'http://localhost:4000/graphql';
const AUTH_TOKEN = process.env.AUTH_TOKEN;

// Fungsi untuk mendapatkan token auth (jika diperlukan)
async function getAuthToken() {
  // Jika token sudah diberikan melalui environment variable
  if (AUTH_TOKEN) return AUTH_TOKEN;
  
  try {
    // Contoh login untuk mendapatkan token
    const loginMutation = `
      mutation {
        login(username: "${process.env.ADMIN_USERNAME}", password: "${process.env.ADMIN_PASSWORD}") {
          token
        }
      }
    `;
    
    const response = await axios.post(GRAPHQL_API, {
      query: loginMutation
    });
    
    if (response.data && response.data.data && response.data.data.login) {
      return response.data.data.login.token;
    } else {
      throw new Error('Failed to get authentication token');
    }
  } catch (error) {
    console.error('Error getting auth token:', error.message);
    throw error;
  }
}

// GraphQL mutation untuk membuat overtime rate
const createOvertimeRateMutation = `
  mutation CreateOvertimeRate($waktuKerja: Int!, $normal: Float!, $weekend: Float!, $libur: Float!) {
    createOvertimeRate(
      waktuKerja: $waktuKerja
      normal: $normal
      weekend: $weekend
      libur: $libur
    ) {
      id
      waktuKerja
      normal
      weekend
      libur
    }
  }
`;

// GraphQL query untuk mendapatkan semua overtime rates
const getOvertimeRatesQuery = `
  query {
    overtimeRates {
      id
      waktuKerja
    }
  }
`;

// GraphQL mutation untuk menghapus overtime rate
const deleteOvertimeRateMutation = `
  mutation DeleteOvertimeRate($id: ID!) {
    deleteOvertimeRate(id: $id)
  }
`;

async function importOvertimeRates() {
  try {
    // Dapatkan token autentikasi
    const token = await getAuthToken();
    
    // Konfigurasi header request dengan token autentikasi
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Hapus semua data yang ada untuk menghindari duplikasi
    console.log('Fetching existing overtime rates...');
    const existingRatesResponse = await axios.post(
      GRAPHQL_API,
      { query: getOvertimeRatesQuery },
      { headers }
    );
    
    if (existingRatesResponse.data && existingRatesResponse.data.data && existingRatesResponse.data.data.overtimeRates) {
      const existingRates = existingRatesResponse.data.data.overtimeRates;
      
      console.log(`Found ${existingRates.length} existing overtime rates. Deleting...`);
      
      for (const rate of existingRates) {
        await axios.post(
          GRAPHQL_API,
          {
            query: deleteOvertimeRateMutation,
            variables: { id: rate.id }
          },
          { headers }
        );
        console.log(`Deleted overtime rate: ${rate.waktuKerja} jam (ID: ${rate.id})`);
      }
    }
    
    // Import data baru
    console.log('Importing new overtime rates...');
    
    const results = [];
    for (const data of overtimeRatesData) {
      try {
        const response = await axios.post(
          GRAPHQL_API,
          {
            query: createOvertimeRateMutation,
            variables: {
              waktuKerja: data.waktuKerja,
              normal: data.normal,
              weekend: data.weekend,
              libur: data.libur
            }
          },
          { headers }
        );
        
        if (response.data && response.data.data && response.data.data.createOvertimeRate) {
          console.log(`Imported: Waktu Kerja ${data.waktuKerja} jam`);
          results.push({ success: true, data });
        } else if (response.data && response.data.errors) {
          const errorMessage = response.data.errors.map(e => e.message).join(', ');
          console.error(`Error importing Waktu Kerja ${data.waktuKerja} jam: ${errorMessage}`);
          results.push({ success: false, data, error: errorMessage });
        } else {
          console.error(`Unknown error importing Waktu Kerja ${data.waktuKerja} jam`);
          results.push({ success: false, data, error: 'Unknown error' });
        }
      } catch (error) {
        console.error(`Error importing Waktu Kerja ${data.waktuKerja} jam:`, error.message);
        results.push({ success: false, data, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Import completed: ${successful} successful, ${failed} failed`);
  } catch (error) {
    console.error('Error in import process:', error);
  }
}

// Jalankan fungsi import
importOvertimeRates()
  .then(() => {
    console.log('Import script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Import script failed:', error);
    process.exit(1);
  }); 