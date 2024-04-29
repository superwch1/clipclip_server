const express = require('express');
const router = express.Router();
const FigurePost = require('../models/figure');
const PreviewInfoPost = require('../models/previewInfo');
const { FiguresWebSocket } = require('../websocket/figuresWebsocket/utils');
const path = require('path');

router.get('/', (req, res) => {
  res.sendFile(path.resolve(appDirectory, 'index.html'));
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
    var figures = await FigurePost.find(); 
    if (figures) {
      res.status(200).json(figures);
    }
    else {
      res.sendStatus(404);
    }
  }
  catch {
    res.sendStatus(500);
  }
})


router.post('/editor', async (req, res) => {
  try {
    await FiguresWebSocket.createEditorFigure(req.body)
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
})


router.post('/preview', async (req, res) => {
  try {
    await FiguresWebSocket.createPreviewFigure(req.body)
    res.sendStatus(200);
  }
  catch (error) {
    console.log(error)
    res.sendStatus(500);
  }
})


router.post('/image', async (req, res) => {
  try {
    var image = req.files.image;
    var figure = JSON.parse(req.body.figure);

    await FiguresWebSocket.createImageFigure(figure, image)
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
})


module.exports = router;