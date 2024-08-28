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
const Config = require('../config')
const convert = require('heic-convert')
const fs = require('fs')

const validateFigure = require('../validation/figure')
const validateFigureId = require('../validation/figureId')
const validateBackgroundColor = require('../validation/figureBackgroundColor')
const validatePositionAndSize = require('../validation/figurePositionAndSize')

/** 
 * redirect the url to /board/ if it does not provide a path
 * @returns '/board/'
 */
router.get('', (req, res) => {
  res.redirect("/board/");
});


/** 
 * render the webpage
 * @returns 200 - html file of react
 */
router.get('/board/*', (req, res) => {
  res.sendFile(path.resolve(global.appDirectory, 'views/index.html'));
});


/** 
 * get the properties of figures
 * @param {*} figure boardId
 * @returns 200 - properties of figures, empty array if not found
 */
router.get('/figures', async (req, res) => {
  try {
    var figures = await FigureRepository.readAllFigures(req.query.boardId); 
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


/** 
 * get the preview information
 * @param {*} figure id
 * @returns 200 - url, title, favicon, description, image (base64), author of preview (previewInfo is found)
 *          400 - no preview info is found
 *          500 - server error
 */
router.get("/preview", async (req, res) => {
  try {
    // template from https://jaybarnes33.hashnode.dev/generating-link-previews-with-react-and-nodejs
    var previewInfo = await PreviewInfoPost.find({figureId: req.query.id});

    var response = await axios.get(previewInfo[0].image, { responseType: 'arraybuffer' });
    const base64Data = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || response.headers['Content-Type'];
    const base64 = `data:${contentType};base64,${base64Data}`;
    previewInfo[0].image = base64;

    if (previewInfo) {
      res.status(200).json(previewInfo);
    }
    else {
      res.status(400).send("figure not found");
    }
  } catch (error) {

    // error in fetching image from external source
    const fileBuffer = fs.readFileSync(global.appDirectory + "/previewError.jpg");
    const base64Data = fileBuffer.toString('base64');
    const base64 = `data:${"image/jpeg"};base64,${base64Data}`;
    previewInfo[0].image = base64;
    
    res.status(200).json(previewInfo);
  }
});


/** 
 * get the image
 * @param {*} figure url (path to image)
 * @returns 200 - file of the image
 *          400 - no image is found on server
 *          500 - server error
 */
router.get('/image', (req, res) => {
  try {
    const imagePath = path.join(appDirectory, 'images', `${req.query.url}`);
    if (fs.existsSync(imagePath)) {
      res.status(200).sendFile(imagePath, (error) => {});
    }
    else {
      res.status(400).send("figure not found");
    }    
  }
  catch {
    res.sendStatus(500);
  }
});


/** 
 * create a editor figure
 * @param {*} figure boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned, plainText, quillDelta
 * @returns 200 - properties of the created figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.post('/editor', validateFigure, async (req, res) => {
  try {
    var createdFigure = await FigureRepository.createFigure(req.body.figure);
    if (createdFigure === null) {
      res.status(400).send("invalid properties");
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
    res.status(200).json(createdFigure);
  }
  catch {
    res.sendStatus(500);
  }
})


/** 
 * create a editor (with id) figure
 * @param {*} figure id, boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned, plainText, quillDelta
 * @returns 200 - properties of the created figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.post('/editorWithId', validateFigure, validateFigureId, async (req, res) => {
  try {
    var createdFigure = await FigureRepository.createFigureWithId(req.body.figure);
    if (createdFigure === null) {
      res.status(400).send("invalid properties");
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
    res.status(200).json(createdFigure);
  }
  catch {
    res.sendStatus(500);
  }
});


/** 
 * create a preview figure
 * @param {*} figure boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned
 * @returns 200 - properties of the created figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.post('/preview', validateFigure, async (req, res) => {
  try {
    const { data } = await axios.get(req.body.url);
    const cheerioData = cheerio.load(data);

    var figure = req.body.figure;
    figure.url = req.body.url;

    var createdFigure = await FigureRepository.createFigure(figure);
    if (createdFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }
    await PreviewInfoRepository.createPreviewInfo(createdFigure._id, req.body.url, cheerioData);
  
    FiguresWebSocket.sendMessage("create", createdFigure);
    res.status(200).json(createdFigure);
  }
  catch {
    res.sendStatus(500);
  }
});


/** 
 * create a preview (with id) figure
 * @param {*} figure boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned
 * @returns 200 - properties of the created figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.post('/previewWithId', validateFigure, validateFigureId, async (req, res) => {
  try {
    const { data } = await axios.get(req.body.url);
    const cheerioData = cheerio.load(data);

    var figure = req.body.figure;
    figure.url = req.body.url;

    var createdFigure = await FigureRepository.createFigureWithId(figure);
    if (createdFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }
    await PreviewInfoRepository.createPreviewInfo(createdFigure._id, req.body.url, cheerioData);
  
    FiguresWebSocket.sendMessage("create", createdFigure);
    res.status(200).json(createdFigure);
  }
  catch {
    res.sendStatus(500);
  }
});


/** 
 * create a image figure
 * @param {*} figure boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned, isDefaultSize, base64
 * @returns 200 - properties of the created figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.post('/image', validateFigure, async (req, res) => {
  try {
    const base64Data = req.body.base64.split(',')[1];
    var buffer = Buffer.from(base64Data, 'base64');
    var figure = req.body.figure;

    // unsupported media type will throw error
    // gif is not animaited - https://github.com/lovell/sharp/issues/4092
    var metadata = await sharp(buffer).metadata();
    if(metadata.size > Config.imageMaxSize) {
      res.status(400).send("size of image too large");
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
      res.status(400).send("invalid properties");
      return;
    }

    const filePath = path.join(appDirectory, 'images', `${createdFigure._id}.${metadata.format}`);
    await sharp(buffer).toFile(filePath);

    var updatedFigure = await FigureRepository.updateFigureUrl(createdFigure._id, `${createdFigure._id}.${metadata.format}`);
    if (updatedFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }

    FiguresWebSocket.sendMessage("create", updatedFigure);
    res.status(200).json(createdFigure);
  }
  catch { 
    res.sendStatus(500);
  }
});


/** 
 * create a image (with id) figure
 * @param {*} figure id, boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned, isDefaultSize, base64
 * @returns 200 - properties of the created figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.post('/imageWithId', validateFigure, validateFigureId, async (req, res) => {
  try {
    const base64Data = req.body.base64.split(',')[1];
    var buffer = Buffer.from(base64Data, 'base64');
    var figure = req.body.figure;

    // unsupported media type will throw error
    // gif is not animaited - https://github.com/lovell/sharp/issues/4092
    var metadata = await sharp(buffer).metadata();
    if(metadata.size > Config.imageMaxSize) {
      res.status(400).send("size of image too large");
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

    var createdFigure = await FigureRepository.createFigureWithId(figure);
    if (createdFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }

    const filePath = path.join(appDirectory, 'images', `${createdFigure._id}.${metadata.format}`);
    await sharp(buffer).toFile(filePath);

    var updatedFigure = await FigureRepository.updateFigureUrl(createdFigure._id, `${createdFigure._id}.${metadata.format}`);
    if (updatedFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }

    FiguresWebSocket.sendMessage("create", updatedFigure);
    res.status(200).json(createdFigure);
  }
  catch { 
    res.sendStatus(500);
  }
});


/** 
 * update the position and size of a figure
 * @param {*} figure id, x, y, width, height
 * @returns 200 - properties of the updated figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.put('/positionAndSize', validatePositionAndSize, async (req, res) => {
  try {    
    // only id, width, height, x and y is needed inside the figure
    var updatedFigure = await FigureRepository.updateFigurePositionAndSize(req.body.figure);
    if (updatedFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }
    
    FiguresWebSocket.sendMessage("update", updatedFigure);
    res.status(200).json(updatedFigure);
  }
  catch {
    res.sendStatus(500);
  }
});


/** 
 * update the background color of a figure
 * @param {*} figure id, background color
 * @returns 200 - properties of the updated figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.put('/backgroundColor', validateBackgroundColor, async (req, res) => {
  try {    
    var updatedFigure = await FigureRepository.updateFigureBackgroundColor(req.body.figure)
    if (updatedFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }

    FiguresWebSocket.sendMessage("update", updatedFigure);
    res.status(200).json(updatedFigure);
  }
  catch {
    res.sendStatus(500);
  }
});


/** 
 * update the pin status of a figure
 * @param {*} figure id, isPinned (true / false)
 * @returns 200 - properties of the updated figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.put('/pin', async (req, res) => {
  try {    

    if (!(req.body.isPinned === true || req.body.isPinned === false)) {
      res.status(400).send("invalid pin status");
      return;
    }

    var updatedFigure = await FigureRepository.updatePinStatusFigure(req.body.id, req.body.isPinned);
    if (updatedFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }

    FiguresWebSocket.sendMessage("update", updatedFigure);
    res.status(200).json(updatedFigure);
  }
  catch {
    res.sendStatus(500);
  }
});


/** 
 * update the layer of a figure
 * @param {*} figure id, action ("up" / "down")
 * @returns 200 - properties of the updated figure
 *          400 - invalid properties inside the middleware
 *          500 - server error
 */
router.put('/layer', async (req, res) => {
  try {    

    if (!(req.body.action === "up" || req.body.action === "down")) {
      res.status(400).send("invalid layer action");
      return;
    }

    var updatedFigure;
    if (req.body.action === "up"){
      updatedFigure = await FigureRepository.layerUpFigure(req.body.id);
    }
    else if (req.body.action === "down") {
      updatedFigure = await FigureRepository.layerDownFigure(req.body.id);
    }
    
    if (updatedFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }

    FiguresWebSocket.sendMessage("update", updatedFigure);
    res.status(200).json(updatedFigure);
  }
  catch {
    res.sendStatus(500);
  }
});


/** 
 * delete a figure
 * @param {*} figure id
 * @returns 200 - properties of the deleted figure
 *          400 - figure not found in database
 *          500 - server error
 */
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
      res.status(200).json(figure);
      return;
    }
    res.status(400).send("figure not found");
  }
  catch {
    res.sendStatus(500);
  }
});


module.exports = router;



/*
router.post('/copyFigure', async (req, res) => {
  try {
    var figure = await FigureRepository.readFigure(req.body.id);
    if (figure == null) {
      res.status(400).send("figure not found");
      return;
    }
     
    figure.x = figure.x + figure.width + 100;
    var createdFigure = await FigureRepository.createFigure(figure);
    if (createdFigure === null) {
      res.status(400).send("invalid properties");
      return;
    }

    if (figure.type === 'editor') {
      await YjsRepository.copyAllWritings(figure._id, createdFigure._id);
    }
    else if (figure.type === 'image') {
      const format = figure.url.split('.')
      createdFigure = await FigureRepository.updateFigureUrl(createdFigure._id, `${createdFigure._id}.${format[1]}`);
      if (createdFigure === null) {
        res.status(400).send("invalid properties");
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
        res.status(400).send("error in saving image");
        return;
      }
    }
    else if (figure.type === 'preview') {
      await PreviewInfoRepository.copyPreviewInfo(figure._id, createdFigure._id);
    }

    FiguresWebSocket.sendMessage("create", createdFigure);
    res.status(200).json(createdFigure);
  }
  catch {
    res.sendStatus(500);
  } 
});

*/