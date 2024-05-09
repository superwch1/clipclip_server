const express = require('express');
const router = express.Router();
const FigureRepository = require('../repository/figureRepository.cjs')
const PreviewInfoRepository = require('../repository/previewInfoRepository.cjs')
const PreviewInfoPost = require('../models/previewInfo');
const { FiguresWebSocket } = require('../websocket/figuresWebSocket');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');
const Y = require('yjs');
const fs = require('fs');
const sharp = require('sharp');
const Config = require('../config');


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
      res.sendStatus(404);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});


router.get('/image', (req, res) => {
  try {
    const imagePath = path.join(appDirectory, 'images', `${req.query.url}`);
    res.status(200).sendFile(imagePath, (error) => {});
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
    var figure = req.body;

    var createdFigure = await FigureRepository.createFigure(figure);
    if (createdFigure === null) {
      res.sendStatus(500);
      return;
    }

    if (req.body.pastedText !== "") {
      const ydoc = await global.mdb.getYDoc(createdFigure._id);

      const yText = ydoc.getText('quill');
      const format = { size: 'large' };
      yText.insert(0, req.body.pastedText, format);
      
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
    var figure = req.body;

    const { data } = await axios.get(figure.url);
    const cheerioData = cheerio.load(data);

    var createdFigure = await FigureRepository.createFigure(figure);
    if (createdFigure === null) {
      res.sendStatus(500);
      return;
    }
    await PreviewInfoRepository.createPreviewInfo(createdFigure._id, figure.url, cheerioData);
  
    FiguresWebSocket.sendMessage("create", createdFigure);
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
})


router.post('/image', async (req, res) => {
  try {
    var image = req.files.image;
    var figure = JSON.parse(req.body.figure);

    if (image === null) {
      res.sendStatus(500);
      return;
    }

    //it will crash if it is not an image
    var metadata = await sharp(image.data).metadata();
    if(metadata.size > Config.imageMaxSize) {
      res.sendStatus(500);
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
      res.sendStatus(500);
      return;
    }

    const filePath = path.join(appDirectory, 'images', `${createdFigure._id}.${metadata.format}`);
    fs.writeFile(filePath, image.data, (err) => {
      if (err !== null) {
        createdFigure === null;
      }
    });
    if (createdFigure === null) {
      res.sendStatus(500);
      return;
    }

    var updatedFigure = await FigureRepository.updateFigureUrl(createdFigure._id, `${createdFigure._id}.${metadata.format}`);
    if (updatedFigure === null) {
      res.sendStatus(500);
      return;
    }

    FiguresWebSocket.sendMessage("create", updatedFigure);
    res.sendStatus(200);
  }
  catch (error){
    console.log(error);
    res.sendStatus(500);
  }
})


module.exports = router;