import { WebSocketServer } from 'ws';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import * as Y from 'yjs';
import Config from './config.js';
import { deleteAllWritings } from './repository/yjs-repository.js';
import { PostgresqlPersistence } from 'y-postgresql';
import pool from './db/pool.js';
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import apiRouter from './router/router.js';
import { setPersistence, setupWSConnection } from './websocket/y-websocket.js';
import { setupFigureConnection } from './websocket/figures-websocket.js';
import { setupCursorConnection, periodicBroadcastCursorLocation } from './websocket/cursors-websocket.js';


async function main () {

  // configuration for y-websocket and y-postgres-provider, websocket for figures and cursors
  // foundation is created with y-websocket then add y-postgres-provider for database management
  const wssYjs = new WebSocketServer({ noServer: true })
  wssYjs.on('connection', setupWSConnection)

  // configuration for figure websocket
  const wssFigure = new WebSocketServer({ noServer: true })
  wssFigure.on('connection', setupFigureConnection);

  const wssCursor = new WebSocketServer({ noServer: true })
  wssCursor.on('connection', setupCursorConnection);

  // handle the WebSocket upgrade process manually
  const server = http.createServer();
  server.on('upgrade', (request, socket, head) => {

    const url = request.url.slice(1, 8);
    if (url === 'figures') {
      wssFigure.handleUpgrade(request, socket, head, ws => wssFigure.emit('connection', ws, request))
    }
    else if (url === "cursors") {
      wssCursor.handleUpgrade(request, socket, head, ws => wssCursor.emit('connection', ws, request))
    }
    else {
      // pathname similar to /figure_66247ef3b6e77a95ee5f55cc
      // Call `ws.HandleUpgrade` *after* you checked whether the client has access
      // See https://github.com/websockets/ws#client-authentication
      wssYjs.handleUpgrade(request, socket, head, ws => wssYjs.emit('connection', ws, request))
    }

    // socket.destroy();
  })
  // end of configuration for y-websocket and y-postgres-provider, websocket for figures and cursors


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

      // delete the document when it is not linked to figures
      const figureRes = await pool.query('SELECT id FROM figures WHERE id = $1', [docName]);
      if (figureRes.rows.length === 0) {
        await deleteAllWritings(docName);
      }
    },
  });


  // configruation for express server
  const app = express();

  app.use(cors());
  app.use(fileUpload());

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  global.appDirectory = path.resolve(__dirname);
  app.use(express.static('page/public')); //get the static file from public directory for html files

  global.pgdb = pgdb;

  app.use(express.json({ limit: `${Config.imageMaxSize / 1000000}mb` })); // base64 need large size for uploading images
  app.use('', apiRouter);

  server.on('request', app);
  // end of configuration for express server


  server.listen(Config.port, () => {
    console.log(`running on port ${Config.port}`)

    // broadcast cursor location continuously every 100 milliseconds
    periodicBroadcastCursorLocation();
  });
}

main().then()
