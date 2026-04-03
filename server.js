const WebSocket = require('ws')
const http = require('http')
const { setPersistence, setupWSConnection } = require('./websocket/y-websocket/utils.cjs');
const Y = require('yjs');
const Config = require('./config');
const YjsRepository = require('./repository/yjsRepository.cjs');
const { PostgresqlPersistence } = require('y-postgresql');
const pool = require('./db/pool.cjs');


async function main () {

  const server = http.createServer();

  // configuration for y-websocket and y-mongodb-provider, websocket for figures and cursors
  // foundation is created with y-websocket then add y-mongodb-provider for database management
  const wssYjs = new WebSocket.Server({ noServer: true })
  wssYjs.on('connection', setupWSConnection)

  // configuration for figure websocket
  const { FiguresWebSocket } = require('./websocket/figuresWebSocket');
  const wssFigure = new WebSocket.Server({ noServer: true })
  wssFigure.on('connection', FiguresWebSocket.setupFigureConnection);

  const { CursorsWebSocket } = require('./websocket/cursorsWebSocket');
  const wssCursor = new WebSocket.Server({ noServer: true })
  wssCursor.on('connection', CursorsWebSocket.setupCursorConnection);

  const pgdb = await PostgresqlPersistence.build(
    {
      host: "localhost",
      port: 5432,
      database: "clipclip",
      user: "postgres",
      password: "123456",
    },
    { tableName: 'yjs-writings', useIndex: false, flushSize: 200 },
  );

  setPersistence({
    bindState: async (docName, ydoc) => {
      // This listen to granular document updates and store them in the database
      const persistedYdoc = await pgdb.getYDoc(docName);
      const newUpdates = Y.encodeStateAsUpdate(ydoc);
      pgdb.storeUpdate(docName, newUpdates);
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));
      ydoc.on('update', async (update) => {
        pgdb.storeUpdate(docName, update);
      });
    },

    // This is called when all connections to the document are closed.
    writeState: async (docName, ydoc) => {
      // flush document by merging records (getStateVector flushes internally when outdated)
      await pgdb.getStateVector(docName);

      // there will be 2 documents left in yjs-writing after using figuresWebSocket with deleteMany (unknown reason)
      // after all connections are closed, remaining documents will be delete when it is not linked to figures 
      const figureRes = await pool.query('SELECT id FROM figures WHERE id = $1', [docName]);
      if (figureRes.rows.length === 0) {
        await YjsRepository.deleteAllWritings(docName);
      }
    },
  });


  // handle the WebSocket upgrade process manually
  server.on('upgrade', (request, socket, head) => {

    const url = request.url.slice(1, 8);

    if (url === 'figures') {
      wssFigure.handleUpgrade(request, socket, head, /** @param {any} ws */ ws => {
        wssFigure.emit('connection', ws, request);
      })
    }

    else if (url === "cursors") {
      wssCursor.handleUpgrade(request, socket, head, /** @param {any} ws */ ws => {
        wssCursor.emit('connection', ws, request);
      })
    }

    else {
      // pathname similar to /figure_66247ef3b6e77a95ee5f55cc
      // Call `ws.HandleUpgrade` *after* you checked whether the client has access
      // See https://github.com/websockets/ws#client-authentication
      wssYjs.handleUpgrade(request, socket, head, /** @param {any} ws */ ws => {
        wssYjs.emit('connection', ws, request);
      })
    }

    // socket.destroy();
  })
  // end of configuration for y-websocket and y-mongodb-provider, websocket for figures and cursors



  // configruation for express server
  const express = require('express')
  const app = express();

  const cors = require('cors');
  app.use(cors());

  const fileUploaded = require('express-fileupload');
  app.use(fileUploaded());

  const path = require('path');
  global.appDirectory = path.resolve(__dirname);

  app.use(express.static('views/public')); //get the static file from public directory for html files

  global.pgdb = pgdb;

  app.use(express.json({ limit: `${Config.imageMaxSize / 1000000}mb` })); // base64 need large size for uploading images
  
  const figureApiRouter = require('./controllers/figureApi');
  app.use('', figureApiRouter);

  server.on('request', app);
  // end of configuration for express server



  server.listen(Config.port, () => {
    console.log(`running on port ${Config.port}`)

    // broadcast cursor location continuously every 100 milliseconds
    CursorsWebSocket.startBroadcastCursorLocation();
  });
}

main().then()
