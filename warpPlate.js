const warpPlateFile = "kubejs/data/warpPlateOwners.json";
global.warpPlateOwners = JsonIO.read(warpPlateFile) || {};

const warpPlateId = "waystones:warp_plate";
// Ensure operator names are in lower case for comparison.
const operators = ["ashbee", "neopreda"];

const checkIsWarpPlate = (blockId) => blockId === warpPlateId;

// Record the owner when the warp_plate is placed.
BlockEvents.placed((event) => {
  const { block, player } = event;
  if (!checkIsWarpPlate(block.id)) return;

  const posKey = `${block.x},${block.y},${block.z}`;
  global.warpPlateOwners[posKey] = player.username.toLowerCase();
  JsonIO.write(warpPlateFile, global.warpPlateOwners);
});

// Protect against unauthorized breaking of the warp_plate.
BlockEvents.broken((event) => {
  const { block, player } = event;
  if (!checkIsWarpPlate(block.id) || !player?.isPlayer) return;

  const posKey = `${block.x},${block.y},${block.z}`;
  global.warpPlateOwners = JsonIO.read(warpPlateFile) || {};
  const owner = global.warpPlateOwners[posKey];

  // Operators are allowed to break it.
  if (operators.includes(player.username.toLowerCase())) return;

  if (owner && owner !== player.username.toLowerCase()) {
    player.tell(`§cCette warp plate appartient à §e${owner} !`);
    return event.cancel();
  }

  delete global.warpPlateOwners[posKey];
  JsonIO.write(warpPlateFile, global.warpPlateOwners);
});

BlockEvents.rightClicked((event) => {
  const { block, player } = event;
  if (!checkIsWarpPlate(block.id) || !player?.isPlayer) return;

  const posKey = `${block.x},${block.y},${block.z}`;
  global.warpPlateOwners = JsonIO.read(warpPlateFile) || {};
  const owner = global.warpPlateOwners[posKey];

  if (operators.includes(player.username.toLowerCase())) return;

  if (owner && owner !== player.username.toLowerCase()) {
    player.tell(`§cCette warp plate appartient à §e${owner} !`);
    return event.cancel();
  }
});
