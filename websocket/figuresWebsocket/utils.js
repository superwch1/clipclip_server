const FigurePost = require('../../models/figure');
const PreviewInfoPost = require('../../models/previewInfo');
const sharp = require('sharp');
const Config = require('../../config');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');
const mongoose = require('mongoose');

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
        else if (figure.type === 'preview') {
          await PreviewInfoPost.deleteOne({figureId: message.id});
        }
  
        this.clients.forEach((client) => {
          client.send(JSON.stringify({action: "delete", figure: figure}));
        });
      }
    }
    catch {}
  }


  static async createEditorFigure (figure) {
    try {
      var figure = new FigurePost({
        type: figure.type,
        width: figure.width,
        height: figure.height,
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
    
      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "create", figure: figure}));
      });
    }
    catch {}
  }

  static async createPreviewFigure (figure) {
    try {
      const { data } = await axios.get(figure.url);
      const $ = cheerio.load(data);

      const getMetaTag = (name) => {
        return ( $(`meta[name=${name}]`).attr("content") || $(`meta[propety="twitter${name}"]`).attr("content") || 
          $(`meta[property="og:${name}"]`).attr("content")
        );
      };

      var figure = new FigurePost({
        type: figure.type,
        width: figure.width,
        height: figure.height,
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

      var previewInfo = new PreviewInfoPost({
        url: figure.url,
        title: $("title").first().text(),
        favicon: $('link[rel="shortcut icon"]').attr("href") || $('link[rel="alternate icon"]').attr("href"),
        description: getMetaTag("description"),
        image: getMetaTag("image"),
        author: getMetaTag("author"), 
        
        //since it store as figure_..., it store as string instead of new mongoose.Types.ObjectId(figure._id.replace('figure_', ''))
        figureId: figure._id 
      });
      await previewInfo.save();

    
      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "create", figure: figure}));
      });
    }
    catch (error) { console.log(error)}
  }

  static async createImageFigure (figure, image) {
    try {
      if (image === null) {
        return;
      }

      var width = figure.width;
      var height = figure.height;
  
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

      if (!(metadata.format === 'jpeg' || metadata.format === 'jpg' || metadata.format === 'gif' || metadata.format === 'png' || metadata.format === 'webp')) {
        return;
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

      const filePath = path.join(appDirectory, 'images', `${figure._id}.${metadata.format}`);
      fs.writeFile(filePath, image.data, (err) => {});
      figure.url = `${figure._id}.${metadata.format}`;
      
      await figure.save();
    
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