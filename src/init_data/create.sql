CREATE TABLE user_table (
    username VARCHAR(60) PRIMARY KEY,
    password CHAR(30) NOT NULL,
    is_buyer BOOL,
    favorites_id INT,
);

CREATE TABLE favorites_table (
    favorites_id INT PRIMARY KEY,
    favorite_cars TEXT,
    username VARCHAR(60),
    FOREIGN KEY (username) REFERENCES user_table(username)
);

FOREIGN KEY (favorites_id) REFERENCES favorite_table(favorites_id)