import { parse } from 'url';

class FiguresWebSocket {
  static clients = new Set();

  static setupFigureConnection(ws, request) {

    const parsedUrl = parse(request.url, true);
    ws.boardId = parsedUrl.query.boardId;

    // (this) is referred to the WebSocketServer not FiguresWebSocket so it cannot be used here
    FiguresWebSocket.clients.add(ws);
    ws.on('message', async (data) => FiguresWebSocket.handleMessage(data, ws));
    ws.on('close', () => FiguresWebSocket.clients.delete(ws));
  }

  static async handleMessage(data, ws) {
    try {
      // send back the pong after receiving a ping from client
      const type = new TextDecoder().decode(data);
      if (type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
    }
    catch {}
  }

  static sendMessage(action, figure) {
    this.clients.forEach((client) => {
      if (figure.boardId === client.boardId) {
        client.send(JSON.stringify({action: action, figure: figure}));
      }
    });
  }
}


export { FiguresWebSocket };
