const { createCanvas } = require("canvas");

/**
 * Draws a rounded rectangle path.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {number} width - Rectangle width.
 * @param {number} height - Rectangle height.
 * @param {number} radius - Corner radius.
 * @returns {CanvasRenderingContext2D} - The same context (for chaining).
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  return ctx;
}

/**
 * Generates a fancy table image from a 2D array.
 *
 * @param {string[][]} data - A 2D array of strings. The first row is the header.
 * @param {Object} [options] - Optional settings.
 * @param {number} [options.canvasWidth=800] - Total canvas width.
 * @param {number} [options.tablePadding=40] - Padding around the table.
 * @param {string} [options.title] - Optional title to display on top.
 * @param {string} [options.titleFont="bold 30px Arial"] - Font for the title.
 * @param {number} [options.titleHeight=60] - Height of the title area.
 * @param {number} [options.headerHeight=60] - Height of the header row.
 * @param {number} [options.rowHeight=40] - Height of each subsequent row.
 * @param {number} options.numCols - Number of columns to render.
 * @param {number} options.numRows - Number of rows to render (including header).
 * @param {string} [options.headerFont="bold 24px Arial"] - Font for header text.
 * @param {string} [options.bodyFont="20px Arial"] - Font for body text.
 * @param {number} [options.tableBorderRadius=10] - Radius for rounded table corners.
 * @returns {Canvas} - The generated canvas.
 */
function generateTableImage(data, options = {}) {
  const canvasWidth = options.canvasWidth || 800;
  const tablePadding = options.tablePadding || 40;
  const title = options.title || "";
  const titleFont = options.titleFont || "bold 30px Arial";
  const titleHeight = title ? options.titleHeight || 60 : 0;
  const headerHeight = options.headerHeight || 60;
  const rowHeight = options.rowHeight || 40;
  const numCols = options.numCols;
  const numRows = options.numRows;
  const headerFont = options.headerFont || "bold 24px Arial";
  const bodyFont = options.bodyFont || "20px Arial";
  const tableBorderRadius = options.tableBorderRadius || 10;

  // Calculate table dimensions.
  const tableWidth = canvasWidth - tablePadding * 2;
  const colWidth = tableWidth / numCols;
  // Table height is header plus body rows (numRows includes header).
  const tableHeight = headerHeight + (numRows - 1) * rowHeight;
  // Total canvas height includes top padding, title area, table, and bottom padding.
  const canvasHeight = tablePadding + titleHeight + tableHeight + tablePadding;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // Set a fancy gradient background for the entire canvas.
  const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  bgGradient.addColorStop(0, "#232526");
  bgGradient.addColorStop(1, "#414345");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw the title (if provided).
  if (title) {
    ctx.font = titleFont;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Add a subtle shadow for extra flair.
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(title, canvasWidth / 2, tablePadding + titleHeight / 2);
    ctx.shadowBlur = 0;
  }

  // Define the top-left corner of the table (below the title).
  const tableX = tablePadding;
  const tableY = tablePadding + titleHeight;

  // Draw the table background with rounded corners and drop shadow.
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(
    ctx,
    tableX,
    tableY,
    tableWidth,
    tableHeight,
    tableBorderRadius
  ).fill();
  ctx.restore();

  // Draw the table border.
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#cccccc";
  drawRoundedRect(
    ctx,
    tableX,
    tableY,
    tableWidth,
    tableHeight,
    tableBorderRadius
  ).stroke();
  ctx.restore();

  // Draw header background with a gradient.
  const headerGradient = ctx.createLinearGradient(
    tableX,
    tableY,
    tableX,
    tableY + headerHeight
  );
  headerGradient.addColorStop(0, "#4e54c8");
  headerGradient.addColorStop(1, "#8f94fb");
  ctx.save();
  // Clip to the header area with rounded top corners.
  ctx.beginPath();
  ctx.moveTo(tableX + tableBorderRadius, tableY);
  ctx.lineTo(tableX + tableWidth - tableBorderRadius, tableY);
  ctx.quadraticCurveTo(
    tableX + tableWidth,
    tableY,
    tableX + tableWidth,
    tableY + tableBorderRadius
  );
  ctx.lineTo(tableX + tableWidth, tableY + headerHeight);
  ctx.lineTo(tableX, tableY + headerHeight);
  ctx.lineTo(tableX, tableY + tableBorderRadius);
  ctx.quadraticCurveTo(tableX, tableY, tableX + tableBorderRadius, tableY);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = headerGradient;
  ctx.fillRect(tableX, tableY, tableWidth, headerHeight);
  ctx.restore();

  // Draw header text.
  ctx.font = headerFont;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (let col = 0; col < numCols; col++) {
    const headerText = (data[0] && data[0][col]) || "";
    const x = tableX + col * colWidth + 10;
    const y = tableY + headerHeight / 2;
    ctx.fillText(headerText, x, y);
  }

  // Draw grid lines for body rows.
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1;
  for (let row = 1; row < numRows; row++) {
    const y = tableY + headerHeight + (row - 1) * rowHeight;
    ctx.beginPath();
    ctx.moveTo(tableX, y);
    ctx.lineTo(tableX + tableWidth, y);
    ctx.stroke();
  }
  for (let col = 1; col < numCols; col++) {
    const x = tableX + col * colWidth;
    ctx.beginPath();
    ctx.moveTo(x, tableY + headerHeight);
    ctx.lineTo(x, tableY + tableHeight);
    ctx.stroke();
  }

  // Draw body rows text with alternating background colors.
  ctx.font = bodyFont;
  for (let row = 1; row < numRows; row++) {
    const rowData = data[row] || [];
    if (row % 2 === 1) {
      const cellY = tableY + headerHeight + (row - 1) * rowHeight;
      ctx.fillStyle = "rgba(240,240,240,0.7)";
      ctx.fillRect(tableX, cellY, tableWidth, rowHeight);
    }
    for (let col = 0; col < numCols; col++) {
      const cellText = rowData[col] || "";
      const x = tableX + col * colWidth + 10;
      const y = tableY + headerHeight + (row - 1) * rowHeight + rowHeight / 2;
      ctx.fillStyle = "#333333";
      ctx.fillText(cellText, x, y);
    }
  }

  return canvas;
}

module.exports = { generateTableImage };
