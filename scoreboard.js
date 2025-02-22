const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const { generateTableImage } = require("./tableRenderer");

// -------------------------------------------
// Configuration: Easily adjust these settings
// -------------------------------------------
const CONFIG = {
  ftp: {
    host: "ftp.nitroserv.games", // FTP server address
    port: 21, // FTP port
    user: "53323-id", // FTP username
    password: "azer", // FTP password (fill in if needed)
    remotePath: "/Minecraft/world/cobblemonplayerdata", // Remote directory with player data
    localPath: "./cobblemonplayerdata", // Local directory where files will be saved
    remoteUserCache: "/Minecraft/usercache.json", // Remote location of usercache.json
  },
  scoreboard: {
    outputImage: "scoreboard.png", // Output image file name
    numCols: 3, // Number of columns in the scoreboard table
  },
};

const TableOptions = {
  numCols: 5,
  numRows: 7,
  title: "Total Pokemons Captured",
  canvasWidth: 800,
  tablePadding: 40,
  titleFont: "bold 30px Arial",
  titleHeight: 60,
  headerHeight: 60,
  rowHeight: 40,
  headerFont: "bold 24px Arial",
  bodyFont: "20px Arial",
  tableBorderRadius: 10,
};

// Derived configuration
const USER_CACHE_FILE = path.join(CONFIG.ftp.localPath, "usercache.json");

// -------------------------------------------
// Utility: Clear Local Player Data Directory
// -------------------------------------------
function clearLocalData() {
  if (fs.existsSync(CONFIG.ftp.localPath)) {
    fs.rmSync(CONFIG.ftp.localPath, { recursive: true, force: true });
    console.log(`Cleared local player data in ${CONFIG.ftp.localPath}`);
  }
}

// -------------------------------------------
// FTP Download Section
// -------------------------------------------
async function downloadFolder(client, remoteFolder, localFolder) {
  if (!fs.existsSync(localFolder)) {
    fs.mkdirSync(localFolder, { recursive: true });
  }
  const fileList = await client.list(remoteFolder);
  for (const file of fileList) {
    const remoteFilePath = `${remoteFolder}/${file.name}`;
    const localFilePath = path.join(localFolder, file.name);
    if (file.type === ftp.FileType.Directory) {
      console.log(`Entering directory: ${remoteFilePath}`);
      await downloadFolder(client, remoteFilePath, localFilePath);
    } else if (file.type === ftp.FileType.File) {
      console.log(`Downloading file: ${remoteFilePath} to ${localFilePath}`);
      await client.downloadTo(localFilePath, remoteFilePath);
    }
  }
}

async function downloadUserCache(client, remotePath, localFile) {
  const localDir = path.dirname(localFile);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  console.log(`Downloading user cache from ${remotePath} to ${localFile}`);
  await client.downloadTo(localFile, remotePath);
}

async function downloadPlayerData() {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  try {
    await client.access({
      host: CONFIG.ftp.host,
      port: CONFIG.ftp.port,
      user: CONFIG.ftp.user,
      password: CONFIG.ftp.password,
      secure: false,
    });
    console.log("Connected to FTP server.");
    await downloadFolder(client, CONFIG.ftp.remotePath, CONFIG.ftp.localPath);
    await downloadUserCache(
      client,
      CONFIG.ftp.remoteUserCache,
      USER_CACHE_FILE
    );
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
function loadUserCache() {
  if (!fs.existsSync(USER_CACHE_FILE)) {
    console.error(`User cache file not found at ${USER_CACHE_FILE}`);
    return {};
  }
  try {
    const data = JSON.parse(fs.readFileSync(USER_CACHE_FILE, "utf8"));
    const cache = {};
    data.forEach((entry) => {
      cache[entry.uuid.toLowerCase()] = entry.name;
    });
    return cache;
  } catch (error) {
    console.error("Error reading usercache.json:", error);
    return {};
  }
}

function readPlayerData(userCache) {
  const players = [];
  const directories = fs
    .readdirSync(CONFIG.ftp.localPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  directories.forEach((dir) => {
    const dirPath = path.join(CONFIG.ftp.localPath, dir);
    const jsonFiles = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json"));
    jsonFiles.forEach((file) => {
      const filePath = path.join(dirPath, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        let uuid = data.uuid || "Unknown";
        const normalizedUUID = uuid.toLowerCase();
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

/**
 * Converts the players array into table data.
 * The first row is the header.
 *
 * @param {Object[]} players
 * @returns {string[][]}
 */
function generateScoreboardTableData(players) {
  // Sort players descending by capture count.
  players.sort((a, b) => b.totalCaptureCount - a.totalCaptureCount);
  const tableData = [["Rank", "Player", "Captures"]];
  players.forEach((player, index) => {
    tableData.push([
      (index + 1).toString(),
      player.playerName,
      player.totalCaptureCount.toString(),
    ]);
  });
  return tableData;
}

function saveCanvasToFile(canvas, outputPath) {
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Scoreboard saved to ${outputPath}`);
}

// -------------------------------------------
// Main Execution
// -------------------------------------------
async function main() {
  // Clear local player data before running
  clearLocalData();

  // Download the latest data from FTP
  await downloadPlayerData();

  // Load user cache and read player data from downloaded files
  const userCache = loadUserCache();
  const players = readPlayerData(userCache);
  if (players.length === 0) {
    console.error(
      "No player data found in the directory:",
      CONFIG.ftp.localPath
    );
    return;
  }

  // Prepare table data: first row is the header.
  const tableData = generateScoreboardTableData(players);

  // Generate the table image using the imported function.
  const canvas = generateTableImage(tableData, TableOptions);
  saveCanvasToFile(canvas, CONFIG.scoreboard.outputImage);
}

main();
