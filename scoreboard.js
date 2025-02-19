const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// --- Configuration ---
const LOCAL_PATH = "./cobblemonplayerdata"; // Folder where the player data folders reside
const OUTPUT_IMAGE = "scoreboard.png";
const USER_CACHE_FILE = "./usercache.json"; // Path to usercache.json

// Load the user cache mapping (UUID -> player name)
function loadUserCache() {
  if (!fs.existsSync(USER_CACHE_FILE)) {
    console.error(`User cache file not found at ${USER_CACHE_FILE}`);
    return {};
  }
  try {
    const data = JSON.parse(fs.readFileSync(USER_CACHE_FILE, "utf8"));
    const cache = {};
    data.forEach((entry) => {
      // Normalize UUIDs to lower-case for consistency
      cache[entry.uuid.toLowerCase()] = entry.name;
    });
    return cache;
  } catch (error) {
    console.error("Error reading usercache.json:", error);
    return {};
  }
}

// Function to read player data from each subdirectory
function readPlayerData(userCache) {
  const players = [];
  // Read all directories in LOCAL_PATH
  const directories = fs
    .readdirSync(LOCAL_PATH, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  directories.forEach((dir) => {
    const dirPath = path.join(LOCAL_PATH, dir);
    // Look for JSON files (e.g., random-uuid.json) in the directory
    const jsonFiles = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json"));
    jsonFiles.forEach((file) => {
      const filePath = path.join(dirPath, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        // Extract player's UUID and totalCaptureCount
        let uuid = data.uuid || "Unknown";
        // Normalize the uuid to lower-case for cache matching
        const normalizedUUID = uuid.toLowerCase();
        // Look up the player's name from the cache; if not found, fall back to uuid
        const playerName = userCache[normalizedUUID] || uuid;
        const totalCaptureCount = data.advancementData
          ? data.advancementData.totalCaptureCount
          : 0;
        players.push({ playerName, totalCaptureCount });
      } catch (error) {
        console.error(`Error parsing file ${filePath}:`, error);
      }
    });
  });
  return players;
}

// Function to generate the scoreboard image using canvas
function generateScoreboard(players) {
  // Sort players descending by totalCaptureCount
  players.sort((a, b) => b.totalCaptureCount - a.totalCaptureCount);

  // Define canvas dimensions
  const width = 800;
  const headerHeight = 60;
  const rowHeight = 40;
  const height = headerHeight + players.length * rowHeight + 20;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Draw background
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, width, height);

  // Draw header
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("Scoreboard - Total Capture Count", 20, 40);

  // Draw a line under the header
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 50);
  ctx.lineTo(width - 20, 50);
  ctx.stroke();

  // Set font for rows
  ctx.font = "24px sans-serif";

  // Render each player's row
  const startY = headerHeight;
  players.forEach((player, index) => {
    const y = startY + index * rowHeight + 30;
    // Customize the row text (rank, player name, capture count)
    const text = `${index + 1}. ${player.playerName} - ${
      player.totalCaptureCount
    }`;
    ctx.fillText(text, 20, y);
  });

  return canvas;
}

// Function to save the canvas as a PNG file
function saveCanvasToFile(canvas, outputPath) {
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Scoreboard saved to ${outputPath}`);
}

// Main execution function
function main() {
  const userCache = loadUserCache();
  const players = readPlayerData(userCache);
  if (players.length === 0) {
    console.error("No player data found in the directory:", LOCAL_PATH);
    return;
  }
  const canvas = generateScoreboard(players);
  saveCanvasToFile(canvas, OUTPUT_IMAGE);
}

main();
