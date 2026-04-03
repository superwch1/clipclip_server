import { parse } from 'url';

const clients = new Set();

function handleMessage(data, ws) {
  try {
    const type = new TextDecoder().decode(data);
    if (type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  } catch {}
}

function sendMessage(action, figure) {
  clients.forEach((client) => {
    if (figure.boardId === client.boardId) {
      client.send(JSON.stringify({ action, figure }));
    }
  });
}

function setupFigureConnection(ws, request) {
  const parsedUrl = parse(request.url, true);
  ws.boardId = parsedUrl.query.boardId;

  // (this) is referred to the WebSocketServer not FiguresWebSocket so it cannot be used here
  clients.add(ws);

  ws.on('message', (data) => handleMessage(data, ws));
  ws.on('close', () => clients.delete(ws));
}

export { sendMessage, setupFigureConnection }