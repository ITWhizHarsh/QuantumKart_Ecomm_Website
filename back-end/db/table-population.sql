INSERT INTO categories (name, description, url_slug)
VALUES 
  ('Books', 'Popular books and literature for Indian readers', 'books'),
  ('Movies', 'Popular movies and entertainment in India', 'movies');

INSERT INTO products (manufacturer_id, name, price, stock_count, available_stock_count, short_description, long_description, size, avg_rating, rating_count, image_path)
VALUES
  (NULL, 'The Immortals of Meluha', 299.99, 100, 90, 'A mythological adventure novel by Amish Tripathi', 'Set in ancient India, this novel reimagines the legends of Lord Shiva in a gripping narrative.', NULL, 4.5, 1200, '1-the-immortals-of-meluha.jpg'),
  (NULL, 'The Palace of Illusions', 349.50, 80, 75, 'A retelling of the Mahabharata from Draupadi''s perspective', 'An immersive look at the epic Mahabharata through the eyes of its most influential woman.', NULL, 4.2, 900, '2-the-palace-of-illusions.jpg'),
  (NULL, 'Five Point Someone', 199.00, 150, 140, 'A humorous take on engineering life by Chetan Bhagat', 'The story of three friends navigating the pressures of college life and the Indian education system.', NULL, 4.0, 2000, '3-five-point-someone.jpg'),
  (NULL, 'The White Tiger', 250.75, 120, 110, 'A dark tale of ambition and class struggle in modern India', 'An exploration of India's socio-economic disparities seen through the rise of an unlikely entrepreneur.', NULL, 4.3, 1500, '4-the-white-tiger.jpg'),
  (NULL, 'The God of Small Things', 320.25, 90, 85, 'A novel exploring the intricacies of Indian family life', 'Set in Kerala, this story reveals the subtle yet powerful forces that shape relationships and destiny.', NULL, 4.6, 1700, '5-the-god-of-small-things.jpg');

INSERT INTO products (manufacturer_id, name, price, stock_count, available_stock_count, short_description, long_description, size, avg_rating, rating_count, image_path)
VALUES
  (NULL, '3 Idiots', 149.99, 200, 180, 'A critically acclaimed Bollywood comedy-drama', 'A heartfelt story about friendship, education, and the pressures of the Indian engineering system.', NULL, 4.7, 2500, '6-3-idiots.jpg'),
  (NULL, 'Lagaan', 199.50, 150, 145, 'A period drama blending sports with social issues', 'Set in colonial India, villagers challenge the British to a cricket match to avoid oppressive taxes.', NULL, 4.8, 2300, '7-lagaan.jpg'),
  (NULL, 'Dangal', 179.00, 180, 170, 'An inspiring tale of determination and empowerment', 'Based on a true story, this film follows a father training his daughters to become world-class wrestlers.', NULL, 4.9, 3000, '8-dangal.jpg'),
  (NULL, 'Baahubali: The Beginning', 159.75, 220, 210, 'An epic action film from a blockbuster Indian franchise', 'A visually stunning saga of power, betrayal, and ancient kingdoms that captivated millions.', NULL, 4.6, 2800, '9-baahubali-the-beginning.jpg'),
  (NULL, 'Gully Boy', 139.25, 190, 185, 'A musical drama capturing India''s underground rap scene', 'An energetic portrayal of life in Mumbai and the rise of a street rapper against all odds.', NULL, 4.5, 2100, '10-gully-boy.jpg');

-- Link Books (Products 1–5) to Category "Books"
INSERT INTO product_categories (product_id, category_id)
VALUES
  (1, 1),
  (2, 1),
  (3, 1),
  (4, 1),
  (5, 1);

-- Link Movies (Products 6–10) to Category "Movies"
INSERT INTO product_categories (product_id, category_id)
VALUES
  (6, 2),
  (7, 2),
  (8, 2),
  (9, 2),
  (10, 2);

INSERT INTO customers (email_address, hashed_pw, auth_method, customer_name, customer_age, loyalty_pts)
VALUES
  ('testuser@example.com', 'hashedpassword', 'local', 'Test User', 30, 100);

INSERT INTO addresses (customer_id, address, postcode)
VALUES
  (1, '123, MG Road, Bengaluru, Karnataka', '560001');

INSERT INTO phone_numbers (customer_id, phone_number)
VALUES
  (1, '+91-9876543210');

INSERT INTO loyalty_program (coupon_code, reqd_pts, discount_amt, last_date)
VALUES
  ('INDIAN10', 500, 10, '2025-12-31');

INSERT INTO reviews (product_id, customer_id, rating, review)
VALUES
  (1, 1, 5, 'Absolutely loved this mythological epic—it brings ancient India to life!');



































/* 

-- Add categories
INSERT INTO categories(name, description, url_slug)
VALUES
  ('Entertainment', 'Books, movies, music, and more.', 'entertainment'),
  ('Books', 'A selection of page-turners from a range of genres.', 'books'),
  ('Movies', 'A variety of top-rated movies to lose yourself in.', 'movies');


-- Add 'To Kill a Mockingbird' product & categories
WITH product_row AS (
  INSERT INTO
    products(
      name,
      price,
      stock_count,
      available_stock_count, 
      short_description,
      long_description,
      avg_rating,
      rating_count
    )
  VALUES 
    (
      'To Kill a Mockingbird',
      8.99,
      25,
      25,
      'The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it. By Harper Lee.',
      'Compassionate, dramatic, and deeply moving, this novel takes readers to the roots of human behaviour - to innocence and experience, kindness and cruelty, love and hatred, humour and pathos. Now with over 18 million copies in print and translated into forty languages, this regional story by a young Alabama woman claims universal appeal and is regarded as a masterpiece of American literature.',
      4.26,
      25
    )
  RETURNING id
)
INSERT INTO product_categories(product_id, category_id)
VALUES
  ((SELECT id FROM product_row), 1),
  ((SELECT id FROM product_row), 2);


-- Add '1984' product & categories
WITH product_row AS (
  INSERT INTO
    products(
      name,
      price,
      stock_count,
      available_stock_count, 
      short_description,
      long_description,
      avg_rating,
      rating_count
    )
  VALUES 
    (
      '1984',
      7.99,
      3,
      3,
      'The year 1984 has come and gone, but this prophetic, nightmarish vision in 1949 of the world we were becoming is timelier than ever. By George Orwell.',
      '1984 is still the great modern classic of negative utopia — a startlingly original and haunting novel that creates an imaginary world that is completely convincing, from the first sentence to the last four words.',
      4.19,
      55
    )
  RETURNING id
)
INSERT INTO product_categories(product_id, category_id)
VALUES
  ((SELECT id FROM product_row), 1),
  ((SELECT id FROM product_row), 2);


-- Add 'The Lord of the Rings' product & categories
WITH product_row AS (
  INSERT INTO
    products(
      name,
      price,
      stock_count,
      available_stock_count, 
      short_description,
      long_description,
      avg_rating,
      rating_count
    )
  VALUES 
    (
      'The Lord of the Rings',
      9.99,
      1,
      1,
      'One Ring to rule them all, One Ring to find them, One Ring to bring them all and in the darkness bind them.',
      'When Bilbo reached his eleventy-first birthday he disappeared, bequeathing to his young cousin Frodo the Ruling Ring and a perilous quest: to journey across Middle-earth, deep into the shadow of the Dark Lord, and destroy the Ring by casting it into the Cracks of Doom.',
      4.52,
      99
    )
  RETURNING id
)
INSERT INTO product_categories(product_id, category_id)
VALUES
  ((SELECT id FROM product_row), 1),
  ((SELECT id FROM product_row), 2);


-- Add 'The Shawshank Redemption' product & categories
WITH product_row AS (
  INSERT INTO
    products(
      name,
      price,
      stock_count,
      available_stock_count, 
      short_description,
      long_description,
      avg_rating,
      rating_count
    )
  VALUES 
    (
      'The Shawshank Redemption',
      6.99,
      8,
      8,
      'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.',
      'This movie starring Tim Robbins and Morgan Freeman chronicles the experiences of a formerly successful banker as a prisoner in the gloomy jailhouse of Shawshank after being found guilty of a crime he did not commit.',
      4.65,
      80
    )
  RETURNING id
)
INSERT INTO product_categories(product_id, category_id)
VALUES
  ((SELECT id FROM product_row), 1),
  ((SELECT id FROM product_row), 3);


-- Add 'The Godfather' product & categories
WITH product_row AS (
  INSERT INTO
    products(
      name,
      price,
      stock_count,
      available_stock_count, 
      short_description,
      long_description,
      avg_rating,
      rating_count
    )
  VALUES 
    (
      'The Godfather',
      7.99,
      3,
      3,
      'The head of a mafia family decides to hand over his empire to his youngest son. However, his decision puts the lives of his loved ones in grave danger.',
      'This movie starring Marlon Brando and Al Pacino is an epic crime drama that chronicles the transformation of Michael Corleone (Pacino) from reluctant family outsider to ruthless mafia boss.',
      4.60,
      80
    )
  RETURNING id
)
INSERT INTO product_categories(product_id, category_id)
VALUES
  ((SELECT id FROM product_row), 1),
  ((SELECT id FROM product_row), 3);


-- Add 'The Dark Knight' product & categories
WITH product_row AS (
  INSERT INTO
    products(
      name,
      price,
      stock_count,
      available_stock_count, 
      short_description,
      long_description,
      avg_rating,
      rating_count
    )
  VALUES 
    (
      'The Dark Knight',
      8.99,
      20,
      20,
      'When The Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest tests of his ability to fight injustice.',
      'This movie starring Christian Bale and Heath Ledger has been widely assessed as one of the best superhero movies ever made, thanks to some outstanding performances, gritty realism, and thrilling action sequences.',
      4.55,
      90
    )
  RETURNING id
)
INSERT INTO product_categories(product_id, category_id)
VALUES
  ((SELECT id FROM product_row), 1),
  ((SELECT id FROM product_row), 3); */