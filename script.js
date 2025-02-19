const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// --- FTP Configuration ---
const CONFIG = {
  host: "ftp.nitroserv.games", // FTP server address
  port: 21, // FTP port
  user: "53323-id", // FTP username
  password: "azer", // FTP password (fill in if needed)
  remotePath: "/Minecraft/world/cobblemonplayerdata", // Remote directory with player data
  localPath: "./cobblemonplayerdata", // Local directory where files will be saved
  remoteUserCache: "/Minecraft/usercache.json", // Remote location of usercache.json
};

// --- Scoreboard Configuration ---
const OUTPUT_IMAGE = "scoreboard.png";
// Download the user cache into the same folder as player data
const USER_CACHE_FILE = path.join(CONFIG.localPath, "usercache.json");

// -------------------------------------------
// FTP Download Section
// -------------------------------------------
/**
 * Recursively downloads a folder from the FTP server.
 * @param {ftp.Client} client - The FTP client.
 * @param {string} remoteFolder - The remote folder path.
 * @param {string} localFolder - The local folder path.
 */
async function downloadFolder(client, remoteFolder, localFolder) {
  // Create local folder if it doesn't exist
  if (!fs.existsSync(localFolder)) {
    fs.mkdirSync(localFolder, { recursive: true });
  }

  // List items in the current remote folder
  const fileList = await client.list(remoteFolder);

  for (const file of fileList) {
    // Construct full remote and local paths.
    const remoteFilePath = `${remoteFolder}/${file.name}`;
    const localFilePath = path.join(localFolder, file.name);

    if (file.type === ftp.FileType.Directory) {
      console.log(`Entering directory: ${remoteFilePath}`);
      // Recursively download the subdirectory
      await downloadFolder(client, remoteFilePath, localFilePath);
    } else if (file.type === ftp.FileType.File) {
      console.log(`Downloading file: ${remoteFilePath} to ${localFilePath}`);
      // Download the file to the specified local path
      await client.downloadTo(localFilePath, remoteFilePath);
    }
  }
}

/**
 * Downloads the user cache file from FTP.
 * @param {ftp.Client} client - The FTP client.
 * @param {string} remotePath - The remote path to the usercache.json file.
 * @param {string} localFile - The local file path to save the usercache.json.
 */
async function downloadUserCache(client, remotePath, localFile) {
  // Ensure the local directory exists
  const localDir = path.dirname(localFile);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  console.log(`Downloading user cache from ${remotePath} to ${localFile}`);
  await client.downloadTo(localFile, remotePath);
}

async function downloadPlayerData() {
  const client = new ftp.Client();
  client.ftp.verbose = true; // Enable detailed logging (optional)

  try {
    // Connect to the FTP server
    await client.access({
      host: CONFIG.host,
      port: CONFIG.port,
      user: CONFIG.user,
      password: CONFIG.password,
      secure: false, // Set to true if your server requires FTPS
    });
    console.log("Connected to FTP server.");

    // Download player data
    await downloadFolder(client, CONFIG.remotePath, CONFIG.localPath);
    // Download usercache.json from its remote location
    await downloadUserCache(client, CONFIG.remoteUserCache, USER_CACHE_FILE);
    console.log("Download complete.");
  } catch (err) {
    console.error("An error occurred during FTP download:", err);
  } finally {
    client.close();
  }
}

// -------------------------------------------
// Scoreboard Generation Section
// -------------------------------------------

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

// Function to read player data from each subdirectory in CONFIG.localPath
function readPlayerData(userCache) {
  const players = [];
  // Read all directories in the local player data folder
  const directories = fs
    .readdirSync(CONFIG.localPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  directories.forEach((dir) => {
    const dirPath = path.join(CONFIG.localPath, dir);
    // Look for JSON files in the subdirectory
    const jsonFiles = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json"));
    jsonFiles.forEach((file) => {
      const filePath = path.join(dirPath, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        // Extract player's UUID and totalCaptureCount
        let uuid = data.uuid || "Unknown";
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
  ctx.fillText("Total des Pokemons capturés", 20, 40);

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

// Main execution function that downloads data and then generates the scoreboard
async function main() {
  // First, download the player data and user cache from FTP
  await downloadPlayerData();

  // Load the user cache from the downloaded usercache.json
  const userCache = loadUserCache();

  // Read player data from the downloaded files
  const players = readPlayerData(userCache);
  if (players.length === 0) {
    console.error("No player data found in the directory:", CONFIG.localPath);
    return;
  }

  // Generate the scoreboard image
  const canvas = generateScoreboard(players);
  saveCanvasToFile(canvas, OUTPUT_IMAGE);
}

main();
