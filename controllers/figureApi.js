const express = require('express');
const router = express.Router();
const FigureRepository = require('../repository/figureRepository.cjs')
const PreviewInfoRepository = require('../repository/previewInfoRepository.cjs')
const ImageRepository = require('../repository/imageRepository.cjs')
const YjsRepository = require('../repository/yjsRepository.cjs');
const { FiguresWebSocket } = require('../websocket/figuresWebSocket');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');
const Y = require('yjs');
const sharp = require('sharp');
const Config = require('../config')
const convert = require('heic-convert')

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

  // redirect the path it if consist letter rather than 0-9, a-z and -_ symbol
  if (/^[a-z0-9_-]*$/.test(req.path.slice(7))) {
    res.sendFile(path.resolve(global.appDirectory, 'views/index.html'));
  }

  // replace invalid letter to '' and capital letter to lower case letter
  else {
    var newPath = req.path.slice(7).toLowerCase().replace(/[^a-z0-9_-]/g, ''); 
    res.redirect(`/board/${newPath}`);
  }
  
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
 *          202 - no preview info is found (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.get("/preview", async (req, res) => {
  try {
    var previewInfo = await PreviewInfoRepository.readPreviewInfo(req.query.id);

    if (previewInfo) {
      res.status(200).json(previewInfo);
    }
    else {
      res.status(202).send("figure not found");
    }
  } catch (error) {
    res.status(202).send("figure not found");
  }
});


/** 
 * get the image
 * @param {*} figure url (path to image)
 * @returns 200 - file of the image
 *          202 - no image is found on server (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.get('/image', async (req, res) => {
  try {
    const figureId = req.query.url.replace(/\.[^.]+$/, '');
    const image = await ImageRepository.readImage(figureId);
    if (image) {
      res.status(200).type(`image/${image.format}`).send(image.data);
    }
    else {
      res.status(202).send("figure not found");
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
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.post('/editor', validateFigure, async (req, res) => {

  var figureId = null;

  try {
    var createdFigure = await FigureRepository.createFigure(req.body.figure);
    if (createdFigure === null) {
      res.status(202).send("invalid properties");
      return;
    }

    figureId = createdFigure._id;

    if (req.body.plainText !== null || req.body.quillDelta !== null) {
      const ydoc = await global.pgdb.getYDoc(createdFigure._id);
      const yText = ydoc.getText('quill');

      if (req.body.plainText !== null) {
        yText.insert(0, req.body.plainText, {});
      }
      else {
        yText.applyDelta(req.body.quillDelta);
      }
      
      var u8intArray = Y.encodeStateAsUpdate(ydoc);
      await global.pgdb.storeUpdate(createdFigure._id, u8intArray);
    }

    FiguresWebSocket.sendMessage("create", createdFigure);
    res.status(200).json(createdFigure);
  }
  catch {
    if (figureId !== null) {
      FigureRepository.deleteFigure(figureId);
      await YjsRepository.deleteAllWritings(figureId);
    }

    res.sendStatus(500);
  }
})


/** 
 * create a editor (with id) figure
 * @param {*} figure id, boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned, plainText, quillDelta
 * @returns 200 - properties of the created figure
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.post('/editorWithId', validateFigure, validateFigureId, async (req, res) => {

  var figureId = null;

  try {
    var createdFigure = await FigureRepository.createFigureWithId(req.body.figure);
    if (createdFigure === null) {
      res.status(202).send("invalid properties");
      return;
    }

    figureId = createdFigure._id;

    if (req.body.plainText !== null || req.body.quillDelta !== null) {
      const ydoc = await global.pgdb.getYDoc(createdFigure._id);
      const yText = ydoc.getText('quill');

      if (req.body.plainText !== null) {
        yText.insert(0, req.body.plainText, {});
      }
      else {
        yText.applyDelta(req.body.quillDelta);
      }
      
      var u8intArray = Y.encodeStateAsUpdate(ydoc);
      await global.pgdb.storeUpdate(createdFigure._id, u8intArray);
    }

    FiguresWebSocket.sendMessage("create", createdFigure);
    res.status(200).json(createdFigure);
  }
  catch {
    if (figureId !== null) {
      FigureRepository.deleteFigure(figureId);
      await YjsRepository.deleteAllWritings(figureId);
    }

    res.sendStatus(500);
  }
});


/** 
 * create a preview figure
 * @param {*} figure boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned
 * @returns 200 - properties of the created figure
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.post('/preview', validateFigure, async (req, res) => {

  var figureId = null;
  var previewInfoId = null;

  try {    
    // template from https://jaybarnes33.hashnode.dev/generating-link-previews-with-react-and-nodejs
    const { data } = await axios.get(req.body.figure.url);
    const cheerioData = cheerio.load(data);

    var createdFigure = await FigureRepository.createFigure(req.body.figure);
    if (createdFigure === null) {
      res.status(202).send("invalid properties");
      return;
    }
    figureId = createdFigure._id;

    var previewInfo = await PreviewInfoRepository.createPreviewInfo(createdFigure._id, req.body.figure.url, cheerioData);
    previewInfoId = previewInfo._id;
  
    FiguresWebSocket.sendMessage("create", createdFigure);
    res.status(200).json(createdFigure);
  }
  catch {
    if (figureId !== null) {
      FigureRepository.deleteFigure(figureId);
    }
    if (previewInfoId !== null) {
      PreviewInfoRepository.deletePreviewInfoWithFigureId(figureId);
    }

    res.sendStatus(500);
  }
});


/** 
 * create a preview (with id) figure
 * @param {*} figure boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned
 * @returns 200 - properties of the created figure
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.post('/previewWithId', validateFigure, validateFigureId, async (req, res) => {

  var figureId = null;
  var previewInfoId = null;

  try {
    const { data } = await axios.get(req.body.figure.url);
    const cheerioData = cheerio.load(data);

    var createdFigure = await FigureRepository.createFigureWithId(req.body.figure);
    if (createdFigure === null) {
      res.status(202).send("invalid properties");
      return;
    }
    figureId = createdFigure._id;

    var previewInfo = await PreviewInfoRepository.createPreviewInfo(createdFigure._id, req.body.figure.url, cheerioData);
    previewInfoId = previewInfo._id;
  
    FiguresWebSocket.sendMessage("create", createdFigure);
    res.status(200).json(createdFigure);
  }
  catch {
    if (figureId !== null) {
      FigureRepository.deleteFigure(figureId);
    }
    if (previewInfoId !== null) {
      PreviewInfoRepository.deletePreviewInfoWithFigureId(figureId);
    }

    res.sendStatus(500);
  }
});


/** 
 * create a image figure
 * @param {*} figure boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned, isDefaultSize, base64
 * @returns 200 - properties of the created figure
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.post('/image', validateFigure, async (req, res) => {

  var figureId = null;
  var figureUrl = null;
  var imageSavingResult = null;

  try {
    const base64Data = req.body.base64.split(',')[1];
    var buffer = Buffer.from(base64Data, 'base64');
    var figure = req.body.figure;

    // unsupported media type will throw error
    // gif is not animaited - https://github.com/lovell/sharp/issues/4092
    var metadata = await sharp(buffer).metadata();
    if(metadata.size > Config.imageMaxSize) {
      res.status(202).send("size of image too large");
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
      res.status(202).send("invalid properties");
      return;
    }
    figureId = createdFigure._id;
    figureUrl = `${createdFigure._id}.${metadata.format}`;

    const processedBuffer = await sharp(buffer).toBuffer();
    await ImageRepository.saveImage(createdFigure._id, processedBuffer, metadata.format);
    imageSavingResult = true;

    var updatedFigure = await FigureRepository.updateFigureUrl(createdFigure._id, figureUrl);
    if (updatedFigure === null) {
      res.status(202).send("invalid properties");
      return;
    }

    FiguresWebSocket.sendMessage("create", updatedFigure);
    res.status(200).json(updatedFigure);
  }
  catch {
    if (figureId !== null) {
      FigureRepository.deleteFigure(figureId);
    }
    if (imageSavingResult !== null && figureUrl !== null) {
      ImageRepository.deleteImage(figureId);
    }

    res.sendStatus(500);
  }
});


/**
 * create a image (with id) figure
 * @param {*} figure id, boardId, x, y, width, height, type, backgroundColor, url, zIndex, isPinned, isDefaultSize, base64
 * @returns 200 - properties of the created figure
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.post('/imageWithId', validateFigure, validateFigureId, async (req, res) => {

  var figureId = null;
  var figureUrl = null;
  var imageSavingResult = null;

  try {
    const base64Data = req.body.base64.split(',')[1];
    var buffer = Buffer.from(base64Data, 'base64');
    var figure = req.body.figure;

    // unsupported media type will throw error
    // gif is not animaited - https://github.com/lovell/sharp/issues/4092
    var metadata = await sharp(buffer).metadata();
    if(metadata.size > Config.imageMaxSize) {
      res.status(202).send("size of image too large");
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
      res.status(202).send("invalid properties");
      return;
    }
    figureId = createdFigure._id;
    figureUrl = `${createdFigure._id}.${metadata.format}`;

    const processedBuffer = await sharp(buffer).toBuffer();
    await ImageRepository.saveImage(createdFigure._id, processedBuffer, metadata.format);
    imageSavingResult = true;

    var updatedFigure = await FigureRepository.updateFigureUrl(createdFigure._id, figureUrl);
    if (updatedFigure === null) {
      res.status(202).send("invalid properties");
      return;
    }

    FiguresWebSocket.sendMessage("create", updatedFigure);
    res.status(200).json(updatedFigure);
  }
  catch {
    if (figureId !== null) {
      FigureRepository.deleteFigure(figureId);
    }
    if (imageSavingResult !== null && figureUrl !== null) {
      ImageRepository.deleteImage(figureId);
    }

    res.sendStatus(500);
  }
});


/** 
 * update the position and size of a figure
 * @param {*} figure id, x, y, width, height
 * @returns 200 - properties of the updated figure
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.put('/positionAndSize', validatePositionAndSize, async (req, res) => {
  try {    
    // only id, width, height, x and y is needed inside the figure
    var updatedFigure = await FigureRepository.updateFigurePositionAndSize(req.body.figure);
    if (updatedFigure === null) {
      res.status(202).send("figure not found");
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
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.put('/backgroundColor', validateBackgroundColor, async (req, res) => {
  try {    
    var updatedFigure = await FigureRepository.updateFigureBackgroundColor(req.body.figure)
    if (updatedFigure === null) {
      res.status(202).send("figure not found");
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
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.put('/pin', async (req, res) => {
  try {    

    if (!(req.body.isPinned === true || req.body.isPinned === false)) {
      res.status(202).send("invalid pin status");
      return;
    }

    var updatedFigure = await FigureRepository.updatePinStatusFigure(req.body.id, req.body.isPinned);
    if (updatedFigure === null) {
      res.status(202).send("figure not found");
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
 *          202 - invalid properties inside the middleware (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.put('/layer', async (req, res) => {
  try {    

    if (!(req.body.action === "up" || req.body.action === "down")) {
      res.status(202).send("invalid layer action");
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
      res.status(202).send("figure not found");
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
 *          202 - figure not found in database (since iisnode only provide default message for 400)
 *          500 - server error
 */
router.delete('/figure', async (req, res) => {
  try {
    var figure = await FigureRepository.readFigure(req.body.id);
    if (figure) {
      await FigureRepository.deleteFigure(figure._id);

      if (figure.type === 'image') {
        await ImageRepository.deleteImage(figure._id);
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
    res.status(202).send("figure not found");
  }
  catch {
    res.sendStatus(500);
  }
});


module.exports = router;