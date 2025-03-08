import { Client, FileType } from "basic-ftp";
import fs from "fs";
import path from "path";
import { FTP_CONFIG } from "./ftpConfig.js";
import { legendaryPokemonArray } from "./legendaries.js";
import puppeteer from "puppeteer";

// Define paths for FTP downloads and output files.
const USER_CACHE_FILE = path.join(FTP_CONFIG.localPath, "usercache.json");
const WHITELIST_FILE = path.join(FTP_CONFIG.localPath, "whitelist.json");
const OUTPUT_DIR = path.join(process.cwd(), "output");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const ignoreNames = []; // Define names to ignore, if any

/* ======================== FTP Download Functions ======================== */

function clearLocalData() {
  if (fs.existsSync(FTP_CONFIG.localPath)) {
    fs.rmSync(FTP_CONFIG.localPath, { recursive: true, force: true });
    console.log(`Cleared local data in ${FTP_CONFIG.localPath}`);
  }
}

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

async function downloadFile(client, remotePath, localFilePath) {
  const localDir = path.dirname(localFilePath);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  console.log(`Downloading file from ${remotePath} to ${localFilePath}`);
  await client.downloadTo(localFilePath, remotePath);
}

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

    await downloadDirectory(
      client,
      FTP_CONFIG.remotePath,
      FTP_CONFIG.localPath
    );
    await downloadFile(client, FTP_CONFIG.remoteUserCache, USER_CACHE_FILE);
    await downloadFile(client, "/Minecraft/whitelist.json", WHITELIST_FILE);
    console.log("FTP download complete.");
  } catch (error) {
    console.error("Error during FTP download:", error);
  } finally {
    client.close();
  }
}

/* ======================= Data Processing Functions ====================== */

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

function loadWhitelist() {
  if (!fs.existsSync(WHITELIST_FILE)) {
    console.error(`Whitelist file not found at ${WHITELIST_FILE}`);
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(WHITELIST_FILE, "utf8"));
  } catch (error) {
    console.error("Error reading whitelist file:", error);
    return [];
  }
}

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

        if (data.extraData?.cobbledex_discovery?.registers) {
          const registers = data.extraData.cobbledex_discovery.registers;
          const normalizedLegendaries = legendaryPokemonArray.map((name) =>
            name.toLowerCase()
          );
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
        // Include uuid for whitelist filtering
        players.push({
          uuid: normalizedUUID,
          playerName,
          caughtCount,
          shinyCount,
          legendaryCount,
        });
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    });
  });
  return players;
}

/* ====================== HTML & Image Generation Functions ====================== */

function generateScoreboardHtml(
  players,
  title,
  scoreProperty,
  tableId,
  templateFile
) {
  let templateHtml = fs.readFileSync(templateFile, "utf8");
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

  const now = new Date();
  const dateString = now.toLocaleDateString("fr-FR");
  const timeString = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  templateHtml = templateHtml.replace(/(<table[^>]*)>/, `$1 id="${tableId}">`);
  templateHtml = templateHtml.replace(
    /<th[^>]*>.*?<\/th>/,
    `<th colspan="4" style="padding: 16px; font-size: 20px; text-align: center">${title}</th>`
  );
  templateHtml = templateHtml.replace(
    /<!-- <tbody>[\s\S]*?<\/tbody> -->/,
    `<tbody>${tbodyContent}</tbody>`
  );
  templateHtml = templateHtml.replace(
    /Dernière update le X/,
    `Dernière update le ${dateString} à ${timeString}`
  );

  return templateHtml;
}

async function generateTableScreenshot(htmlFilePath, tableId, outputImagePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlFilePath}`, { waitUntil: "networkidle0" });
  const tableElement = await page.$(`#${tableId}`);
  if (tableElement) {
    await tableElement.screenshot({ path: outputImagePath });
    console.log(`Saved table image to ${outputImagePath}`);
  } else {
    console.error(`Table element with ID "${tableId}" not found`);
  }
  await browser.close();
}

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
      templateFile: path.join(process.cwd(), "./src/mostScoreboard.html"),
      htmlFile: path.join(OUTPUT_DIR, "most-pokemon.html"),
      imageFile: path.join(OUTPUT_DIR, "most.png"),
    },
    {
      title: "Qui a attrapé le plus de shiny ?",
      players: shinyPlayers,
      property: "shinyCount",
      tableId: "table-shiny",
      templateFile: path.join(process.cwd(), "./src/shinyScoreboard.html"),
      htmlFile: path.join(OUTPUT_DIR, "most-shiny.html"),
      imageFile: path.join(OUTPUT_DIR, "shiny.png"),
    },
    {
      title: "Qui a attrapé le plus de légendaires ?",
      players: legendaryPlayers,
      property: "legendaryCount",
      tableId: "table-legendaries",
      templateFile: path.join(process.cwd(), "./src/legendaryScoreboard.html"),
      htmlFile: path.join(OUTPUT_DIR, "most-legendary.html"),
      imageFile: path.join(OUTPUT_DIR, "leg.png"),
    },
  ];

  for (const scoreboard of scoreboards) {
    const html = generateScoreboardHtml(
      scoreboard.players,
      scoreboard.title,
      scoreboard.property,
      scoreboard.tableId,
      scoreboard.templateFile
    );
    fs.writeFileSync(scoreboard.htmlFile, html, "utf8");
    console.log(`HTML scoreboard saved to ${scoreboard.htmlFile}`);
    await generateTableScreenshot(
      scoreboard.htmlFile,
      scoreboard.tableId,
      scoreboard.imageFile
    );
  }
}

/* ============================ Leaderboard Retrieval Functions ============================ */

export function getMostPokemonPlayers(players) {
  return players
    .filter((player) => !ignoreNames.includes(player.playerName))
    .sort((a, b) => b.caughtCount - a.caughtCount);
}

export function getMostShinyPlayers(players) {
  return players
    .filter((player) => !ignoreNames.includes(player.playerName))
    .sort((a, b) => b.shinyCount - a.shinyCount);
}

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

    // Load whitelist and filter players based on allowed UUIDs
    const whitelistEntries = loadWhitelist();
    const allowedUUIDs = new Set(
      whitelistEntries.map((entry) => entry.uuid.toLowerCase())
    );
    const whitelistedPlayers = players.filter((player) =>
      allowedUUIDs.has(player.uuid)
    );

    // Retrieve sorted leaderboards using only whitelisted players
    const mostPokemon = getMostPokemonPlayers(whitelistedPlayers);
    const mostShiny = getMostShinyPlayers(whitelistedPlayers);
    const mostLegendaries = getMostLegendariesPlayers(whitelistedPlayers);

    await generateScoreboards(mostPokemon, mostShiny, mostLegendaries);
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
