const express = require('express');
const router = express.Router();
const FigurePost = require('../models/figure');
const { FiguresWebSocket } = require('../websocket/figuresWebsocket/utils');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');

router.get('/', (req, res) => {
  res.sendFile(path.resolve(appDirectory, 'index.html'));
});

// https://jaybarnes33.hashnode.dev/generating-link-previews-with-react-and-nodejs
router.get("/preview", async (req, res) => {
  try {
    const { url } = req.query;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const getMetaTag = (name) => {
      return ( $(`meta[name=${name}]`).attr("content") || $(`meta[propety="twitter${name}"]`).attr("content") || 
        $(`meta[property="og:${name}"]`).attr("content")
      );
    };

    const preview = {
      url,
      title: $("title").first().text(),
      favicon: $('link[rel="shortcut icon"]').attr("href") || $('link[rel="alternate icon"]').attr("href"),
      description: getMetaTag("description"),
      image: getMetaTag("image"),
      author: getMetaTag("author"),
    };

    res.status(200).json(preview);
  } catch (error) {
    res.sendStatus(500);
  }
});


router.get('/image', (req, res) => {
  try {
    const imagePath = path.join(appDirectory, 'images', `${req.query.id}.jpeg`);
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
    await FiguresWebSocket.createFigure(req.body, null)
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
})


router.post('/preview', async (req, res) => {
  try {
    await FiguresWebSocket.createFigure(req.body, null)
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

    await FiguresWebSocket.createFigure(figure, image)
    res.sendStatus(200);
  }
  catch {
    res.sendStatus(500);
  }
})


module.exports = router;