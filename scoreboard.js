const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

// -------------------------------------------
// Legendary names filler (all variants)
// -------------------------------------------
const legendaryPokemonFiller = [
  // Generation I
  "Articuno",
  // Regional variants for Articuno:
  "ArticunoGalar",
  "Articuno-Galar",
  "Articuno_Galar",
  "Galarian Articuno",
  "Zapdos",
  "ZapdosGalar",
  "Zapdos-Galar",
  "Zapdos_Galar",
  "Galarian Zapdos",
  "Moltres",
  "MoltresGalar",
  "Moltres-Galar",
  "Moltres_Galar",
  "Galarian Moltres",
  "Mewtwo",

  // Generation II
  "Raikou",
  "Entei",
  "Suicune",
  "Lugia",
  "Ho-Oh",
  "HoOh",
  "Ho Oh",
  "Ho_oh",
  "Ho–Oh",
  "Ho—Oh",

  // Generation III
  "Regirock",
  "Regice",
  "Registeel",
  "Latias",
  "Latios",
  "Kyogre",
  "Groudon",
  "Rayquaza",

  // Generation IV
  "Uxie",
  "Mesprit",
  "Azelf",
  "Dialga",
  "Palkia",
  "Heatran",
  "Regigigas",
  "Giratina",
  "Cresselia",

  // Generation V
  "Cobalion",
  "Terrakion",
  "Virizion",
  "Tornadus",
  "Thundurus",
  "Landorus",
  "Reshiram",
  "Zekrom",
  "Kyurem",

  // Generation VI
  "Xerneas",
  "Yveltal",
  "Zygarde",

  // Generation VII
  // "Type: Null" variants:
  "Type: Null",
  "Type:Null",
  "Type Null",
  "TypeNull",
  "Type – Null",
  "Type–Null",
  "Type –Null",
  "Type– Null",
  "Type_Null",
  "Silvally",
  // Tapu names with multiple spacing/punctuation variants:
  "Tapu Koko",
  "TapuKoko",
  "Tapu-Koko",
  "Tapu_Koko",
  "Tapu–Koko",
  "Tapu—Koko",
  "Tapu Lele",
  "TapuLele",
  "Tapu-Lele",
  "Tapu_Lele",
  "Tapu–Lele",
  "Tapu—Lele",
  "Tapu Bulu",
  "TapuBulu",
  "Tapu-Bulu",
  "Tapu_Bulu",
  "Tapu–Bulu",
  "Tapu—Bulu",
  "Tapu Fini",
  "TapuFini",
  "Tapu-Fini",
  "Tapu_Fini",
  "Tapu–Fini",
  "Tapu—Fini",
  "Cosmog",
  "Cosmoem",
  "Solgaleo",
  "Lunala",
  "Necrozma",

  // Generation VIII
  "Zacian",
  "Zamazenta",
  "Eternatus",
  "Kubfu",
  "Urshifu",
  "Regieleki",
  "Regidrago",
  "Glastrier",
  "Spectrier",
  "Calyrex",
  "Enamorus",

  // Generation IX
  // Names with hyphens/dashes:
  "Wo-Chien",
  "WoChien",
  "Wo Chien",
  "Wo_Chien",
  "Wo–Chien",
  "Wo—Chien",
  "Chien-Pao",
  "ChienPao",
  "Chien Pao",
  "Chien_Pao",
  "Chien–Pao",
  "Chien—Pao",
  "Ting-Lu",
  "TingLu",
  "Ting Lu",
  "Ting_Lu",
  "Ting–Lu",
  "Ting—Lu",
  "Chi-Yu",
  "ChiYu",
  "Chi Yu",
  "Chi_Yu",
  "Chi–Yu",
  "Chi—Yu",
  "Koraidon",
  "Miraidon",
  "Okidogi",
  "Munkidori",
  "Fezandipiti",
  "Ogerpon",
  "Terapagos",

  // ============================
  // MYTHICAL Pokémon
  // ============================
  // Generation I
  "Mew",

  // Generation II
  "Celebi",

  // Generation III
  "Jirachi",
  "Deoxys",

  // Generation IV
  "Phione",
  "Manaphy",
  "Darkrai",
  // For Shaymin, include its Sky Forme variants:
  "Shaymin",
  "Shaymin Sky",
  "Shaymin-Sky",
  "Shaymin_Sky",
  "Arceus",

  // Generation V
  "Victini",
  "Keldeo",
  // For Meloetta, include forme names:
  "Meloetta",
  "Meloetta Aria",
  "Meloetta-Aria",
  "Meloetta_Aria",
  "Meloetta Pirouette",
  "Meloetta-Pirouette",
  "Meloetta_Pirouette",
  "Genesect",

  // Generation VI
  "Diancie",
  "Hoopa",
  "Hoopa-Unbound",
  "Hoopa Unbound",
  "Hoopa_Unbound",
  "Volcanion",

  // Generation VII
  "Magearna",
  "Marshadow",
  "Zeraora",
  "Meltan",
  "Melmetal",
  "Zarude",

  // Generation IX
  "Pecharunt",
  "Pecharunt^M", // Include variant marker if needed
];

