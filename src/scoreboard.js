import { Client, FileType } from "basic-ftp";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { CONFIG } from "./config.js";
import { FTP_CONFIG } from "./ftpConfig.js";
import { legendaryPokemonArray } from "./legendaries.js";

// Define the location for the user cache file and any names to ignore.
const USER_CACHE_FILE = path.join(FTP_CONFIG.localPath, "usercache.json");
const ignoreNames = []; // Define names to ignore, if any

/* ======================== FTP Download Functions ======================== */

/**
 * Clears the local data directory.
 */
function clearLocalData() {
  if (fs.existsSync(FTP_CONFIG.localPath)) {
    fs.rmSync(FTP_CONFIG.localPath, { recursive: true, force: true });
    console.log(`Cleared local data in ${FTP_CONFIG.localPath}`);
  }
}

/**
 * Recursively downloads a remote directory from the FTP server.
 * @param {Client} client - The FTP client.
 * @param {string} remoteDir - Remote directory path.
 * @param {string} localDir - Local directory path.
 */
async function downloadDirectory(client, remoteDir, localDir) {
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const items = await client.list(remoteDir);
  for (const item of items) {
    const remotePath = `${remoteDir}/${item.name}`;
    const localPath = path.join(localDir, item.name);
    if (item.type === FileType.Directory) {
      await downloadDirectory(client, remotePath, localPath);
    } else if (item.type === FileType.File) {
      await client.downloadTo(localPath, remotePath);
    }
  }
}

/**
 * Downloads a single file from the FTP server.
 * @param {Client} client - The FTP client.
 * @param {string} remotePath - Remote file path.
 * @param {string} localFilePath - Local file path.
 */
async function downloadFile(client, remotePath, localFilePath) {
  const localDir = path.dirname(localFilePath);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  console.log(`Downloading file from ${remotePath} to ${localFilePath}`);
  await client.downloadTo(localFilePath, remotePath);
}

/**
 * Connects to the FTP server and downloads all player data along with the user cache.
 */
async function downloadPlayerData() {
  const client = new Client();
  client.ftp.verbose = true;
  try {
    await client.access({
      host: FTP_CONFIG.host,
      port: FTP_CONFIG.port,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: false,
    });
    console.log("Connected to FTP server.");

    // Download the main player data folder
    await downloadDirectory(
      client,
      FTP_CONFIG.remotePath,
      FTP_CONFIG.localPath
    );
    // Download the user cache file separately
    await downloadFile(client, FTP_CONFIG.remoteUserCache, USER_CACHE_FILE);
    console.log("FTP download complete.");
  } catch (error) {
    console.error("Error during FTP download:", error);
  } finally {
    client.close();
  }
}

/* ======================= Data Processing Functions ====================== */

/**
 * Loads the user cache file and builds a mapping from UUID to player name.
 * @returns {Object} A mapping object with keys as lowercase UUIDs and values as names.
 */
function loadUserCacheMapping() {
  if (!fs.existsSync(USER_CACHE_FILE)) {
    console.error(`User cache file not found at ${USER_CACHE_FILE}`);
    return {};
  }
  try {
    const data = JSON.parse(fs.readFileSync(USER_CACHE_FILE, "utf8"));
    const mapping = {};
    data.forEach((entry) => {
      mapping[entry.uuid.toLowerCase()] = entry.name;
    });
    return mapping;
  } catch (error) {
    console.error("Error reading usercache.json:", error);
    return {};
  }
}

/**
 * Reads each player's JSON file from the local data and computes counts.
 * @param {Object} namesMapping - Mapping of user UUIDs to names.
 * @returns {Array} List of player objects with counts.
 */
