const url = require('url');

class CursorsWebSocket {
  static clients = new Set();
  static cursors = new Map();

  static setupCursorConnection(ws, request) {
    // (this) is referred to the WebSocketServer not FiguresWebSocket so it cannot be used here
    const parsedUrl = url.parse(request.url, true);
    const uuid = parsedUrl.query.uuid;
    
    CursorsWebSocket.clients.add(ws);
    CursorsWebSocket.cursors.set(`${uuid}`, { x: 0, y: 0 });

    ws.on('message', async (data) => CursorsWebSocket.handleMessage(data, ws));

    ws.on('close', () => {
      CursorsWebSocket.clients.delete(ws);
      CursorsWebSocket.cursors.delete(`${uuid}`);
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
    CursorsWebSocket.intervalId = setInterval(() => {
      const cursorsArray = Array.from(this.cursors, ([key, value]) => ({ key, value }));

      this.clients.forEach((client) => {
        client.send(JSON.stringify({cursors: cursorsArray}));      
      });
    }, 100);
  }


  static setCursorPosition(message) {
    try {
      this.cursors.set(`${message.uuid}`, { x: message.x, y: message.y })
    }
    catch {}
  }
}


module.exports = {
  CursorsWebSocket: CursorsWebSocket
};