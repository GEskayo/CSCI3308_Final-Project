
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password CHAR(60) NOT NULL
);

DROP TABLE IF EXISTS userPage;
CREATE TABLE userPage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_desc VARCHAR(255),
    profile_pic VARCHAR(255)
);

DROP TABLE IF EXISTS bookmarks;
CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL, -- Optional, for display purposes
    product_image VARCHAR(255) -- Optional, for display purposes
);
