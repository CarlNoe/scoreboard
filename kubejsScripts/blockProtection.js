// List of operators (usernames in lowercase).
const operators = ["ashbee404", "neopreda", "twisted974"];

// Block configurations for each type of protected block.
// Added key "protectRightClick" to control if right-click interactions should be protected.
const blockConfigs = [
  {
    ids: ["waystones:warp_plate"],
    file: "kubejs/data/warpPlateOwners.json",
    height: 1,
    placedMessage: (owner) =>
      `§c${owner} seul vous pourra modifier cette warp plate !`,
    message: (owner) => `§cCette warp plate appartient à §e${owner} !`,
    protectRightClick: true,
  },
  {
    ids: [
      "waystones:waystone",
      "waystones:mossy_waystone",
      "waystones:sandy_waystone",
    ],
    file: "kubejs/data/waystoneOwners.json",
    height: 2,
    placedMessage: (owner) =>
      `§c${owner} seul vous pourra casser cette waystone !`,
    message: (owner) => `§cCette waystone appartient à §e${owner} !`,
    protectRightClick: false,
  },
  {
    ids: ["numismatic-overhaul:shop", "numismatic-overhaul:inexhaustible_shop"],
    file: "kubejs/data/shopOwners.json",
    height: 1,
    placedMessage: (owner) =>
      `§c${owner} seul vous pourra casser cette waystone !`,
    message: (owner) => `§cLe shop appartient à §e${owner} !`,
    protectRightClick: false,
  },
];

/**
 * Returns an array of candidate position keys for a block.
 * For one‑block objects, it returns one key.
 * For two‑block objects, it returns the current position, one block below, and one block above,
 * covering any part that might be interacted with.
 */
function getPosKeys(x, y, z, height) {
  if (height === 1) {
    return [`${x},${y},${z}`];
  } else if (height === 2) {
    return [`${x},${y},${z}`, `${x},${y - 1},${z}`, `${x},${y + 1},${z}`];
  }
  return [`${x},${y},${z}`];
}

// ---------------------
// Placement Event: Record ownership on placement.
// ---------------------
BlockEvents.placed((event) => {
  const { block, player } = event;
  const blockId = block.id;
  const username = player.username.toLowerCase();

  // Loop through each block configuration.
  for (const config of blockConfigs) {
    if (config.ids.includes(blockId)) {
      // Load the current owners data.
      let owners = JsonIO.read(config.file) || {};

      if (config.height === 1) {
        // For single-block objects, record this position.
        const posKey = `${block.x},${block.y},${block.z}`;
        owners[posKey] = username;
      } else if (config.height === 2) {
        // For two‑block objects, record ownership on both the placed block (top)
        // and the block below (bottom).
        const topKey = `${block.x},${block.y},${block.z}`;
        const bottomKey = `${block.x},${block.y - 1},${block.z}`;
        owners[topKey] = username;
        owners[bottomKey] = username;
      }

      player.tell(config.placedMessage(username));
      JsonIO.write(config.file, owners);
      break;
    }
  }
});

// ---------------------
// Break Event: Prevent unauthorized breaking.
// ---------------------
BlockEvents.broken((event) => {
  const { block, player } = event;
  if (!player?.isPlayer) return;
  const blockId = block.id;
  const username = player.username.toLowerCase();

  for (const config of blockConfigs) {
    if (config.ids.includes(blockId)) {
      // Reload the owners data in case it changed.
      let owners = JsonIO.read(config.file) || {};
      const posKeys = getPosKeys(block.x, block.y, block.z, config.height);

      // Check each candidate key for an owner.
      let owner = null;
      for (const key of posKeys) {
        if (owners[key]) {
          owner = owners[key];
          break;
        }
      }

      // Operators bypass restrictions.
      if (operators.includes(username)) return;

      // If the block is owned by someone else, cancel the break.
      if (owner && owner !== username) {
        player.tell(config.message(owner));
        event.cancel();
        return;
      }

      // Otherwise, remove all ownership keys for this block.
      for (const key of posKeys) {
        delete owners[key];
      }
      JsonIO.write(config.file, owners);
      break;
    }
  }
});

// ---------------------
// Right-Click Interaction Event: Optionally protect interactions.
// ---------------------
BlockEvents.rightClicked((event) => {
  const { block, player } = event;
  if (!player?.isPlayer) return;
  const blockId = block.id;
  const username = player.username.toLowerCase();

  for (const config of blockConfigs) {
    if (config.ids.includes(blockId)) {
      // Skip right-click protection if not enabled for this block type.
      if (!config.protectRightClick) break;
      let owners = JsonIO.read(config.file) || {};
      const posKeys = getPosKeys(block.x, block.y, block.z, config.height);

      let owner = null;
      for (const key of posKeys) {
        if (owners[key]) {
          owner = owners[key];
          break;
        }
      }

      // Operators bypass restrictions.
      if (operators.includes(username)) return;

      if (owner && owner !== username) {
        player.tell(config.message(owner));
        event.cancel();
        return;
      }
      break;
    }
  }
});
