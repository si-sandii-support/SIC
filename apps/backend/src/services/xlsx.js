import ExcelJS from "exceljs";

export async function buildXlsx(blocks, title, layoutMode = "vertical") {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Selected Content", {
    pageSetup: {
      paperSize: 9,
      orientation: layoutMode === "horizontal" ? "landscape" : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      horizontalDpi: 300,
      verticalDpi: 300,
    },
  });
  const sourceBlocks = blocks || [];
  const columnWidths = [];
  const horizontal = layoutMode === "horizontal";
  let nextRow = 1;
  let nextCol = 1;

  for (const block of sourceBlocks) {
    const matrix = getBlockMatrix(block);
    if (!matrix.length) continue;
    const startRow = horizontal ? 1 : nextRow;
    const startCol = horizontal ? nextCol : 1;
    writeMatrix(sheet, block, matrix, startRow, startCol, columnWidths);
    if (horizontal) {
      nextCol += Math.max(1, ...matrix.map((row) => row.length)) + 1;
    } else {
      nextRow += matrix.length;
    }
  }

  if (!sheet.rowCount) sheet.addRow([""]);
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
  sheet.pageSetup.scale = undefined;
  sheet.pageSetup.printArea = `A1:${columnLetter(Math.max(1, sheet.columnCount))}${Math.max(1, sheet.rowCount)}`;
  sheet.pageSetup.showGridLines = true;
  if (sheet.rowCount > 1 && !horizontal) sheet.pageSetup.printTitlesRow = "1:1";
  sheet.views = [{ state: "normal", showGridLines: true }];
  sheet.columns = Array.from({ length: Math.max(1, sheet.columnCount) }, (_, i) => ({ key: `c${i + 1}`, width: columnWidths[i] || 18 }));
  const data = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(data), filename: `${safe(title)}.xlsx`, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
}

function getBlockMatrix(block) {
  if (Array.isArray(block?.spreadsheet?.matrix) && block.spreadsheet.matrix.length) {
    return block.spreadsheet.matrix.map((row) => Array.isArray(row) ? row : [row]);
  }
  const html = block?.visual?.kind === "html" ? block.visual.html : "";
  const table = html ? parseTable(html) : [];
  if (table.length) return table;
  const value = cleanText(block?.text);
  return value ? [[value]] : [];
}

function writeMatrix(sheet, block, matrix, startRow, startCol, widths) {
  const spreadsheet = block?.spreadsheet || {};
  const sourceWidths = spreadsheet.columnWidths || [];
  sourceWidths.forEach((width, offset) => {
    const absoluteIndex = startCol + offset - 1;
    const widthInChars = Math.max(1, Math.min(255, Number(width) / 7 || 18));
    widths[absoluteIndex] = Math.max(widths[absoluteIndex] || 0, widthInChars);
  });

  matrix.forEach((row, rowOffset) => {
    const values = (Array.isArray(row) ? row : [row]).map((value) => cleanText(value));
    const excelRow = sheet.getRow(startRow + rowOffset);
    const sourceRowHeight = spreadsheet.rowHeights?.[rowOffset];
    if (sourceRowHeight) excelRow.height = Math.max(excelRow.height || 0, Math.max(12, Math.min(409, Number(sourceRowHeight) * 0.75)));
    else {
      const estimatedLines = values.reduce((max, value, index) => Math.max(max, Math.ceil(String(value ?? "").length / Math.max(8, widths[startCol + index - 1] || 18))), 1);
      excelRow.height = Math.max(excelRow.height || 0, Math.min(120, 15 * estimatedLines));
    }
    values.forEach((value, colOffset) => {
      const cell = sheet.getCell(startRow + rowOffset, startCol + colOffset);
      cell.value = value;
      const sourceStyle = spreadsheet.cellStyles?.[rowOffset]?.[colOffset] || {};
      const displayLength = String(value ?? "").split("\n").reduce((max, line) => Math.max(max, line.length), 0);
      const absoluteColumn = startCol + colOffset - 1;
      widths[absoluteColumn] = Math.max(widths[absoluteColumn] || 0, Math.min(48, Math.max(10, displayLength + 2)));
      const formula = spreadsheet.formulas?.[rowOffset]?.[colOffset];
      const numberFormat = spreadsheet.numFmts?.[rowOffset]?.[colOffset];
      if (formula) cell.value = { formula: String(formula).replace(/^=/, "") };
      const blockAlign = ["left", "center", "right", "justify"].includes(block?.style?.textAlign)
        ? (block.style.textAlign === "justify" ? "distributed" : block.style.textAlign)
        : undefined;
      cell.alignment = {
        vertical: sourceStyle.alignment?.vertical || "top",
        horizontal: sourceStyle.alignment?.horizontal || blockAlign,
        wrapText: sourceStyle.alignment?.wrapText ?? true,
        shrinkToFit: false,
      };
      if (block?.style?.fontFamily || block?.style?.fontSize || block?.style?.fontWeight || block?.style?.fontStyle) {
        cell.font = {
          ...(sourceStyle.font || {}),
          ...(block.style.fontFamily ? { name: String(block.style.fontFamily).split(",")[0].replace(/[\"']/g, "").trim() } : {}),
          ...(block.style.fontSize ? { size: Math.max(6, Math.min(72, (Number(block.style.fontSize) || 16) * 0.75)) } : {}),
          ...(block.style.fontWeight ? { bold: Number(block.style.fontWeight) >= 600 } : {}),
          ...(block.style.fontStyle ? { italic: block.style.fontStyle === "italic" } : {}),
        };
      }
      if (sourceStyle.font) cell.font = sourceStyle.font;
      if (sourceStyle.fill) cell.fill = sourceStyle.fill;
      if (sourceStyle.border) cell.border = sourceStyle.border;
      else cell.border = thinBorder();
      if (sourceStyle.numFmt || numberFormat) cell.numFmt = sourceStyle.numFmt || numberFormat;
    });
  });
}

function parseTable(html) { return [...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => decode(cleanText(c[1].replace(/<[^>]+>/g, " "))).trim())); }
function decode(v) { return String(v).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }
function cleanText(value) { return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\uFFFD/g, ""); }
function thinBorder() { return { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; }
function safe(s) { return String(s || "").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_") || "selected_content"; }
function columnLetter(number) { let n = Math.max(1, Number(number) || 1), out = ""; while (n > 0) { const rem = (n - 1) % 26; out = String.fromCharCode(65 + rem) + out; n = Math.floor((n - 1) / 26); } return out; }
