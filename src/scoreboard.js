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
 * Generates an HTML string with player data for the scoreboard.
 * Uses the existing scoreboard HTML structure from the template.
 * @param {Array} players - Sorted player data array.
 * @param {string} title - Title for the scoreboard.
 * @param {string} scoreProperty - Property name to display (caughtCount, shinyCount, or legendaryCount).
 * @param {string} tableId - ID to assign to the table element.
 * @returns {string} HTML content.
 */
function generateScoreboardHtml(players, title, scoreProperty, tableId) {
  // Limit to 40 players maximum (10 rows and 4 columns)
  const topPlayers = players.slice(0, 40);
  const rows = 10;
  const columns = 4;

  let tbodyContent = "";

  // Use column-major order: for each row, iterate over each column
  for (let row = 0; row < rows; row++) {
    tbodyContent += "<tr>";
    for (let col = 0; col < columns; col++) {
      const playerIndex = col * rows + row;
      const player =
        playerIndex < topPlayers.length ? topPlayers[playerIndex] : null;
      const rank = playerIndex + 1;
      const topClass = rank <= 3 ? `top${rank}` : "";

      if (player) {
        tbodyContent += `
          <td class="score-cell ${topClass}">
            <div class="grid-container">
              <span>${rank}.</span>
              <span>${player.playerName}</span>
              <span>${player[scoreProperty]}</span>
            </div>
          </td>`;
      } else {
        // Empty cell if we don't have enough players
        tbodyContent += `
          <td class="score-cell">
            <div class="grid-container">
              <span>${rank}.</span>
              <span>-</span>
              <span>0</span>
            </div>
          </td>`;
      }
    }
    tbodyContent += "</tr>";
  }

  // Format the current date and time using French locale
  const now = new Date();
  const dateString = now.toLocaleDateString("fr-FR"); // e.g., "31/03/2025"
  const timeString = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }); // e.g., "14:30"

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      :root {
        --header-footer-bg: #15ff00;
        --odd-row-bg: #d500bc; /* For odd row zebra */
        --even-row-bg: #c1e427; /* For even row zebra */
        --table-bg: #312825; /* Overall table background */
        --text-color: white;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: Roboto, monospace;
        font-size: 16px;
        text-align: center;
        color: var(--text-color);
      }
      table {
        width: 1200px;
        margin: 0 auto;
        border-collapse: collapse;
        background-color: var(--table-bg);
      }
      thead,
      tfoot {
        background-color: var(--header-footer-bg);
      }
      tbody tr:nth-child(odd) {
        background-color: var(--odd-row-bg);
      }
      tbody tr:nth-child(even) {
        background-color: var(--even-row-bg);
      }
      .score-cell {
        width: 25%;
        font-size: 16px;
        align-items: center;
        gap: 5px;
      }
      .grid-container {
        display: grid;
        grid-template-columns: 40px 1fr 60px;
        padding: 8px;
        align-items: center;
      }
      /* Top rank overrides */
      .top1 {
        background-color: #e8a203 !important;
      }
      .top2 {
        background-color: #808080 !important;
      }
      .top3 {
        background-color: #7b3d00 !important;
      }
      .top1,
      .top2,
      .top3 {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <table id="${tableId}">
      <thead>
        <tr>
          <th colspan="4" style="padding: 16px; font-size: 20px; text-align: center">
            ${title}
          </th>
        </tr>
      </thead>
      <tbody>
        ${tbodyContent}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="padding: 12px; text-align: center">
            Dernière update le ${dateString} à ${timeString}
          </td>
        </tr>
      </tfoot>
    </table>
  </body>
</html>`;
}

/**
 * Uses Puppeteer to create a screenshot of just the table element.
 * @param {string} htmlFilePath - Path to the HTML file.
 * @param {string} tableId - The ID of the table element to screenshot.
 * @param {string} outputImagePath - Path where the image will be saved.
 */
async function generateTableScreenshot(htmlFilePath, tableId, outputImagePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Use the file protocol to load the HTML file
  await page.goto(`file://${htmlFilePath}`, { waitUntil: "networkidle0" });

  // Find the table element by ID
  const tableElement = await page.$(`#${tableId}`);

  if (tableElement) {
    // Take a screenshot of just the table element
    await tableElement.screenshot({ path: outputImagePath });
    console.log(`Saved table image to ${outputImagePath}`);
  } else {
    console.error(`Table element with ID "${tableId}" not found`);
  }

  await browser.close();
}

/**
 * Generates the scoreboard HTMLs and images for each leaderboard category.
 * @param {Array} mostPlayers - Sorted players for most Pokémon caught.
 * @param {Array} shinyPlayers - Sorted players for most shiny Pokémon.
 * @param {Array} legendaryPlayers - Sorted players for most legendaries.
 */
async function generateScoreboards(
  mostPlayers,
  shinyPlayers,
  legendaryPlayers
) {
  const scoreboards = [
    {
      title: "Qui a attrapé le plus de pokemon ?",
      players: mostPlayers,
      property: "caughtCount",
      tableId: "table-most",
      htmlFile: path.join(OUTPUT_DIR, "most-pokemon.html"),
      imageFile: path.join(OUTPUT_DIR, "most.png"),
    },
    {
      title: "Qui a attrapé le plus de shiny ?",
      players: shinyPlayers,
      property: "shinyCount",
      tableId: "table-shiny",
      htmlFile: path.join(OUTPUT_DIR, "most-shiny.html"),
      imageFile: path.join(OUTPUT_DIR, "shiny.png"),
    },
    {
      title: "Qui a attrapé le plus de légendaires ?",
      players: legendaryPlayers,
      property: "legendaryCount",
      tableId: "table-legendaries",
      htmlFile: path.join(OUTPUT_DIR, "most-legendary.html"),
      imageFile: path.join(OUTPUT_DIR, "leg.png"),
    },
  ];

  for (const scoreboard of scoreboards) {
    // Generate the HTML for this scoreboard
    const html = generateScoreboardHtml(
      scoreboard.players,
      scoreboard.title,
      scoreboard.property,
      scoreboard.tableId
    );

    // Save the HTML file
    fs.writeFileSync(scoreboard.htmlFile, html, "utf8");
    console.log(`HTML scoreboard saved to ${scoreboard.htmlFile}`);

    // Generate the table screenshot from the HTML
    await generateTableScreenshot(
      scoreboard.htmlFile,
      scoreboard.tableId,
      scoreboard.imageFile
    );
  }
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

    // Generate HTML files and create images with Puppeteer
    await generateScoreboards(mostPokemon, mostShiny, mostLegendaries);
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