// -------------------------------------------
// Configuration: Adjust these settings as needed
// -------------------------------------------
const CONFIG = {
  ftp: {
    host: "ftp.nitroserv.games", // FTP server address
    port: 21, // FTP port
    user: "53323-id", // FTP username
    password: "azer", // FTP password
    remotePath: "/Minecraft/world/cobblemonplayerdata", // Remote directory with player data
    localPath: "./cobblemonplayerdata", // Local directory where files will be saved
    remoteUserCache: "/Minecraft/usercache.json", // Remote location of usercache.json
  },
  leaderboard: {
    outputExcel: "output.xlsx", // Excel file name that will contain the leaderboards
    most: {
      enable: true,
      sheetName: "leaderboard2",
      excelRows: 10,
      excelColumns: 3,
      subtitle: "Most Pokemons Captured",
      ignoreNames: "", // comma-separated list of names to ignore (if any)
    },
    shiny: {
      enable: true,
      sheetName: "leaderboard3",
      excelRows: 10,
      excelColumns: 3,
      subtitle: "Shiny Pokemons Leaderboard",
      ignoreNames: "", // comma-separated list of names to ignore (if any)
    },
    legendary: {
      enable: true,
      sheetName: "leaderboard4",
      excelRows: 10,
      excelColumns: 3,
      subtitle: "Legendary Captures Leaderboard",
      ignoreNames: "", // comma-separated list of names to ignore (if any)
    },
  },
};

// Derived configuration: local user cache file path
const USER_CACHE_FILE = path.join(CONFIG.ftp.localPath, "usercache.json");

// -------------------------------------------
// Utility: Clear Local Player Data Directory
// -------------------------------------------
function clearLocalData() {
  if (fs.existsSync(CONFIG.ftp.localPath)) {
    fs.rmSync(CONFIG.ftp.localPath, { recursive: true, force: true });
    console.log(`Cleared local data in ${CONFIG.ftp.localPath}`);
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
    // Download the entire folder with player data
    await downloadFolder(client, CONFIG.ftp.remotePath, CONFIG.ftp.localPath);
    // Download the user cache (for UUID→username mapping)
    await downloadUserCache(
      client,
      CONFIG.ftp.remoteUserCache,
      USER_CACHE_FILE
    );
    console.log("FTP download complete.");
  } catch (err) {
    console.error("An error occurred during FTP download:", err);
  } finally {
    client.close();
  }
}

// -------------------------------------------
// Load User Cache Mapping
// -------------------------------------------
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

