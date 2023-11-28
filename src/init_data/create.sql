CREATE TABLE user_table (
    username VARCHAR(60) PRIMARY KEY,
    password CHAR(60) NOT NULL
);

CREATE TABLE car_table (
    car_id SERIAL PRIMARY KEY,
    make VARCHAR(32) NOT NULL,
    model VARCHAR(32) NOT NULL,
    color VARCHAR(32),
    price FLOAT NOT NULL,
    miles FLOAT,
    mpg FLOAT,

    -- Optional Seller Info (If Listed By User)
    username VARCHAR(60),
    FOREIGN KEY (username) REFERENCES user_table(username)
);

CREATE TABLE favorites_table (
    favorite_id SERIAL PRIMARY KEY,
    car_id INT,
    FOREIGN KEY (car_id) REFERENCES car_table(car_id),
    username VARCHAR(60),
    FOREIGN KEY (username) REFERENCES user_table(username)
);