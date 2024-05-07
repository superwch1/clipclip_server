const YjsPost = require('../models/yjs');
const PreviewInfoPost = require('../models/previewInfo');
const sharp = require('sharp');
const Config = require('../config');
const FigureRepository = require('../repository/figureRepository.cjs')
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');
const Y = require('yjs');


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
        var posts = await YjsPost.find({ docName: figure._id});
        for (var i = 0; i < posts.length; i++) {
          var newWriting = new YjsPost({
            action: posts[i].action,
            clock: posts[i].clock,
            version: posts[i].version,
            docName: createdFigure._id,
            value: posts[i].value
          });
          await newWriting.save()
        }
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
        var posts = await PreviewInfoPost.find({ figureId: figure._id});
        var newPreview = new PreviewInfoPost({
          url: posts[0].url,
          title: posts[0].title,
          favicon: posts[0].favicon,
          description: posts[0].description,
          image: posts[0].image,
          author: posts[0].author, 
          figureId: createdFigure._id 
        });
        await newPreview.save()
      }

      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "copy", figure: createdFigure}));
      });
    }
    catch {}
  }
  
  
  static async moveFigure(message) {
    try {
      // only id, width, height, x and y is needed inside the message 
      var updatedFigure = await FigureRepository.updateFigureSizeAndPosition(message);
      if (updatedFigure === null) {
        return;
      }
     
      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "update", figure: updatedFigure}));
      });
    }
    catch {}
  }
  
  
  static async layerUpFigure(message) {
    try {
      var updatedFigure = await FigureRepository.layerUpFigure(message.id);
      if (updatedFigure === null) {
        return;
      }

      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "update", figure: updatedFigure}));
      });
    }
    catch {}
  }
  
  
  static async layerDownFigure(message) {
    try {
      var updatedFigure = await FigureRepository.layerDownFigure(message.id);
      if (updatedFigure === null) {
        return;
      }

      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "update", figure: updatedFigure}));
      });
    }
    catch {}
  }
  

  static async backgroundColorFigure(message) {
    try {
      var updatedFigure = await FigureRepository.updateFigureBackgroundColor(message.id, message.backgroundColor)
      if (updatedFigure === null) {
        return;
      }

      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "update", figure: figure}));
      });
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
          await YjsPost.deleteMany({docName: figure._id});
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


  static async createEditorFigure (figure, pastedText) {
    try {
      var createdFigure = await FigureRepository.createFigure(figure);
      if (createdFigure === null) {
        return;
      }

      if (pastedText !== "") {
        const ydoc = await global.mdb.getYDoc(figure._id);

        const yText = ydoc.getText('quill');
        const format = { size: 'large' };
        yText.insert(0, pastedText, format);
        
        var u8intArray = Y.encodeStateAsUpdate(ydoc);
        await global.mdb.storeUpdate(figure._id, u8intArray);
      }

      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "create", figure: createdFigure}));
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

      var createdFigure = await FigureRepository.createFigure(figure);
      if (createdFigure === null) {
        return;
      }

      var previewInfo = new PreviewInfoPost({
        url: figure.url,
        title: $("title").first().text(),
        favicon: $('link[rel="shortcut icon"]').attr("href") || $('link[rel="alternate icon"]').attr("href"),
        description: getMetaTag("description"),
        image: getMetaTag("image"),
        author: getMetaTag("author"), 
        
        //since it store as figure_..., it store as string instead of new mongoose.Types.ObjectId(figure._id.replace('figure_', ''))
        figureId: createdFigure._id 
      });
      await previewInfo.save();

    
      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "create", figure: createdFigure}));
      });
    }
    catch {}
  }


  static async createImageFigure (figure, image) {
    try {
      if (image === null) {
        return;
      }
  
      //it will crash if it is not an image
      var metadata = await sharp(image.data).metadata();
      if(metadata.size > Config.imageMaxSize) {
        return;
      }

      var aspect = metadata.width / metadata.height;
      figure.height = 200;
      if (200 * aspect < 200) {
        figure.width = 200;
        figure.height = 200 / aspect;
      }
      else {
        figure.width = 200 * aspect;
      }


      if (!(metadata.format === 'jpeg' || metadata.format === 'jpg' || metadata.format === 'gif' || metadata.format === 'png' || metadata.format === 'webp')) {
        return;
      }
  
      var createdFigure = await FigureRepository.createFigure(figure);
      if (createdFigure === null) {
        return;
      }

      const filePath = path.join(appDirectory, 'images', `${createdFigure._id}.${metadata.format}`);
      fs.writeFile(filePath, image.data, (err) => {
        if (err !== null) {
          createdFigure === null;
        }
      });
      if (createdFigure === null) {
        return;
      }

      var updatedFigure = await FigureRepository.updateFigureUrl(createdFigure._id, `${createdFigure._id}.${metadata.format}`);
      if (updatedFigure === null) {
        return;
      }
    
      this.clients.forEach((client) => {
        client.send(JSON.stringify({action: "create", figure: updatedFigure}));
      });
    }
    catch {}
  }
}


module.exports = {
  FiguresWebSocket: FiguresWebSocket
};