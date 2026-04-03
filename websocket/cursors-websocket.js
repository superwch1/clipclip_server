import { parse } from 'url';

const clients = new Set();
const cursorsMap = new Map();

function handleMessage(data, ws) {
  try {
    const message = JSON.parse(data);
    setCursorPosition(message);
  }
  catch {}
}

function setCursorPosition(message) {
  try {
    var map = cursorsMap.get(`${message.boardId}`);
    if (map === undefined) {
      map = cursorsMap.set(`${message.boardId}`, new Map());
    }

    cursorsMap.get(`${message.boardId}`).set(`${message.uuid}`, { x: message.x, y: message.y })
  }
  catch {}
}

function setupCursorConnection(ws, request) {
    
  // (this) is referred to the WebSocketServer not FiguresWebSocket so it cannot be used here
  const parsedUrl = parse(request.url, true);
  const uuid = parsedUrl.query.uuid;
  const isDesktop = parsedUrl.query.isDesktop;
  const boardId = parsedUrl.query.boardId;
  ws.boardId = boardId;


  if (isDesktop === "true") {

    // add a new map with boardId inside cursorsMap if no existing map is found
    var map = cursorsMap.get(`${boardId}`);
    if (map === undefined) {
      cursorsMap.set(`${boardId}`, new Map());
    }

    // the location will be stored using uuid provided from client as key
    cursorsMap.get(`${boardId}`).set(`${uuid}`, { x: 0, y: 0 });
  }
  clients.add(ws);


  ws.on('message', async (data) => handleMessage(data, ws));

  ws.on('close', () => {
    if (isDesktop === "true") {
      var map = cursorsMap.get(`${boardId}`);
      if (map !== undefined) {
        cursorsMap.get(`${boardId}`).delete(`${uuid}`);
      }

      // delete the map with no more cursor location inside that map
      if (map !== undefined && map.size === 0) {
        cursorsMap.delete(`${boardId}`);
      }
    }
    clients.delete(ws);
  });
}





function periodicBroadcastCursorLocation() {
  setInterval(() => {
    clients.forEach((client) => {
      const cursorsArray = Array.from(cursorsMap.get(`${client.boardId}`), ([key, value]) => ({ key, value }));
      client.send(JSON.stringify({cursors: cursorsArray}));
    });
  }, 100);
}

export { setupCursorConnection, periodicBroadcastCursorLocation };