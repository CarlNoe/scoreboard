const file = "kubejs/data/waystoneOwners.json";
global.waystoneOwners = JsonIO.read(file) || {};

const waystoneIds = [
  "waystones:waystone",
  "waystones:mossy_waystone",
  "waystones:sandy_waystone",
];

const operators = ["ashbee", "NeoPreda"];

const checkIsWaystone = (blockId) => waystoneIds.includes(blockId);

BlockEvents.placed((event) => {
  const { block, player } = event;

  if (!checkIsWaystone(block.id)) return;

  const posKey = `${block.x},${block.y},${block.z}`;

  global.waystoneOwners[posKey] = player.username.toLowerCase();
  JsonIO.write(file, global.waystoneOwners);
});

BlockEvents.broken((event) => {
  const { block, player } = event;

  if (!checkIsWaystone(block.id) || !player?.isPlayer) return;

  const posKeyTop = `${block.x},${block.y},${block.z}`;
  const posKeyBase = `${block.x},${block.y - 1},${block.z}`;
  global.waystoneOwners = JsonIO.read(file) || {};

  const waystoneOwner =
    global.waystoneOwners[posKeyTop] || global.waystoneOwners[posKeyBase];

  // Allows operators to vreak the waystone
  if (operators.includes(player.username.toLowerCase())) return;

  if (waystoneOwner && waystoneOwner !== player.username.toLowerCase()) {
    player.tell(`§cCette waystone appartient à §e${waystoneOwner} !`);
    return event.cancel();
  }

  delete global.waystoneOwners[posKeyTop];
  delete global.waystoneOwners[posKeyBase];
  JsonIO.write(file, global.waystoneOwners);
});
