const FigurePost = require('../models/figure');
const Config = require('../config');

class FigureRepository {

  /** 
   * create figure
   * @param {*} figure type, width, height, x, y, backgroundColor, url and zIndex
   * @returns figure properties, null if unsuccessful
   */
  static async createFigure(figure) {
    if (this.isInvalidFigure(figure) === true) {
      return null;
    }
    
    var createdFigure = new FigurePost({
      type: figure.type,
      width: figure.width,
      height: figure.height,
      x: figure.x,
      y: figure.y,
      backgroundColor: figure.backgroundColor,
      url: figure.url,
      zIndex: figure.zIndex
    });
    await createdFigure.save();
    return createdFigure;
  }

  
  /** 
   * read all figures
   * @returns array of figures with their properties, empty array [] with no figures are found
   */
  static async readAllFigures() {
    var figures = await FigurePost.find();
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
  static async updateFigureSizeAndPosition(figure) {
    if (this.isInvalidSizeAndPosition(figure)) {
      return null;
    }

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
   * @param {*} id 
   * @param {*} backgroundColor updated background color of figure
   * @returns figure properties, null if unsuccessful
   */
  static async updateFigureBackgroundColor(id, backgroundColor) {
    if(this.isInvalidBackgroundColor(backgroundColor)){
      return null;
    }

    var updatedFigure = await FigurePost.findById(id);
    if (updatedFigure) {
      updated.backgroundColor = message.backgroundColor;

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
   * check is the properties of figure valid or not
   * @param {*} figure type, x, y, width, height, backgorundColor and zIndex
   * @returns true, false if invalid
   */
  static isInvalidFigure(figure) {
    if (this.isInvalidSizeAndPosition(figure)) {
      return true;
    }

    if (this.isInvalidBackgroundColor(figure)) {
      return true;
    }
    
    // check if it is an integer
    if (figure.zIndex % 1 !== 0 || figure.zIndex > Config.figureMaxZIndex || figure.zIndex < Config.figureMinZIndex) {
      return true;
    }

    if (!(figure.type === Config.figureType[0] || figure.type === Config.figureType[1] || figure.type === Config.figureType[2])) {
      return true;
    }
    return false;
  }


  /** 
   * check is the size and position of figure valid or not
   * @param {*} figure x, y, width and height
   * @returns true, false if invalid
   */
  static isInvalidSizeAndPosition(figure) {
    if (figure.x < 0 || figure.y < 0) {
      return true;
    }
    else if (figure.x + figure.width > Config.interfaceWidth || figure.y + figure.height > Config.interfaceHeight) {
      return true;
    }

    if (figure.width < Config.figureMinWidth || figure.width > Config.figureMaxWidth) {
      return true;
    }
    else if (figure.height < Config.figureMinHeight || figure.height > Config.figureMaxHeight) {
      return true;
    }
    return false;
  }

  
  /** 
   * check is the background color of figure valid or not
   * @param {*} figure background color
   * @returns true, false if invalid
   */
  static isInvalidBackgroundColor(figure) {
    // rgba(0,0,0,1) to rbga(255,255,255,0);
    // \d{1,2}?\d matches numbers from 0 to 99,  1\d{2} matches numbers from 100 to 199, 
    // 2[0-4]\d matches numbers from 200 to 249,  25[0-5] matches numbers from 250 to 255.
    // (0?\.\d+|[01]) matches either 0 or 1 or a decimal number between 0 and 1   
    if(!/^rgba\((\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5]),(0?\.\d+|[01])\)$/.test(figure.backgroundColor)) {
      return true;
    }
    return false;
  }
}

module.exports = FigureRepository;
