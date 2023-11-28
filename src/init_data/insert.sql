-- Inserting users
INSERT INTO user_table (username, password) VALUES
    ('john_doe', 'password123'),
    ('jane_smith', 'securepass'),
    ('bob_jones', 'pass456');

-- Inserting cars with a specified seller (user)
INSERT INTO car_table (make, model, color, price, miles, mpg, username)
VALUES 
    ('Toyota', 'Camry', 'Blue', 25000.00, 30000.0, 30.0, 'john_doe'),
    ('Honda', 'Civic', 'Silver', 20000.00, 25000.0, 35.0, 'jane_smith'),
    ('Ford', 'Mustang', 'Red', 35000.00, 15000.0, 25.0, 'bob_jones');

-- Inserting cars without a specified seller (user)
INSERT INTO car_table (make, model, color, price, miles, mpg, username)
VALUES 
    ('Chevrolet', 'Malibu', 'Black', 22000.00, 28000.0, 28.0, NULL),
    ('Nissan', 'Altima', 'White', 23000.00, 32000.0, 32.0, NULL),
    ('BMW', 'X5', 'Gray', 50000.00, 18000.0, 20.0, NULL);