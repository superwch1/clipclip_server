const FigurePost = require('../../models/figure');
const sharp = require('sharp');
var fs = require('fs');

const clients = new Set();

function setupFigureConnection(ws) {
  clients.add(ws);

  ws.on('message', async function message(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.action === 'move') {
        await moveFigure(message);
      }

      else if (message.action === 'layerup') {
        await layerUpFigure(message);
      }

      else if (message.action === 'layerdown') {
        await layerDownFigure(message);
      }

      else if (message.action === 'backgroundcolor') {
        await backgroundColorFigure(message);
      }

      else if (message.action === 'delete') {
        await deleteFigure(message);
      }

      else if (message.action === 'copy') {
        await copyFigure(message);
      }
    }
    catch {}
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
}


async function createFigure (wss, figure, image) {
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
    await figure.save();

    if (image !== null){ 
      await sharp(image.data)
        .jpeg()
        .toFile(`images/${figure._id}.jpeg`);
    }

    wss.clients.forEach((client) => {
      client.send(JSON.stringify({action: "create", figure: figure}));
    });
  }
  catch {

  }
}


async function copyFigure(message) {
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
    await newfigure.save();

    if (figure.type === 'image') {
      fs.copyFile(`./images/${figure._id}.jpeg`, `./images/${newfigure._id}.jpeg`, (err) => {
        // the error catch function need to be exist or error will occur
      });
    }

    clients.forEach((client) => {
      client.send(JSON.stringify({action: "copy", figure: newfigure}));
    });
  }
  catch {

  }
}


async function moveFigure(message) {
  try {
    var figure = await FigurePost.findById(message.id);
    if (figure) {
      figure.width = message.width;
      figure.height = message.height;
      figure.x = message.x;
      figure.y = message.y;
      await figure.save();

      clients.forEach((client) => {
        client.send(JSON.stringify({action: "update", figure: figure}));
      });
    }
  }
  catch {
    
  }
}


async function layerUpFigure(message) {
  var figure = await FigurePost.findById(message.id);
  if (figure) {
    var newValue = figure.zIndex + 1;
    if (newValue > 20) {
      return;
    }

    figure.zIndex = newValue;
    await figure.save();

    clients.forEach((client) => {
      client.send(JSON.stringify({action: "update", figure: figure}));
    });
  }
}


async function layerDownFigure(message) {
  try {
    var figure = await FigurePost.findById(message.id);
    if (figure) {
      var newValue = figure.zIndex - 1;
      if (newValue < 1) {
        return;
      }

      figure.zIndex = newValue;
      await figure.save();

      clients.forEach((client) => {
        client.send(JSON.stringify({action: "update", figure: figure}));
      });
    }
  }
  catch {

  }
}

async function backgroundColorFigure(message) {
  try {
    var figure = await FigurePost.findById(message.id);
    if (figure) {
      figure.backgroundColor = message.backgroundColor;
      await figure.save();

      clients.forEach((client) => {
        client.send(JSON.stringify({action: "update", figure: figure}));
      });
    }
  }
  catch {

  }
}


async function deleteFigure(message) {
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

      clients.forEach((client) => {
        client.send(JSON.stringify({action: "delete", figure: figure}));
      });
    }
  }
  catch {

  }
}


module.exports = {
  setupFigureConnection: setupFigureConnection, 
  createFigure: createFigure
};