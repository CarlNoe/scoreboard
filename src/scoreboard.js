import { Client, FileType } from "basic-ftp";
import fs from "fs";
import path from "path";
import { FTP_CONFIG } from "./ftpConfig.js";
import { legendaryPokemonArray } from "./legendaries.js";
import puppeteer from "puppeteer";

// Define a folder for FTP downloads (player data) and a separate output folder for HTML/images.
const USER_CACHE_FILE = path.join(FTP_CONFIG.localPath, "usercache.json");
const OUTPUT_DIR = path.join(process.cwd(), "output");

// Ensure the output directory exists.
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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

/* ====================== HTML & Image Generation Functions ====================== */

/**
 * Generates an HTML string with three tables for the leaderboards.
 * Each table has a similar structure with columns: Rank, Player Name, and the stat.
 * @param {Array} mostPlayers - Sorted players for most Pokémon caught.
 * @param {Array} shinyPlayers - Sorted players for most shiny Pokémon.
 * @param {Array} legendaryPlayers - Sorted players for most legendaries.
 * @returns {string} HTML content.
 */
function generateHtmlContent(mostPlayers, shinyPlayers, legendaryPlayers) {
  const mostRows = mostPlayers
    .map(
      (player, index) =>
        `<tr><td>${index + 1}</td><td>${player.playerName}</td><td>${
          player.caughtCount
        }</td></tr>`
    )
    .join("");
  const shinyRows = shinyPlayers
    .map(
      (player, index) =>
        `<tr><td>${index + 1}</td><td>${player.playerName}</td><td>${
          player.shinyCount
        }</td></tr>`
    )
    .join("");
  const legendaryRows = legendaryPlayers
    .map(
      (player, index) =>
        `<tr><td>${index + 1}</td><td>${player.playerName}</td><td>${
          player.legendaryCount
        }</td></tr>`
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Leaderboard</title>
  </head>
  <body>
    <h1>Most Pokémon Caught</h1>
    <table id="table-most" border="1" cellspacing="0" cellpadding="5">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player Name</th>
          <th>Caught Count</th>
        </tr>
      </thead>
      <tbody>
        ${mostRows}
      </tbody>
    </table>

    <h1>Most Shiny Pokémon</h1>
    <table id="table-shiny" border="1" cellspacing="0" cellpadding="5">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player Name</th>
          <th>Shiny Count</th>
        </tr>
      </thead>
      <tbody>
        ${shinyRows}
      </tbody>
    </table>

    <h1>Most Legendaries</h1>
    <table id="table-legendaries" border="1" cellspacing="0" cellpadding="5">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player Name</th>
          <th>Legendary Count</th>
        </tr>
      </thead>
      <tbody>
        ${legendaryRows}
      </tbody>
    </table>
  </body>
  </html>
  `;
}

/**
 * Uses Puppeteer to load the HTML file and create screenshots of each table.
 * Each table is saved as a separate image.
 * @param {string} htmlFilePath - Path to the HTML file.
 */
async function generateImagesFromHtml(htmlFilePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // Use the file protocol to load the HTML file
  await page.goto(`file://${htmlFilePath}`, { waitUntil: "networkidle0" });

  const tableConfigs = [
    {
      id: "table-most",
      filename: path.join(OUTPUT_DIR, "leaderboard-most.png"),
    },
    {
      id: "table-shiny",
      filename: path.join(OUTPUT_DIR, "leaderboard-shiny.png"),
    },
    {
      id: "table-legendaries",
      filename: path.join(OUTPUT_DIR, "leaderboard-legendaries.png"),
    },
  ];

  for (const config of tableConfigs) {
    const element = await page.$(`#${config.id}`);
    if (element) {
      await element.screenshot({ path: config.filename });
      console.log(`Saved image for ${config.id} as ${config.filename}`);
    } else {
      console.error(`Element with id ${config.id} not found`);
    }
  }

  await browser.close();
}

/**
 * Generates the HTML file from the leaderboard data and then uses Puppeteer to create images.
 * @param {Array} mostPlayers - Sorted players for most Pokémon caught.
 * @param {Array} shinyPlayers - Sorted players for most shiny Pokémon.
 * @param {Array} legendaryPlayers - Sorted players for most legendaries.
 */
async function generateHtmlAndImages(
  mostPlayers,
  shinyPlayers,
  legendaryPlayers
) {
  const htmlContent = generateHtmlContent(
    mostPlayers,
    shinyPlayers,
    legendaryPlayers
  );
  const htmlFilePath = path.join(OUTPUT_DIR, "leaderboard.html");
  fs.writeFileSync(htmlFilePath, htmlContent, "utf8");
  console.log(`HTML leaderboard saved to ${htmlFilePath}`);
  await generateImagesFromHtml(htmlFilePath);
}

/* ============================ Leaderboard Retrieval Functions ============================ */

/**
 * Retrieves and sorts players by total Pokémon caught.
 * @param {Array} players - List of player objects.
 * @returns {Array} Sorted list of players by caughtCount.
 */
export function getMostPokemonPlayers(players) {
  return players
    .filter((player) => !ignoreNames.includes(player.playerName))
    .sort((a, b) => b.caughtCount - a.caughtCount);
}

/**
 * Retrieves and sorts players by shiny Pokémon count.
 * @param {Array} players - List of player objects.
 * @returns {Array} Sorted list of players by shinyCount.
 */
export function getMostShinyPlayers(players) {
  return players
    .filter((player) => !ignoreNames.includes(player.playerName))
    .sort((a, b) => b.shinyCount - a.shinyCount);
}

/**
 * Retrieves and sorts players by legendary Pokémon count.
 * @param {Array} players - List of player objects.
 * @returns {Array} Sorted list of players by legendaryCount.
 */
export function getMostLegendariesPlayers(players) {
  return players
    .filter((player) => !ignoreNames.includes(player.playerName))
    .sort((a, b) => b.legendaryCount - a.legendaryCount);
}

/* ============================ Main Script Flow ============================ */

(async () => {
  try {
    clearLocalData();
    await downloadPlayerData();

    const namesMapping = loadUserCacheMapping();
    const players = readPlayerData(namesMapping);

    if (!Array.isArray(players)) throw new Error("Player data is not an array");

    // Retrieve sorted leaderboards
    const mostPokemon = getMostPokemonPlayers(players);
    const mostShiny = getMostShinyPlayers(players);
    const mostLegendaries = getMostLegendariesPlayers(players);

    // Generate HTML file and create images with Puppeteer
    await generateHtmlAndImages(mostPokemon, mostShiny, mostLegendaries);
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
