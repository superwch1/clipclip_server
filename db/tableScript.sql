CREATE TABLE figures (
  id               VARCHAR(255) PRIMARY KEY,
  board_id         VARCHAR(255) NOT NULL,
  type             VARCHAR(50)  NOT NULL,
  width            NUMERIC      NOT NULL,
  height           NUMERIC      NOT NULL,
  x                NUMERIC      NOT NULL,
  y                NUMERIC      NOT NULL,
  background_color VARCHAR(255) DEFAULT 'rgba(0,0,0,1)',
  url              VARCHAR(255) DEFAULT '',
  z_index          INTEGER      DEFAULT 1,
  is_pinned        BOOLEAN      NOT NULL
);

CREATE TABLE preview_infos (
  id          SERIAL       PRIMARY KEY,
  url         TEXT,
  title       TEXT,
  favicon     TEXT,
  description TEXT,
  image       TEXT,
  author      TEXT,
  figure_id   VARCHAR(255) NOT NULL
);

CREATE TABLE images (
  figure_id VARCHAR(255) PRIMARY KEY,
  data      BYTEA        NOT NULL,
  format    VARCHAR(20)  NOT NULL
);