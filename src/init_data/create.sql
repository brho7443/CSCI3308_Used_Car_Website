CREATE TABLE user_table (
    username VARCHAR(60) PRIMARY KEY,
    password CHAR(60) NOT NULL,
    is_buyer BOOL,
    favorites_id INT
);

CREATE TABLE favorites_table (
    favorites_id INT PRIMARY KEY,
    favorite_cars TEXT,
    username VARCHAR(60),
    FOREIGN KEY (username) REFERENCES user_table(username)
);

CREATE TABLE car_table (
    make VARCHAR(32) NOT NULL,
    model VARCHAR(32) NOT NULL,
    color VARCHAR(32),
    price FLOAT NOT NULL,
    miles FLOAT,
    mpg FLOAT,
    username VARCHAR(60),
    FOREIGN KEY (username) REFERENCES user_table(username)
);