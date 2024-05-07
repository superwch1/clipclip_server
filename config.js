class Config {
  static port = process.env.PORT || '1234';
  static mongodb_Uri = 'mongodb://localhost:27017/personal_database';

  static interfaceWidth = 5000;
  static interfaceHeight = 5000;

  static figureMinWidth = 50;
  static figureMinHeight = 50;

  static figureMaxWidth = 1500;
  static figureMaxHeight = 1500;

  static figureType = ['preview', 'editor', 'image'];

  static figureMinZIndex = 0;
  static figureMaxZIndex = 20;

  static imageMaxSize = 5000000; 
}

module.exports = Config;