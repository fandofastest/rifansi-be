const XLSX = require("xlsx");
const mongoose = require("mongoose");
const dayjs = require("dayjs");
require("dayjs/locale/id");
dayjs.locale("id");
const stringSimilarity = require("string-similarity");

const SPK = require("../models/SPK");
const WorkItem = require("../models/WorkItem");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");
const Unit = require("../models/Unit");
const Area = require("../models/Area");

const labelMap = {
  spkNo: ["SPK No", "SPK Number", "No SPK"],
  wapNo: ["WAP No", "No WAP"],
  issuedDate: ["Issued Date", "Tanggal Dikeluarkan"],
  title: ["Work Title", "Judul Pekerjaan"],
  contractor: ["Assigned To", "Kontraktor"],
  projectName: ["Operation Unit"],
  location: ["Work Location", "Lokasi"],
  permittingType: ["Permitting Type", "Tipe Perizinan"],
  originator: ["Originator"],
  teamName: ["Team Name"],
  startDate: ["Start Date:"],
  endDate: ["End Date:"],
  duration: ["Duration"]
};

// Update label mapping untuk fokus ke date
const wapLabelMap = {
  planningNumber: ["Planning Number"],
  assignedTo: ["Assigned To"],
  networkArea: ["Network Area"],
  wapNo: ["WAP No"],
  spkNo: ["SPK No"],
  workTitle: ["Work Title"],
  issuedDate: ["Issued Date"],
  projectEngineering: ["Project & Technical Engineering"],
  projectName: ["Operation Unit:"],
  originator: ["Originator"],
  teamName: ["Team Name"],
  workDetailDescription: ["Work Detail Description"],
  workUnitRate: ["Work Unit Rate", "WUR"],
  estimatedCost: ["Estimated Cost", "Estimated"],
  siteKOM: ["Site KOM"],
  startDate: ["article Start Date:", "article Start Date", "Start Date:"],
  endDate: ["article End Date:", "article End Date", "End Date:"],
  duration: ["Duration"],
  actualDate: ["Actual Date"],
  workType: ["Work Type"],
  constructionCost: ["Construction Cost"],
  contractor: ["Contractor Supervision"],
  location: ["Work Location", "Network Area"]
};

function getLabelValue(sheetData, targetKey) {
  const aliases = labelMap[targetKey];
  for (let r = 0; r < sheetData.length; r++) {
    const row = sheetData[r];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell !== "string") continue;
      for (const alias of aliases) {
        if (cell.toLowerCase().includes(alias.toLowerCase())) {
          const nextCell = row[c + 1];
          if (typeof nextCell === "string" && nextCell.toLowerCase().includes(":")) {
            const nextRow = sheetData[r + 1];
            const val = nextRow?.[c];
            return typeof val === 'string' ? val.trim() : val;
          }
          if (nextCell !== undefined) {
            return typeof nextCell === 'string' ? nextCell.trim() : nextCell;
          }
        }
      }
    }
  }
  return null;
}

// Fungsi khusus untuk mencari date dengan format article
function getWAPDateValue(sheetData, targetKey) {
  const aliases = wapLabelMap[targetKey];
  if (!aliases) return null;

  console.log(`🔍 Mencari ${targetKey} dengan aliases:`, aliases);

  for (let r = 0; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell !== "string") continue;

      for (const alias of aliases) {
        // Cek apakah cell mengandung label yang dicari
        if (cell.toLowerCase().includes(alias.toLowerCase())) {
          console.log(`🎯 DITEMUKAN label '${alias}' di baris ${r + 1}, kolom ${c + 1}`);
          console.log(`📍 Isi cell: "${cell}"`);

          // Cek baris berikutnya untuk nilai tanggal
          if (r + 1 < sheetData.length) {
            const nextRow = sheetData[r + 1];
            console.log(`🔎 Mengecek baris berikutnya:`, nextRow);

            if (Array.isArray(nextRow)) {
              // Cek kolom yang sama dulu
              if (nextRow[c] !== undefined && nextRow[c] !== "") {
                const value = nextRow[c];
                console.log(`✅ NILAI DITEMUKAN di kolom yang sama: "${value}"`);
                return typeof value === 'string' ? value.trim() : value;
              }

              // Jika tidak ada, cek kolom di sekitarnya (±2 kolom)
              for (let checkCol = Math.max(0, c - 2); checkCol <= Math.min(nextRow.length - 1, c + 2); checkCol++) {
                const value = nextRow[checkCol];
                if (value !== undefined && value !== "" && value !== null) {
                  console.log(`✅ NILAI DITEMUKAN di kolom ${checkCol + 1}: "${value}"`);
                  return typeof value === 'string' ? value.trim() : value;
                }
              }
            }
          }

          // Cek 2 baris ke bawah juga
          if (r + 2 < sheetData.length) {
            const nextRow2 = sheetData[r + 2];
            if (Array.isArray(nextRow2) && nextRow2[c] !== undefined && nextRow2[c] !== "") {
              const value = nextRow2[c];
              console.log(`✅ NILAI DITEMUKAN 2 baris ke bawah: "${value}"`);
              return typeof value === 'string' ? value.trim() : value;
            }
          }
        }
      }
    }
  }

  console.log(`❌ ${targetKey} TIDAK DITEMUKAN`);
  return null;
}

// Update fungsi getWAPLabelValue untuk menangani nilai di baris bawah
function getWAPLabelValue(sheetData, targetKey) {
  // Untuk startDate dan endDate, gunakan fungsi khusus
  if (targetKey === 'startDate' || targetKey === 'endDate') {
    return getWAPDateValue(sheetData, targetKey);
  }

  const aliases = wapLabelMap[targetKey];
  if (!aliases) return null;

  for (let r = 0; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell !== "string") continue;

      for (const alias of aliases) {
        if (cell.toLowerCase().includes(alias.toLowerCase())) {

          // Khusus untuk projectName (Operation Unit:), cari di baris bawah dulu
          if (targetKey === 'projectName') {
            console.log(`🔍 DITEMUKAN "${alias}" di baris ${r + 1}, kolom ${c + 1}`);

            // Cek baris berikutnya di kolom yang sama
            if (r + 1 < sheetData.length) {
              const nextRow = sheetData[r + 1];
              if (Array.isArray(nextRow) && nextRow[c] !== undefined && nextRow[c] !== "") {
                const value = nextRow[c];
                console.log(`✅ NILAI DI BARIS BAWAH: "${value}"`);
                return typeof value === 'string' ? value.trim() : value;
              }
            }

            // Jika tidak ada di baris bawah, cek kolom sebelah kanan
            if (c + 1 < row.length && row[c + 1] !== undefined && row[c + 1] !== "") {
              const value = row[c + 1];
              console.log(`✅ NILAI DI SEBELAH KANAN: "${value}"`);
              return typeof value === 'string' ? value.trim() : value;
            }

            console.log(`❌ Tidak ada nilai di baris bawah atau sebelah kanan`);
            return null;
          }

          // Untuk field lain, tetap gunakan logika yang lama
          // Cari nilai di cell sebelah kanan dulu
          if (c + 1 < row.length && row[c + 1] !== undefined && row[c + 1] !== "") {
            const value = row[c + 1];
            return typeof value === 'string' ? value.trim() : value;
          }

          // Jika tidak ada di sebelah kanan, cek baris berikutnya di kolom yang sama
          if (r + 1 < sheetData.length) {
            const nextRow = sheetData[r + 1];
            if (Array.isArray(nextRow) && nextRow[c] !== undefined && nextRow[c] !== "") {
              const value = nextRow[c];
              return typeof value === 'string' ? value.trim() : value;
            }
          }

          // Cek 2 baris ke bawah jika ada
          if (r + 2 < sheetData.length) {
            const nextRow2 = sheetData[r + 2];
            if (Array.isArray(nextRow2) && nextRow2[c] !== undefined && nextRow2[c] !== "") {
              const value = nextRow2[c];
              return typeof value === 'string' ? value.trim() : value;
            }
          }
        }
      }
    }
  }
  return null;
}

