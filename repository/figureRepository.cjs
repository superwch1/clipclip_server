const FigurePost = require('../models/figure');
const Config = require('../config');
const mongoose = require('mongoose');

class FigureRepository {

  /** 
   * create figure
   * @param {*} figure boardId, type, width, height, x, y, backgroundColor, url and zIndex
   * @returns figure properties, null if unsuccessful
   */
  static async createFigure(figure) {
    
    var createdFigure = new FigurePost({
      boardId: figure.boardId,
      type: figure.type,
      width: figure.width,
      height: figure.height,
      x: figure.x,
      y: figure.y,
      backgroundColor: figure.backgroundColor,
      url: figure.url,
      zIndex: figure.zIndex,
      isPinned: figure.isPinned
    });
    await createdFigure.save();
    return createdFigure;
  }


  /** 
   * create figure with Id
   * @param {*} figure id, boardId, type, width, height, x, y, backgroundColor, url and zIndex
   * @returns figure properties, null if unsuccessful
   */
  static async createFigureWithId(figure) {

    var existingFigure = await FigurePost.findById(figure.id);
    if (existingFigure !== null) {
      return null;
    }
    
    var createdFigure = new FigurePost({
      _id: figure.id,
      boardId: figure.boardId,
      type: figure.type,
      width: figure.width,
      height: figure.height,
      x: figure.x,
      y: figure.y,
      backgroundColor: figure.backgroundColor,
      url: figure.url,
      zIndex: figure.zIndex,
      isPinned: figure.isPinned
    });
    await createdFigure.save();
    return createdFigure;
  }

  
  /** 
   * read all figures
   * @returns array of figures with their properties, empty array [] with no figures are found
   */
  static async readAllFigures(boardId) {
    var figures = await FigurePost.find({ boardId: boardId });
    if (figures.length > 0) {
      return figures;
    }
    return null;
  }

  
  /** 
   * read figure with id
   * @param {*} id 
   * @returns figure properties, null if unsuccessful
   */
  static async readFigure(id) {
    var figure = await FigurePost.findById(id);
    if (figure) {
      return figure;
    }
    return null;
  }

  
  /** 
   * update url of the figure with id
   * @param {*} id 
   * @param {*} url updated url of figure
   * @returns figure properties, null if unsuccessful
   */
  static async updateFigureUrl(id, url) {
    var updatedFigure = await FigurePost.findById(id);
    if (updatedFigure) {
      updatedFigure.url = url;

      await updatedFigure.save();
      return updatedFigure;
    }
    return null;
  }


  /** 
   * update the position of figure  
   * @param {*} figure id, x, y, width and height
   * @returns figure properties, null if unsuccessful
   */
  static async updateFigurePositionAndSize(figure) {

    var updatedFigure = await FigurePost.findById(figure.id);
    if (updatedFigure) {
      updatedFigure.x = figure.x;
      updatedFigure.y = figure.y;
      updatedFigure.width = figure.width;
      updatedFigure.height = figure.height;

      await updatedFigure.save();
      return updatedFigure;
    }
    return null;
  }

  
  /** 
   * update the background color of figure
   * @param {*} figure id and backgroundColor
   * @returns figure properties, null if unsuccessful
   */
  static async updateFigureBackgroundColor(figure) {
    var updatedFigure = await FigurePost.findById(figure.id);
    if (updatedFigure) {
      updatedFigure.backgroundColor = figure.backgroundColor;

      await updatedFigure.save();
      return updatedFigure;
    }
    return null;
  }

  
  /** 
   * update the background color of figure
   * @param {*} id 
   * @param {*} backgroundColor updated background color of figure
   */
  static async deleteFigure(id) {
    await FigurePost.findByIdAndDelete(id);
  }


  /** 
   * increase the zIndex by 1
   * @param {*} id 
   * @returns figure properties, null if unsuccessful
   */
  static async layerUpFigure(id) {
    var updatedFigure = await FigurePost.findById(id);
    if (updatedFigure) {
      var newValue = updatedFigure.zIndex + 1;
      if (newValue > Config.figureMaxZIndex) {
        return null;
      }
      updatedFigure.zIndex = newValue;

      await updatedFigure.save();
      return updatedFigure;
    }
    return null;
  }

  
  /** 
   * decrease zIndex by 1
   * @param {*} id 
   * @returns figure properties, null if unsuccessful
   */
  static async layerDownFigure(id) {
    var updatedFigure = await FigurePost.findById(id);
    if (updatedFigure) {
      var newValue = updatedFigure.zIndex - 1;
      if (newValue < Config.figureMinZIndex) {
        return null;
      }
      updatedFigure.zIndex = newValue;

      await updatedFigure.save();
      return updatedFigure;
    }
    return null;
  }

  /** 
   * switch pin status
   * @param {*} id 
   * @returns figure properties, null if unsuccessful
   */
  static async updatePinStatusFigure(id, isPinned) {
    var updatedFigure = await FigurePost.findById(id);
    if (updatedFigure) {
      updatedFigure.isPinned = isPinned;

      await updatedFigure.save();
      return updatedFigure;
    }
    return null;
  }
}

module.exports = FigureRepository;
