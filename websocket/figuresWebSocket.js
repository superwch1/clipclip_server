const YjsRepository = require('../repository/yjsRepository.cjs')
const FigureRepository = require('../repository/figureRepository.cjs')
const PreviewInfoRepository = require('../repository/previewInfoRepository.cjs')
const path = require('path');
const fs = require('fs');


class FiguresWebSocket {
  static clients = new Set();

  static setupFigureConnection(ws) {
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

      const message = JSON.parse(data);
      switch(message.action) {
        case 'delete':
          await FiguresWebSocket.deleteFigure(message);
          break;
        case 'copy':
          await FiguresWebSocket.copyFigure(message);
          break;
        default:
          console.log(`Unhandled action: ${message.action}`);
      }
    }
    catch {}
  }

  static async copyFigure(message) {
    try {
      var figure = await FigureRepository.readFigure(message.id);
      if (figure == null) {
        return;
      }
       
      figure.x = figure.x + figure.width + 100;
      var createdFigure = await FigureRepository.createFigure(figure);
      if (createdFigure === null) {
        return;
      }

      if (figure.type === 'editor') {
        await YjsRepository.copyAllWritings(figure._id, createdFigure._id);
      }
      else if (figure.type === 'image') {
        const format = figure.url.split('.')
        createdFigure = await FigureRepository.updateFigureUrl(createdFigure._id, `${createdFigure._id}.${format[1]}`);
        if (createdFigure === null) {
          return;
        }

        fs.copyFile(`./images/${figure.url}`, `./images/${createdFigure.url}`, async (err) => {
          // the error catch function need to be exist or error will occur
          if (err !== null) {
            await FigureRepository.deleteFigure(createdFigure._id);
            createdFigure = null;
          }
        });
        
        // stop sending websocket to all user when it has error in saving image 
        if (createdFigure === null) {
          return;
        }
      }
      else if (figure.type === 'preview') {
        await PreviewInfoRepository.copyPreviewInfo(figure._id, createdFigure._id);
      }

      this.sendMessage("copy", createdFigure);
    }
    catch {}
  } 
  
  
  static async deleteFigure(message) {
    try {
      var figure = await FigureRepository.readFigure(message.id);
      if (figure) {
        await FigureRepository.deleteFigure(figure._id);
  
        if (figure.type === 'image') {
          fs.unlink(`./images/${figure.url}`, (err) => {
            // the error catch function need to be exist or function will throw error automatically
            // it automatically return null - need to be checked
          });
        }
        else if (figure.type === 'editor') {
          // server will delete the remaining 2 documents in yjs-writing when those connection is lost
          // the procedure of cleaning will be handled in server.js
          await YjsRepository.deleteAllWritings(figure._id);
        }
        else if (figure.type === 'preview') {
          await PreviewInfoRepository.deletePreviewInfoWithFigureId(figure._id);
        }
  
        this.sendMessage("delete", figure);
      }
    }
    catch {}
  }

  static sendMessage(action, figure) {
    this.clients.forEach((client) => {
      client.send(JSON.stringify({action: action, figure: figure}));
    });
  }
}


module.exports = {
  FiguresWebSocket: FiguresWebSocket
};