function getLabelFromHorizontalPair(sheetData, targetKey) {
  const aliases = labelMap[targetKey];
  for (let i = 0; i < sheetData.length - 1; i++) {
    const labelRow = sheetData[i];
    const valueRow = sheetData[i + 1];
    if (!Array.isArray(labelRow) || !Array.isArray(valueRow)) continue;
    for (let j = 0; j < labelRow.length; j++) {
      const cell = labelRow[j];
      if (typeof cell === "string") {
        for (const alias of aliases) {
          if (cell.toLowerCase().includes(alias.toLowerCase())) {
            const value = valueRow[j];
            return typeof value === 'string' ? value.trim() : value;
          }
        }
      }
    }
  }
  return null;
}

function getLabelFromInlineRow(sheetData, targetKey) {
  const aliases = labelMap[targetKey];
  for (const row of sheetData) {
    if (!Array.isArray(row)) continue;
    for (let i = 0; i < row.length - 1; i++) {
      const cell = row[i];
      if (typeof cell === "string") {
        for (const alias of aliases) {
          if (cell.toLowerCase().includes(alias.toLowerCase())) {
            const value = row[i + 1];
            return typeof value === 'string' ? value.trim() : value;
          }
        }
      }
    }
  }
  return null;
}

function parseDateSafe(value) {
  if (!value) return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }
  if (typeof value === "string") {
    const parsed = dayjs(value.trim(), ['D/M/YYYY', 'DD/MM/YYYY', 'D-MMM-YY', 'DD-MMM-YY'], 'id', true);
    if (parsed.isValid()) {
      return new Date(parsed.year(), parsed.month(), parsed.date());
    }
  }
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  return null;
}

// Update fungsi parsing tanggal untuk menangani format DD/MM/YYYY
function parseDateSafeWAP(value) {
  if (!value) return null;

  console.log(`📅 Parsing tanggal: "${value}" (tipe: ${typeof value})`);

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const date = new Date(parsed.y, parsed.m - 1, parsed.d);
      console.log(`✅ Berhasil parse number: ${date.toLocaleDateString('id-ID')}`);
      return date;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Format: DD/MM/YYYY (10/06/2025)
    const ddmmyyyyMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      console.log(`✅ Berhasil parse DD/MM/YYYY: ${date.toLocaleDateString('id-ID')}`);
      return date;
    }

    // Format: DD/MM/YY (10/06/25)
    const ddmmyyMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
    if (ddmmyyMatch) {
      const [, day, month, year] = ddmmyyMatch;
      const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
      const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      console.log(`✅ Berhasil parse DD/MM/YY: ${date.toLocaleDateString('id-ID')}`);
      return date;
    }

    // Format Indonesia: 28-Mei-25
    const indonesianMonths = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5,
      'jul': 6, 'agu': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
    };

    const indoMatch = trimmed.match(/(\d{1,2})-([a-z]{3})-(\d{2})/i);
    if (indoMatch) {
      const [, day, monthStr, year] = indoMatch;
      const month = indonesianMonths[monthStr.toLowerCase()];
      if (month !== undefined) {
        const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
        const date = new Date(fullYear, month, parseInt(day));
        console.log(`✅ Berhasil parse Indonesian format: ${date.toLocaleDateString('id-ID')}`);
        return date;
      }
    }

    // Fallback ke parsing regular
    const parsed = dayjs(trimmed, ['D/M/YYYY', 'DD/MM/YYYY', 'D-MMM-YY', 'DD-MMM-YY'], 'id', true);
    if (parsed.isValid()) {
      const date = new Date(parsed.year(), parsed.month(), parsed.date());
      console.log(`✅ Berhasil parse dengan dayjs: ${date.toLocaleDateString('id-ID')}`);
      return date;
    }
  }

  if (value instanceof Date) {
    console.log(`✅ Sudah dalam bentuk Date: ${value.toLocaleDateString('id-ID')}`);
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  console.log(`❌ GAGAL parse tanggal: "${value}"`);
  return null;
}

function extractWorkDescription(sheetData, beforeRow) {
  const lines = [];
  for (let i = 0; i < beforeRow; i++) {
    const row = sheetData[i];
    const joined = row?.filter(cell => typeof cell === 'string').join(' ').trim();
    if (joined && joined.length > 10) lines.push(joined);
  }
  return lines.join('\n').trim();
}

// Fungsi untuk ekstrak Work Detail Description dari format WAP
function extractWorkDetailDescriptionWAP(sheetData) {
  let foundDescriptionStart = false;
  let description = "";

  for (let r = 0; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!Array.isArray(row)) continue;

    // Cari baris yang mengandung "Work Detail Description"
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell === "string" && cell.toLowerCase().includes("work detail description")) {
        foundDescriptionStart = true;
        // Mulai baca dari baris berikutnya
        for (let i = r + 1; i < sheetData.length; i++) {
          const descRow = sheetData[i];
          if (!Array.isArray(descRow)) continue;

          // Hentikan jika menemukan field lain
          const hasOtherField = descRow.some(cell =>
            typeof cell === "string" &&
            (cell.toLowerCase().includes("attachment") ||
              cell.toLowerCase().includes("proposed payment") ||
              cell.toLowerCase().includes("work unit") ||
              cell.toLowerCase().includes("work scope"))
          );

          if (hasOtherField) break;

          // Gabungkan text dari row ini
          const rowText = descRow.filter(cell =>
            typeof cell === 'string' &&
            cell.trim() !== ""
          ).join(' ').trim();

          if (rowText) {
            description += (description ? '\n' : '') + rowText;
          }
        }
        break;
      }
    }
    if (foundDescriptionStart) break;
  }

  return description.trim();
}

async function findOrCreate(model, query, defaults = {}) {
  const existing = await model.findOne(query);
  if (existing) {
    console.log(`📎 Menggunakan ${model.modelName} yang sudah ada:`, query.name || query);
    return existing;
  }

  const doc = await model.create({ ...query, ...defaults });
  console.log(`🆕 Membuat ${model.modelName}:`, query.name || query);
  return doc;
}

function detectBOQStart(sheetData) {
  return sheetData.findIndex(row =>
    row.includes("Description") &&
    row.includes("Unit") &&
    row.includes("Total Price")
  ) + 1;
}

// Update fungsi untuk mendeteksi awal BOQ di format WAP dengan nama sheet 'BOQ.'
function detectBOQStartWAP(sheetData) {
  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!Array.isArray(row)) continue;

    // Cari baris header yang mengandung Description, Unit, Non Remote, Remote, Total Price
    const hasDescription = row.some(cell =>
      typeof cell === "string" && cell.toLowerCase().includes("description")
    );
    const hasUnit = row.some(cell =>
      typeof cell === "string" && cell.toLowerCase().includes("unit")
    );
    const hasNonRemote = row.some(cell =>
      typeof cell === "string" && cell.toLowerCase().includes("non remote")
    );
    const hasRemote = row.some(cell =>
      typeof cell === "string" && cell.toLowerCase().includes("remote")
    );
    const hasTotalPrice = row.some(cell =>
      typeof cell === "string" && cell.toLowerCase().includes("total price")
    );

    if (hasDescription && hasUnit && hasNonRemote && hasRemote && hasTotalPrice) {
      console.log(`📍 Header BOQ ditemukan di baris ${i + 1}`);
      console.log(`📋 Header: [${row.join(' | ')}]`);
      return i + 1; // Return baris setelah header
    }
  }
  return -1;
}

