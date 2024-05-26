const express = require('express');
const router = express.Router();
const FigureRepository = require('../repository/figureRepository.cjs')
const PreviewInfoRepository = require('../repository/previewInfoRepository.cjs')
const PreviewInfoPost = require('../models/previewInfo');
const YjsRepository = require('../repository/yjsRepository.cjs');
const { FiguresWebSocket } = require('../websocket/figuresWebSocket');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');
const Y = require('yjs');
const sharp = require('sharp');
const Config = require('../config');
const convert = require('heic-convert');
const fs = require('fs');


router.get('/', (req, res) => {
  res.sendFile(path.resolve(global.appDirectory, 'views/index.html'));
});

// https://jaybarnes33.hashnode.dev/generating-link-previews-with-react-and-nodejs
router.get("/preview", async (req, res) => {
  try {
    var previewInfo = await PreviewInfoPost.find({figureId: req.query.id})
    if (previewInfo) {
      res.status(200).json(previewInfo);
    }
    else {
      res.status(404).send("Preview not found");
    }
  } catch (error) {
    res.sendStatus(500);
  }
});


router.get('/image', (req, res) => {
  try {
    const imagePath = path.join(appDirectory, 'images', `${req.query.url}`);
    if (fs.existsSync(imagePath)) {
      res.status(200).sendFile(imagePath, (error) => {});
    }
    else {
      res.status(404).send("Image not found");
    }
    
  }
  catch {
    res.sendStatus(500);
  }
});


router.get('/figures', async (req, res) => {
  try {
    var figures = await FigureRepository.readAllFigures(); 
    if (figures) {
      res.status(200).json(figures);
    }
    else {
      res.status(200).json([]);
    }
  }
  catch {
    res.sendStatus(500);
  }
})


router.post('/editor', async (req, res) => {
  try {
    var createdFigure = await FigureRepository.createFigure(req.body.figure);
    if (createdFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }

    if (req.body.plainText !== null || req.body.quillDelta !== null) {
      const ydoc = await global.mdb.getYDoc(createdFigure._id);
      const yText = ydoc.getText('quill');

      if (req.body.plainText !== null) {
        yText.insert(0, req.body.plainText, {});
      }
      else {
        yText.applyDelta(req.body.quillDelta);
      }
      
      var u8intArray = Y.encodeStateAsUpdate(ydoc);
      await global.mdb.storeUpdate(createdFigure._id, u8intArray);
    }

    FiguresWebSocket.sendMessage("create", createdFigure);
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
})


router.post('/preview', async (req, res) => {
  try {
    const { data } = await axios.get(req.body.url);
    const cheerioData = cheerio.load(data);

    var figure = req.body.figure;
    figure.url = req.body.url;

    var createdFigure = await FigureRepository.createFigure(figure);
    if (createdFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }
    await PreviewInfoRepository.createPreviewInfo(createdFigure._id, req.body.url, cheerioData);
  
    FiguresWebSocket.sendMessage("create", createdFigure);
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
})


router.post('/image', async (req, res) => {
  try {
    const base64Data = req.body.base64.split(',')[1];
    var buffer = Buffer.from(base64Data, 'base64');
    var figure = req.body.figure;

    // unsupported media type will throw error
    // gif is not animaited - https://github.com/lovell/sharp/issues/4092
    var metadata = await sharp(buffer).metadata();
    if(metadata.size > Config.imageMaxSize) {
      res.status(400).send("Size of image too large");
      return;
    }

    if (req.body.isDefaultSize === true) {
      var aspect = 0;
      // photo is taken upright and need to reverse the width and height
      if (metadata.orientation === 6) {
        aspect = metadata.height / metadata.width
      }
      else {
        aspect = metadata.width / metadata.height
      }

      figure.height = 300;
      if (300 * aspect < 300) {
        figure.width = 300;
        figure.height = 300 / aspect;
      }
      else {
        figure.width = 300 * aspect;
      }
    }

    // convert the image to jpg format if it is a .heif
    if (metadata.format === 'heif'){
      buffer = await convert({ buffer: buffer, format: 'JPEG' });
      metadata = await sharp(buffer).metadata();
    }

    var createdFigure = await FigureRepository.createFigure(figure);
    if (createdFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }

    const filePath = path.join(appDirectory, 'images', `${createdFigure._id}.${metadata.format}`);
    await sharp(buffer).toFile(filePath);

    var updatedFigure = await FigureRepository.updateFigureUrl(createdFigure._id, `${createdFigure._id}.${metadata.format}`);
    if (updatedFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }

    FiguresWebSocket.sendMessage("create", updatedFigure);
    res.sendStatus(200);
  }
  catch { 
    res.sendStatus(500);
  }
});


router.put('/positionAndSize', async (req, res) => {
  try {    
    // only id, width, height, x and y is needed inside the figure
    var updatedFigure = await FigureRepository.updateFigureSizeAndPosition(req.body.figure);
    if (updatedFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }
    
    FiguresWebSocket.sendMessage("update", updatedFigure);
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
});


router.put('/backgroundColor', async (req, res) => {
  try {    
    var updatedFigure = await FigureRepository.updateFigureBackgroundColor(req.body.figure)
    if (updatedFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }

    FiguresWebSocket.sendMessage("update", updatedFigure);
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
});

router.put('/pin', async (req, res) => {
  try {    
    var updatedFigure = await FigureRepository.switchPinStatusFigure(req.body.id);
    if (updatedFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }

    FiguresWebSocket.sendMessage("update", updatedFigure);
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
});


router.put('/layer', async (req, res) => {
  try {    
    var updatedFigure;
    if (req.body.action === "up"){
      updatedFigure = await FigureRepository.layerUpFigure(req.body.id);
    }
    else if (req.body.action === "down") {
      updatedFigure = await FigureRepository.layerDownFigure(req.body.id);
    }
    
    if (updatedFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }

    FiguresWebSocket.sendMessage("update", updatedFigure);
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
});


router.post('/copyFigure', async (req, res) => {
  try {
    var figure = await FigureRepository.readFigure(req.body.id);
    if (figure == null) {
      res.status(400).send("Invalid figure properties");
      return;
    }
     
    figure.x = figure.x + figure.width + 100;
    var createdFigure = await FigureRepository.createFigure(figure);
    if (createdFigure === null) {
      res.status(400).send("Invalid figure properties");
      return;
    }

    if (figure.type === 'editor') {
      await YjsRepository.copyAllWritings(figure._id, createdFigure._id);
    }
    else if (figure.type === 'image') {
      const format = figure.url.split('.')
      createdFigure = await FigureRepository.updateFigureUrl(createdFigure._id, `${createdFigure._id}.${format[1]}`);
      if (createdFigure === null) {
        res.status(400).send("Invalid figure properties");
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
        res.status(400).send("Error in saving image");
        return;
      }
    }
    else if (figure.type === 'preview') {
      await PreviewInfoRepository.copyPreviewInfo(figure._id, createdFigure._id);
    }

    FiguresWebSocket.sendMessage("copy", createdFigure);
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  } 
})


router.delete('/figure', async (req, res) => {
  try {
    var figure = await FigureRepository.readFigure(req.body.id);
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

      FiguresWebSocket.sendMessage("delete", figure);
      res.sendStatus(200);
      return;
    }
    res.status(404).send("Figure not found");
  }
  catch (error) {
    console.log(error)
    res.sendStatus(500);
  }
});


module.exports = router;