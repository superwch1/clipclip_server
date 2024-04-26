const FigurePost = require('../../models/figure');
const sharp = require('sharp');
const Config = require('../../config');
var fs = require('fs');

class FiguresWebSocket {
  static clients = new Set();

  static setupFigureConnection(ws) {
    // (this) is referred to the WebSocketServer not FiguresWebSocket so it cannot be used here
    FiguresWebSocket.clients.add(ws);
    ws.on('message', async (data) => FiguresWebSocket.handleMessage(data));
    ws.on('close', () => FiguresWebSocket.clients.delete(ws));
  }

  static async handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch(message.action) {
        case 'move':
          await FiguresWebSocket.moveFigure(message);
          break;
        case 'layerup':
          await FiguresWebSocket.layerUpFigure(message);
          break;
        case 'layerdown':
          await FiguresWebSocket.layerDownFigure(message);
          break;
        case 'backgroundcolor':
          await FiguresWebSocket.backgroundColorFigure(message);
          break;
        case 'delete':
          await FiguresWebSocket.deleteFigure(message);
          break;
        case 'copy':
          await FiguresWebSocket.copyFigure(message);
          break;
        default:
          console.log("Unhandled action: ", message.action);
      }
    }
    catch {}
  }


  static async copyFigure(message) {
    try {
      var figure = await FigurePost.findById(message.id);
      if (!figure) {
        return;
      }
  
      var newfigure = new FigurePost({
        type: figure.type,
        width: figure.width,
        height: figure.height,
        x: figure.x + figure.width + 100,
        y: figure.y,
        backgroundColor: figure.backgroundColor,
        url: figure.url,
        zIndex: figure.zIndex
      });
  
      if (Config.isInvalidFigure(newfigure)) {
        return;
      }
      await newfigure.save();
  
      if (figure.type === 'image') {
        fs.copyFile(`./images/${figure._id}.jpeg`, `./images/${newfigure._id}.jpeg`, (err) => {
          // the error catch function need to be exist or error will occur
        });
      }

      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "copy", figure: newfigure}));
      });
    }
    catch {}
  }
  
  
  static async moveFigure(message) {
    try {
      var figure = await FigurePost.findById(message.id);
      if (figure) {
        figure.width = message.width;
        figure.height = message.height;
        figure.x = message.x;
        figure.y = message.y;
  
        if (Config.isInvalidFigureSizeAndPosition(figure)) {
          return;
        }
        await figure.save();
  
        this.clients.forEach((client) => {
          client.send(JSON.stringify({action: "update", figure: figure}));
        });
      }
    }
    catch {}
  }
  
  
  static async layerUpFigure(message) {
    try {
      var figure = await FigurePost.findById(message.id);
      if (figure) {
        var newValue = figure.zIndex + 1;
        if (newValue > Config.maxZIndex) {
          return;
        }
    
        figure.zIndex = newValue;
        await figure.save();
    
        this.clients.forEach((client) => {
          client.send(JSON.stringify({action: "update", figure: figure}));
        });
      }
    }
    catch {}
  }
  
  
  static async layerDownFigure(message) {
    try {
      var figure = await FigurePost.findById(message.id);
      if (figure) {
        var newValue = figure.zIndex - 1;
        if (newValue < Config.minZIndex) {
          return;
        }
  
        figure.zIndex = newValue;
        await figure.save();
  
        this.clients.forEach((client) => {
          client.send(JSON.stringify({action: "update", figure: figure}));
        });
      }
    }
    catch {}
  }
  

  static async backgroundColorFigure(message) {
    try {
      var figure = await FigurePost.findById(message.id);
      if (figure) {
        figure.backgroundColor = message.backgroundColor;
  
        if(Config.isInvalidBackgroundColor(figure)){
          return;
        }
        await figure.save();
  
        this.clients.forEach((client) => {
          client.send(JSON.stringify({action: "update", figure: figure}));
        });
      }
    }
    catch {}
  }
  
  
  static async deleteFigure(message) {
    try {
      var figure = await FigurePost.findById(message.id);
      if (figure) {
        await FigurePost.findByIdAndDelete(figure._id);
  
        if (figure.type === 'image') {
          fs.unlink(`./images/${figure._id}.jpeg`, (err) => {
            // the error catch function need to be exist or function will throw error automatically
          });
        }
        else if (figure.type === 'editor') {
          // server will all documents in yjs-writing when those connection is lost
          // the procedure of clearing will be handled in server.js
        }
  
        this.clients.forEach((client) => {
          client.send(JSON.stringify({action: "delete", figure: figure}));
        });
      }
    }
    catch {}
  }


  static async createFigure (figure, image) {
    try {
      var width = figure.width;
      var height = figure.height;
  
      if (image !== null) {
        //it will crash if it is not an image
        var metadata = await sharp(image.data).metadata();
        var aspect = metadata.width / metadata.height;
        var height = 200;
        if (200 * aspect < 200) {
          width = 200;
          height = 200 / aspect;
        }
        else {
          width = 200 * aspect;
        }
      }
  
      var figure = new FigurePost({
        type: figure.type,
        width: width,
        height: height,
        x: figure.x,
        y: figure.y,
        backgroundColor: figure.backgroundColor,
        url: figure.url,
        zIndex: figure.zIndex
      });
      
      if (Config.isInvalidFigure(figure)) {
        return;
      }
      await figure.save();
  
      if (image !== null){ 
        await sharp(image.data)
          .jpeg()
          .toFile(`images/${figure._id}.jpeg`);
      }
  
      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "create", figure: figure}));
      });
    }
    catch {}
  }
}


module.exports = {
  FiguresWebSocket: FiguresWebSocket
};