function detectExplicitBudget(sheetData) {
  for (const row of sheetData) {
    if (!Array.isArray(row)) continue;
    const hasTotal = row.some(cell =>
      typeof cell === "string" && cell.toLowerCase().includes("total")
    );
    if (hasTotal) {
      const numeric = row.findLast(cell => typeof cell === "number");
      if (numeric && !isNaN(numeric)) {
        return numeric;
      }
    }
  }
  return null;
}

// Update fungsi untuk mencari total budget di sheet BOQ dengan format baru
function detectExplicitBudgetWAP(sheetData) {
  for (let i = sheetData.length - 1; i >= 0; i--) {
    const row = sheetData[i];
    if (!Array.isArray(row)) continue;

    const hasTotal = row.some(cell =>
      typeof cell === "string" && cell.toLowerCase().includes("total")
    );

    if (hasTotal) {
      console.log(`🔍 Baris TOTAL ditemukan: [${row.join(' | ')}]`);

      // Cari nilai numerik terbesar di baris ini (kolom Total Price)
      const numeric = row.filter(cell =>
        typeof cell === "number" && !isNaN(cell) && cell > 1000000
      ).sort((a, b) => b - a)[0];

      if (numeric) {
        console.log(`💰 Total budget ditemukan: ${numeric.toLocaleString("id-ID")}`);
        return numeric;
      }
    }
  }
  return null;
}

// Fungsi khusus untuk mengambil budget dari "Estimated" - ambil kolom ke-4 (2 cell ke kanan)
function getWAPBudgetValue(sheetData) {
  console.log(`🔍 Mencari budget dari field "Estimated"...`);

  for (let r = 0; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell !== "string") continue;

      // Cari "Estimated" (case insensitive)
      if (cell.toLowerCase().includes("estimated")) {
        console.log(`🎯 DITEMUKAN "Estimated" di baris ${r + 1}, kolom ${c + 1}`);
        console.log(`📍 Isi cell: "${cell}"`);

        // Tampilkan semua nilai di sebelah kanan untuk debugging
        console.log(`🔎 Mengecek nilai di sebelah kanan:`);
        for (let checkCol = c + 1; checkCol < Math.min(row.length, c + 5); checkCol++) {
          const value = row[checkCol];
          console.log(`   Kolom ${checkCol + 1}: "${value}" (tipe: ${typeof value})`);
        }

        // Ambil nilai di kolom ke-4 (2 cell ke kanan dari "Estimated")
        // Karena: Estimated | : | 2072114860
        //         c        c+1   c+2
        if (c + 2 < row.length && row[c + 2] !== undefined && row[c + 2] !== "") {
          const budgetValue = row[c + 2];
          console.log(`💰 BUDGET RAW VALUE (kolom ${c + 3}): "${budgetValue}"`);
          console.log(`💰 BUDGET TYPE: ${typeof budgetValue}`);

          // Parse nilai budget
          let parsedBudget = null;
          if (typeof budgetValue === 'number') {
            parsedBudget = budgetValue;
            console.log(`✅ BUDGET SUDAH BERUPA NUMBER: ${parsedBudget}`);
          } else if (typeof budgetValue === 'string') {
            console.log(`🧹 CLEANING BUDGET STRING:`);
            console.log(`   Original: "${budgetValue}"`);

            // Remove any non-numeric characters
            const cleanValue = budgetValue.replace(/[^\d]/g, '');
            console.log(`   After cleaning: "${cleanValue}"`);

            parsedBudget = parseFloat(cleanValue);
            console.log(`   Parsed to number: ${parsedBudget}`);
          }

          if (parsedBudget && !isNaN(parsedBudget)) {
            console.log(`✅ BUDGET BERHASIL DIPARSE: ${parsedBudget.toLocaleString("id-ID")}`);
            return parsedBudget;
          } else {
            console.log(`❌ GAGAL PARSE BUDGET: "${budgetValue}"`);
          }
        } else {
          console.log(`❌ Tidak ada nilai di kolom ke-4 setelah "Estimated"`);

          // Fallback: coba ambil nilai numeric pertama yang ditemukan di baris ini
          console.log(`🔄 Mencari nilai numeric di baris ini...`);
          for (let checkCol = c + 1; checkCol < row.length; checkCol++) {
            const value = row[checkCol];
            if (typeof value === 'number' && value > 1000000) { // Asumsi budget minimal 1 juta
              console.log(`💡 Menemukan nilai numeric besar di kolom ${checkCol + 1}: ${value}`);
              console.log(`✅ MENGGUNAKAN BUDGET: ${value.toLocaleString("id-ID")}`);
              return value;
            }
          }
        }

        // Jika masih tidak ditemukan, return null untuk row ini dan lanjut ke row berikutnya
        console.log(`❌ Budget tidak ditemukan di baris ${r + 1}, melanjutkan pencarian...`);
      }
    }
  }

  console.log(`❌ Field "Estimated" TIDAK DITEMUKAN`);
  return null;
}

// Fungsi import format BOQ asli (TAMBAHKAN INI KEMBALI)
async function importExcelToSPK(filePath) {
  console.log("📥 Membaca file Excel...");
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets["BOQ"];
  if (!sheet) throw new Error("❌ Sheet 'BOQ' tidak ditemukan.");
  const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const meta = {};
  for (const key in labelMap) {
    meta[key] = getLabelValue(sheetData, key)
      || getLabelFromHorizontalPair(sheetData, key)
      || getLabelFromInlineRow(sheetData, key);
    if (meta[key]) {
      console.log(`🔹 ${key}: ${meta[key]}`);
    } else {
      console.warn(`⚠️ '${key}' tidak ditemukan di file Excel.`);
    }
  }

  const startDate = parseDateSafe(meta.startDate);
  const endDate = parseDateSafe(meta.endDate);
  const issuedDate = parseDateSafe(meta.issuedDate);

  if (!startDate || !endDate || !issuedDate) {
    throw new Error("❌ Tanggal tidak valid. Periksa format startDate/endDate/issuedDate di Excel.");
  }

  if (!meta.location) throw new Error("❌ 'Work Location' tidak ditemukan.");

  const area = await findOrCreate(
    Area,
    { name: meta.location },
    { location: { type: 'Point', coordinates: [101.0, -1.0] } }
  );

  const boqStart = detectBOQStart(sheetData);
  if (boqStart <= 0) throw new Error("❌ Header BOQ tidak ditemukan.");

  const workDescription = extractWorkDescription(sheetData, boqStart);
  if (!workDescription) throw new Error("❌ workDescription tidak ditemukan sebelum BOQ.");

  let currentCategory = "";
  let currentSubCategory = "";
  const workItems = [];

  for (let i = boqStart; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!Array.isArray(row) || row.length < 3) continue;

    let rawDescription = row[2] || row[1] || row[0];
    let description = typeof rawDescription === "string"
      ? rawDescription.replace(/scope of work/gi, "").trim().replace(/\s+/g, " ")
      : null;

    const unitName = row[3]?.toString().trim();
    const totalPrice = parseFloat(row[8]) || 0;

    console.log(`📄 Baris ${i}`);
    console.log(`  📝 Description: ${description}`);
    console.log(`  📏 Unit: ${unitName}`);
    console.log(`  💰 Total Price: ${totalPrice}`);

    const nextRow = sheetData[i + 1];
    const nextHasUnit = nextRow && typeof nextRow[3] === "string" && nextRow[3].trim() !== "";

    if (!unitName && description) {
      if (nextHasUnit) {
        currentSubCategory = description;
        console.log(`  📁 Ditetapkan sebagai SUBKATEGORI: ${currentSubCategory}`);
      } else {
        currentCategory = description;
        console.log(`  📂 Ditetapkan sebagai KATEGORI: ${currentCategory}`);
      }
      continue;
    }

    if (!description || !unitName) {
      console.warn(`  ⚠️ Tidak lengkap, dilewati.`);
      continue;
    }

    if (!currentCategory) {
      currentCategory = "SAMPLECAT";
      console.warn(`  ⚠️ Tidak ada kategori, pakai default: SAMPLECAT`);
    }

    if (!currentSubCategory) {
      currentSubCategory = "SAMPLESUB";
      console.warn(`  ⚠️ Tidak ada subkategori, pakai default: SAMPLESUB`);
    }

    const rateNR = parseFloat(row[4]) || 0;
    const rateR = parseFloat(row[5]) || 0;
    const quantityNR = parseFloat(row[6]) || 0;
    const quantityR = parseFloat(row[7]) || 0;

    const category = await findOrCreate(Category, { name: currentCategory }, { code: currentCategory.slice(0, 5) });
    const subCategory = await findOrCreate(SubCategory, { name: currentSubCategory, categoryId: category._id });
    const unit = await findOrCreate(Unit, { name: unitName }, { code: unitName });

    const workItem = await findOrCreate(
      WorkItem,
      { name: description },
      {
        categoryId: category._id,
        subCategoryId: subCategory._id,
        unitId: unit._id,
        description,
        rates: {
          nr: { rate: rateNR },
          r: { rate: rateR }
        }
      }
    );

    workItems.push({
      workItemId: workItem._id,
      boqVolume: { nr: quantityNR, r: quantityR },
      rates: { nr: { rate: rateNR }, r: { rate: rateR } },
      amount: totalPrice,
      description
    });

    console.log(`  ✅ ItemWork ditambahkan: ${description}`);
  }

  let totalBudget = workItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const explicitBudget = detectExplicitBudget(sheetData);
  if (explicitBudget && explicitBudget > 0) {
    console.log(`📊 Budget diambil dari baris TOTAL: ${explicitBudget.toLocaleString("id-ID")}`);
    totalBudget = explicitBudget;
  }

  await SPK.create({
    spkNo: meta.spkNo,
    wapNo: meta.wapNo,
    title: meta.title,
    projectName: meta.projectName,
    contractor: meta.contractor,
    date: issuedDate,
    startDate,
    endDate,
    duration: parseInt(meta.duration) || 0,
    workDescription,
    location: area._id,
    budget: totalBudget,
    workItems
  });

  console.log(`🎉 SPK "${meta.spkNo}" berhasil disimpan ke database.`);
}

