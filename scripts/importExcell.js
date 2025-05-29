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
  projectName: ["Project Name", "Operation Unit"],
  location: ["Work Location", "Lokasi"],
  permittingType: ["Permitting Type", "Tipe Perizinan"],
  originator: ["Originator"],
  teamName: ["Team Name"],
  startDate: ["Start Date:"],
  endDate: ["End Date:"],
  duration: ["Duration"]
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

function extractWorkDescription(sheetData, beforeRow) {
  const lines = [];
  for (let i = 0; i < beforeRow; i++) {
    const row = sheetData[i];
    const joined = row?.filter(cell => typeof cell === 'string').join(' ').trim();
    if (joined && joined.length > 10) lines.push(joined);
  }
  return lines.join('\n').trim();
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

module.exports = { importExcelToSPK };
