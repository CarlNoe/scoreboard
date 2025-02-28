const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const legendaryPokemonArray = [
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

const CONFIG = {
  ftp: {
    host: "ftp.nitroserv.games", // FTP server address
    port: 21, // FTP port
    user: "", // FTP username
    password: "", // FTP password
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
      excelColumns: 4,
      subtitle: "Most Pokemons Captured",
      ignoreNames: "", // comma-separated list of names to ignore (if any)
    },
    shiny: {
      enable: true,
      sheetName: "leaderboard3",
      excelRows: 10,
      excelColumns: 4,
      subtitle: "Shiny Pokemons Leaderboard",
      ignoreNames: "", // comma-separated list of names to ignore (if any)
    },
    legendary: {
      enable: true,
      sheetName: "leaderboard4",
      excelRows: 10,
      excelColumns: 4,
      subtitle: "Legendary Captures Leaderboard",
      ignoreNames: "", // comma-separated list of names to ignore (if any)
    },
  },
};

const USER_CACHE_FILE = path.join(CONFIG.ftp.localPath, "usercache.json");

function clearLocalData() {
  if (fs.existsSync(CONFIG.ftp.localPath)) {
    fs.rmSync(CONFIG.ftp.localPath, { recursive: true, force: true });
    console.log(`Cleared local data in ${CONFIG.ftp.localPath}`);
  }
}

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
// Process Player Data & Count Stats (Matching Python Logic)
// -------------------------------------------
function readPlayerDataForExcel(namesMapping) {
  const players = [];
  if (!fs.existsSync(CONFIG.ftp.localPath)) {
    console.error(`Local path ${CONFIG.ftp.localPath} does not exist.`);
    return players;
  }
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
        let uuid = data.uuid || path.basename(file, ".json");
        const normalizedUUID = uuid.toLowerCase();
        const playerName = namesMapping[normalizedUUID] || uuid;

        let caughtCount = 0;
        let shinyCount = 0;
        let legendaryCount = 0;
        if (
          data.extraData &&
          data.extraData.cobbledex_discovery &&
          data.extraData.cobbledex_discovery.registers
        ) {
          const registers = data.extraData.cobbledex_discovery.registers;
          const normalizedLegendaries = legendaryPokemonArray.map((n) =>
            n.toLowerCase()
          );
          for (const [pokemon, variants] of Object.entries(registers)) {
            for (const [variant, details] of Object.entries(variants)) {
              if (details.status === "CAUGHT") {
                caughtCount++;
                if (details.isShiny === true || details.isShiny === "True") {
                  shinyCount++;
                }
                if (normalizedLegendaries.includes(pokemon.toLowerCase())) {
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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("template.xlsx");

  async function writeLeaderboard(sheetName, entries, statKey, configSection) {
    let sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      sheet = workbook.addWorksheet(sheetName);
    }

    const excelRows = configSection.excelRows;
    const excelCols = configSection.excelColumns;
    const totalEntries = excelRows * excelCols;
    const topEntries = entries.slice(0, totalEntries);

    topEntries.forEach((player, i) => {
      const rowNum = (i % excelRows) + 3;
      const colOffset = Math.floor(i / excelRows) * 3;
      sheet.getCell(rowNum, 2 + colOffset).value = i + 1 + ".";
      sheet.getCell(rowNum, 3 + colOffset).value = player.playerName;
      sheet.getCell(rowNum, 4 + colOffset).value = player[statKey];
    });

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

  if (CONFIG.leaderboard.most.enable) {
    await writeLeaderboard(
      CONFIG.leaderboard.most.sheetName,
      mostPlayers,
      "caughtCount",
      CONFIG.leaderboard.most
    );
  }
  if (CONFIG.leaderboard.shiny.enable) {
    await writeLeaderboard(
      CONFIG.leaderboard.shiny.sheetName,
      shinyPlayers,
      "shinyCount",
      CONFIG.leaderboard.shiny
    );
  }
  if (CONFIG.leaderboard.legendary.enable) {
    await writeLeaderboard(
      CONFIG.leaderboard.legendary.sheetName,
      legendaryPlayers,
      "legendaryCount",
      CONFIG.leaderboard.legendary
    );
  }

  await workbook.xlsx.writeFile(CONFIG.leaderboard.outputExcel);
  console.log(`Excel leaderboard saved to ${CONFIG.leaderboard.outputExcel}`);
}

// -------------------------------------------
// Main Execution
// -------------------------------------------
async function main() {
  clearLocalData();
  await downloadPlayerData();

  const namesMapping = loadUserCacheMapping();
  if (Object.keys(namesMapping).length === 0) {
    console.error("User cache mapping is empty – cannot proceed.");
    return;
  }

  const players = readPlayerDataForExcel(namesMapping);
  if (players.length === 0) {
    console.error("No player data found in", CONFIG.ftp.localPath);
    return;
  }

  let mostPlayers = [...players].sort((a, b) => b.caughtCount - a.caughtCount);
  let shinyPlayers = [...players].sort((a, b) => b.shinyCount - a.shinyCount);
  let legendaryPlayers = [...players].sort(
    (a, b) => b.legendaryCount - a.legendaryCount
  );

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

  await generateExcelOutput(mostPlayers, shinyPlayers, legendaryPlayers);
}

main();