// Update fungsi test untuk validasi sheet BOQ.
async function testExtractWAPMetadata(filePath) {
  try {
    console.log("📥 Membaca file Excel WAP...");
    const workbook = XLSX.readFile(filePath);

    // Cek sheet yang tersedia
    console.log("📋 Sheet yang tersedia:", Object.keys(workbook.Sheets));

    const wapSheet = workbook.Sheets["WAP"];
    const boqSheet = workbook.Sheets["BOQ."];  // Cek sheet BOQ.

    if (!wapSheet) {
      throw new Error("❌ Sheet 'WAP' tidak ditemukan.");
    }

    if (!boqSheet) {
      throw new Error("❌ Sheet 'BOQ.' tidak ditemukan.");
    }

    const wapData = XLSX.utils.sheet_to_json(wapSheet, { header: 1 });
    const boqData = XLSX.utils.sheet_to_json(boqSheet, { header: 1 });

    console.log(`📊 Jumlah baris di sheet WAP: ${wapData.length}`);
    console.log(`📊 Jumlah baris di sheet BOQ.: ${boqData.length}`);

    console.log("\n🔍 TEST BUDGET DARI WAP:");
    console.log("=".repeat(40));
    const budgetFromWAP = getWAPBudgetValue(wapData);

    console.log("\n🔍 TEST BUDGET DARI BOQ:");
    console.log("=".repeat(40));
    const budgetFromBOQ = detectExplicitBudgetWAP(boqData);

    console.log("\n📊 PERBANDINGAN BUDGET:");
    console.log("=".repeat(40));
    console.log(`💰 Budget WAP: ${budgetFromWAP ? budgetFromWAP.toLocaleString("id-ID") : 'TIDAK DITEMUKAN'}`);
    console.log(`💰 Budget BOQ: ${budgetFromBOQ ? budgetFromBOQ.toLocaleString("id-ID") : 'TIDAK DITEMUKAN'}`);

    if (budgetFromWAP && budgetFromBOQ) {
      const match = Math.abs(budgetFromWAP - budgetFromBOQ) < 1000;
      console.log(`🔍 Budget Match: ${match ? '✅ COCOK' : '❌ BERBEDA'}`);
    }

    console.log("\n🔍 TEST DETEKSI BOQ HEADER:");
    console.log("=".repeat(40));
    const boqStart = detectBOQStartWAP(boqData);
    console.log(`📍 BOQ Start: ${boqStart > 0 ? `Baris ${boqStart}` : '❌ TIDAK DITEMUKAN'}`);

    return {
      budgetWAP: budgetFromWAP,
      budgetBOQ: budgetFromBOQ,
      boqStart: boqStart
    };

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

// Update fungsi import utama untuk menangani sheet 'BOQ.' dan struktur yang benar
async function importExcelWAPToSPK(filePath) {
  try {
    console.log("📥 Memulai import Excel WAP format...");
    const workbook = XLSX.readFile(filePath);

    // Cek sheet yang tersedia
    console.log("📋 Sheet yang tersedia:", Object.keys(workbook.Sheets));

    // Validasi sheets - nama sheet BOQ ada titik
    if (!workbook.Sheets["WAP"]) throw new Error("❌ Sheet 'WAP' tidak ditemukan.");
    if (!workbook.Sheets["BOQ."]) throw new Error("❌ Sheet 'BOQ.' tidak ditemukan.");

    // Baca sheet WAP untuk metadata
    const wapData = XLSX.utils.sheet_to_json(workbook.Sheets["WAP"], { header: 1 });
    const boqData = XLSX.utils.sheet_to_json(workbook.Sheets["BOQ."], { header: 1 }); // Pakai 'BOQ.'

    console.log("📊 Mengekstrak metadata dari sheet WAP...");
    const metadata = {};

    // Ekstrak metadata dari sheet WAP
    for (const key in wapLabelMap) {
      metadata[key] = getWAPLabelValue(wapData, key);
      if (metadata[key]) {
        console.log(`🔹 ${key}: ${metadata[key]}`);
      }
    }

    // Ekstrak work description dan budget
    metadata.workDetailDescription = extractWorkDetailDescriptionWAP(wapData);
    const budgetFromWAP = getWAPBudgetValue(wapData);

    // Parse tanggal
    const issuedDate = parseDateSafeWAP(metadata.issuedDate);
    const startDate = parseDateSafeWAP(metadata.startDate);
    const endDate = parseDateSafeWAP(metadata.endDate);

    if (!issuedDate) {
      console.warn("⚠️ Issued Date tidak valid, menggunakan tanggal sekarang");
    }

    // Siapkan area/lokasi
    const locationName = metadata.networkArea || metadata.location || "Unknown Location";
    const area = await findOrCreate(
      Area,
      { name: locationName },
      { location: { type: 'Point', coordinates: [101.0, -1.0] } }
    );

    // Proses BOQ dengan struktur baru
    console.log("📊 Memproses data BOQ...");
    const boqStart = detectBOQStartWAP(boqData);
    if (boqStart <= 0) throw new Error("❌ Header BOQ tidak ditemukan.");

    let currentCategory = "";
    let currentSubCategory = "";
    const workItems = [];

    for (let i = boqStart; i < boqData.length; i++) {
      const row = boqData[i];
      if (!Array.isArray(row) || row.length < 3) continue;

      // Skip baris TOTAL
      if (row[0] && typeof row[0] === 'string' && row[0].toLowerCase().includes('total')) {
        console.log(`📊 Mencapai baris TOTAL, selesai processing BOQ.`);
        break;
      }

      const description = row[0]?.toString().trim();
      const unit = row[1]?.toString().trim();
      const nonRemoteRate = parseFloat(row[2]) || 0;
      const nonRemoteQty = parseFloat(row[3]) || 0;
      const remoteRate = parseFloat(row[4]) || 0;
      const remoteQty = parseFloat(row[5]) || 0;
      const totalPrice = parseFloat(row[6]) || 0;

      console.log(`📄 Baris ${i + 1}: "${description}" | Unit: "${unit}" | Total: ${totalPrice}`);

      // Skip jika tidak ada description
      if (!description) {
        console.warn(`  ⚠️ Tidak ada description, dilewati.`);
        continue;
      }

      // Logika kategorisasi berdasarkan struktur Excel
      // 1. Jika tidak ada unit dan tidak ada indentasi -> Main Category (PILING, EARTHWORK & CIVIL, dll)
      // 2. Jika tidak ada unit tapi ada indentasi -> Sub Category (Install, Earthworks, dll)  
      // 3. Jika ada unit -> Work Item

      if (!unit || unit === "") {
        // Cek apakah ini kategori utama atau subkategori
        // Kategori utama biasanya ALL CAPS atau tanpa indentasi
        const isMainCategory = description === description.toUpperCase() ||
          description.includes('&') ||
          !description.startsWith(' ');

        if (isMainCategory) {
          currentCategory = description;
          currentSubCategory = ""; // Reset subkategori
          console.log(`  📂 KATEGORI UTAMA: ${currentCategory}`);
        } else {
          currentSubCategory = description.trim();
          console.log(`  📁 SUBKATEGORI: ${currentSubCategory}`);
        }
        continue;
      }

      // Ini adalah work item (ada unit)
      if (!description || !unit) {
        console.warn(`  ⚠️ Work item tidak lengkap, dilewati.`);
        continue;
      }

      // Set default kategori jika belum ada
      if (!currentCategory) {
        currentCategory = "GENERAL";
        console.warn(`  ⚠️ Tidak ada kategori, pakai default: GENERAL`);
      }

      if (!currentSubCategory) {
        currentSubCategory = "GENERAL";
        console.warn(`  ⚠️ Tidak ada subkategori, pakai default: GENERAL`);
      }

      // Buat/cari kategori, subkategori, unit
      const category = await findOrCreate(Category, { name: currentCategory }, { code: currentCategory.slice(0, 5) });
      const subCategory = await findOrCreate(SubCategory, { name: currentSubCategory, categoryId: category._id });
      const unitDoc = await findOrCreate(Unit, { name: unit }, { code: unit });

      // Buat/cari work item
      const workItem = await findOrCreate(
        WorkItem,
        { name: description },
        {
          categoryId: category._id,
          subCategoryId: subCategory._id,
          unitId: unitDoc._id,
          description,
          rates: {
            nr: { rate: nonRemoteRate },
            r: { rate: remoteRate }
          }
        }
      );

      workItems.push({
        workItemId: workItem._id,
        boqVolume: { nr: nonRemoteQty, r: remoteQty },
        rates: { nr: { rate: nonRemoteRate }, r: { rate: remoteRate } },
        amount: totalPrice,
        description
      });

      console.log(`  ✅ Work Item ditambahkan: ${description} (${currentCategory} > ${currentSubCategory})`);
    }

    // Gunakan budget dari WAP sheet, tapi validasi dengan BOQ jika perlu
    let finalBudget = budgetFromWAP || 0;
    const boqTotal = detectExplicitBudgetWAP(boqData);

    if (boqTotal && Math.abs(finalBudget - boqTotal) > 1000) {
      console.warn(`⚠️ Budget WAP (${finalBudget.toLocaleString("id-ID")}) berbeda dengan BOQ (${boqTotal.toLocaleString("id-ID")})`);
      console.log(`📊 Menggunakan budget dari WAP: ${finalBudget.toLocaleString("id-ID")}`);
    }

    // Buat SPK
    const spkData = {
      spkNo: metadata.spkNo,
      wapNo: metadata.wapNo,
      title: metadata.workTitle,
      projectName: metadata.projectName,
      contractor: metadata.assignedTo,
      date: issuedDate || new Date(),
      startDate: startDate,
      endDate: endDate,
      duration: parseInt(metadata.duration) || 0,
      workDescription: metadata.workDetailDescription,
      location: area._id,
      budget: finalBudget,
      workItems
    };

    const newSPK = await SPK.create(spkData);
    console.log(`🎉 SPK "${metadata.spkNo}" berhasil disimpan ke database.`);
    console.log(`💰 Budget: ${finalBudget.toLocaleString("id-ID")}`);
    console.log(`📦 Total Work Items: ${workItems.length}`);
    console.log(`🚀 Start Date: ${startDate ? startDate.toLocaleDateString('id-ID') : 'N/A'}`);
    console.log(`🏁 End Date: ${endDate ? endDate.toLocaleDateString('id-ID') : 'N/A'}`);

    return newSPK;

  } catch (error) {
    console.error("❌ Error import:", error.message);
    throw error;
  }
}

// Fungsi untuk menampilkan semua item BOQ dengan detail
async function displayBOQItems(filePath) {
  try {
    console.log("📥 Membaca file Excel WAP untuk analisis BOQ...");
    const workbook = XLSX.readFile(filePath);

    // Cek sheet yang tersedia
    console.log("📋 Sheet yang tersedia:", Object.keys(workbook.Sheets));

    const boqSheet = workbook.Sheets["BOQ."];
    if (!boqSheet) {
      throw new Error("❌ Sheet 'BOQ.' tidak ditemukan.");
    }

    const boqData = XLSX.utils.sheet_to_json(boqSheet, { header: 1 });
    console.log(`📊 Jumlah baris di sheet BOQ.: ${boqData.length}`);

    console.log("\n🔍 MENCARI HEADER BOQ:");
    console.log("=".repeat(50));

    const boqStart = detectBOQStartWAP(boqData);
    if (boqStart <= 0) {
      throw new Error("❌ Header BOQ tidak ditemukan.");
    }

    console.log("\n📋 DAFTAR SEMUA ITEM BOQ:");
    console.log("=".repeat(80));

    let currentCategory = "";
    let currentSubCategory = "";
    let itemCount = 0;
    let categoryCount = 0;
    let subCategoryCount = 0;

    for (let i = boqStart; i < boqData.length; i++) {
      const row = boqData[i];
      if (!Array.isArray(row) || row.length < 3) continue;

      // Skip baris TOTAL
      if (row[0] && typeof row[0] === 'string' && row[0].toLowerCase().includes('total')) {
        console.log(`\n📊 MENCAPAI BARIS TOTAL - SELESAI`);
        console.log(`📄 Baris TOTAL: [${row.join(' | ')}]`);
        break;
      }

      const description = row[0]?.toString().trim();
      const unit = row[1]?.toString().trim();
      const nonRemoteRate = parseFloat(row[2]) || 0;
      const nonRemoteQty = parseFloat(row[3]) || 0;
      const remoteRate = parseFloat(row[4]) || 0;
      const remoteQty = parseFloat(row[5]) || 0;
      const totalPrice = parseFloat(row[6]) || 0;

      // Skip jika tidak ada description
      if (!description) continue;

      // Kategorisasi
      if (!unit || unit === "") {
        // Cek apakah ini kategori utama atau subkategori
        const isMainCategory = description === description.toUpperCase() ||
          description.includes('&') ||
          !description.startsWith(' ');

        if (isMainCategory) {
          currentCategory = description;
          currentSubCategory = "";
          categoryCount++;
          console.log(`\n📂 KATEGORI ${categoryCount}: ${currentCategory}`);
          console.log("─".repeat(60));
        } else {
          currentSubCategory = description.trim();
          subCategoryCount++;
          console.log(`\n  📁 SUBKATEGORI ${subCategoryCount}: ${currentSubCategory}`);
          console.log("  " + "─".repeat(55));
        }
      } else {
        // Work Item
        itemCount++;
        console.log(`\n    ${itemCount}. 📄 ${description}`);
        console.log(`       📏 Unit: ${unit}`);
        console.log(`       💰 Non Remote: Rate=${nonRemoteRate.toLocaleString("id-ID")} x Qty=${nonRemoteQty}`);
        console.log(`       🌍 Remote: Rate=${remoteRate.toLocaleString("id-ID")} x Qty=${remoteQty}`);
        console.log(`       💵 Total Price: ${totalPrice.toLocaleString("id-ID")}`);
        console.log(`       🏷️  Kategori: ${currentCategory} > ${currentSubCategory}`);
        console.log("       " + "·".repeat(50));
      }
    }

    console.log("\n📊 RINGKASAN BOQ:");
    console.log("=".repeat(50));
    console.log(`📂 Total Kategori: ${categoryCount}`);
    console.log(`📁 Total Sub-Kategori: ${subCategoryCount}`);
    console.log(`📄 Total Work Items: ${itemCount}`);

    // Cari total budget
    const budgetFromBOQ = detectExplicitBudgetWAP(boqData);
    if (budgetFromBOQ) {
      console.log(`💰 Total Budget: ${budgetFromBOQ.toLocaleString("id-ID")}`);
    }

    return {
      categories: categoryCount,
      subCategories: subCategoryCount,
      workItems: itemCount,
      totalBudget: budgetFromBOQ
    };

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

// Update fungsi untuk import dan save semua BOQ items dengan struktur kolom yang benar
async function importAndDisplayBOQItems(filePath) {
  try {
    console.log("📥 Membaca file Excel WAP untuk import BOQ ke database...");
    const workbook = XLSX.readFile(filePath);

    const boqSheet = workbook.Sheets["BOQ."];
    if (!boqSheet) {
      throw new Error("❌ Sheet 'BOQ.' tidak ditemukan.");
    }

    const boqData = XLSX.utils.sheet_to_json(boqSheet, { header: 1 });
    console.log(`📊 Jumlah baris di sheet BOQ.: ${boqData.length}`);

    console.log("\n🔍 MENCARI HEADER BOQ:");
    const boqStart = detectBOQStartWAP(boqData);
    if (boqStart <= 0) {
      throw new Error("❌ Header BOQ tidak ditemukan.");
    }

    console.log("\n📋 ANALISIS STRUKTUR BOQ FLEKSIBEL:");
    console.log("=".repeat(70));

    let currentCategory = "";
    let currentSubCategory = "";
    let itemCount = 0;
    let categoryCount = 0;
    let subCategoryCount = 0;
    const savedWorkItems = [];

    for (let i = boqStart; i < boqData.length; i++) {
      const row = boqData[i];
      if (!Array.isArray(row) || row.length < 3) continue;

      // Skip baris TOTAL
      if (row[0] && typeof row[0] === 'string' && row[0].toLowerCase().includes('total')) {
        console.log(`\n📊 MENCAPAI BARIS TOTAL - SELESAI PROCESSING`);
        break;
      }

      console.log(`\n📄 Baris ${i + 1}:`);

      // Tampilkan semua kolom untuk debugging
      for (let j = 0; j < Math.min(row.length, 8); j++) {
        console.log(`   Col${j}: "${row[j] || ''}" (${typeof row[j]})`);
      }

      // Cari semua nilai string yang bukan kosong di baris ini
      const stringValues = row.filter(cell => typeof cell === 'string' && cell.trim() !== '');
      const numericValues = row.filter(cell => typeof cell === 'number' && cell > 0);

      console.log(`   String values: [${stringValues.join(', ')}]`);
      console.log(`   Numeric values: [${numericValues.join(', ')}]`);

      // Logika penentuan tipe baris
      if (stringValues.length === 1 && numericValues.length === 0) {
        // Hanya ada 1 string, tidak ada numeric → bisa kategori atau sub kategori
        const singleString = stringValues[0];

        if (!currentCategory) {
          // Belum ada kategori → ini kategori
          currentCategory = singleString;
          categoryCount++;
          console.log(`   📂 KATEGORI ${categoryCount}: ${currentCategory}`);
        } else if (singleString.toLowerCase().includes('install') ||
          singleString.toLowerCase().includes('earthworks') ||
          singleString.toLowerCase().includes('structural') ||
          singleString.toLowerCase().includes('miscellaneous') ||
          singleString.toLowerCase().includes('removal') ||
          singleString.toLowerCase().includes('survey') ||
          singleString.toLowerCase().includes('laboratory')) {
          // Pattern sub kategori yang umum
          currentSubCategory = singleString;
          subCategoryCount++;
          console.log(`   📁 SUB KATEGORI ${subCategoryCount}: ${currentSubCategory}`);
        } else {
          // Tidak cocok pattern, mungkin kategori baru
          currentCategory = singleString;
          currentSubCategory = "";
          categoryCount++;
          console.log(`   📂 KATEGORI BARU ${categoryCount}: ${currentCategory}`);
        }

      } else if (stringValues.length >= 1 && numericValues.length > 0) {
        // Ada string DAN ada numeric → ini work item
        itemCount++;

        // Cari work item name (string terpanjang atau yang pertama yang bukan unit)
        let workItemName = "";
        let unit = "";

        // Coba cari pattern yang masuk akal
        for (const str of stringValues) {
          if (str.toLowerCase().includes('pile') ||
            str.toLowerCase().includes('install') ||
            str.toLowerCase().includes('excavation') ||
            str.toLowerCase().includes('steel') ||
            str.toLowerCase().includes('concrete') ||
            str.toLowerCase().includes('test') ||
            str.length > 10) {
            workItemName = str;
            break;
          }
        }

        // Jika tidak ketemu pattern, ambil string pertama
        if (!workItemName) {
          workItemName = stringValues[0];
        }

        // Cari unit (string yang pendek dan umum)
        for (const str of stringValues) {
          if (str !== workItemName &&
            (str.toLowerCase() === 'meter' ||
              str.toLowerCase() === 'kilogram' ||
              str.toLowerCase() === 'each' ||
              str.toLowerCase() === 'test' ||
              str.toLowerCase() === 'package' ||
              str.toLowerCase() === 'cu.' ||
              str.toLowerCase() === 'sq.' ||
              str.length < 10)) {
            unit = str;
            break;
          }
        }

        if (!unit) unit = "Unit";

        // Ambil data numeric dari posisi yang tepat berdasarkan struktur Excel
        const nonRemoteRate = parseFloat(row[2]) || 0;
        const nonRemoteQty = parseFloat(row[3]) || 0;
        const remoteRate = parseFloat(row[4]) || 0;
        const remoteQty = parseFloat(row[5]) || 0;
        const totalPrice = parseFloat(row[6]) || 0;

        console.log(`   ✅ WORK ITEM ${itemCount}: "${workItemName}"`);
        console.log(`      📏 Unit: "${unit}"`);

        // Pastikan ada kategori dan sub kategori
        if (!currentCategory) {
          currentCategory = "GENERAL";
          console.warn(`      ⚠️ Tidak ada kategori, pakai default: GENERAL`);
        }

        if (!currentSubCategory) {
          currentSubCategory = "GENERAL";
          console.warn(`      ⚠️ Tidak ada sub kategori, pakai default: GENERAL`);
        }

        try {
          // Buat/cari kategori, subkategori, unit
          const category = await findOrCreate(Category, { name: currentCategory }, { code: currentCategory.slice(0, 5) });
          const subCategory = await findOrCreate(SubCategory, { name: currentSubCategory, categoryId: category._id });
          const unitDoc = await findOrCreate(Unit, { name: unit }, { code: unit });

          // Buat/cari work item
          const workItemData = {
            name: workItemName,
            categoryId: category._id,
            subCategoryId: subCategory._id,
            unitId: unitDoc._id,
            description: workItemName,
            rates: {
              nr: {
                rate: nonRemoteRate,
                description: 'Non-remote rate'
              },
              r: {
                rate: remoteRate,
                description: 'Remote rate'
              }
            }
          };

          const workItem = await findOrCreate(WorkItem, { name: workItemName }, workItemData);

          savedWorkItems.push({
            _id: workItem._id,
            name: workItem.name,
            category: category.name,
            subCategory: subCategory.name,
            unit: unitDoc.name,
            rates: workItem.rates,
            nonRemoteQty,
            remoteQty,
            totalPrice,
            createdAt: workItem.createdAt,
            updatedAt: workItem.updatedAt
          });

          console.log(`      💾 Tersimpan: ID=${workItem._id}`);
          console.log(`      🏷️  ${category.name} > ${subCategory.name}`);
          console.log(`      💰 NR Rate: ${nonRemoteRate} | NR Qty: ${nonRemoteQty}`);
          console.log(`      🌍 R Rate: ${remoteRate} | R Qty: ${remoteQty}`);
          console.log(`      💵 Total Price: ${totalPrice.toLocaleString("id-ID")}`);

        } catch (error) {
          console.error(`      ❌ Error menyimpan work item: ${error.message}`);
        }

      } else {
        console.log(`   ⏭️  Skip - tidak ada pattern yang cocok`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 RINGKASAN IMPORT BOQ:");
    console.log("=".repeat(80));
    console.log(`📂 Total Kategori: ${categoryCount}`);
    console.log(`📁 Total Sub-Kategori: ${subCategoryCount}`);
    console.log(`📄 Total Work Items Tersimpan: ${savedWorkItems.length}`);

    // Tampilkan struktur hierarkis
    console.log("\n📋 STRUKTUR HIERARKIS YANG TERSIMPAN:");
    console.log("=".repeat(80));

    const structure = {};
    savedWorkItems.forEach(item => {
      if (!structure[item.category]) {
        structure[item.category] = {};
      }
      if (!structure[item.category][item.subCategory]) {
        structure[item.category][item.subCategory] = [];
      }
      structure[item.category][item.subCategory].push(item);
    });

    Object.entries(structure).forEach(([categoryName, subCategories]) => {
      console.log(`\n📂 ${categoryName}`);
      console.log("─".repeat(60));

      Object.entries(subCategories).forEach(([subCategoryName, items]) => {
        console.log(`\n  📁 ${subCategoryName} (${items.length} items)`);
        console.log("  " + "─".repeat(55));

        items.forEach((item, index) => {
          console.log(`    ${index + 1}. 📄 ${item.name}`);
          console.log(`       📏 Unit: ${item.unit}`);
          console.log(`       💰 NR: ${item.rates.nr.rate.toLocaleString("id-ID")} x ${item.nonRemoteQty}`);
          console.log(`       🌍 R: ${item.rates.r.rate.toLocaleString("id-ID")} x ${item.remoteQty}`);
          console.log(`       💵 Total: ${item.totalPrice.toLocaleString("id-ID")}`);
        });
      });
    });

    return {
      categories: categoryCount,
      subCategories: subCategoryCount,
      workItems: savedWorkItems.length
    };

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

// Fungsi gabungan untuk import WAP + BOQ sekaligus
async function importCompleteWAPBOQ(filePath) {
  try {
    console.log("📥 Memulai import lengkap WAP + BOQ...");
    const workbook = XLSX.readFile(filePath);

    // Cek sheet yang tersedia
    console.log("📋 Sheet yang tersedia:", Object.keys(workbook.Sheets));

    // Validasi sheets
    if (!workbook.Sheets["WAP"]) throw new Error("❌ Sheet 'WAP' tidak ditemukan.");
    if (!workbook.Sheets["BOQ."]) throw new Error("❌ Sheet 'BOQ.' tidak ditemukan.");

    const wapData = XLSX.utils.sheet_to_json(workbook.Sheets["WAP"], { header: 1 });
    const boqData = XLSX.utils.sheet_to_json(workbook.Sheets["BOQ."], { header: 1 });

    console.log(`📊 WAP: ${wapData.length} baris | BOQ: ${boqData.length} baris`);

    // ============== BAGIAN 1: EKSTRAKSI METADATA WAP ==============
    console.log("\n" + "=".repeat(80));
    console.log("📋 BAGIAN 1: EKSTRAKSI METADATA DARI SHEET WAP");
    console.log("=".repeat(80));

    const metadata = {};
    for (const key in wapLabelMap) {
      metadata[key] = getWAPLabelValue(wapData, key);
      if (metadata[key]) {
        console.log(`✅ ${key}: ${metadata[key]}`);
      }
    }

    // Ekstrak work description dan budget
    metadata.workDetailDescription = extractWorkDetailDescriptionWAP(wapData);
    const budgetFromWAP = getWAPBudgetValue(wapData);

    // Parse tanggal
    const issuedDate = parseDateSafeWAP(metadata.issuedDate);
    const startDate = parseDateSafeWAP(metadata.startDate);
    const endDate = parseDateSafeWAP(metadata.endDate);

    console.log(`📅 Issued Date: ${issuedDate ? issuedDate.toLocaleDateString('id-ID') : 'N/A'}`);
    console.log(`📅 Start Date: ${startDate ? startDate.toLocaleDateString('id-ID') : 'N/A'}`);
    console.log(`📅 End Date: ${endDate ? endDate.toLocaleDateString('id-ID') : 'N/A'}`);
    console.log(`💰 Budget: ${budgetFromWAP ? budgetFromWAP.toLocaleString("id-ID") : 'N/A'}`);

    // ============== BAGIAN 2: SETUP AREA ==============
    console.log("\n" + "=".repeat(80));
    console.log("📋 BAGIAN 2: SETUP AREA");
    console.log("=".repeat(80));

    const locationName = metadata.networkArea || metadata.location || "Unknown Location";
    console.log(`🔍 Mencari/membuat area: "${locationName}"`);

    const area = await findOrCreate(
      Area,
      { name: locationName },
      { location: { type: 'Point', coordinates: [101.0, -1.0] } }
    );

    // ============== BAGIAN 3: PROSES BOQ ==============
    console.log("\n" + "=".repeat(80));
    console.log("📋 BAGIAN 3: PROSES BOQ DAN SIMPAN WORK ITEMS");
    console.log("=".repeat(80));

    const boqStart = detectBOQStartWAP(boqData);
    if (boqStart <= 0) throw new Error("❌ Header BOQ tidak ditemukan.");

    let currentCategory = "";
    let currentSubCategory = "";
    let itemCount = 0;
    let categoryCount = 0;
    let subCategoryCount = 0;
    const workItems = [];

    for (let i = boqStart; i < boqData.length; i++) {
      const row = boqData[i];
      if (!Array.isArray(row) || row.length < 3) continue;

      // Skip baris TOTAL
      if (row[0] && typeof row[0] === 'string' && row[0].toLowerCase().includes('total')) {
        console.log(`\n📊 MENCAPAI BARIS TOTAL - SELESAI PROCESSING BOQ`);
        break;
      }

      // Cari semua nilai string dan numeric
      const stringValues = row.filter(cell => typeof cell === 'string' && cell.trim() !== '');
      const numericValues = row.filter(cell => typeof cell === 'number' && cell > 0);

      if (stringValues.length === 1 && numericValues.length === 0) {
        // Kategori atau Sub Kategori
        const singleString = stringValues[0];

        if (!currentCategory) {
          currentCategory = singleString;
          categoryCount++;
          console.log(`📂 KATEGORI ${categoryCount}: ${currentCategory}`);
        } else if (singleString.toLowerCase().includes('install') ||
          singleString.toLowerCase().includes('earthworks') ||
          singleString.toLowerCase().includes('structural') ||
          singleString.toLowerCase().includes('miscellaneous') ||
          singleString.toLowerCase().includes('removal') ||
          singleString.toLowerCase().includes('survey') ||
          singleString.toLowerCase().includes('laboratory')) {
          currentSubCategory = singleString;
          subCategoryCount++;
          console.log(`📁 SUB KATEGORI ${subCategoryCount}: ${currentSubCategory}`);
        } else {
          currentCategory = singleString;
          currentSubCategory = "";
          categoryCount++;
          console.log(`📂 KATEGORI BARU ${categoryCount}: ${currentCategory}`);
        }

      } else if (stringValues.length >= 1 && numericValues.length > 0) {
        // Work Item
        itemCount++;

        // Cari work item name
        let workItemName = "";
        let unit = "";

        for (const str of stringValues) {
          if (str.toLowerCase().includes('pile') ||
            str.toLowerCase().includes('install') ||
            str.toLowerCase().includes('excavation') ||
            str.toLowerCase().includes('steel') ||
            str.toLowerCase().includes('concrete') ||
            str.toLowerCase().includes('test') ||
            str.length > 10) {
            workItemName = str;
            break;
          }
        }

        if (!workItemName) workItemName = stringValues[0];

        // Cari unit
        for (const str of stringValues) {
          if (str !== workItemName &&
            (str.toLowerCase() === 'meter' ||
              str.toLowerCase() === 'kilogram' ||
              str.toLowerCase() === 'each' ||
              str.toLowerCase() === 'test' ||
              str.toLowerCase() === 'package' ||
              str.toLowerCase() === 'cu.' ||
              str.toLowerCase() === 'sq.' ||
              str.length < 10)) {
            unit = str;
            break;
          }
        }

        if (!unit) unit = "Unit";

        // Ambil data numeric
        const nonRemoteRate = parseFloat(row[2]) || 0;
        const nonRemoteQty = parseFloat(row[3]) || 0;
        const remoteRate = parseFloat(row[4]) || 0;
        const remoteQty = parseFloat(row[5]) || 0;

        console.log(`📄 WORK ITEM ${itemCount}: "${workItemName}" (${unit})`);

        // Set default jika perlu
        if (!currentCategory) {
          currentCategory = "GENERAL";
        }
        if (!currentSubCategory) {
          currentSubCategory = "GENERAL";
        }

        try {
          // Cari/buat kategori, subkategori, unit dengan cek duplikasi
          const category = await findOrCreate(Category, { name: currentCategory }, { code: currentCategory.slice(0, 5) });
          const subCategory = await findOrCreate(SubCategory, { name: currentSubCategory, categoryId: category._id });
          const unitDoc = await findOrCreate(Unit, { name: unit }, { code: unit });

          // Cari/buat work item dengan cek duplikasi
          const workItemData = {
            name: workItemName,
            categoryId: category._id,
            subCategoryId: subCategory._id,
            unitId: unitDoc._id,
            description: workItemName,
            rates: {
              nr: {
                rate: nonRemoteRate,
                description: 'Non-remote rate'
              },
              r: {
                rate: remoteRate,
                description: 'Remote rate'
              }
            }
          };

          const workItem = await findOrCreate(WorkItem, { name: workItemName }, workItemData);

          // Simpan untuk SPK (tanpa total price karena tidak ada di model)
          workItems.push({
            workItemId: workItem._id,
            boqVolume: { nr: nonRemoteQty, r: remoteQty },
            rates: { nr: { rate: nonRemoteRate }, r: { rate: remoteRate } },
            description: workItemName
          });

          console.log(`   ✅ Tersimpan: ${workItemName} (${category.name} > ${subCategory.name})`);

        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
        }
      }
    }

    // ============== BAGIAN 4: BUAT SPK ==============
    console.log("\n" + "=".repeat(80));
    console.log("📋 BAGIAN 4: MEMBUAT SPK");
    console.log("=".repeat(80));

    const spkData = {
      spkNo: metadata.spkNo,
      wapNo: metadata.wapNo,
      title: metadata.workTitle,
      projectName: metadata.projectName,
      contractor: metadata.assignedTo,
      date: issuedDate || new Date(),
      startDate: startDate,
      endDate: endDate,
      duration: parseInt(metadata.duration) || 0,
      workDescription: metadata.workDetailDescription,
      location: area._id,
      budget: budgetFromWAP || 0,
      workItems
    };

    // Cek apakah SPK sudah ada
    const existingSPK = await SPK.findOne({ spkNo: metadata.spkNo });
    let newSPK;

    if (existingSPK) {
      console.log(`⚠️  SPK "${metadata.spkNo}" sudah ada, akan diupdate...`);
      newSPK = await SPK.findByIdAndUpdate(existingSPK._id, spkData, { new: true });
      console.log(`🔄 SPK "${metadata.spkNo}" berhasil diupdate.`);
    } else {
      newSPK = await SPK.create(spkData);
      console.log(`🆕 SPK "${metadata.spkNo}" berhasil dibuat.`);
    }

    // ============== BAGIAN 5: RINGKASAN ==============
    console.log("\n" + "=".repeat(80));
    console.log("📊 RINGKASAN IMPORT LENGKAP");
    console.log("=".repeat(80));

    const totalWorkItems = await WorkItem.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalSubCategories = await SubCategory.countDocuments();
    const totalUnits = await Unit.countDocuments();
    const totalAreas = await Area.countDocuments();
    const totalSPKs = await SPK.countDocuments();

    console.log(`🎉 BERHASIL IMPORT SPK: ${metadata.spkNo}`);
    console.log(`📋 SPK ID: ${newSPK._id}`);
    console.log(`💰 Budget: ${(budgetFromWAP || 0).toLocaleString("id-ID")}`);
    console.log(`📦 Work Items di SPK: ${workItems.length}`);
    console.log(`📅 Periode: ${startDate ? startDate.toLocaleDateString('id-ID') : 'N/A'} - ${endDate ? endDate.toLocaleDateString('id-ID') : 'N/A'}`);

    console.log(`\n📊 TOTAL DATA DI DATABASE:`);
    console.log(`📄 Total SPKs: ${totalSPKs}`);
    console.log(`📦 Total WorkItems: ${totalWorkItems}`);
    console.log(`📂 Total Categories: ${totalCategories}`);
    console.log(`📁 Total SubCategories: ${totalSubCategories}`);
    console.log(`📏 Total Units: ${totalUnits}`);
    console.log(`🌍 Total Areas: ${totalAreas}`);

    return {
      spk: newSPK,
      stats: {
        categoriesProcessed: categoryCount,
        subCategoriesProcessed: subCategoryCount,
        workItemsProcessed: itemCount,
        totalInDB: {
          spks: totalSPKs,
          workItems: totalWorkItems,
          categories: totalCategories,
          subCategories: totalSubCategories,
          units: totalUnits,
          areas: totalAreas
        }
      }
    };

  } catch (error) {
    console.error("❌ Error import:", error.message);
    throw error;
  }
}

module.exports = {
  importExcelToSPK,           // Fungsi asli untuk format lama
  importExcelWAPToSPK,        // Fungsi baru untuk format WAP
  testExtractWAPMetadata,     // Fungsi test untuk format WAP
  displayBOQItems,            // Fungsi untuk tampilkan BOQ items
  importAndDisplayBOQItems,   // Fungsi untuk import dan tampilkan dari DB
  importCompleteWAPBOQ        // Fungsi baru: import lengkap WAP + BOQ
};
