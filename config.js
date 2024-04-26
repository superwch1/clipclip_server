class Config {
  static port = process.env.PORT || '1234';
  static mongodb_Uri = 'mongodb://localhost:27017/personal_database';

  static interfaceWidth = 30000;
  static interfaceHeight = 30000;

  static figureMinWidth = 50;
  static figureMinHeight = 50;

  static figureMaxWidth = 1500;
  static figureMaxHeight = 1500;

  static figureType = ['preview', 'editor', 'image'];

  static figureMinnZIndex = 0;
  static figureMaxZIndex = 20;


  static isInvalidFigure(figure) {
    if (this.isInvalidFigureSizeAndPosition(figure)) {
      return true;
    }

    if (this.isInvalidBackgroundColor(figure)) {
      return true;
    }
    
    // check if it is an integer
    if (figure.zIndex % 1 !== 0 || figure.zIndex > this.figureMaxZIndex || figure.zIndex < this.figureMinZIndex) {
      return true;
    }

    if (!(figure.type === this.figureType[0] || figure.type === this.figureType[1] || figure.type === this.figureType[2])) {
      return true;
    }
    return false;
  }


  static isInvalidFigureSizeAndPosition(figure) {
    if (figure.x < 0 || figure.y < 0) {
      return true;
    }
    else if (figure.x + figure.width > this.interfaceWidth || figure.y + figure.height > this.interfaceHeight) {
      return true;
    }

    if (figure.width < this.figureMinWidth || figure.width > this.figureMaxWidth) {
      return true;
    }
    else if (figure.height < this.figureMinHeight || figure.height > this.figureMaxHeight) {
      return true;
    }
    return false;
  }


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

module.exports = Config;