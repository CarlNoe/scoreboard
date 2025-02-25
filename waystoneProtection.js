const file = "kubejs/data/waystoneOwners.json";
global.waystoneOwners = JsonIO.read(file) || {};

const waystoneIds = [
  "waystones:waystone",
  "waystones:mossy_waystone",
  "waystones:sandy_waystone",
];

// Convert all operator names to lower case
const operators = ["ashbee", "neopreda"];

const checkIsWaystone = (blockId) => waystoneIds.includes(blockId);

BlockEvents.placed((event) => {
  const { block, player } = event;

  if (!checkIsWaystone(block.id)) return;

  // Use proper template literals with backticks
  const posKey = `${block.x},${block.y},${block.z}`;

  global.waystoneOwners[posKey] = player.username.toLowerCase();
  JsonIO.write(file, global.waystoneOwners);
});

BlockEvents.broken((event) => {
  const { block, player } = event;

  if (!checkIsWaystone(block.id) || !player?.isPlayer) return;

  // Use proper template literals with backticks
  const posKeyTop = `${block.x},${block.y},${block.z}`;
  const posKeyBase = `${block.x},${block.y - 1},${block.z}`;
  global.waystoneOwners = JsonIO.read(file) || {};

  const waystoneOwner =
    global.waystoneOwners[posKeyTop] || global.waystoneOwners[posKeyBase];

  // Allow operators to break the waystone
  if (operators.includes(player.username.toLowerCase())) return;

  if (waystoneOwner && waystoneOwner !== player.username.toLowerCase()) {
    player.tell(`§cCette waystone appartient à §e${waystoneOwner} !`);
    return event.cancel();
  }

  delete global.waystoneOwners[posKeyTop];
  delete global.waystoneOwners[posKeyBase];
  JsonIO.write(file, global.waystoneOwners);
});