function readPlayerData(namesMapping) {
  const players = [];
  if (!fs.existsSync(FTP_CONFIG.localPath)) {
    console.error(`Local path ${FTP_CONFIG.localPath} does not exist.`);
    return players;
  }
  // Read each subdirectory (each representing a player)
  const directories = fs
    .readdirSync(FTP_CONFIG.localPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  directories.forEach((dir) => {
    const dirPath = path.join(FTP_CONFIG.localPath, dir);
    // Consider all JSON files except the user cache file
    const jsonFiles = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json") && file !== "usercache.json");
    jsonFiles.forEach((file) => {
      const filePath = path.join(dirPath, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const uuid = data.uuid || path.basename(file, ".json");
        const normalizedUUID = uuid.toLowerCase();
        const playerName = namesMapping[normalizedUUID] || uuid;

        // Initialize counters for the player
        let caughtCount = 0;
        let shinyCount = 0;
        let legendaryCount = 0;

        // Check if the data contains Cobbledex discovery details
        if (data.extraData?.cobbledex_discovery?.registers) {
          const registers = data.extraData.cobbledex_discovery.registers;
          // Create a list of normalized legendary Pokémon names for comparison
          const normalizedLegendaries = legendaryPokemonArray.map((name) =>
            name.toLowerCase()
          );
          // Process each Pokémon entry
          Object.entries(registers).forEach(([pokemon, variants]) => {
            Object.values(variants).forEach((details) => {
              if (details.status === "CAUGHT") {
                caughtCount++;
                if (details.isShiny === true || details.isShiny === "True") {
                  shinyCount++;
                }
                if (normalizedLegendaries.includes(pokemon.toLowerCase())) {
                  legendaryCount++;
                }
              }
            });
          });
        }
        players.push({ playerName, caughtCount, shinyCount, legendaryCount });
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    });
  });
  return players;
}

/* ====================== Excel Leaderboard Generation ====================== */

/**
 * Generates an Excel leaderboard using a template.
 * @param {Array} mostPlayers - Sorted array of players by caught count.
 * @param {Array} shinyPlayers - Sorted array of players by shiny count.
 * @param {Array} legendaryPlayers - Sorted array of players by legendary count.
 */
async function generateExcelLeaderboard(
  mostPlayers,
  shinyPlayers,
  legendaryPlayers
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("./src/template.xlsx");

  /**
   * Writes one leaderboard section on a worksheet.
   * @param {string} sheetName - Name of the Excel sheet.
   * @param {Array} players - Array of players to list.
   * @param {string} statKey - The key for the statistic to display.
   * @param {Object} configSection - Configuration object for the leaderboard.
   */
  async function writeLeaderboard(sheetName, players, statKey, configSection) {
    let sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      sheet = workbook.addWorksheet(sheetName);
    }

    const rowsPerColumn = 10;
    const maxEntries = rowsPerColumn * 4;
    const topPlayers = players.slice(0, maxEntries);

    topPlayers.forEach((player, index) => {
      const row = (index % rowsPerColumn) + 3;
      const colOffset = Math.floor(index / rowsPerColumn) * 3;
      sheet.getCell(row, 2 + colOffset).value = `${index + 1}.`;
      sheet.getCell(row, 3 + colOffset).value = player.playerName;
      sheet.getCell(row, 4 + colOffset).value = player[statKey];
    });

    const now = new Date();
    const updateString = `Dernière update le ${String(now.getDate()).padStart(
      2,
      "0"
    )}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(
      now.getFullYear()
    ).slice(-2)} à ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    sheet.getCell(rowsPerColumn + 3, 2).value = updateString;
    sheet.getCell(rowsPerColumn + 4, 2).value = configSection.subtitle;
  }

  await writeLeaderboard(
    CONFIG.leaderboard.most.sheetName,
    mostPlayers,
    "caughtCount",
    CONFIG.leaderboard.most
  );
  await writeLeaderboard(
    CONFIG.leaderboard.shiny.sheetName,
    shinyPlayers,
    "shinyCount",
    CONFIG.leaderboard.shiny
  );
  await writeLeaderboard(
    CONFIG.leaderboard.legendary.sheetName,
    legendaryPlayers,
    "legendaryCount",
    CONFIG.leaderboard.legendary
  );

  await workbook.xlsx.writeFile(CONFIG.leaderboard.outputExcel);
  console.log(`Excel leaderboard saved to ${CONFIG.leaderboard.outputExcel}`);
}

/* ====================== Leaderboard Retrieval Functions ====================== */

/**
 * Retrieves and sorts players by total Pokémon caught.
 * @param {Array} players - List of player objects.
 * @returns {Array} Sorted list of players by caughtCount.
 */
export function getMostPokemonPlayers(players) {
  const mostPlayers = players
    .filter((player) => !ignoreNames.includes(player.playerName))
    .sort((a, b) => b.caughtCount - a.caughtCount);
  return mostPlayers;
}

/**
 * Retrieves and sorts players by shiny Pokémon count.
 * @param {Array} players - List of player objects.
 * @returns {Array} Sorted list of players by shinyCount.
 */
export function getMostShinyPlayers(players) {
  const shinyPlayers = players
    .filter((player) => !ignoreNames.includes(player.playerName))
    .sort((a, b) => b.shinyCount - a.shinyCount);
  return shinyPlayers;
}

/**
 * Retrieves and sorts players by legendary Pokémon count.
 * @param {Array} players - List of player objects.
 * @returns {Array} Sorted list of players by legendaryCount.
 */
export function getMostLegendariesPlayers(players) {
  const legendaryPlayers = players
    .filter((player) => !ignoreNames.includes(player.playerName))
    .sort((a, b) => b.legendaryCount - a.legendaryCount);
  return legendaryPlayers;
}

/* ============================ Main Script Flow ============================ */

(async () => {
  try {
    clearLocalData();
    await downloadPlayerData();

    // Load the user cache mapping and read player data
    const namesMapping = loadUserCacheMapping();
    const players = readPlayerData(namesMapping);

    // Ensure players is an array before proceeding
    if (!Array.isArray(players)) {
      throw new Error("Player data is not an array");
    }

    // Pass the players array to the leaderboard retrieval functions
    const mostPokemon = getMostPokemonPlayers(players);
    const mostShiny = getMostShinyPlayers(players);
    const mostLegendaries = getMostLegendariesPlayers(players);

    // Generate the Excel leaderboard
    await generateExcelLeaderboard(mostPokemon, mostShiny, mostLegendaries);
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