// -------------------------------------------
// Process Player Data & Count Legendaries
// -------------------------------------------
function readPlayerDataForExcel(namesMapping) {
  const players = [];
  if (!fs.existsSync(CONFIG.ftp.localPath)) {
    console.error(`Local path ${CONFIG.ftp.localPath} does not exist.`);
    return players;
  }
  // Each subdirectory in localPath should contain one or more player JSON files.
  const directories = fs
    .readdirSync(CONFIG.ftp.localPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  directories.forEach((dir) => {
    const dirPath = path.join(CONFIG.ftp.localPath, dir);
    const jsonFiles = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json") && file !== "usercache.json");
    jsonFiles.forEach((file) => {
      const filePath = path.join(dirPath, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        // Get UUID either from file content or from the file name
        let uuid = data.uuid || path.basename(file, ".json");
        const normalizedUUID = uuid.toLowerCase();
        // Look up the player name from user cache mapping (fallback to UUID)
        const playerName = namesMapping[normalizedUUID] || uuid;

        // Compute counts by iterating over the registers in extraData
        let caughtCount = 0;
        let shinyCount = 0;
        let legendaryCount = 0;
        if (
          data.extraData &&
          data.extraData.cobbledex_discovery &&
          data.extraData.cobbledex_discovery.registers
        ) {
          const registers = data.extraData.cobbledex_discovery.registers;
          // Create a normalized list of legendary names for quick comparison
          const normalizedLegendaries = legendaryPokemonFiller.map((n) =>
            n.toLowerCase()
          );
          for (const key in registers) {
            if (registers.hasOwnProperty(key)) {
              const record = registers[key];
              if (record.normal && record.normal.status === "CAUGHT") {
                caughtCount++;
                if (
                  record.normal.isShiny === true ||
                  record.normal.isShiny === "True"
                ) {
                  shinyCount++;
                }
                // Assume the register key is the Pokémon name.
                // Check if this name (normalized) is in the legendary list.
                if (normalizedLegendaries.includes(key.toLowerCase())) {
                  legendaryCount++;
                }
              }
            }
          }
        }

        players.push({ playerName, caughtCount, shinyCount, legendaryCount });
      } catch (err) {
        console.error(`Error processing file ${filePath}:`, err);
      }
    });
  });
  return players;
}

// -------------------------------------------
// Generate Excel Leaderboards using ExcelJS
// -------------------------------------------
async function generateExcelOutput(
  mostPlayers,
  shinyPlayers,
  legendaryPlayers
) {
  // Load the template file instead of creating a new workbook
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("template.xlsx");

  // Helper function: write/update a leaderboard sheet given sorted entries and a key (e.g., caughtCount, shinyCount, legendaryCount)
  async function writeLeaderboard(sheetName, entries, statKey, configSection) {
    // Try to get the worksheet from the template; if not found, create a new one
    let sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      sheet = workbook.addWorksheet(sheetName);
    }

    const excelRows = configSection.excelRows;
    const excelCols = configSection.excelColumns;
    const totalEntries = excelRows * excelCols;
    const topEntries = entries.slice(0, totalEntries);

    topEntries.forEach((player, i) => {
      const rowNum = (i % excelRows) + 3; // starting at row 3
      const colOffset = Math.floor(i / excelRows) * 3; // each block uses 3 columns
      sheet.getCell(rowNum, 2 + colOffset).value = i + 1 + ".";
      sheet.getCell(rowNum, 3 + colOffset).value = player.playerName;
      sheet.getCell(rowNum, 4 + colOffset).value = player[statKey];
    });

    // Write update timestamp and subtitle
    const now = new Date();
    const updateString =
      "Dernière update le " +
      now.getDate().toString().padStart(2, "0") +
      "." +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      "." +
      now.getFullYear().toString().slice(-2) +
      " à " +
      now.getHours().toString().padStart(2, "0") +
      ":" +
      now.getMinutes().toString().padStart(2, "0");
    sheet.getCell(excelRows + 3, 2).value = updateString;
    sheet.getCell(excelRows + 4, 2).value = configSection.subtitle;
  }

  // Most Pokemons leaderboard (using caughtCount)
  if (CONFIG.leaderboard.most.enable) {
    await writeLeaderboard(
      CONFIG.leaderboard.most.sheetName,
      mostPlayers,
      "caughtCount",
      CONFIG.leaderboard.most
    );
  }
  // Shiny leaderboard (using shinyCount)
  if (CONFIG.leaderboard.shiny.enable) {
    await writeLeaderboard(
      CONFIG.leaderboard.shiny.sheetName,
      shinyPlayers,
      "shinyCount",
      CONFIG.leaderboard.shiny
    );
  }
  // Legendary leaderboard (using legendaryCount)
  if (CONFIG.leaderboard.legendary.enable) {
    await writeLeaderboard(
      CONFIG.leaderboard.legendary.sheetName,
      legendaryPlayers,
      "legendaryCount",
      CONFIG.leaderboard.legendary
    );
  }

  // Write the updated workbook to your output file
  await workbook.xlsx.writeFile(CONFIG.leaderboard.outputExcel);
  console.log(`Excel leaderboard saved to ${CONFIG.leaderboard.outputExcel}`);
}

// -------------------------------------------
// Main Execution
// -------------------------------------------
async function main() {
  // 1. Clear local data directory
  clearLocalData();

  // 2. Download the latest player data and user cache from FTP
  await downloadPlayerData();

  // 3. Load user cache mapping (UUID → username)
  const namesMapping = loadUserCacheMapping();
  if (Object.keys(namesMapping).length === 0) {
    console.error("User cache mapping is empty – cannot proceed.");
    return;
  }

  // 4. Process downloaded player JSON files to extract stats (including legendaryCount)
  const players = readPlayerDataForExcel(namesMapping);
  if (players.length === 0) {
    console.error("No player data found in", CONFIG.ftp.localPath);
    return;
  }

  // 5. Sort players to create three leaderboards:
  // • Most Pokemons leaderboard (caughtCount descending)
  // • Shiny leaderboard (shinyCount descending)
  // • Legendary leaderboard (legendaryCount descending)
  let mostPlayers = [...players].sort((a, b) => b.caughtCount - a.caughtCount);
  let shinyPlayers = [...players].sort((a, b) => b.shinyCount - a.shinyCount);
  let legendaryPlayers = [...players].sort(
    (a, b) => b.legendaryCount - a.legendaryCount
  );

  // Apply ignore names if set in the config
  if (CONFIG.leaderboard.most.ignoreNames) {
    const ignoreNames = CONFIG.leaderboard.most.ignoreNames
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n);
    mostPlayers = mostPlayers.filter(
      (player) => !ignoreNames.includes(player.playerName)
    );
  }
  if (CONFIG.leaderboard.shiny.ignoreNames) {
    const ignoreNames = CONFIG.leaderboard.shiny.ignoreNames
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n);
    shinyPlayers = shinyPlayers.filter(
      (player) => !ignoreNames.includes(player.playerName)
    );
  }
  if (CONFIG.leaderboard.legendary.ignoreNames) {
    const ignoreNames = CONFIG.leaderboard.legendary.ignoreNames
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n);
    legendaryPlayers = legendaryPlayers.filter(
      (player) => !ignoreNames.includes(player.playerName)
    );
  }

  // 6. Generate the Excel file with all three leaderboards
  await generateExcelOutput(mostPlayers, shinyPlayers, legendaryPlayers);
}

main();
