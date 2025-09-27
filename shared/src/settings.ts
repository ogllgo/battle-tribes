// @CLEANUP: Rename this to "config.ts"



export const enum Settings {
   SERVER_PORT = 8000,
   // @Incomplete was gunna bring these out of the settings enum but cuz this is typescript this messes up some other shit, wait until i can mark them as constexpr
   /** Server ticks per second. */
   TICK_RATE = 40,
   /** Amount of times the server sends packets to update the clients each second. */
   SERVER_PACKET_SEND_RATE = 20,
   /** Amount of times a second the client sends updates to the server each second */
   CLIENT_PACKET_SEND_RATE = 20,
   DT_S = 1 / Settings.TICK_RATE,
   TILE_SIZE = 64,
   SUBTILE_SIZE = TILE_SIZE / 4,
   SUBTILES_IN_TILE = TILE_SIZE / SUBTILE_SIZE,
   // @Temporary: for now the game uses too much memory to handle a board size of 64. thanks grass
   /** Number of chunks in the world's width and height */
   BOARD_SIZE = 16,
   /** Number of tiles in a chunk's width and height */
   CHUNK_SIZE = 4,
   CHUNK_UNITS = CHUNK_SIZE * TILE_SIZE,
   BOARD_DIMENSIONS = BOARD_SIZE * CHUNK_SIZE,
   BOARD_UNITS = BOARD_DIMENSIONS * TILE_SIZE,
   TILES_IN_WORLD_WIDTH = BOARD_UNITS / TILE_SIZE,
   INITIAL_PLAYER_HOTBAR_SIZE = 7,
   ITEM_PLACE_DISTANCE = 60,
   DEFAULT_ATTACK_COOLDOWN = 0.3,
   EDGE_GENERATION_DISTANCE = 16,
   FULL_BOARD_DIMENSIONS = BOARD_DIMENSIONS + 2 * EDGE_GENERATION_DISTANCE,
   STRUCTURE_SNAP_RANGE = 100,
   STRUCTURE_POSITION_SNAP = 25,
   STRUCTURE_ROTATION_SNAP = 0.4,
   ENTITY_PUSH_FORCE = 20,
   // @Cleanup: Should these be here?
   SAFETY_NODE_SEPARATION = 16,
   SAFETY_NODES_IN_WORLD_WIDTH = BOARD_UNITS / SAFETY_NODE_SEPARATION,
   MAX_CRAFTING_STATION_USE_DISTANCE = 150,
   TIME_PASS_RATE = 150,
   NIGHT_LIGHT_LEVEL = 0.4
}

export const enum PathfindingSettings {
   /** Units of separation between the nodes horizontally and vertically */
   NODE_SEPARATION = 16,
   NODES_IN_WORLD_WIDTH = Settings.BOARD_UNITS / PathfindingSettings.NODE_SEPARATION + 2,
   NODE_REACH_DIST = 24
}