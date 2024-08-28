const url = require('url');

class CursorsWebSocket {
  static clients = new Set();
  static cursorsMap = new Map();

  static setupCursorConnection(ws, request) {
    // (this) is referred to the WebSocketServer not FiguresWebSocket so it cannot be used here
    const parsedUrl = url.parse(request.url, true);
    const uuid = parsedUrl.query.uuid;
    const isDesktop = parsedUrl.query.isDesktop; 
    const boardId = parsedUrl.query.boardId;
    ws.boardId = boardId;


    if (isDesktop === "true") {

      // add a new map with boardId inside cursorsMap if no existing map is found
      var map = CursorsWebSocket.cursorsMap.get(`${boardId}`);
      if (map === undefined) {
        CursorsWebSocket.cursorsMap.set(`${boardId}`, new Map());
      }

      // the location will be stored using uuid provided from client as key
      CursorsWebSocket.cursorsMap.get(`${boardId}`).set(`${uuid}`, { x: 0, y: 0 });
    }
    CursorsWebSocket.clients.add(ws);


    ws.on('message', async (data) => CursorsWebSocket.handleMessage(data, ws));


    ws.on('close', () => {
      if (isDesktop === "true") {
        var map = CursorsWebSocket.cursorsMap.get(`${boardId}`);
        if (map !== undefined) {
          CursorsWebSocket.cursorsMap.get(`${boardId}`).delete(`${uuid}`);
        }

        // delete the map with no more cursor location inside that map
        if (map.size === 0) {
          CursorsWebSocket.cursorsMap.delete(`${boardId}`);
        }
      }
      CursorsWebSocket.clients.delete(ws);
    });
  }


  static async handleMessage(data, ws) {
    try {
      const message = JSON.parse(data);
      CursorsWebSocket.setCursorPosition(message);
    }
    catch {}
  }
  

  static startBroadcastCursorLocation() {
    setInterval(() => {
      this.clients.forEach((client) => {
        const cursorsArray = Array.from(this.cursorsMap.get(`${client.boardId}`), ([key, value]) => ({ key, value }));
        client.send(JSON.stringify({cursors: cursorsArray}));      
      });
    }, 100);
  }


  static setCursorPosition(message) {
    try {
      var map = CursorsWebSocket.cursorsMap.get(`${message.boardId}`);
      if (map === undefined) {
        map = CursorsWebSocket.cursorsMap.set(`${message.boardId}`, new Map());
      }

      CursorsWebSocket.cursorsMap.get(`${message.boardId}`).set(`${message.uuid}`, { x: message.x, y: message.y })
    }
    catch {}
  }
}


module.exports = {
  CursorsWebSocket: CursorsWebSocket
};